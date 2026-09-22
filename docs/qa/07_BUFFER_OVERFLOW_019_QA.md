# QA 019 — системен буфер и лично администраторско одобрение

Само за изолирания QA Supabase проект. Този документ съдържа заявки за ръчно изпълнение; подготовката му не прилага SQL. Първо потвърдете идентичността на QA проекта извън тази заявка. Не изпълнявайте в Production. Migration 017 и 018 трябва вече да са приложени в този ред. Запазете резултатите от preflight, целия резултат от прилагането на `019_buffer_overflow_approval.sql` и postflight.

## Preflight — само SELECT в QA SQL Editor

Всички редове трябва да имат `ready = true`. При друг резултат спрете и установете причината, преди да копирате 019 в нова заявка.

```sql
-- Migration 019 uses code BUFFER deliberately: locations has UNIQUE
-- (warehouse_id, code), so the same code is valid in different warehouses.
-- The migration also rejects any pre-existing BUFFER code before backfill,
-- while uq_one_buffer_per_warehouse enforces one is_buffer row per warehouse.
WITH checks AS (
  SELECT '017/018: exactly one public movement RPC' AS check_name,
    to_regprocedure('public.record_stock_movement(uuid,text,numeric,uuid,uuid,text,text,uuid)') IS NOT NULL
    AND (SELECT count(*) = 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
         WHERE n.nspname = 'public' AND p.proname = 'record_stock_movement')
    AND (SELECT p.pronargs = 8 FROM pg_proc p
         WHERE p.oid = to_regprocedure('public.record_stock_movement(uuid,text,numeric,uuid,uuid,text,text,uuid)')) AS ready
  UNION ALL
  SELECT '018: capacity column and positive NOT NULL',
    EXISTS (SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'locations'
        AND column_name = 'max_capacity_units' AND is_nullable = 'NO')
    AND EXISTS (SELECT 1 FROM pg_constraint c
      WHERE c.conrelid = 'public.locations'::regclass
        AND c.conname = 'chk_locations_max_capacity_units')
  UNION ALL
  SELECT '018: internal hardened and uncapped functions',
    to_regprocedure('public.record_stock_movement_uncapped(uuid,text,numeric,uuid,uuid,text,text,uuid)') IS NOT NULL
    AND to_regprocedure('public.record_stock_movement(uuid,text,numeric,uuid,uuid,text,text,uuid)') IS NOT NULL
  UNION ALL
  SELECT '018: expected QA permanent locations',
    (SELECT count(*) = 3 FROM public.locations l
      WHERE (l.code, l.company_id) IN (
        ('QA-P0-A-LOC-01', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid),
        ('QA-P0-A-LOC-02', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid),
        ('QA-P0-B-LOC-01', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'::uuid))
      AND l.max_capacity_units = 20 AND l.status = 'active')
  UNION ALL
  SELECT '019: no reserved BUFFER code already in use',
    NOT EXISTS (SELECT 1 FROM public.locations WHERE code = 'BUFFER')
  UNION ALL
  SELECT '019: no partially applied schema',
    to_regclass('public.overflow_requests') IS NULL
    AND NOT EXISTS (SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'locations' AND column_name = 'is_buffer')
  UNION ALL
  SELECT 'pcs and whole nonnegative inventory',
    NOT EXISTS (SELECT 1 FROM public.inventory_balances b
      JOIN public.products p ON p.id = b.product_id
      WHERE p.unit <> 'pcs' OR b.quantity_available <> trunc(b.quantity_available)
         OR b.quantity_available < 0)
  UNION ALL
  SELECT 'no existing location over capacity',
    NOT EXISTS (SELECT 1 FROM public.locations l
      LEFT JOIN public.inventory_balances b ON b.location_id = l.id
      GROUP BY l.id, l.max_capacity_units
      HAVING coalesce(sum(b.quantity_available), 0) > l.max_capacity_units)
), output AS (
  SELECT check_name, ready,
    CASE WHEN bool_and(ready) OVER () THEN 'PASS' ELSE 'FAIL' END AS overall_status,
    0 AS sort_order
  FROM checks
  UNION ALL
  SELECT 'OVERALL', bool_and(ready),
    CASE WHEN bool_and(ready) THEN 'PASS' ELSE 'FAIL' END,
    1
  FROM checks
)
SELECT check_name, ready, overall_status
FROM output
ORDER BY sort_order, check_name;
```

