# QA migration 018: preflight and postflight

Run these queries only in the verified QA Supabase project. They are read-only.
Run the preflight before pasting the complete, unchanged `018_location_capacity.sql`
into a separate SQL Editor query. Do not apply the migration if any preflight
check fails. Run the postflight immediately after a successful migration and
before UI movement tests.

The fixture companies are identified by UUID, not just by a location code.
Company A: `aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa`.
Company B: `bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb`.

## Preflight SQL

```sql
WITH expected(code, company_id, expected_occupied) AS (
  VALUES
    ('QA-P0-A-LOC-01', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid, 7::numeric),
    ('QA-P0-A-LOC-02', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid, 15::numeric),
    ('QA-P0-B-LOC-01', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'::uuid, 0::numeric)
),
fixture AS (
  SELECT e.code, e.expected_occupied,
         pg_catalog.count(DISTINCT l.id) AS locations_found,
         pg_catalog.count(DISTINCT l.id) FILTER (
           WHERE l.company_id = e.company_id
         ) AS expected_company_matches,
         COALESCE(pg_catalog.sum(b.quantity_available), 0) AS occupied_units
  FROM expected AS e
  LEFT JOIN public.locations AS l ON l.code = e.code
  LEFT JOIN public.inventory_balances AS b
    ON b.location_id = l.id AND b.company_id = l.company_id
  GROUP BY e.code, e.company_id, e.expected_occupied
),
global_checks AS (
  SELECT
    EXISTS (
      SELECT 1 FROM pg_catalog.pg_proc AS p
      WHERE p.oid = pg_catalog.to_regprocedure(
        'public.record_stock_movement(uuid,text,numeric,uuid,uuid,text,text,uuid)'
      )
        AND p.prosecdef
        AND p.pronargdefaults = 2
        AND EXISTS (
          SELECT 1 FROM pg_catalog.unnest(p.proconfig) AS cfg(setting)
          WHERE pg_catalog.left(
            cfg.setting, pg_catalog.length('search_path=')
          ) = 'search_path='
            AND pg_catalog.substr(
              cfg.setting, pg_catalog.length('search_path=') + 1
            ) IN ('', '""')
        )
        AND pg_catalog.pg_get_functiondef(p.oid)
            LIKE '%Reference is not accessible to the current company%'
    )
    AND pg_catalog.to_regprocedure('public.current_company_id()') IS NOT NULL
    AND pg_catalog.to_regprocedure(
      'public.record_stock_movement(uuid,uuid,text,numeric,uuid,uuid,text)'
    ) IS NULL
    AND pg_catalog.to_regprocedure(
      'public.record_stock_movement(uuid,uuid,text,numeric,uuid,uuid,text,text,uuid)'
    ) IS NULL AS migration_017_contract_ok,
    NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'locations'
        AND column_name = 'max_capacity_units'
    ) AS migration_018_not_applied,
    (
      SELECT pg_catalog.count(*) FROM public.locations
      WHERE code NOT IN (
        'QA-P0-A-LOC-01', 'QA-P0-A-LOC-02', 'QA-P0-B-LOC-01'
      )
    ) AS unexpected_locations,
    NOT EXISTS (
      SELECT 1 FROM public.inventory_balances AS b
      WHERE b.quantity_available::text IN ('NaN', 'Infinity', '-Infinity')
         OR b.quantity_available <> pg_catalog.trunc(b.quantity_available)
    ) AS all_balances_whole_pcs,
    NOT EXISTS (
      SELECT 1 FROM public.products AS p
      WHERE p.unit IS DISTINCT FROM 'pcs'
    ) AS all_products_unit_pcs
)
SELECT f.code, f.locations_found, f.expected_company_matches,
       f.occupied_units, f.expected_occupied,
       f.locations_found = 1
         AND f.expected_company_matches = 1
         AND f.occupied_units = f.expected_occupied AS fixture_pass,
       g.migration_017_contract_ok, g.migration_018_not_applied,
       g.unexpected_locations, g.all_balances_whole_pcs,
       g.all_products_unit_pcs
FROM fixture AS f CROSS JOIN global_checks AS g
ORDER BY f.code;
```

Expected: exactly three rows, each with `fixture_pass = true`, occupied units
`7`, `15`, `0` in code order, all global booleans `true`, and
`unexpected_locations = 0`. The all-products check is intentionally stricter
than migration 018's positive-stock product-unit check.

