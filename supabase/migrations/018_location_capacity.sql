-- StockFlow QA MVP: total location capacity in pcs.
-- Requires 017_harden_record_stock_movement.sql. Apply only to the QA project.
-- Existing locations other than the three named QA fixtures must already have a
-- deliberate capacity assignment; this migration never invents one.

BEGIN;

ALTER TABLE public.locations
  ADD COLUMN max_capacity_units integer;

-- Match each QA fixture to its expected company and check its current total
-- occupancy before assigning a capacity. A missing, duplicated or misplaced
-- code is an environment mismatch, not a reason to guess a capacity.
DO $$
DECLARE
  v_expected record;
  v_location_count bigint;
  v_occupied numeric;
BEGIN
  FOR v_expected IN
    SELECT expected.code, expected.company_id
    FROM (VALUES
      ('QA-P0-A-LOC-01', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid),
      ('QA-P0-A-LOC-02', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid),
      ('QA-P0-B-LOC-01', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'::uuid)
    ) AS expected(code, company_id)
  LOOP
    SELECT pg_catalog.count(DISTINCT l.id),
           COALESCE(pg_catalog.sum(b.quantity_available), 0)
      INTO v_location_count, v_occupied
    FROM public.locations AS l
    LEFT JOIN public.inventory_balances AS b
      ON b.location_id = l.id AND b.company_id = l.company_id
    WHERE l.code = v_expected.code;

    IF v_location_count <> 1 THEN
      RAISE EXCEPTION USING
        ERRCODE = '22023',
        MESSAGE = pg_catalog.format(
          'QA location %s must exist exactly once; found %s',
          v_expected.code, v_location_count
        );
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM public.locations AS l
      WHERE l.code = v_expected.code
        AND l.company_id = v_expected.company_id
    ) THEN
      RAISE EXCEPTION USING
        ERRCODE = '22023',
        MESSAGE = pg_catalog.format(
          'QA location %s belongs to an unexpected company', v_expected.code
        );
    END IF;

    IF v_occupied > 20 THEN
      RAISE EXCEPTION USING
        ERRCODE = '22023',
        MESSAGE = pg_catalog.format(
          'QA location %s occupies %s pcs, exceeding its 20 pcs capacity',
          v_expected.code, v_occupied
        );
    END IF;
  END LOOP;
END;
$$;

