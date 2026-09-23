-- ============================================================
-- StockFlow MVP — Migration 017
-- Harden record_stock_movement against cross-tenant execution
-- ============================================================
-- Security goals:
--   - company_id is derived from the authenticated user's active profile;
--   - only admin/operator profiles may create stock movements;
--   - products and locations must belong to the derived company;
--   - the authenticated user is recorded in stock_movements.user_id;
--   - SECURITY DEFINER functions use an empty search_path;
--   - only authenticated may execute the movement RPC.
-- ============================================================

BEGIN;

-- Remove both insecure historical overloads. Do not use CASCADE: if an
-- unexpected database object depends on either signature, fail safely.
DROP FUNCTION IF EXISTS public.record_stock_movement(
  uuid, uuid, text, numeric, uuid, uuid, text
);

DROP FUNCTION IF EXISTS public.record_stock_movement(
  uuid, uuid, text, numeric, uuid, uuid, text, text, uuid
);

-- Keep the RLS helper bound to auth.uid(), restrict it to active profiles,
-- and eliminate caller-controlled object resolution.
CREATE OR REPLACE FUNCTION public.current_company_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT p.company_id
  FROM public.profiles AS p
  WHERE p.id = (SELECT auth.uid())
    AND p.status = 'active'
$$;

REVOKE ALL PRIVILEGES
  ON FUNCTION public.current_company_id()
  FROM PUBLIC, anon, service_role;

GRANT EXECUTE
  ON FUNCTION public.current_company_id()
  TO authenticated;