## Postflight SQL: fixtures

```sql
WITH expected(code, company_id, expected_occupied) AS (
  VALUES
    ('QA-P0-A-LOC-01', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid, 7::numeric),
    ('QA-P0-A-LOC-02', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid, 15::numeric),
    ('QA-P0-B-LOC-01', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'::uuid, 0::numeric)
)
SELECT e.code,
       pg_catalog.count(DISTINCT l.id) AS locations_found,
       pg_catalog.count(DISTINCT l.id) FILTER (
         WHERE l.company_id = e.company_id
       ) AS expected_company_matches,
       pg_catalog.max(l.max_capacity_units) AS max_capacity_units,
       COALESCE(pg_catalog.sum(b.quantity_available), 0) AS occupied_units,
       pg_catalog.count(DISTINCT l.id) = 1
         AND pg_catalog.count(DISTINCT l.id) FILTER (
           WHERE l.company_id = e.company_id
         ) = 1
         AND pg_catalog.max(l.max_capacity_units) = 20
         AND COALESCE(pg_catalog.sum(b.quantity_available), 0)
             = e.expected_occupied AS pass
FROM expected AS e
LEFT JOIN public.locations AS l ON l.code = e.code
LEFT JOIN public.inventory_balances AS b
  ON b.location_id = l.id AND b.company_id = l.company_id
GROUP BY e.code, e.company_id, e.expected_occupied
ORDER BY e.code;
```

Expected: exactly three rows, each with `max_capacity_units = 20` and
`pass = true`. Run before UI tests, which will change occupancy.

## Postflight SQL: schema and RPC security

```sql
WITH rpc AS (
  SELECT p.* FROM pg_catalog.pg_proc AS p
  WHERE p.oid = pg_catalog.to_regprocedure(
    'public.record_stock_movement(uuid,text,numeric,uuid,uuid,text,text,uuid)'
  )
)
SELECT
  EXISTS (
    SELECT 1 FROM pg_catalog.pg_attribute AS a
    WHERE a.attrelid = 'public.locations'::regclass
      AND a.attname = 'max_capacity_units'
      AND a.attnotnull AND NOT a.attisdropped
  ) AS capacity_not_null,
  EXISTS (
    SELECT 1 FROM pg_catalog.pg_constraint AS c
    WHERE c.conrelid = 'public.locations'::regclass
      AND c.conname = 'chk_locations_max_capacity_units'
      AND c.contype = 'c' AND c.convalidated
      AND pg_catalog.pg_get_constraintdef(c.oid)
          LIKE '%max_capacity_units > 0%'
  ) AS positive_capacity_check,
  EXISTS (
    SELECT 1 FROM rpc AS p
    WHERE p.prosecdef AND p.pronargs = 8
      AND EXISTS (
        SELECT 1 FROM pg_catalog.unnest(p.proconfig) AS cfg(setting)
        WHERE pg_catalog.left(
          cfg.setting, pg_catalog.length('search_path=')
        ) = 'search_path='
          AND pg_catalog.substr(
            cfg.setting, pg_catalog.length('search_path=') + 1
          ) IN ('', '""')
      )
  ) AS secure_rpc_signature,
  EXISTS (
    SELECT 1 FROM rpc AS p
    WHERE pg_catalog.has_function_privilege(
            'authenticated', p.oid, 'EXECUTE')
      AND NOT pg_catalog.has_function_privilege(
            'anon', p.oid, 'EXECUTE')
      AND NOT pg_catalog.has_function_privilege(
            'service_role', p.oid, 'EXECUTE')
      AND NOT EXISTS (
        SELECT 1 FROM pg_catalog.aclexplode(p.proacl) AS acl
        WHERE acl.grantee = 0 AND acl.privilege_type = 'EXECUTE'
      )
  ) AS execute_only_authenticated,
  (
    SELECT pg_catalog.count(*) = 1
    FROM pg_catalog.pg_proc AS p
    JOIN pg_catalog.pg_namespace AS n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'record_stock_movement'
  ) AS no_other_public_rpc_overload;
```

Expected: every column is `true`. A failed postflight is not a pass; stop QA
movement tests and review the SQL Editor error/result before any retry.