Тази проверка доказва схема и данни, но сама не доказва, че SQL Editor е отворен в QA проекта. Потвърдете проекта и направете snapshot на текущите warehouse/location/balance данни преди прилагане. Ако миграция 018 още не е приложена, изпълнете нейния отделен preflight и инструкция; не пропускайте реда.

## Прилагане — само след успешен preflight

В QA Supabase SQL Editor отворете **нова** заявка, копирайте **целия** локален файл `StockFlow_Project_OS/supabase/migrations/019_buffer_overflow_approval.sql` от `BEGIN;` до `COMMIT;` и изпълнете веднъж. Не смесвайте с preflight/postflight заявките и не изпълнявайте в Production. При грешка транзакцията трябва да се върне цяла; спрете и запазете точния error. После отворете нова заявка за postflight.

## Postflight — само SELECT в QA SQL Editor

Всички редове трябва да имат `pass = true`. `security_definer/search_path` се проверява чрез `unnest(proconfig)`, защото PostgreSQL може да представи празния път като `search_path=""`.

```sql
WITH fn AS (
  SELECT p.oid, p.proname, p.prosecdef,
    EXISTS (SELECT 1 FROM unnest(p.proconfig) AS cfg(setting)
      WHERE cfg.setting LIKE 'search_path=%'
        AND replace(split_part(cfg.setting, '=', 2), '"', '') = '') AS empty_path
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname IN (
    'record_stock_movement', 'record_stock_movement_capacity_base',
    'record_stock_movement_uncapped', 'create_overflow_request',
    'reserve_overflow_auth_attempt', 'mint_overflow_review_ticket',
    'review_overflow_request', 'guard_buffer_location',
    'create_warehouse_buffer')
), checks AS (
  SELECT 'one buffer per warehouse, active and capacity 100' AS check_name,
    NOT EXISTS (SELECT 1 FROM public.warehouses w
      LEFT JOIN public.locations l ON l.warehouse_id = w.id AND l.is_buffer
      GROUP BY w.id HAVING count(l.id) <> 1)
    AND NOT EXISTS (SELECT 1 FROM public.locations l WHERE l.is_buffer
      AND (l.code <> 'BUFFER' OR l.status <> 'active'
        OR l.max_capacity_units <> 100)) AS pass
  UNION ALL
  SELECT 'no buffer over capacity',
    NOT EXISTS (SELECT 1 FROM public.locations l
      LEFT JOIN public.inventory_balances b ON b.location_id = l.id
      WHERE l.is_buffer GROUP BY l.id
      HAVING coalesce(sum(b.quantity_available), 0) > 100)
  UNION ALL
  SELECT 'buffer unique index and guard/create triggers',
    to_regclass('public.uq_one_buffer_per_warehouse') IS NOT NULL
    AND EXISTS (SELECT 1 FROM pg_trigger
      WHERE tgrelid = 'public.locations'::regclass
        AND tgname = 'trg_guard_buffer_location' AND NOT tgisinternal)
    AND EXISTS (SELECT 1 FROM pg_trigger
      WHERE tgrelid = 'public.warehouses'::regclass
        AND tgname = 'trg_create_warehouse_buffer' AND NOT tgisinternal)
  UNION ALL
  SELECT 'all nine functions: SECURITY DEFINER, empty search_path',
    (SELECT count(*) = 9 FROM fn WHERE prosecdef AND empty_path)
    AND (SELECT count(*) = 9 FROM fn)
  UNION ALL
  SELECT 'public movement only authenticated',
    has_function_privilege('authenticated',
      'public.record_stock_movement(uuid,text,numeric,uuid,uuid,text,text,uuid)', 'EXECUTE')
    AND NOT has_function_privilege('anon',
      'public.record_stock_movement(uuid,text,numeric,uuid,uuid,text,text,uuid)', 'EXECUTE')
    AND NOT has_function_privilege('service_role',
      'public.record_stock_movement(uuid,text,numeric,uuid,uuid,text,text,uuid)', 'EXECUTE')
  UNION ALL
  SELECT 'internal movement functions unavailable to API roles',
    NOT has_function_privilege('authenticated',
      'public.record_stock_movement_capacity_base(uuid,text,numeric,uuid,uuid,text,text,uuid)', 'EXECUTE')
    AND NOT has_function_privilege('authenticated',
      'public.record_stock_movement_uncapped(uuid,text,numeric,uuid,uuid,text,text,uuid)', 'EXECUTE')
  UNION ALL
  SELECT 'review authenticated; ticket mint service_role only',
    has_function_privilege('authenticated',
      'public.review_overflow_request(uuid,text,text,text)', 'EXECUTE')
    AND NOT has_function_privilege('anon',
      'public.review_overflow_request(uuid,text,text,text)', 'EXECUTE')
    AND has_function_privilege('service_role',
      'public.mint_overflow_review_ticket(uuid,uuid,uuid,text)', 'EXECUTE')
    AND NOT has_function_privilege('authenticated',
      'public.mint_overflow_review_ticket(uuid,uuid,uuid,text)', 'EXECUTE')
  UNION ALL
  SELECT 'overflow tables have RLS',
    (SELECT count(*) = 3 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname IN
        ('overflow_requests', 'overflow_review_tickets', 'overflow_approval_audit')
        AND c.relrowsecurity)
)
SELECT check_name, pass FROM checks ORDER BY check_name;
```

