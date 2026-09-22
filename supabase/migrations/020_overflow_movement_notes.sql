-- QA only. Apply after 019. No existing movement or audit row is changed.
BEGIN;

-- Internal IN primitive for an approved overflow request. It records the
-- request relation in reference_type/reference_id and keeps the location lock
-- and balance update in the review transaction. Delivery references remain
-- available via overflow_requests.delivery_id and overflow_approval_audit.
CREATE FUNCTION public.record_approved_overflow_in(
  p_request_id uuid,
  p_quantity integer,
  p_to_location_id uuid,
  p_note text
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_admin_id uuid := auth.uid();
  v_company_id uuid;
  v_request public.overflow_requests%ROWTYPE;
  v_location_id uuid;
  v_capacity integer;
  v_is_buffer boolean;
  v_occupied numeric;
  v_buffer_occupied numeric;
BEGIN
  SELECT p.company_id INTO v_company_id
  FROM public.profiles AS p
  WHERE p.id = v_admin_id AND p.status = 'active' AND p.role = 'admin';
  IF v_company_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501',
      MESSAGE = 'An active administrator is required';
  END IF;

  SELECT * INTO v_request FROM public.overflow_requests AS r
  WHERE r.id = p_request_id AND r.company_id = v_company_id
    AND r.status = 'pending'
  FOR UPDATE;
  IF NOT FOUND OR p_quantity IS NULL OR p_quantity <= 0
     OR p_quantity > v_request.quantity
     OR p_to_location_id NOT IN (
       v_request.target_location_id, v_request.buffer_location_id
     ) THEN
    RAISE EXCEPTION USING ERRCODE = '42501',
      MESSAGE = 'Approved overflow movement is unavailable';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.products AS p
    WHERE p.id = v_request.product_id AND p.company_id = v_company_id
      AND p.unit = 'pcs' AND p.status = 'active'
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '42501',
      MESSAGE = 'Requested product is unavailable';
  END IF;

  -- Use the same lock order as review_overflow_request and the public
  -- movement RPC before checking either destination's occupancy.
  FOR v_location_id IN
    SELECT l.id FROM public.locations AS l
    WHERE l.company_id = v_company_id
      AND l.id IN (v_request.target_location_id, v_request.buffer_location_id)
    ORDER BY l.id
  LOOP
    PERFORM 1 FROM public.locations AS l
    WHERE l.id = v_location_id AND l.company_id = v_company_id FOR UPDATE;
  END LOOP;

  IF NOT EXISTS (
    SELECT 1 FROM public.locations AS l
    WHERE l.id = v_request.buffer_location_id
      AND l.company_id = v_company_id
      AND l.warehouse_id = v_request.warehouse_id
      AND l.is_buffer AND l.status = 'active'
      AND l.max_capacity_units = 100
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '42501',
      MESSAGE = 'Request buffer is unavailable';
  END IF;

  SELECT l.max_capacity_units, l.is_buffer
    INTO v_capacity, v_is_buffer
  FROM public.locations AS l
  WHERE l.id = p_to_location_id AND l.company_id = v_company_id
    AND l.warehouse_id = v_request.warehouse_id AND l.status = 'active'
  FOR UPDATE;
  IF v_capacity IS NULL
     OR v_is_buffer IS DISTINCT FROM
       (p_to_location_id = v_request.buffer_location_id) THEN
    RAISE EXCEPTION USING ERRCODE = '42501',
      MESSAGE = 'Request destination is unavailable';
  END IF;

  SELECT COALESCE(pg_catalog.sum(b.quantity_available), 0)
    INTO v_occupied FROM public.inventory_balances AS b
  WHERE b.company_id = v_company_id AND b.location_id = p_to_location_id;
  SELECT COALESCE(pg_catalog.sum(b.quantity_available), 0)
    INTO v_buffer_occupied FROM public.inventory_balances AS b
  WHERE b.company_id = v_company_id
    AND b.location_id = v_request.buffer_location_id;
  IF v_buffer_occupied > 0 AND NOT v_is_buffer THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001',
      MESSAGE = 'BUFFER_DRAIN_FIRST';
  END IF;
  IF v_buffer_occupied > 0 AND p_quantity <> v_request.quantity THEN
    RAISE EXCEPTION USING ERRCODE = '22023',
      MESSAGE = 'Occupied buffer requires the full requested quantity';
  END IF;
  IF v_occupied + p_quantity > v_capacity THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001',
      MESSAGE = 'LOCATION_CAPACITY_EXCEEDED';
  END IF;
  IF NOT v_is_buffer AND EXISTS (
    SELECT 1 FROM public.inventory_balances AS b
    WHERE b.company_id = v_company_id AND b.location_id = p_to_location_id
      AND b.product_id <> v_request.product_id
      AND b.quantity_available > 0
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '22023',
      MESSAGE = 'TARGET_HAS_DIFFERENT_PRODUCT';
  END IF;

  INSERT INTO public.stock_movements (
    company_id, product_id, movement_type, quantity, from_location_id,
    to_location_id, user_id, note, reference_type, reference_id
  ) VALUES (
    v_company_id, v_request.product_id, 'IN', p_quantity, NULL,
    p_to_location_id, v_admin_id,
    COALESCE(NULLIF(pg_catalog.btrim(p_note), ''),
             'Одобрено извънредно приемане. Причината не е посочена.'),
    'overflow_request', p_request_id
  );

  INSERT INTO public.inventory_balances AS target (
    company_id, product_id, location_id, quantity_available
  ) VALUES (
    v_company_id, v_request.product_id, p_to_location_id, p_quantity
  )
  ON CONFLICT (company_id, product_id, location_id)
  DO UPDATE SET
    quantity_available = target.quantity_available
                         + EXCLUDED.quantity_available,
    updated_at = pg_catalog.now();
END;
$$;

REVOKE ALL ON FUNCTION public.record_approved_overflow_in(
  uuid, integer, uuid, text
) FROM PUBLIC, anon, authenticated, service_role;

-- The admin JWT, ticket, tenant checks, sorted locks, delivery update and
-- audit trail remain the 019 review flow. Only the movement note/reference
-- writer changes.

CREATE OR REPLACE FUNCTION public.review_overflow_request(
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
  v_target_code text;
  v_reason text;
  v_permanent_note text;
  v_buffer_note text;
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

  SELECT l.max_capacity_units, l.code INTO v_target_capacity, v_target_code
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

  IF v_buffer_occupied > 0 THEN
    v_permanent_units := 0;
  ELSE
    v_permanent_units := LEAST(
      v_request.quantity,
      GREATEST(v_target_capacity - v_target_occupied, 0)
    )::integer;
  END IF;
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

  v_reason := NULLIF(pg_catalog.btrim(COALESCE(v_request.reason, ''), ' .'), '');
  IF v_reason IS NULL THEN
    v_reason := 'Причината не е посочена';
  END IF;
  v_permanent_note := pg_catalog.format(
    'Извънредно приемане в %s поради ограничен капацитет. Причина: %s.',
    v_target_code, v_reason
  );
  v_buffer_note := pg_catalog.format(
    'Извънредно приемане в буфер поради липса на място в %s. Причина: %s.',
    v_target_code, v_reason
  );

  IF v_permanent_units > 0 THEN
    PERFORM public.record_approved_overflow_in(
      p_request_id, v_permanent_units, v_request.target_location_id,
      v_permanent_note
    );
  END IF;
  IF v_buffer_units > 0 THEN
    PERFORM public.record_approved_overflow_in(
      p_request_id, v_buffer_units, v_request.buffer_location_id,
      v_buffer_note
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

REVOKE ALL ON FUNCTION public.review_overflow_request(
  uuid, text, text, text
) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.review_overflow_request(
  uuid, text, text, text
) TO authenticated;

COMMIT;
