-- QA only. Requires 017 and 018. Do not apply to Production.
BEGIN;

-- Exactly one protected 100 pcs buffer is created for every warehouse.
ALTER TABLE public.locations
  ADD COLUMN is_buffer boolean NOT NULL DEFAULT false,
  ADD CONSTRAINT chk_buffer_location
    CHECK (NOT is_buffer OR
      (code = 'BUFFER' AND max_capacity_units = 100 AND status = 'active'));

CREATE UNIQUE INDEX uq_one_buffer_per_warehouse
  ON public.locations (warehouse_id) WHERE is_buffer;

CREATE FUNCTION public.guard_buffer_location()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.is_buffer THEN
      RAISE EXCEPTION USING ERRCODE = '42501',
        MESSAGE = 'System buffer locations cannot be deleted';
    END IF;
    RETURN OLD;
  END IF;
  IF OLD.is_buffer AND (
       NEW.is_buffer IS DISTINCT FROM true
       OR NEW.code IS DISTINCT FROM OLD.code
       OR NEW.company_id IS DISTINCT FROM OLD.company_id
       OR NEW.warehouse_id IS DISTINCT FROM OLD.warehouse_id
       OR NEW.max_capacity_units IS DISTINCT FROM 100
       OR NEW.status IS DISTINCT FROM 'active'
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '42501',
      MESSAGE = 'System buffer locations cannot be changed or deactivated';
  END IF;
  IF NOT OLD.is_buffer AND NEW.is_buffer THEN
    RAISE EXCEPTION USING ERRCODE = '42501',
      MESSAGE = 'Ordinary locations cannot become system buffers';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.guard_buffer_location()
  FROM PUBLIC, anon, authenticated, service_role;

CREATE TRIGGER trg_guard_buffer_location
  BEFORE UPDATE OR DELETE ON public.locations
  FOR EACH ROW EXECUTE FUNCTION public.guard_buffer_location();

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.locations WHERE code = 'BUFFER'
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '22023',
      MESSAGE = 'A location already uses reserved code BUFFER; resolve it before migration 019';
  END IF;
END;
$$;

INSERT INTO public.locations (
  company_id, warehouse_id, code, status, max_capacity_units, is_buffer
)
SELECT w.company_id, w.id, 'BUFFER', 'active', 100, true
FROM public.warehouses AS w;

CREATE FUNCTION public.create_warehouse_buffer()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.locations (
    company_id, warehouse_id, code, status, max_capacity_units, is_buffer
  ) VALUES (NEW.company_id, NEW.id, 'BUFFER', 'active', 100, true);
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.create_warehouse_buffer()
  FROM PUBLIC, anon, authenticated, service_role;

CREATE TRIGGER trg_create_warehouse_buffer
  AFTER INSERT ON public.warehouses
  FOR EACH ROW EXECUTE FUNCTION public.create_warehouse_buffer();

CREATE TABLE public.overflow_requests (
  id uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id),
  warehouse_id uuid NOT NULL REFERENCES public.warehouses(id),
  product_id uuid NOT NULL REFERENCES public.products(id),
  target_location_id uuid NOT NULL REFERENCES public.locations(id),
  buffer_location_id uuid NOT NULL REFERENCES public.locations(id),
  delivery_id uuid REFERENCES public.incoming_deliveries(id),
  delivery_item_id uuid REFERENCES public.incoming_delivery_items(id),
  requested_by uuid NOT NULL REFERENCES public.profiles(id),
  quantity integer NOT NULL CHECK (quantity > 0),
  reason text NOT NULL CHECK (pg_catalog.length(pg_catalog.btrim(reason)) BETWEEN 10 AND 1000),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
  expires_at timestamptz NOT NULL DEFAULT (pg_catalog.now() + interval '10 minutes'),
  auth_attempts integer NOT NULL DEFAULT 0,
  auth_window_started_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  approved_by uuid REFERENCES public.profiles(id),
  reviewed_at timestamptz,
  rejection_reason text,
  permanent_units integer,
  buffer_units integer,
  created_at timestamptz NOT NULL DEFAULT pg_catalog.now()
);

CREATE INDEX idx_overflow_requests_company_status
  ON public.overflow_requests (company_id, status, expires_at);