Резултат `true` за структурата не е функционален PASS. Изпълнете долните сценарии с предварително записани баланси, брой движения, статуси на доставка и audit, после сравнете същите стойности. Всеки сценарий започва от собствено контролирано QA състояние; не използвайте Production данни.

## UI и security сценарии

| ID | Подготовка и действие | Очакван резултат |
|---|---|---|
| 01 | Създайте нов склад; отворете локациите. | Точно един системен `BUFFER` с 100 pcs; UI показва заетост и няма edit/archive. Повторно създаване или промяна/изтриване през нормалния API отказва. |
| 02 | Постоянна локация 20/20, буфер 0/100; заявете ръчен IN 100 и одобрете с admin. | 0 постоянна, 100 буфер; request approved, едно движение, точен audit. |
| 03 | При буфер 100/100 заявете още 1 и опитайте approval. | Ясен отказ; нула нови движения/баланси/доставка; заявката остава pending до отказ/изтичане. |
| 04 | Постоянна локация 15/20, буфер 0/100; доставка за 25 pcs, заявка за нейния item. | След approval: 5 постоянна, 20 буфер, общо 25; item +25, delivery статус обновен, две движения с reference incoming_delivery, един audit. |
| 05 | Създайте заявка като оператор; опитайте без admin данни, с грешна парола и с admin от друга компания. Опитайте и през няколко различни заявки на същия оператор. | Няма движение, статус pending, операторската сесия остава същата. След 5 опита за една заявка или 10 общо за оператор в 15 минути следва отказ. |
| 06 | Същият оператор въвежда лично валидни данни на активен admin от същата компания в модала. | Approval/rejection само за тази заявка, краткосрочен еднократен ticket, audit съдържа operator/admin; след затваряне операторската сесия е непроменена. |
| 07 | Буферът съдържа 1 pcs; пробвайте обикновен ръчен IN и приемане на доставка към постоянна локация в същия склад. | `BUFFER_DRAIN_FIRST`, разбираемо BG съобщение; никакво движение или промяна на доставка. В друг склад без зает буфер IN е допустим. |
| 08 | TRANSFER от буфер към постоянна локация с достатъчно място, после опитайте над свободния капацитет. | Първият мести точно количество и освобождава буфера; вторият отказва атомарно. OUT от буфер остава възможен. |
| 09 | Две паралелни одобрения към един буфер с общ остатък по-малък от сбора на заявките. | Само първата валидна транзакция успява; другата отказва без частични движения. Буферът никога не надхвърля 100. |
| 10 | Viewer, неактивен профил, липсващ профил, cross-company product/location/delivery/admin. | Няма създаване или одобрение; няма четене на чужди заявки/audit; балансите и статусите не се променят. |
| 11 | Между заявка и approval променете оставащото количество/статуса на доставката или запълнете буфера. | Approval отказва цялата транзакция; няма частично движение, item update, request approved или audit approved. |
| 12 | Одобрете `rejected` с причина; опитайте повторно approval със същия ticket или след изтичане на срока. | Отказът записва audit без движение; повторно/изтекло потвърждение е блокирано. |
| 13 | Опитайте OUT по поръчка и TRANSFER между обикновени локации след 019. | Старите правила за наличност, tenant и капацитет продължават да работят. |
| 14 | Постоянната цел съдържа друг продукт и има свободно място; опитайте да одобрите заявка по доставка. | Цялото одобрение отказва, без смесване на продукти в постоянната локация и без частична промяна. |