UPDATE public.locations AS l
SET max_capacity_units = 20
FROM (VALUES
  ('QA-P0-A-LOC-01', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid),
  ('QA-P0-A-LOC-02', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid),
  ('QA-P0-B-LOC-01', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'::uuid)
) AS expected(code, company_id)
WHERE l.code = expected.code
  AND l.company_id = expected.company_id;

-- Verify every existing location before enforcing NOT NULL. The whole
-- transaction rolls back if any location has no deliberate valid capacity,
-- exceeds its capacity, or holds stock measured in a unit other than pcs.
DO $$
DECLARE
  v_bad_code text;
BEGIN
  SELECT l.code INTO v_bad_code
  FROM public.locations AS l
  LEFT JOIN public.inventory_balances AS b
    ON b.location_id = l.id AND b.company_id = l.company_id
  GROUP BY l.id, l.code, l.max_capacity_units
  HAVING l.max_capacity_units IS NULL
      OR l.max_capacity_units <= 0
      OR COALESCE(pg_catalog.sum(b.quantity_available), 0) > l.max_capacity_units
  ORDER BY l.code
  LIMIT 1;

  IF v_bad_code IS NOT NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = pg_catalog.format(
        'Location %s has no valid capacity or current occupancy exceeds capacity; assign and verify its capacity before migration 018',
        v_bad_code
      );
  END IF;

  SELECT l.code INTO v_bad_code
  FROM public.locations AS l
  JOIN public.inventory_balances AS b
    ON b.location_id = l.id AND b.company_id = l.company_id
  WHERE b.quantity_available <> pg_catalog.trunc(b.quantity_available)
  ORDER BY l.code
  LIMIT 1;

  IF v_bad_code IS NOT NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = pg_catalog.format(
        'Location %s contains fractional stock; reconcile it to whole pcs before migration 018',
        v_bad_code
      );
  END IF;

  SELECT l.code INTO v_bad_code
  FROM public.locations AS l
  JOIN public.inventory_balances AS b
    ON b.location_id = l.id AND b.company_id = l.company_id
  JOIN public.products AS p
    ON p.id = b.product_id AND p.company_id = l.company_id
  WHERE b.quantity_available > 0 AND p.unit <> 'pcs'
  ORDER BY l.code
  LIMIT 1;

  IF v_bad_code IS NOT NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = pg_catalog.format(
        'Location %s contains stock outside the pcs unit; reconcile units before migration 018',
        v_bad_code
      );
  END IF;
END;
$$;

ALTER TABLE public.locations
  ALTER COLUMN max_capacity_units SET NOT NULL,
  ADD CONSTRAINT chk_locations_max_capacity_units
    CHECK (max_capacity_units > 0);

-- New QA products default to the only supported capacity unit. Existing
-- stocked products are validated above instead of silently converting units.
ALTER TABLE public.products
  ALTER COLUMN unit SET DEFAULT 'pcs';

-- A capacity reduction must be serialized against movement placement. An
-- UPDATE of the location row acquires its row lock before this trigger runs.
CREATE FUNCTION public.check_location_capacity_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_occupied numeric;
BEGIN
  SELECT COALESCE(pg_catalog.sum(b.quantity_available), 0)
    INTO v_occupied
  FROM public.inventory_balances AS b
  WHERE b.location_id = NEW.id AND b.company_id = NEW.company_id;

  IF v_occupied > NEW.max_capacity_units THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'LOCATION_CAPACITY_EXCEEDED';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL PRIVILEGES ON FUNCTION public.check_location_capacity_update()
  FROM PUBLIC, anon, authenticated, service_role;

CREATE TRIGGER trg_locations_capacity_update
  BEFORE UPDATE OF max_capacity_units ON public.locations
  FOR EACH ROW EXECUTE FUNCTION public.check_location_capacity_update();

-- Keep the hardened 017 implementation, including its tenant, role, reference,
-- stock and audit checks, as an internal routine. Revoke every API role before
-- creating the public capacity-enforcing entry point.
ALTER FUNCTION public.record_stock_movement(
  uuid, text, numeric, uuid, uuid, text, text, uuid
) RENAME TO record_stock_movement_uncapped;

REVOKE ALL PRIVILEGES ON FUNCTION public.record_stock_movement_uncapped(
  uuid, text, numeric, uuid, uuid, text, text, uuid
) FROM PUBLIC, anon, authenticated, service_role;

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
  v_user_id uuid;
  v_company_id uuid;
  v_role text;
  v_location_id uuid;
  v_capacity integer;
  v_occupied numeric;
BEGIN
  v_user_id := auth.uid();

  SELECT p.company_id, p.role INTO v_company_id, v_role
  FROM public.profiles AS p
  WHERE p.id = v_user_id AND p.status = 'active';

  IF v_user_id IS NULL OR v_company_id IS NULL
     OR v_role IS NULL OR v_role NOT IN ('admin', 'operator') THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501',
      MESSAGE = 'An active admin or operator profile is required';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.products AS p
    WHERE p.id = p_product_id
      AND p.company_id = v_company_id
      AND p.unit = 'pcs'
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'Only products measured in pcs can be moved';
  END IF;

  IF p_quantity IS NOT NULL
     AND p_quantity <> pg_catalog.trunc(p_quantity) THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'Movement quantity must be a whole number of pcs';
  END IF;

  -- Lock every affected location in UUID order. IN locks destination; OUT
  -- locks source; TRANSFER locks both, avoiding opposite-direction deadlocks.
  FOR v_location_id IN
    SELECT l.id
    FROM public.locations AS l
    WHERE l.company_id = v_company_id
      AND l.id IN (p_from_location_id, p_to_location_id)
    ORDER BY l.id
  LOOP
    PERFORM 1 FROM public.locations AS l
    WHERE l.id = v_location_id AND l.company_id = v_company_id
    FOR UPDATE;
  END LOOP;

  IF p_movement_type IN ('IN', 'TRANSFER') THEN
    SELECT l.max_capacity_units INTO v_capacity
    FROM public.locations AS l
    WHERE l.id = p_to_location_id AND l.company_id = v_company_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION USING
        ERRCODE = '42501',
        MESSAGE = 'Destination location does not belong to the current company';
    END IF;

    SELECT COALESCE(pg_catalog.sum(b.quantity_available), 0)
      INTO v_occupied
    FROM public.inventory_balances AS b
    WHERE b.location_id = p_to_location_id
      AND b.company_id = v_company_id;

    IF p_quantity IS NOT NULL AND v_occupied + p_quantity > v_capacity THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = 'LOCATION_CAPACITY_EXCEEDED';
    END IF;
  END IF;

  -- The internal 017 function performs the atomic movement and balance update
  -- in this same transaction while the location row locks remain held.
  PERFORM public.record_stock_movement_uncapped(
    p_product_id, p_movement_type, p_quantity,
    p_from_location_id, p_to_location_id, p_note,
    p_reference_type, p_reference_id
  );
END;
$$;

REVOKE ALL PRIVILEGES ON FUNCTION public.record_stock_movement(
  uuid, text, numeric, uuid, uuid, text, text, uuid
) FROM PUBLIC, anon, service_role;

GRANT EXECUTE ON FUNCTION public.record_stock_movement(
  uuid, text, numeric, uuid, uuid, text, text, uuid
) TO authenticated;

COMMIT;