CREATE TABLE public.overflow_review_tickets (
  token text PRIMARY KEY,
  request_id uuid NOT NULL REFERENCES public.overflow_requests(id),
  operator_id uuid NOT NULL REFERENCES public.profiles(id),
  admin_id uuid NOT NULL REFERENCES public.profiles(id),
  expires_at timestamptz NOT NULL DEFAULT (pg_catalog.now() + interval '60 seconds'),
  consumed_at timestamptz
);

CREATE TABLE public.overflow_approval_audit (
  id uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.overflow_requests(id),
  company_id uuid NOT NULL REFERENCES public.companies(id),
  operator_id uuid NOT NULL REFERENCES public.profiles(id),
  admin_id uuid NOT NULL REFERENCES public.profiles(id),
  decision text NOT NULL CHECK (decision IN ('approved', 'rejected', 'expired')),
  request_reason text NOT NULL,
  review_reason text,
  product_id uuid NOT NULL REFERENCES public.products(id),
  warehouse_id uuid NOT NULL REFERENCES public.warehouses(id),
  target_location_id uuid NOT NULL REFERENCES public.locations(id),
  buffer_location_id uuid NOT NULL REFERENCES public.locations(id),
  delivery_id uuid REFERENCES public.incoming_deliveries(id),
  delivery_item_id uuid REFERENCES public.incoming_delivery_items(id),
  requested_units integer NOT NULL,
  permanent_units integer NOT NULL,
  buffer_units integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT pg_catalog.now()
);

CREATE INDEX idx_overflow_audit_company_created
  ON public.overflow_approval_audit (company_id, created_at DESC);

ALTER TABLE public.overflow_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.overflow_review_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.overflow_approval_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY overflow_requests_read ON public.overflow_requests FOR SELECT
  TO authenticated USING (
    company_id = public.current_company_id()
    AND EXISTS (
      SELECT 1 FROM public.profiles AS p
      WHERE p.id = auth.uid() AND p.status = 'active'
        AND p.role IN ('admin', 'operator')
    )
  );

CREATE POLICY overflow_audit_read ON public.overflow_approval_audit FOR SELECT
  TO authenticated USING (
    company_id = public.current_company_id()
    AND EXISTS (
      SELECT 1 FROM public.profiles AS p
      WHERE p.id = auth.uid() AND p.status = 'active'
        AND p.role IN ('admin', 'operator')
    )
  );

REVOKE ALL ON public.overflow_requests,
  public.overflow_review_tickets, public.overflow_approval_audit
  FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.overflow_requests, public.overflow_approval_audit
  TO authenticated;

-- Operator/admin request creation. All tenant identity comes from auth.uid().
CREATE FUNCTION public.create_overflow_request(
  p_product_id uuid,
  p_quantity integer,
  p_target_location_id uuid,
  p_reason text,
  p_delivery_item_id uuid DEFAULT NULL
)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_company_id uuid;
  v_warehouse_id uuid;
  v_buffer_id uuid;
  v_capacity integer;
  v_occupied numeric;
  v_delivery_id uuid;
  v_remaining numeric;
  v_request_id uuid;