При провал запишете ID на сценария, час, tenant, входни количества, видима грешка и read-only snapshot преди/след; не записвайте пароли, токени или ключове.

## QA checkpoint — 18.09.2026

### Статус до края на деня

Завършени и проверени в QA според отчета от тестовете:

- Migration 017 — защитен RPC за движенията.
- Migration 018 — капацитет на постоянните локации 20 pcs.
- Migration 019 — буферна локация `BUFFER` с капацитет 100 pcs.
- Migration 020 — български забележки за одобрени извънредни приемания.
- Всички preflight и postflight проверки за 018 и 019 са PASS.
- Проверен е обикновен IN до максималния капацитет.
- Проверен е отказ при надвишаване на капацитета.
- Проверено е администраторско одобрение с имейл и парола без прекъсване на операторската сесия.
- Проверено е извънредно приемане към `BUFFER`.
- Проверено е правилото при зает буфер: новото количество отива първо в `BUFFER`.
- Проверено е движение от `BUFFER` към постоянна локация.
- Проверени са българската забележка и връзката към извънредната заявка.

### Текущо QA състояние

- `BUFFER`: 5/100 pcs.
- `QA-P0-A-LOC-02`: 20/20 pcs.
- `QA-P0-A-LOC-01`: 20/20 pcs.
- QA базата е използвана за тестове.
- Production не е променян.
- Migration 020 не трябва да се прилага повторно.
- Няма извършен Production deploy.

### Оставащи QA тестове

1. Отказ от администраторска заявка — без движение и без промяна в наличностите.
2. Неуспешно администраторско одобрение — грешна парола, невалиден ticket или недостатъчен капацитет; очаква се пълен rollback.
3. Обикновено приемане на доставка при свободно и при запълнено място.
4. Изписване OUT — намаляване на наличността и освобождаване на капацитет.
5. Изписване по изходяща поръчка — намаляване на наличността и reference към поръчката.
6. Проверка на права — viewer и оператор без административно право не могат да одобряват извънредно приемане.
7. Финална проверка на движения, наличности, audit записи и забележки.
8. Финален QA sign-off.
9. Едва след QA sign-off — подготовка за deploy.

## NEXT SESSION START HERE

Продължи от тест 1: отказ от администраторска заявка. Не повтаряй вече завършените тестове и не променяй QA базата извън необходимото за текущия тест.