-- company_id is deliberately absent from the public RPC contract.
CREATE FUNCTION public.record_stock_movement(
  p_product_id       uuid,
  p_movement_type    text,
  p_quantity         numeric,
  p_from_location_id uuid,
  p_to_location_id   uuid,
  p_note             text,
  p_reference_type   text DEFAULT NULL,
  p_reference_id     uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id   uuid;
  v_company_id uuid;
  v_role      text;
  v_available numeric;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501',
      MESSAGE = 'Authentication is required to record a stock movement';
  END IF;

  SELECT p.company_id, p.role
    INTO v_company_id, v_role
  FROM public.profiles AS p
  WHERE p.id = v_user_id
    AND p.status = 'active';

  IF v_company_id IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501',
      MESSAGE = 'An active user profile is required to record a stock movement';
  END IF;

  IF v_role NOT IN ('admin', 'operator') THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501',
      MESSAGE = 'The current user is not allowed to record stock movements';
  END IF;

  IF p_quantity IS NULL OR p_quantity <= 0 THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'Quantity must be greater than zero';
  END IF;

  IF p_movement_type IS NULL
     OR p_movement_type NOT IN ('IN', 'OUT', 'TRANSFER') THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'Invalid movement type';
  END IF;

  IF p_movement_type = 'IN' AND p_to_location_id IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'IN movements require a destination location';
  END IF;

  IF p_movement_type = 'OUT' AND p_from_location_id IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'OUT movements require a source location';
  END IF;

  IF p_movement_type = 'TRANSFER'
     AND (p_from_location_id IS NULL OR p_to_location_id IS NULL) THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'TRANSFER movements require source and destination locations';
  END IF;

  IF p_movement_type = 'TRANSFER'
     AND p_from_location_id = p_to_location_id THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'TRANSFER source and destination locations must be different';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.products AS p
    WHERE p.id = p_product_id
      AND p.company_id = v_company_id
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501',
      MESSAGE = 'Product does not belong to the current company';
  END IF;

  IF p_from_location_id IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM public.locations AS l
       WHERE l.id = p_from_location_id
         AND l.company_id = v_company_id
     ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501',
      MESSAGE = 'Source location does not belong to the current company';
  END IF;

  IF p_to_location_id IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM public.locations AS l
       WHERE l.id = p_to_location_id
         AND l.company_id = v_company_id
     ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501',
      MESSAGE = 'Destination location does not belong to the current company';
  END IF;

  -- Lock the source balance before OUT/TRANSFER so concurrent requests cannot
  -- spend the same stock. A missing balance is treated as zero availability.
  IF p_movement_type IN ('OUT', 'TRANSFER') THEN
    SELECT b.quantity_available
      INTO v_available
    FROM public.inventory_balances AS b
    WHERE b.company_id = v_company_id
      AND b.product_id = p_product_id
      AND b.location_id = p_from_location_id
    FOR UPDATE;

    v_available := COALESCE(v_available, 0);

    IF v_available < p_quantity THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = pg_catalog.format(
          'Insufficient stock. Available quantity: %s',
          v_available
        );
    END IF;
  END IF;

  -- References are optional, but they must be supplied as a complete pair.
  IF (p_reference_type IS NULL AND p_reference_id IS NOT NULL)
     OR (p_reference_type IS NOT NULL AND p_reference_id IS NULL) THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'Reference type and reference ID must both be provided or both be null';
  END IF;

  -- Validate every supported reference against the company derived from the
  -- authenticated profile. Missing and cross-tenant records intentionally use
  -- the same error so callers cannot probe another company's identifiers.
  IF p_reference_type IS NOT NULL THEN
    CASE p_reference_type
      WHEN 'supplier' THEN
        IF NOT EXISTS (
          SELECT 1
          FROM public.suppliers AS s
          WHERE s.id = p_reference_id
            AND s.company_id = v_company_id
        ) THEN
          RAISE EXCEPTION USING
            ERRCODE = '42501',
            MESSAGE = 'Reference is not accessible to the current company';
        END IF;

      WHEN 'customer' THEN
        IF NOT EXISTS (
          SELECT 1
          FROM public.customers AS c
          WHERE c.id = p_reference_id
            AND c.company_id = v_company_id
        ) THEN
          RAISE EXCEPTION USING
            ERRCODE = '42501',
            MESSAGE = 'Reference is not accessible to the current company';
        END IF;

      WHEN 'incoming_delivery' THEN
        IF NOT EXISTS (
          SELECT 1
          FROM public.incoming_deliveries AS d
          WHERE d.id = p_reference_id
            AND d.company_id = v_company_id
        ) THEN
          RAISE EXCEPTION USING
            ERRCODE = '42501',
            MESSAGE = 'Reference is not accessible to the current company';
        END IF;

      WHEN 'outgoing_order' THEN
        IF NOT EXISTS (
          SELECT 1
          FROM public.outgoing_orders AS o
          WHERE o.id = p_reference_id
            AND o.company_id = v_company_id
        ) THEN
          RAISE EXCEPTION USING
            ERRCODE = '42501',
            MESSAGE = 'Reference is not accessible to the current company';
        END IF;

      ELSE
        RAISE EXCEPTION USING
          ERRCODE = '22023',
          MESSAGE = 'Invalid reference type';
    END CASE;
  END IF;

  INSERT INTO public.stock_movements (
    company_id,
    product_id,
    movement_type,
    quantity,
    from_location_id,
    to_location_id,
    user_id,
    note,
    reference_type,
    reference_id
  ) VALUES (
    v_company_id,
    p_product_id,
    p_movement_type,
    p_quantity,
    p_from_location_id,
    p_to_location_id,
    v_user_id,
    p_note,
    p_reference_type,
    p_reference_id
  );

  IF p_movement_type IN ('OUT', 'TRANSFER') THEN
    UPDATE public.inventory_balances AS b
    SET quantity_available = b.quantity_available - p_quantity,
        updated_at = pg_catalog.now()
    WHERE b.company_id = v_company_id
      AND b.product_id = p_product_id
      AND b.location_id = p_from_location_id;
  END IF;

  IF p_movement_type IN ('IN', 'TRANSFER') THEN
    INSERT INTO public.inventory_balances AS target (
      company_id,
      product_id,
      location_id,
      quantity_available
    ) VALUES (
      v_company_id,
      p_product_id,
      p_to_location_id,
      p_quantity
    )
    ON CONFLICT (company_id, product_id, location_id)
    DO UPDATE
      SET quantity_available = target.quantity_available
                               + EXCLUDED.quantity_available,
          updated_at = pg_catalog.now();
  END IF;
END;
$$;

REVOKE ALL PRIVILEGES
  ON FUNCTION public.record_stock_movement(
    uuid, text, numeric, uuid, uuid, text, text, uuid
  )
  FROM PUBLIC, anon, service_role;

GRANT EXECUTE
  ON FUNCTION public.record_stock_movement(
    uuid, text, numeric, uuid, uuid, text, text, uuid
  )
  TO authenticated;

COMMIT;