BEGIN
  SELECT p.company_id INTO v_company_id
  FROM public.profiles AS p
  WHERE p.id = v_user_id AND p.status = 'active'
    AND p.role IN ('admin', 'operator');
  IF v_company_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501',
      MESSAGE = 'An active operator or admin profile is required';
  END IF;
  IF p_quantity IS NULL OR p_quantity <= 0
     OR pg_catalog.length(pg_catalog.btrim(COALESCE(p_reason, ''))) NOT BETWEEN 10 AND 1000 THEN
    RAISE EXCEPTION USING ERRCODE = '22023',
      MESSAGE = 'Positive whole pcs and a reason of 10-1000 characters are required';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.products AS p
    WHERE p.id = p_product_id AND p.company_id = v_company_id
      AND p.unit = 'pcs' AND p.status = 'active'
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '42501',
      MESSAGE = 'Product is not an active pcs product of this company';
  END IF;
  SELECT l.warehouse_id, l.max_capacity_units
    INTO v_warehouse_id, v_capacity
  FROM public.locations AS l
  JOIN public.warehouses AS w
    ON w.id = l.warehouse_id AND w.company_id = l.company_id
  WHERE l.id = p_target_location_id AND l.company_id = v_company_id
    AND l.status = 'active' AND NOT l.is_buffer AND w.status = 'active'
  FOR UPDATE OF l;
  IF v_warehouse_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501',
      MESSAGE = 'Target must be an active permanent location of this company';
  END IF;
  SELECT l.id INTO v_buffer_id FROM public.locations AS l
  WHERE l.warehouse_id = v_warehouse_id AND l.company_id = v_company_id
    AND l.is_buffer AND l.status = 'active' AND l.max_capacity_units = 100;
  IF v_buffer_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '22023',
      MESSAGE = 'Warehouse has no valid system buffer';
  END IF;
  SELECT COALESCE(pg_catalog.sum(b.quantity_available), 0) INTO v_occupied
  FROM public.inventory_balances AS b
  WHERE b.company_id = v_company_id
    AND b.location_id = p_target_location_id;
  IF v_occupied + p_quantity <= v_capacity THEN
    RAISE EXCEPTION USING ERRCODE = '22023',
      MESSAGE = 'Permanent location has enough space; use normal receiving';
  END IF;
  IF p_delivery_item_id IS NOT NULL THEN
    SELECT i.delivery_id,
           i.expected_quantity - i.received_quantity
      INTO v_delivery_id, v_remaining
    FROM public.incoming_delivery_items AS i
    JOIN public.incoming_deliveries AS d
      ON d.id = i.delivery_id AND d.company_id = i.company_id
    WHERE i.id = p_delivery_item_id AND i.company_id = v_company_id
      AND i.product_id = p_product_id
      AND d.status IN ('draft', 'expected', 'partially_received');
    IF v_delivery_id IS NULL OR v_remaining < p_quantity THEN
      RAISE EXCEPTION USING ERRCODE = '22023',
        MESSAGE = 'Delivery item is unavailable or has insufficient remaining quantity';
    END IF;
  END IF;
  INSERT INTO public.overflow_requests (
    company_id, warehouse_id, product_id, target_location_id,
    buffer_location_id, delivery_id, delivery_item_id,
    requested_by, quantity, reason
  ) VALUES (
    v_company_id, v_warehouse_id, p_product_id, p_target_location_id,
    v_buffer_id, v_delivery_id, p_delivery_item_id,
    v_user_id, p_quantity, pg_catalog.btrim(p_reason)
  ) RETURNING id INTO v_request_id;
  RETURN v_request_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_overflow_request(
  uuid, integer, uuid, text, uuid
) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.create_overflow_request(
  uuid, integer, uuid, text, uuid
) TO authenticated;

-- Count every password attempt before calling Supabase Auth. The counter is
-- serialized per request and does not store an email or password.
CREATE FUNCTION public.reserve_overflow_auth_attempt(p_request_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_company_id uuid;
  v_request public.overflow_requests%ROWTYPE;
  v_attempts integer;
  v_operator_attempts integer;
BEGIN
  SELECT p.company_id INTO v_company_id FROM public.profiles AS p
  WHERE p.id = v_user_id AND p.status = 'active'
    AND p.role IN ('admin', 'operator')
  FOR UPDATE;
  IF v_company_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501',
      MESSAGE = 'Active operator or admin required';
  END IF;
  SELECT * INTO v_request FROM public.overflow_requests AS r
  WHERE r.id = p_request_id AND r.company_id = v_company_id
    AND r.requested_by = v_user_id
  FOR UPDATE;
  IF NOT FOUND OR v_request.status <> 'pending'
     OR v_request.expires_at <= pg_catalog.now() THEN
    RAISE EXCEPTION USING ERRCODE = '42501',
      MESSAGE = 'Pending request is not available to this operator';
  END IF;
  SELECT COALESCE(pg_catalog.sum(r.auth_attempts), 0)::integer
    INTO v_operator_attempts FROM public.overflow_requests AS r
  WHERE r.requested_by = v_user_id
    AND r.auth_window_started_at > pg_catalog.now() - interval '15 minutes';
  IF v_operator_attempts >= 10 THEN
    RAISE EXCEPTION USING ERRCODE = '42501',
      MESSAGE = 'AUTH_ATTEMPTS_LIMIT';
  END IF;
  v_attempts := CASE
    WHEN v_request.auth_window_started_at <=
      pg_catalog.now() - interval '15 minutes' THEN 0
    ELSE v_request.auth_attempts
  END;
  IF v_attempts >= 5 THEN
    RAISE EXCEPTION USING ERRCODE = '42501',
      MESSAGE = 'AUTH_ATTEMPTS_LIMIT';
  END IF;
  UPDATE public.overflow_requests AS r
  SET auth_attempts = v_attempts + 1,
      auth_window_started_at = CASE
        WHEN v_attempts = 0 THEN pg_catalog.now()
        ELSE r.auth_window_started_at END
  WHERE r.id = p_request_id;
END;
$$;

REVOKE ALL ON FUNCTION public.reserve_overflow_auth_attempt(uuid)
  FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.reserve_overflow_auth_attempt(uuid)
  TO authenticated;

-- The server issues this one-use ticket only after Supabase Auth has verified
-- the administrator's password and getUser has verified the returned token.
-- service_role mints a capability; it never impersonates a user for movements.
CREATE FUNCTION public.mint_overflow_review_ticket(
  p_request_id uuid, p_operator_id uuid, p_admin_id uuid, p_token text
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_company_id uuid;
BEGIN
  IF pg_catalog.length(COALESCE(p_token, '')) < 64 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Invalid ticket';
  END IF;
  SELECT r.company_id INTO v_company_id FROM public.overflow_requests AS r
  WHERE r.id = p_request_id AND r.requested_by = p_operator_id
    AND r.status = 'pending' AND r.expires_at > pg_catalog.now();
  IF v_company_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.profiles AS p
    WHERE p.id = p_admin_id AND p.company_id = v_company_id
      AND p.status = 'active' AND p.role = 'admin'
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '42501',
      MESSAGE = 'Administrator and request must belong to the same company';
  END IF;
  INSERT INTO public.overflow_review_tickets (
    token, request_id, operator_id, admin_id
  ) VALUES (p_token, p_request_id, p_operator_id, p_admin_id);
END;
$$;

REVOKE ALL ON FUNCTION public.mint_overflow_review_ticket(
  uuid, uuid, uuid, text
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mint_overflow_review_ticket(
  uuid, uuid, uuid, text
) TO service_role;

-- The admin JWT is the RPC caller. Row locks and all writes share one DB
-- transaction; any error rolls back both IN movements and delivery updates.
CREATE FUNCTION public.review_overflow_request(
  p_request_id uuid, p_ticket text, p_decision text,
  p_rejection_reason text DEFAULT NULL
)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_admin_id uuid := auth.uid();
  v_company_id uuid;
  v_request public.overflow_requests%ROWTYPE;
  v_location_id uuid;
  v_target_capacity integer;
  v_buffer_capacity integer;
  v_target_occupied numeric;
  v_buffer_occupied numeric;
  v_permanent_units integer;
  v_buffer_units integer;
  v_item public.incoming_delivery_items%ROWTYPE;
  v_delivery_status text;
BEGIN
  SELECT p.company_id INTO v_company_id FROM public.profiles AS p
  WHERE p.id = v_admin_id AND p.status = 'active' AND p.role = 'admin';
  IF v_company_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501',
      MESSAGE = 'An active administrator is required';
  END IF;
  SELECT * INTO v_request FROM public.overflow_requests AS r
  WHERE r.id = p_request_id AND r.company_id = v_company_id
  FOR UPDATE;
  IF NOT FOUND OR v_request.status <> 'pending' THEN
    RAISE EXCEPTION USING ERRCODE = '42501',
      MESSAGE = 'Pending request is unavailable';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.overflow_review_tickets AS t
    WHERE t.token = p_ticket AND t.request_id = p_request_id
      AND t.operator_id = v_request.requested_by
      AND t.admin_id = v_admin_id
      AND t.expires_at > pg_catalog.now() AND t.consumed_at IS NULL
    FOR UPDATE
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '42501',
      MESSAGE = 'A fresh administrator confirmation is required';
  END IF;
  IF p_decision NOT IN ('approved', 'rejected') OR p_decision IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Invalid review decision';
  END IF;
  IF v_request.expires_at <= pg_catalog.now() THEN
    UPDATE public.overflow_requests SET status = 'expired',
      approved_by = v_admin_id, reviewed_at = pg_catalog.now()
    WHERE id = p_request_id;
    INSERT INTO public.overflow_approval_audit (
      request_id, company_id, operator_id, admin_id, decision,
      request_reason, review_reason, product_id, warehouse_id,
      target_location_id, buffer_location_id, delivery_id, delivery_item_id,
      requested_units, permanent_units, buffer_units
    ) VALUES (
      p_request_id, v_company_id, v_request.requested_by, v_admin_id, 'expired',
      v_request.reason, NULL, v_request.product_id, v_request.warehouse_id,
      v_request.target_location_id, v_request.buffer_location_id,
      v_request.delivery_id, v_request.delivery_item_id,
      v_request.quantity, 0, 0
    );
    UPDATE public.overflow_review_tickets SET consumed_at = pg_catalog.now()
    WHERE token = p_ticket;
    RETURN 'expired';
  END IF;
  IF p_decision = 'rejected' THEN
    IF pg_catalog.length(pg_catalog.btrim(COALESCE(p_rejection_reason, ''))) < 10 THEN
      RAISE EXCEPTION USING ERRCODE = '22023',
        MESSAGE = 'A rejection reason of at least 10 characters is required';
    END IF;
    UPDATE public.overflow_requests SET status = 'rejected',
      approved_by = v_admin_id, reviewed_at = pg_catalog.now(),
      rejection_reason = pg_catalog.btrim(p_rejection_reason)
    WHERE id = p_request_id;
    INSERT INTO public.overflow_approval_audit (
      request_id, company_id, operator_id, admin_id, decision,
      request_reason, review_reason, product_id, warehouse_id,
      target_location_id, buffer_location_id, delivery_id, delivery_item_id,
      requested_units, permanent_units, buffer_units
    ) VALUES (
      p_request_id, v_company_id, v_request.requested_by, v_admin_id, 'rejected',
      v_request.reason, pg_catalog.btrim(p_rejection_reason),
      v_request.product_id, v_request.warehouse_id,
      v_request.target_location_id, v_request.buffer_location_id,
      v_request.delivery_id, v_request.delivery_item_id,
      v_request.quantity, 0, 0
    );
    UPDATE public.overflow_review_tickets SET consumed_at = pg_catalog.now()
    WHERE token = p_ticket;
    RETURN 'rejected';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.products AS p
    WHERE p.id = v_request.product_id AND p.company_id = v_company_id
      AND p.unit = 'pcs' AND p.status = 'active'
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '42501',
      MESSAGE = 'Requested product is unavailable';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.warehouses AS w
    WHERE w.id = v_request.warehouse_id
      AND w.company_id = v_company_id AND w.status = 'active'
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '42501',
      MESSAGE = 'Request warehouse is unavailable';
  END IF;

  -- Lock the two destinations in UUID order before either occupancy sum.
  FOR v_location_id IN
    SELECT l.id FROM public.locations AS l
    WHERE l.company_id = v_company_id
      AND l.id IN (v_request.target_location_id, v_request.buffer_location_id)
    ORDER BY l.id
  LOOP
    PERFORM 1 FROM public.locations AS l
    WHERE l.id = v_location_id AND l.company_id = v_company_id FOR UPDATE;
  END LOOP;

  SELECT l.max_capacity_units INTO v_target_capacity
  FROM public.locations AS l
  WHERE l.id = v_request.target_location_id
    AND l.company_id = v_company_id
    AND l.warehouse_id = v_request.warehouse_id
    AND NOT l.is_buffer AND l.status = 'active';
  SELECT l.max_capacity_units INTO v_buffer_capacity
  FROM public.locations AS l
  WHERE l.id = v_request.buffer_location_id
    AND l.company_id = v_company_id
    AND l.warehouse_id = v_request.warehouse_id
    AND l.is_buffer AND l.status = 'active';
  IF v_target_capacity IS NULL OR v_buffer_capacity IS DISTINCT FROM 100 THEN
    RAISE EXCEPTION USING ERRCODE = '42501',
      MESSAGE = 'Request locations are unavailable';
  END IF;
  SELECT COALESCE(pg_catalog.sum(b.quantity_available), 0)
    INTO v_target_occupied FROM public.inventory_balances AS b
  WHERE b.company_id = v_company_id
    AND b.location_id = v_request.target_location_id;
  SELECT COALESCE(pg_catalog.sum(b.quantity_available), 0)
    INTO v_buffer_occupied FROM public.inventory_balances AS b
  WHERE b.company_id = v_company_id
    AND b.location_id = v_request.buffer_location_id;

  IF v_target_occupied > v_target_capacity OR v_buffer_occupied > v_buffer_capacity THEN
    RAISE EXCEPTION USING ERRCODE = '22023',
      MESSAGE = 'Location already exceeds its configured capacity';
  END IF;

  v_permanent_units := LEAST(
    v_request.quantity,
    GREATEST(v_target_capacity - v_target_occupied, 0)
  )::integer;
  v_buffer_units := v_request.quantity - v_permanent_units;
  IF v_permanent_units > 0 AND EXISTS (
    SELECT 1 FROM public.inventory_balances AS b
    WHERE b.company_id = v_company_id
      AND b.location_id = v_request.target_location_id
      AND b.product_id <> v_request.product_id
      AND b.quantity_available > 0
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '22023',
      MESSAGE = 'TARGET_HAS_DIFFERENT_PRODUCT';
  END IF;
  IF v_buffer_occupied + v_buffer_units > 100 THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001',
      MESSAGE = 'BUFFER_CAPACITY_EXCEEDED';
  END IF;

  IF v_request.delivery_item_id IS NOT NULL THEN
    SELECT * INTO v_item FROM public.incoming_delivery_items AS i
    WHERE i.id = v_request.delivery_item_id
      AND i.delivery_id = v_request.delivery_id
      AND i.company_id = v_company_id
      AND i.product_id = v_request.product_id
    FOR UPDATE;
    IF NOT FOUND OR v_item.expected_quantity - v_item.received_quantity
        < v_request.quantity THEN
      RAISE EXCEPTION USING ERRCODE = '22023',
        MESSAGE = 'Delivery item remaining quantity changed';
    END IF;
    SELECT d.status INTO v_delivery_status
    FROM public.incoming_deliveries AS d
    WHERE d.id = v_request.delivery_id AND d.company_id = v_company_id
    FOR UPDATE;
    IF v_delivery_status IS NULL OR v_delivery_status IN ('cancelled', 'received') THEN
      RAISE EXCEPTION USING ERRCODE = '22023',
        MESSAGE = 'Delivery is not receivable';
    END IF;
  END IF;

  IF v_permanent_units > 0 THEN
    PERFORM public.record_stock_movement_uncapped(
      v_request.product_id, 'IN', v_permanent_units, NULL,
      v_request.target_location_id, 'Approved overflow ' || p_request_id::text,
      CASE WHEN v_request.delivery_id IS NULL THEN NULL ELSE 'incoming_delivery' END,
      v_request.delivery_id
    );
  END IF;
  IF v_buffer_units > 0 THEN
    PERFORM public.record_stock_movement_uncapped(
      v_request.product_id, 'IN', v_buffer_units, NULL,
      v_request.buffer_location_id, 'Approved overflow ' || p_request_id::text,
      CASE WHEN v_request.delivery_id IS NULL THEN NULL ELSE 'incoming_delivery' END,
      v_request.delivery_id
    );
  END IF;
  IF v_request.delivery_item_id IS NOT NULL THEN
    UPDATE public.incoming_delivery_items
    SET received_quantity = received_quantity + v_request.quantity
    WHERE id = v_request.delivery_item_id AND company_id = v_company_id;
    UPDATE public.incoming_deliveries AS d
    SET status = CASE WHEN EXISTS (
      SELECT 1 FROM public.incoming_delivery_items AS i
      WHERE i.delivery_id = d.id AND i.company_id = v_company_id
        AND i.received_quantity < i.expected_quantity
    ) THEN 'partially_received' ELSE 'received' END,
        received_date = CURRENT_DATE
    WHERE d.id = v_request.delivery_id AND d.company_id = v_company_id;
  END IF;
  UPDATE public.overflow_requests SET status = 'approved',
    approved_by = v_admin_id, reviewed_at = pg_catalog.now(),
    permanent_units = v_permanent_units, buffer_units = v_buffer_units
  WHERE id = p_request_id;
  INSERT INTO public.overflow_approval_audit (
    request_id, company_id, operator_id, admin_id, decision,
    request_reason, review_reason, product_id, warehouse_id,
    target_location_id, buffer_location_id, delivery_id, delivery_item_id,
    requested_units, permanent_units, buffer_units
  ) VALUES (
    p_request_id, v_company_id, v_request.requested_by, v_admin_id, 'approved',
    v_request.reason, NULL, v_request.product_id, v_request.warehouse_id,
    v_request.target_location_id, v_request.buffer_location_id,
    v_request.delivery_id, v_request.delivery_item_id, v_request.quantity,
    v_permanent_units, v_buffer_units
  );
  UPDATE public.overflow_review_tickets SET consumed_at = pg_catalog.now()
  WHERE token = p_ticket;
  RETURN 'approved';
END;
$$;

REVOKE ALL ON FUNCTION public.review_overflow_request(uuid, text, text, text)
  FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.review_overflow_request(uuid, text, text, text)
  TO authenticated;

-- Preserve the exact 018 capacity/tenant/reference implementation internally.
-- The new public wrapper adds buffer-first and prevents ordinary IN to buffer.
ALTER FUNCTION public.record_stock_movement(
  uuid, text, numeric, uuid, uuid, text, text, uuid
) RENAME TO record_stock_movement_capacity_base;

REVOKE ALL ON FUNCTION public.record_stock_movement_capacity_base(
  uuid, text, numeric, uuid, uuid, text, text, uuid
) FROM PUBLIC, anon, authenticated, service_role;

CREATE FUNCTION public.record_stock_movement(
  p_product_id uuid,
  p_movement_type text,
  p_quantity numeric,
  p_from_location_id uuid,
  p_to_location_id uuid,
  p_note text,
  p_reference_type text DEFAULT NULL,
  p_reference_id uuid DEFAULT NULL
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_company_id uuid;
  v_warehouse_id uuid;
  v_destination_is_buffer boolean;
  v_buffer_id uuid;
  v_location_id uuid;
  v_buffer_occupied numeric;
BEGIN
  SELECT p.company_id INTO v_company_id FROM public.profiles AS p
  WHERE p.id = auth.uid() AND p.status = 'active'
    AND p.role IN ('admin', 'operator');
  IF v_company_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501',
      MESSAGE = 'Active operator or admin required';
  END IF;
  IF p_movement_type IN ('IN', 'TRANSFER') THEN
    SELECT l.warehouse_id, l.is_buffer
      INTO v_warehouse_id, v_destination_is_buffer
    FROM public.locations AS l
    WHERE l.id = p_to_location_id AND l.company_id = v_company_id
      AND l.status = 'active';
    IF v_warehouse_id IS NULL THEN
      RAISE EXCEPTION USING ERRCODE = '42501',
        MESSAGE = 'Destination is not an active company location';
    END IF;
    IF v_destination_is_buffer THEN
      RAISE EXCEPTION USING ERRCODE = '42501',
        MESSAGE = 'BUFFER_REQUIRES_APPROVAL';
    END IF;
  END IF;
  IF p_movement_type = 'IN' THEN
    SELECT l.id INTO v_buffer_id FROM public.locations AS l
    WHERE l.warehouse_id = v_warehouse_id AND l.company_id = v_company_id
      AND l.is_buffer AND l.status = 'active';
    IF v_buffer_id IS NULL THEN
      RAISE EXCEPTION USING ERRCODE = '22023',
        MESSAGE = 'Warehouse system buffer is missing';
    END IF;
  END IF;
  FOR v_location_id IN
    SELECT l.id FROM public.locations AS l
    WHERE l.company_id = v_company_id
      AND l.id IN (p_from_location_id, p_to_location_id, v_buffer_id)
    ORDER BY l.id
  LOOP
    PERFORM 1 FROM public.locations AS l
    WHERE l.id = v_location_id AND l.company_id = v_company_id FOR UPDATE;
  END LOOP;
  IF p_movement_type = 'IN' THEN
    SELECT COALESCE(pg_catalog.sum(b.quantity_available), 0)
      INTO v_buffer_occupied FROM public.inventory_balances AS b
    WHERE b.company_id = v_company_id AND b.location_id = v_buffer_id;
    IF v_buffer_occupied > 0 THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001',
        MESSAGE = 'BUFFER_DRAIN_FIRST';
    END IF;
  END IF;
  PERFORM public.record_stock_movement_capacity_base(
    p_product_id, p_movement_type, p_quantity,
    p_from_location_id, p_to_location_id, p_note,
    p_reference_type, p_reference_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.record_stock_movement(
  uuid, text, numeric, uuid, uuid, text, text, uuid
) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.record_stock_movement(
  uuid, text, numeric, uuid, uuid, text, text, uuid
) TO authenticated;

COMMIT;
