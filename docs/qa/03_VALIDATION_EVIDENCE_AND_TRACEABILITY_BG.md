# StockFlow — полета, състояния, SQL сверки и доказателства

Версия 1.0 · 2026-09-15 · Само план. Нито един SQL пример в този файл не е изпълнен. Статусът на VAL проверките е NOT_RUN.

Прилагат се [основният план](00_QA_MASTER_PLAN_BG.md), [складовите сценарии](01_WAREHOUSE_LOCATION_TESTS_BG.md) и [каталогът на приложението](02_APPLICATION_TEST_CATALOG_BG.md). Този документ превръща общите сценарии в проверка на конкретни полета, интерфейси и доказуеми равенства.

## 1. Универсална матрица на входните граници

Всеки VAL ред се параметризира по **всяко приложимо поле от раздел2**, create/update и UI/direct action. Ако поле е достъпно и през RPC/Data API, включи и този път според правата. Отделният run ID е например `VAL-006/products.min_quantity/create/direct/A-OP`.

Валидните граници не се измислят от тестера: първо се извличат от UI, runtime validator, SQL и бизнес решение. Несъответствие между слоевете е finding. Ако липсва максимална дължина/точност/числова граница, отбележи SPEC_GAP и предложи граница; не маркирай произволно избрания максимум като одобрен.

| ID | Приоритет | Категория и стойности | Критерий |
|---|---|---|---|
| VAL-001 | P1 | Задължително поле: липсващ key, undefined, null, empty string, whitespace | Ясен отказ преди бизнес mutation; не default към неправилен продукт/фирма |
| VAL-002 | P2 | Nullable поле: липсва/null/empty/whitespace | Единна договорена нормализация; няма случайно изтриване при partial update |
| VAL-003 | P1 | String вместо number и обратно; bool, array, object | Runtime проверка; няма доверие само на TS types или implicit coercion |
| VAL-004 | P2 | Текст:1 символ, лимит−1, лимит, лимит+1; много дълъг payload | Граници в UI/server; без silent truncation, overflow или ресурсна атака |
| VAL-005 | P2 | Кирилица/латиница/emoji/combining chars/non-breaking spaces | Коректен round-trip; normalisation/length дефинирани; без замяна на символи |
| VAL-006 | P1 | Число:−1,−0,0,най-малка положителна единица | Positive/nonnegative правила според полето; −0 не заобикаля ограничения |
| VAL-007 | P1 | NaN, Infinity,−Infinity и текстовите им форми | Крайна стойност required; транспортът може да reject — това се записва, не се прескача server boundary |
| VAL-008 | P1 | Много големи числа, >safe integer, exponent, overflow | Без загуба на точност/неограничен numeric scale; controlled refusal |
| VAL-009 | P1 | Decimal digits0/1/2/3/6/7; max permitted precision±1 | Точност по unit/amount; rounding не увеличава stock или payment неусетно |
| VAL-010 | P1 | `1,25`, `1.25`, `1 000`, `1e3`, tabs, mixed separators | Locale parsing е съгласувано; не превръща1,25 в1/125/NaN без ясно съобщение |
| VAL-011 | P1 | UUID валиден/несъществуващ/грешен формат/празен | Not-found/validation, no zero-row success |
| VAL-012 | P0 | Валиден UUID от друга фирма/parent/document | Съществуването не дава право; отказ и нула чужди данни/ефект |
| VAL-013 | P1 | FK към inactive/archived entity | D14/active-state правила се спазват server-side |
| VAL-014 | P1 | Enum всяка валидна стойност, unknown, case variant, null | Allowlist; не прескача lifecycle със status от клиента |
| VAL-015 | P1 | Date: leap day, invalid day/month, missing, timestamp вместо date | Строг договорен формат; не silent rollover на невалидна дата |
| VAL-016 | P2 | Date order: due<invoice, expected<order, future payment | D12/D15 задават ограниченията; UI и server съвпадат |
| VAL-017 | P1 | Arrays:0/1/max/max+1, null вместо array, null element | Bounded inputs и структурна валидация; не false success при празна операция |
| VAL-018 | P1 | Duplicate IDs/objects/placements, разменен ред | Reject/normalize по спецификация; няма двойно количество или index drift |
| VAL-019 | P0 | Extra properties: id,company_id,status,role,user_id,totals,received/issued | Input allowlist; неочакваните полета не достигат UPDATE/INSERT |
| VAL-020 | P1 | SQL-like strings, HTML/script, formula prefixes и CR/LF | Съдържанието остава данни; съответните output encoders/CSV tests работят |
| VAL-021 | P1 | Unique поле: същият запис, друг запис, друг tenant, case/trim/null | Съгласувана uniqueness; no self-collision; foreign tenant не се разкрива |
| VAL-022 | P1 | Update с частичен/стар payload и concurrent update | Не нулира непосочени полета; конфликтът е видим, не silent lost update |
| VAL-023 | P1 | Сума на children срещу parent amount/qty | Авторитетен сбор, не доверие на client totals; точни граници ±unit/EPS |
| VAL-024 | P1 | JSON payload много голям/дълбок/неочаквано структуриран | Контролиран лимит/отказ без business effect или unhandled crash |
| VAL-025 | P1 | Server/DB отказ при всяка валидираща заявка | Error е различен от empty/not-found; никакво небезопасно продължаване |
| VAL-026 | P1 | Един и същ валиден payload повторен след timeout | Idempotency/replay policy различава retry от нова валидна операция |

## 2. Инвентар на бизнес полетата

Всяко изброено поле се изпълнява отделно, дори когато е групирано в един ред на таблицата. `Системни` означава read-only за caller payload; не означава неизменяемо за SQL owner. За полета без server validator се записва конкретният пробив/липса, не се приема, че HTML input е достатъчен.

| Обект / input | Полета | Проверки извън универсалните VAL |
|---|---|---|
| ProductInput | name | Trim, nonempty, съвпадение в dropdowns/scan/history, еднакви имена с различни IDs |
| ProductInput | sku | Nullable, company uniqueness, self-edit, archive/restore collision, leading zeros |
| ProductInput | barcode | String без numeric conversion, whitespace, exact match, partial-index semantics |
| ProductInput | category | Empty/null, Unicode, filter grouping, rename и празни категории |
| ProductInput | unit | Всички поддържани единици от формата, неизвестна стойност, промяна при stock/история |
| ProductInput | min_quantity | Nonnegative/finite според решение,0=без минимум ако така е договорено; per-product срещу per-location |
| ProductInput | cost_price | NULL срещу0; nonnegative; precision; valuation при наличност и промяна |
| ProductInput | sale_price | NULL срещу0; precision; import в invoice и historical pricing |
| WarehouseInput | name, address | Nonempty name; nullable address; same-name warehouses различими; дълъг адрес |
| LocationInput | warehouse_id | Съществува, same company, active; edit със stock и pending docs |
| LocationInput | code | Nonempty, UNIQUE(warehouse,code); case/trim; дълги/подобни кодове; A-01 в два склада |
| LocationInput | zone, row, shelf, bin | Nullable текстови адресни части; leading zeros, barcode label/visual address consistency |
| SupplierInput | name | Required, trim, duplicate policy, rename/history |
| SupplierInput | phone | String, +prefix, spaces, leading zeros, extension; не numeric количество |
| SupplierInput | email | Blank/null, валиден/невалиден формат, length; без обещана доставка на email |
| SupplierInput | address, note | Multiline, long Unicode, display/export encoding |
| CustomerInput | name | Required, company uniqueness, quick-create matches, rename/snapshot |
| CustomerInput | phone, email | Същите полеви проверки като supplier, без реални лични данни |
| CustomerInput | address | Печат, дължина, newlines, исторически snapshot D16 |
| CustomerInput | eik, vat_number | String, leading zeros/prefixes, blank/null; jurisdiction validation е отделно изискване |
| CustomerInput | mol | Unicode име, null, print wrapping и snapshot |
| CustomerInput | note | Free text, no executable output, export/print rules |
| MovementInput | movement_type | IN/OUT/TRANSFER; nullable/unknown; location shape |
| MovementInput | product_id | Active и same company; не се заменя с произволно име |
| MovementInput | from_location_id, to_location_id | Required според type, distinct при transfer, company/active/occupancy/capacity |
| MovementInput | quantity | >0, finite, unit precision, source availability, exact-zero boundary |
| MovementInput | note | Не задейства действия; запазва multiline/Unicode |
| MovementActionInput | supplier_id | Required IN, relation same company, active state; не наследен при type switch |
| MovementActionInput | customer_id | Required OUT; нормален UUID или изричен NEW sentinel |
| MovementActionInput | new_customer_name | Required само при NEW; trim; duplicate/concurrent creation |
| MovementInput/RPC | reference_type, reference_id | Server-authoritative mapping; nullable двойка; allowed relation, same company; липсващ parent |
| DeliveryInput | supplier_id, delivery_number | Valid party; nonempty number; uniqueness и self-edit |
| DeliveryInput | status | Create/update allowlist draft/expected; не received/cancelled от payload |
| DeliveryInput | expected_date, note | Nullable date/text; dates и traceability |
| DeliveryInput | items[] | Empty draft policy, размер, malformed/duplicate entries, transactionality |
| DeliveryItemInput | product_id, expected_quantity, location_id | >0; nullable planned location; active/same-company; same product repeated rows |
| ReceiveDeliveryInput | delivery_id, items[] | Correct active lifecycle, not empty business work, correct parent/tenant |
| ReceiveItemInput | item_id, product_id | Membership към delivery; DB product authoritative; duplicate item_id |
| ReceiveItemInput | quantity_to_receive | >0 за обработван ред; ≤remaining; precision/EPS; cumulative duplicate bound |
| ReceiveItemInput | placements[] | Поне1 за положително qty; max size; exact sum; order changes |
| PlacementInput | location_id, quantity | Active same-company location; >0; finite; no-mixed/capacity и duplicate location |
| OrderInput | order_number | Required/unique company; trim; concurrent create |
| OrderInput | customer_id, customer_name | Нов задължителен customer срещу legacy null; server snapshot consistency |
| OrderInput | status | Draft/open allowlist; no arbitrary fulfilled/cancelled through update |
| OrderInput | order_date, expected_date, note | Date validity/order, nullable semantics, multiline |
| Order item actions | orderId, productId, itemId, quantity | Parent membership, unique(order,product), >0; locked lifecycle |
| IssueOrderInput | order_id, items[] | Correct order/tenant; всички remaining items accounted for |
| IssueItem | item_id, product_id, from_location_id | Client quantity не определя issue; една локация с достатъчно stock или D06 gap |
| InvoiceInput | invoice_number | Nonempty/unique; leading zeros като string; numbering policy explicit |
| InvoiceInput | customer_id, outgoing_order_id | Customer required; order nullable; same-company/customer-consistency |
| InvoiceInput | invoice_date, due_date | Required date/default срещу explicit null; due relationship по D15 |
| InvoiceInput | vat_rate | Finite0..100; decimal rate; header edit triggers correct recalc |
| InvoiceInput | note | Long Unicode/multiline, print encoding |
| InvoiceItemInput | product_id | Nullable за manual description; foreign product отказ |
| InvoiceItemInput | description | Required trim; print pagination; no silent truncation |
| InvoiceItemInput | quantity, unit_price | qty>0, price≥0 по D15, finite, decimal oracle |
| PaymentInput | amount | >0 след определено rounding, finite, ≤due при забранен overpayment |
| PaymentInput | payment_date | Valid date; future/backdate политика; no timezone shift |
| PaymentInput | payment_method | bank_transfer/cash/card/other само |
| PaymentInput | note | Nullable text, audit/correction reasons според D15 |
| askAssistant | messages[].role, messages[].content | Allowlist user/assistant, bounded string content, последен nonempty user, общ token/payload budget |
| AI get_products/get_customers | search; customers.status | Bounded string, wildcard escaping/semantics, active/inactive allowlist |
| AI get_inventory | product_name, warehouse_name | Правилен server-side/search обхват; search след LIMIT не трябва да губи резултати |
| AI get_movements | product_name, movement_type, limit | Valid type; limit integer в разрешения диапазон, negative/NaN/huge отказ |
| AI get_deliveries | status, supplier_name | Draft/expected/partial/received/cancelled semantics; невъзможна стойност е отказ |
| AI get_orders | status, customer_name | Valid states, filter пълнота и tenant scope |
| AI get_invoices | status, payment_status, customer_name | Две различни оси на статус; съвместно филтриране |
| AI get_invoice_detail | invoice_number | Required exact string; duplicate/чужд номер не връща друга invoice |
| AI get_low_stock/get_stock_value | Няма бизнес параметри | Extra properties не променят scope; пълен aggregation и error handling |
| Системни master fields | id, company_id, status, created_at, updated_at | Не се mass-assign през input; timestamps не се подменят от caller |
| Системни stock/document fields | received_quantity, issued_quantity, received_date, issued_date, user_id | Изчисляват/попълват се само от доверен business flow |
| Системни invoice fields | amount, subtotal, vat_amount, total, amount_paid, payment_status | Независимо server/DB изчисление; extra client totals се отхвърлят/игнорират безопасно |
| Системни profiles/companies | role, status, company_id; company name/plan/status | Effective DB/API права; липсващ admin UI не премахва security теста |
| Бъдещ capacity input | capacity/max_quantity, capacity unit, allow_mixed_products | GAP до решение/реализация;0/null/unlimited не са едно и също |
| Бъдещ allocation input | primary/overflow assignment, suggestion priority, override reason | GAP; права, историчност, active/tenant consistency |

## 3. Матрици на състоянията

Таблиците определят QA очаквания/отворени решения, не твърдят че текущият server ги прилага. „Четене“ означава разрешен authenticated user в своя tenant. Всяко write се проверява с admin/operator, viewer, anon и чужд tenant независимо от business status.

### 3.1 Доставка

| Текущ статус | Edit header/items | Receive | Cancel | Допълнителен invariant |
|---|---|---|---|---|
| draft | Позволено по права | D12: реши дали първо expected | Позволено без stock effect | Create/edit не приема стока |
| expected | Позволено преди receipt по D12 | Да, ≤remaining | Да без receipt | Всички редове/placements валидни преди ефект |
| partially_received | Само изрично разрешени промени, никога reset received | Да, ≤remaining | D12; вече приетото не се заличава | Received и movements запазени |
| received | Заключени qty/rows; корекция отделен процес | Не | Не чрез прост status flip без определен процес | Retry не генерира IN |
| cancelled | Не re-open чрез generic update | Не | Idempotent/no-op или ясен отказ | Историята не изчезва |
| unknown/corrupt | Integrity error | Не | Не автоматично | Няма silent нормализиране, прикриващо повреда |

### 3.2 Поръчка

| Текущ статус | Edit header/items | Issue | Cancel | Допълнителен invariant |
|---|---|---|---|---|
| draft | Да по права | Не | Да | No OUT при create/edit |
| open | По D12 с concurrency guard | Да, authoritative remaining | Да само съгласувано с issue | Full-order моделът е реално all-or-nothing |
| fulfilled | Не | Не/replay result | Не чрез прост update | Issued qty=committed order OUT |
| cancelled | Не | Не | Safe repeat | Не re-open чрез generic update |
| unknown/corrupt | Integrity error | Не | Не автоматично | Negative remaining не се третира като успешно изпълнение |

### 3.3 Фактура и плащане

| Invoice status | Header/item edit | Import | Issue | Cancel | Payment add/delete |
|---|---|---|---|---|---|
| draft | Да по права | Само празна с валиден order | Само след valid rows/totals | Да | Не |
| issued | Не за заключеното съдържание | Не | Safe repeat/отказ | Не чрез текущия draft-only flow | Да по D15 и manage_invoices |
| cancelled | Не | Не | Не | Safe repeat/отказ | Не |
| unknown/corrupt | Не | Не | Не | Не автоматично | Не |

За положителен invoice total: paid0→unpaid; 0<paid<total→partially_paid; paid=total→paid; paid>total→грешка при текущото правило. Zero total е D15. Payment status не е invoice status: issued може да бъде unpaid/partial/paid. При всяко remove/delete се проверява новият статус от останалите редове.

### 3.4 Локация и активност

| Състояние | Read/history | Нов IN/receive/TRANSFER към нея | OUT/TRANSFER от нея | Archive |
|---|---|---|---|---|
| Active, празна | Да | Ако compatible/capacity по договорения модел | Няма положителен stock за OUT | Да при безопасен lifecycle |
| Active, същият продукт>0 | Да | Ако има допустим capacity | До available | Не докато има stock |
| Active, друг продукт>0 | Да | No-mixed отказ; mixed според D04 | Само за наличния продукт | Не |
| Active child/inactive warehouse | Да за историята | D14/контролиран отказ | Дефинирана recovery политика | Не прикрива stock |
| Inactive,0 | Да | Не | Няма stock | Safe повторение |
| Inactive,>0 | Да, видим integrity exception | Не без определен recovery | D14; да не е невъзможно да се възстанови правилното състояние | Не скрива проблема |

## 4. Инвентар на server действията и свързано покритие

Базата за сравнение са `export async function` в actions файловете и `'use server'` helpers. Инвентарът включва и вътрешни helpers като отделни security/logic boundaries; export в обикновен модул не се нарича автоматично публичен HTTP endpoint.

| Файл / boundary | Действия — всяко отделно | Основни тестове |
|---|---|---|
| `app/(auth)/actions.ts` | logout | SEC-023–025, UI-016 |
| `app/(auth)/login/page.tsx` | browser signInWithPassword, form/errors | SEC-001–005, SEC-034, UI |
| `lib/current-user.ts` | getCurrentRole, requirePermission | SEC-003–009, SEC-029/032 |
| `products/actions.ts` | createProduct, updateProduct, archiveProduct, restoreProduct | MST-001–008, SEC-019/020, VAL |
| `warehouses/actions.ts` | createWarehouse, updateWarehouse, archiveWarehouse, restoreWarehouse | MST-009–011, WH-031–033, CON-010, VAL |
| `locations/actions.ts` | createLocation, updateLocation, archiveLocation, restoreLocation | MST-012–015, WH-024–033/040/041, CON-009/026, VAL |
| `suppliers/actions.ts` | createSupplier, updateSupplier, deactivateSupplier, restoreSupplier | MST-016–018/024, VAL |
| `customers/actions.ts` | createCustomer, updateCustomer, deactivateCustomer, restoreCustomer | MST-019–024, INV-023, VAL |
| `movements/actions.ts` | findProductForMovement, submitMovement | MOV-001–010, BAR-006–009, WH, CON, SEC |
| `lib/barcode-utils.ts` | findProductByBarcode, lookupByBarcode | BAR-001–012, SEC-026, WH-047 |
| `lib/movement-engine.ts` | recordMovement | WH-002–016/036–038/048, CON-001/002/011, DB-015 |
| SQL002/004 | record_stock_movement двете сигнатури | SEC-013–018, DB-006/007/010/015/016 |
| `deliveries/actions.ts` | findProductForDelivery | BAR, SEC-026 |
| `deliveries/actions.ts` | createDelivery, updateDelivery, cancelDelivery | DEL-001–018, CON-015/016 |
| `deliveries/actions.ts` | receiveDelivery | REC-001–040, WFLOW, CON, SEC-006/008 |
| `orders/actions.ts` | findProductForOrder, getOrderItems | BAR, ORD-009, SEC-026 |
| `orders/actions.ts` | createOrder, updateOrder, cancelOrder | ORD-001–004/010–012, CON-013 |
| `orders/actions.ts` | addOrderItem, updateOrderItem, removeOrderItem | ORD-005–009/024, CON-014 |
| `orders/actions.ts` | issueOrder | ORD-013–024, WFLOW-003/006, CON-003/013/014/024 |
| `invoices/actions.ts` | createInvoice, updateInvoice, cancelInvoice | INV-001–004/009/010/014/015/022/025, VAL |
| `invoices/actions.ts` | getInvoiceItems, addInvoiceItem, updateInvoiceItem, removeInvoiceItem | INV-005–011/014/021/022/026, SEC-026 |
| `invoices/actions.ts` | importOrderItems, issueInvoice | INV-012–020/022/024/025, CON-018–020 |
| `invoices/actions.ts` | getInvoicePayments, recordPayment, deletePayment | PAY-001–018, CON-017/021/022, SEC-026 |
| `invoices/actions.ts` private helpers | round2, recalcInvoiceTotals, recalcPaymentStatus | INV-006/010/011/021, PAY, DB-012 |
| `assistant/actions.ts` | askAssistant | AI-001–020, SEC, VAL |
| `assistant/tools.ts` | executeTool и10 tool handlers | AI-001/004/009–013/018–020, REP-008 |
| `lib/export-csv.ts` | escapeCell, exportToCSV, csvDate, csvDateTime, todayStr | EXP, REP-011, UI-017 |
| `lib/export-xlsx.ts` | exportToXLSX | EXP, PERF-005/010 |
| `middleware.ts` | middleware/matcher/session cookies | SEC-001/023–028, OPS-009 |
| `lib/supabase` | browser/server/admin createClient variants | SEC-026/030/032, DB-016, OPS-006/007 |

Пътищата `products/...` и аналогичните са под `app/(dashboard)/`. При изпълнение сравни инвентара с checkout наново; нов/преименуван export създава нов coverage ред. Само броенето на функциите не доказва покритие на branches, например NEW customer в submitMovement.

## 5. Маршрути, компоненти и точките за преглед

| Route / група | Файлове/контроли за всеки отделен run | Тестови семейства |
|---|---|---|
| `/login` | form inputs, errors, loading, auth layout | SEC, UI |
| `/` | dashboard-view, cards, chart, recent movements, active deliveries, quick actions | REP, PERF, UI |
| `/products` | page, products-client, product-modal, search, status filter, archive/restore | MST, VAL, BAR, UI |
| `/warehouses` | page, client, warehouse-modal | MST, WH, VAL, UI |
| `/locations` | page, client, location-modal, warehouse filter, structured address | WH, MST, CAP, UI |
| `/suppliers` | page, client, supplier-modal | MST, VAL, UI |
| `/customers` | page, client, customer-modal и billing section | MST, VAL, INV/PRT |
| `/movements` | page, client, embedded form, tabs/types/parties/barcode, filters, export | MOV, WH, BAR, REP, EXP, UI |
| `/inventory` | page, inventory-client, filters, cards, rows, export | WH, REP, EXP, UI |
| `/deliveries` | page/client/delivery-modal/receive-modal/delivery-detail-modal | DEL, REC, WH, CAP, CON, UI |
| `/orders` | page/client/order-modal/order-detail-modal/issue-modal | ORD, WH, CON, UI |
| `/invoices` | page/client/invoice-modal/invoice-detail-modal/items/payment controls | INV, PAY, CON, UI |
| `/invoices/[id]/print` | print page, amountInWords, PrintButton, print layout | PRT, SEC, UI |
| `/reports` | page, low-stock-client, delivery-reports-client, exports | REP, EXP, AI consistency |
| `/scan` | page, scan-client, scanner focus и results | BAR, WH, UI |
| `/assistant` | page, assistant-client, history/loading/error states | AI, SEC, UI, PERF |
| Всички layouts | root/dashboard/auth/print, sidebar, globals.css | SEC, UI, PRT |
| Общи компоненти | language-toggle/provider, theme-toggle/provider, i18n dictionary | UI-006–008, EXP-012, PRT-007 |
| Конфигурация | Dockerfile, .dockerignore, next.config.mjs, package/lock, tsconfig, lint, middleware | OPS, SEC |

UI-001–020 се параметризират по всяка приложима форма/route. За липсващ search/архивен бутон не се измисля контрол: N/A с конкретно обяснение, докато съществуващите backend операции остават в security coverage.

## 6. SQL сверки — само примери за бъдещо read-only изпълнение

### 6.1 Изпълнителен договор

SQL примерите са за изолирана тестова база и schema `public`, след DB-001. Преди пускане се сверяват реалните имена и версия. Read-only не означава автоматично евтино: използвай timeout и разумен test dataset. За консистентен набор отчети използвай една read-only repeatable-read transaction или фиксирана времева отсечка без паралелни fixture mutations. Не се прехвърлят production connection strings в този файл.

```sql
-- Обвивка за бъдеща сесия; примерът НЕ Е изпълнен.
BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY;
SET LOCAL statement_timeout = '5s';
-- Тук избраните SELECT сверки върху тестовата база.
ROLLBACK;
```

Нула редове в query за разлики е PASS само ако всички необходими таблици са достъпни, fixtures съществуват и заявката не е ограничена от RLS. Привилегированата QA read-only връзка доказва целостта на test dataset; отделните user/anon връзки доказват правата. Не се смесват двата вида доказателства.

### 6.2 Ledger → inventory_balances (DB-010 / WH)

```sql
WITH signed AS (
  SELECT company_id, product_id, to_location_id AS location_id,
         quantity AS delta
  FROM public.stock_movements
  WHERE movement_type IN ('IN', 'TRANSFER')
  UNION ALL
  SELECT company_id, product_id, from_location_id AS location_id,
         -quantity AS delta
  FROM public.stock_movements
  WHERE movement_type IN ('OUT', 'TRANSFER')
), ledger AS (
  SELECT company_id, product_id, location_id, SUM(delta) AS expected_qty
  FROM signed GROUP BY company_id, product_id, location_id
)
SELECT COALESCE(l.company_id, b.company_id) AS company_id,
       COALESCE(l.product_id, b.product_id) AS product_id,
       COALESCE(l.location_id, b.location_id) AS location_id,
       COALESCE(l.expected_qty, 0) AS ledger_qty,
       COALESCE(b.quantity_available, 0) AS balance_qty
FROM ledger l
FULL OUTER JOIN public.inventory_balances b
  USING (company_id, product_id, location_id)
WHERE COALESCE(l.expected_qty, 0) IS DISTINCT FROM
      COALESCE(b.quantity_available, 0);
```

Очаквано:0 реда. Допълнително провери негативни/невалидни quantities, duplicate balance keys и movements с неподходящи null locations — те са отделни DB-006/007/018 проверки. Излишен balance=0 без movement не е количествено несъответствие сам по себе си, но произходът му се проверява при D20. Ако начални balances са внесени без movement, това се отчита като migration/fixture gap, не се добавя тайна компенсираща константа в oracle.

### 6.3 Физически адреси и заетост (WH-001/015–017/024)

```sql
SELECT b.company_id, b.product_id, p.sku, p.name, p.unit,
       w.id AS warehouse_id, w.name AS warehouse,
       l.id AS location_id, l.code, l.zone, l.row, l.shelf, l.bin,
       b.quantity_available,
       SUM(b.quantity_available) OVER (
         PARTITION BY b.company_id, b.product_id
       ) AS product_total
FROM public.inventory_balances b
JOIN public.products p ON p.id = b.product_id
JOIN public.locations l ON l.id = b.location_id
JOIN public.warehouses w ON w.id = l.warehouse_id
WHERE b.quantity_available > 0
ORDER BY b.company_id, p.sku, w.name, l.code, l.id;

SELECT l.company_id, l.id, l.code, l.warehouse_id,
       COUNT(b.id) FILTER (WHERE b.quantity_available > 0) AS occupied_products
FROM public.locations l
LEFT JOIN public.inventory_balances b
  ON b.location_id = l.id AND b.company_id = l.company_id
GROUP BY l.company_id, l.id, l.code, l.warehouse_id;
```

Няма SUM на количествата на различни продукти като capacity. `occupied_products=0` е празна локация, не доказан свободен физически капацитет. INNER JOIN може да скрие orphan records — DB-009 проверката по-долу се изпълнява отделно.

### 6.4 Company consistency по parent/child (DB-009 / SEC)

Следният пример изброява връзките, носещи денормализирана фирма. Nullable FK се проверява само когато е попълнен. Constraints за FK съществуване се сверяват отделно чрез DB-001.

```sql
WITH edges AS (
  SELECT 'locations.warehouse' AS relation, l.id AS child_id,
         l.company_id AS child_company, w.company_id AS parent_company
  FROM public.locations l JOIN public.warehouses w ON w.id=l.warehouse_id
  UNION ALL
  SELECT 'balance.product', b.id,b.company_id,p.company_id
  FROM public.inventory_balances b JOIN public.products p ON p.id=b.product_id
  UNION ALL
  SELECT 'balance.location', b.id,b.company_id,l.company_id
  FROM public.inventory_balances b JOIN public.locations l ON l.id=b.location_id
  UNION ALL
  SELECT 'movement.product',m.id,m.company_id,p.company_id
  FROM public.stock_movements m JOIN public.products p ON p.id=m.product_id
  UNION ALL
  SELECT 'movement.from',m.id,m.company_id,l.company_id
  FROM public.stock_movements m JOIN public.locations l ON l.id=m.from_location_id
  UNION ALL
  SELECT 'movement.to',m.id,m.company_id,l.company_id
  FROM public.stock_movements m JOIN public.locations l ON l.id=m.to_location_id
  UNION ALL
  SELECT 'movement.user',m.id,m.company_id,p.company_id
  FROM public.stock_movements m JOIN public.profiles p ON p.id=m.user_id
  UNION ALL
  SELECT 'delivery.supplier',d.id,d.company_id,s.company_id
  FROM public.incoming_deliveries d JOIN public.suppliers s ON s.id=d.supplier_id
  UNION ALL
  SELECT 'delivery_item.delivery',i.id,i.company_id,d.company_id
  FROM public.incoming_delivery_items i JOIN public.incoming_deliveries d ON d.id=i.delivery_id
  UNION ALL
  SELECT 'delivery_item.product',i.id,i.company_id,p.company_id
  FROM public.incoming_delivery_items i JOIN public.products p ON p.id=i.product_id
  UNION ALL
  SELECT 'delivery_item.location',i.id,i.company_id,l.company_id
  FROM public.incoming_delivery_items i JOIN public.locations l ON l.id=i.location_id
  UNION ALL
  SELECT 'order.customer',o.id,o.company_id,c.company_id
  FROM public.outgoing_orders o JOIN public.customers c ON c.id=o.customer_id
  UNION ALL
  SELECT 'order_item.order',i.id,i.company_id,o.company_id
  FROM public.outgoing_order_items i JOIN public.outgoing_orders o ON o.id=i.order_id
  UNION ALL
  SELECT 'order_item.product',i.id,i.company_id,p.company_id
  FROM public.outgoing_order_items i JOIN public.products p ON p.id=i.product_id
  UNION ALL
  SELECT 'order_item.location',i.id,i.company_id,l.company_id
  FROM public.outgoing_order_items i JOIN public.locations l ON l.id=i.location_id
  UNION ALL
  SELECT 'invoice.customer',i.id,i.company_id,c.company_id
  FROM public.invoices i JOIN public.customers c ON c.id=i.customer_id
  UNION ALL
  SELECT 'invoice.order',i.id,i.company_id,o.company_id
  FROM public.invoices i JOIN public.outgoing_orders o ON o.id=i.outgoing_order_id
  UNION ALL
  SELECT 'invoice_item.invoice',i.id,i.company_id,h.company_id
  FROM public.invoice_items i JOIN public.invoices h ON h.id=i.invoice_id
  UNION ALL
  SELECT 'invoice_item.product',i.id,i.company_id,p.company_id
  FROM public.invoice_items i JOIN public.products p ON p.id=i.product_id
  UNION ALL
  SELECT 'payment.invoice',p.id,p.company_id,i.company_id
  FROM public.invoice_payments p JOIN public.invoices i ON i.id=p.invoice_id
)
SELECT * FROM edges WHERE child_company IS DISTINCT FROM parent_company;
```

Очаквано:0 реда. Допълни отделни проверки за polymorphic `reference_type/reference_id`: incoming_delivery→incoming_deliveries; outgoing_order→outgoing_orders; supplier→suppliers; customer→customers. За всяка: parent съществува, фирмата е същата, type е допустим, null pair е съгласуван. Такъв reference няма обикновен FK към всички типове едновременно. За company_id→companies и profiles.id→auth.users проверката е за съществуване и разрешен lifecycle; company consistency не се извежда от JWT само чрез име.

### 6.5 Приети/изписани количества спрямо движенията (DB-011)

```sql
WITH doc AS (
  SELECT company_id, delivery_id AS document_id, product_id,
         SUM(received_quantity) AS stored_qty
  FROM public.incoming_delivery_items
  GROUP BY company_id, delivery_id, product_id
), mov AS (
  SELECT company_id, reference_id AS document_id, product_id,
         SUM(quantity) AS moved_qty
  FROM public.stock_movements
  WHERE reference_type='incoming_delivery' AND movement_type='IN'
  GROUP BY company_id, reference_id, product_id
)
SELECT COALESCE(d.company_id,m.company_id) AS company_id,
       COALESCE(d.document_id,m.document_id) AS document_id,
       COALESCE(d.product_id,m.product_id) AS product_id,
       COALESCE(d.stored_qty,0) AS received_qty,
       COALESCE(m.moved_qty,0) AS receipt_movements_qty
FROM doc d FULL OUTER JOIN mov m USING(company_id,document_id,product_id)
WHERE COALESCE(d.stored_qty,0) IS DISTINCT FROM COALESCE(m.moved_qty,0);
```

За orders изпълни аналогичния независим вариант: `outgoing_order_items`, `order_id`, `issued_quantity`, `reference_type='outgoing_order'`, `movement_type='OUT'`. Двата резултата се записват отделно. Очаквано:0 разлики. Няма сверяване с текущия stock като заместител — след приемането може да е имало валиден OUT/TRANSFER. Ако се добавят returns/corrections, знаците и document-link semantics първо се специфицират, а oracle се версионира.

### 6.6 Суми по фактура и плащания (DB-012)

```sql
WITH rows_sum AS (
  SELECT company_id,invoice_id,SUM(amount) AS subtotal
  FROM public.invoice_items GROUP BY company_id,invoice_id
), pay_sum AS (
  SELECT company_id,invoice_id,SUM(amount) AS paid
  FROM public.invoice_payments GROUP BY company_id,invoice_id
), expected AS (
  SELECT i.id,i.company_id,i.subtotal,i.vat_amount,i.total,i.amount_paid,
         ROUND(COALESCE(r.subtotal,0),2) AS expected_subtotal,
         ROUND(COALESCE(r.subtotal,0)*i.vat_rate/100,2) AS expected_vat,
         ROUND(COALESCE(p.paid,0),2) AS expected_paid
  FROM public.invoices i
  LEFT JOIN rows_sum r ON r.invoice_id=i.id AND r.company_id=i.company_id
  LEFT JOIN pay_sum p ON p.invoice_id=i.id AND p.company_id=i.company_id
)
SELECT * FROM expected
WHERE subtotal IS DISTINCT FROM expected_subtotal
   OR vat_amount IS DISTINCT FROM expected_vat
   OR total IS DISTINCT FROM ROUND(expected_subtotal+expected_vat,2)
   OR amount_paid IS DISTINCT FROM expected_paid;

SELECT id,invoice_id,company_id,quantity,unit_price,amount,
       ROUND(quantity*unit_price,2) AS expected_line_amount
FROM public.invoice_items
WHERE amount IS DISTINCT FROM ROUND(quantity*unit_price,2);
```

Използвай след потвърждение на D15/decimal rounding и invoice line precision. Проверка за payment_status, total-paid и overpayment е отделна PAY сверка; горното не доказва само по себе си статусите. Не JOIN-вай invoice_items и invoice_payments преди агрегиране — това умножава редовете и създава фалшив total.

### 6.7 RLS и RPC инвентар (SEC / DB-016)

```sql
SELECT schemaname,tablename,policyname,permissive,roles,cmd,qual,with_check
FROM pg_policies WHERE schemaname='public'
ORDER BY tablename,policyname;

SELECT n.nspname,p.proname,pg_get_function_identity_arguments(p.oid) AS args,
       p.prosecdef AS security_definer,p.proconfig AS settings,
       pg_get_userbyid(p.proowner) AS owner,
       CASE WHEN a.grantee=0 THEN 'PUBLIC'
            ELSE pg_get_userbyid(a.grantee) END AS grantee,
       a.privilege_type
FROM pg_proc p
JOIN pg_namespace n ON n.oid=p.pronamespace
LEFT JOIN LATERAL aclexplode(COALESCE(p.proacl,acldefault('f',p.proowner))) a ON true
WHERE n.nspname='public'
  AND p.proname IN ('record_stock_movement','current_company_id')
ORDER BY p.proname,args,grantee;

SELECT n.nspname,c.relname,c.relrowsecurity,c.relforcerowsecurity,
       pg_get_userbyid(c.relowner) AS owner
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' AND c.relkind IN ('r','p')
ORDER BY c.relname;
```

Провери допълнително effective table/column privileges, role membership, BYPASSRLS, auth claims/status checks и grants към всяка RPC сигнатура. Само `ENABLE RLS` или име на policy с „service_role“ не доказва защита. SECURITY DEFINER работи с правата на owner; `PUBLIC` има стандартни EXECUTE права за нови функции, освен ако defaults/grants са променени. Източници за механизма: [PostgreSQL CREATE FUNCTION](https://www.postgresql.org/docs/18/sql-createfunction.html) и [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security). Това не е доказателство за конкретните production grants на StockFlow.

## 7. Регистър на резултатите и evidence contract

Началният работен регистър е [04 — QA run register](04_QA_RUN_REGISTER_BG.md). Той изброява дефинираните тестови ID и техния източник. Не е попълнен отчет за изпълнение. Параметризираните VAL/SEC/UI runs се добавят под основния ID, за да не се губи коя комбинация е минала.

### 7.1 Формат на отделен run

```text
Run ID: <test ID>/<variant>/<attempt>
Test ID и версия на плана:
Статус: NOT_RUN | PASS | FAIL | BLOCKED_DECISION | GAP | NOT_APPLICABLE
Изпълнител и проверяващ:
Дата/час UTC + бизнес timezone:
Среда/project id (без credentials):
Commit + dirty-file hashes + schema manifest:
Браузър/устройство/locale/viewport:
Потребител alias, role, company alias:
Fixture IDs и B0 snapshot:
Решения Dxx и версията им:
Точни стъпки/параметри:
Очакван резултат:
Реален резултат:
B1 snapshot + delta/movement counts/totals:
Инварианти, проверени чрез независим oracle:
Поведение след refresh/втори клиент/retry:
Evidence paths (redacted): screenshots/logs/HAR/query outputs:
Свързан defect ID или причина за blocked/N/A:
Reset метод и резултат:
```

### 7.2 Формат на дефект

```text
Defect ID: SF-QA-<номер>
Заглавие: конкретен trigger → неправилно бизнес поведение
Severity/Priority и засегнат обхват:
Статус: NEW / REPRODUCED / PLANNED / FIXED_PENDING_RETEST / CLOSED
Версия/среда/права/fixture:
Минимално възпроизвеждане със стъпки:
Очаквано спрямо Dxx/инвариант/test:
Реално + независими DB/UI доказателства:
Честота и concurrency график, ако приложимо:
Бизнес ефект: количество/пари/чужди данни/блокиран оператор:
Root cause: потвърден или хипотеза (обозначи кое):
Свързани файлове/действия/SQL objects:
План за корекция (без автоматично одобрение):
Рискове и нужни миграции/данни за възстановяване:
Retest IDs и засегната регресия:
Собственик/следваща стъпка:
```

### 7.3 Формат на бизнес решение

```text
Decision ID: Dxx
Статус: OPEN / DECIDED / SUPERSEDED
Въпрос и защо блокира очаквания резултат:
Варианти, предимства и конкретни рискове:
Препоръка (не е автоматично решение):
Решил, дата и източник на потвърждението:
Точно прието правило + пример с числа:
Приложим release/tenant/warehouse/unit:
Засегнати tests/fixtures/docs:
Извън обхват ограничения:
```

### 7.4 Метрики без подвеждащ PASS процент

Показвай отделно: дефинирани case IDs; разгънати variants; изпълнени; PASS; FAIL; BLOCKED_DECISION; GAP; N/A; NOT_RUN. Докладвай coverage по действия/полета/състояния и критичност. `PASS/(PASS+FAIL)` не е обща готовност, ако половината P1 са NOT_RUN. При отложен CAP feature отложените cases остават видими в GAP графата, с приет release обхват.

## 8. Регресия след конкретни бъдещи корекции

| Коригирана област | Задължителен повторен набор |
|---|---|
| RLS/auth/company scoping | SEC всички роли/tenants + DB-009/016/018 + reads и writes на всяка засегната таблица + E2E |
| Movement RPC/transactions | WH movement arithmetic, REC, ORD issue, CON всички stock случаи, DB-010/011/015, REP/EXP |
| Receive split/validation | REC всички + WFLOW-001/002/005–007 + no-mixed manual/transfer пътища + UI nested rows |
| Capacity/put-away | CAP всички след решенията + WH/REC/CON/SEC + compatibility на старите NULL locations |
| Order lifecycle/split issue | ORD всички + WH-002–010/WFLOW-003 + invoice import + CON + history/report |
| Invoice rounding/status | INV/PAY/PRT + DB-012 + CON-017–022 + E2E-002 |
| Master-data field/archiving | VAL за полето + MST + pending/legacy documents + archive races + dropdown/scan/report |
| Export/pagination | REP/EXP/AI count/limit случаи + BAR large inventory + PERF |
| Docker/runtime/dependencies | OPS clean build/start + SEC middleware/session + основните E2E smoke; dependency-specific regression |

## 9. Точни източници за преглед

- [Роли и permission matrix](../../../stockflow/lib/permissions.ts), [current-user](../../../stockflow/lib/current-user.ts), [middleware](../../../stockflow/middleware.ts).
- [Movement engine](../../../stockflow/lib/movement-engine.ts), [manual actions](<../../../stockflow/app/(dashboard)/movements/actions.ts>).
- [Receive/delivery actions](<../../../stockflow/app/(dashboard)/deliveries/actions.ts>), [receive modal](<../../../stockflow/app/(dashboard)/deliveries/receive-modal.tsx>).
- [Order actions](<../../../stockflow/app/(dashboard)/orders/actions.ts>), [issue modal](<../../../stockflow/app/(dashboard)/orders/issue-modal.tsx>).
- [Location actions](<../../../stockflow/app/(dashboard)/locations/actions.ts>), [inventory client](<../../../stockflow/app/(dashboard)/inventory/inventory-client.tsx>).
- [Invoice actions](<../../../stockflow/app/(dashboard)/invoices/actions.ts>), [print page](<../../../stockflow/app/(print)/invoices/[id]/print/page.tsx>).
- [Assistant actions](<../../../stockflow/app/(dashboard)/assistant/actions.ts>), [tools](<../../../stockflow/app/(dashboard)/assistant/tools.ts>).
- [Initial SQL](../../supabase/migrations/001_initial_schema.sql), [RPC002](../../supabase/migrations/002_movement_rpc.sql), [RPC004](../../supabase/migrations/004_movement_reference.sql).
- [Invoice SQL](<../../SQL Migrations/013_invoices.sql>), [Payments SQL](<../../SQL Migrations/015_invoice_payments.sql>).
- [Dockerfile](../../../stockflow/Dockerfile), [.dockerignore](../../../stockflow/.dockerignore), [package.json](../../../stockflow/package.json).
- [Предходен put-away preflight](../v0.9_step3_putaway_preflight.md), [current status](../current_status.md), [PC status](../current_status-cls-007-pc.md), [ранен MVP scope](../mvp_scope.md).

Връзките сочат работните файлове, а не immutable commit permalink. За бъдещото изпълнение се записва baseline manifest. Историческите твърдения от документите се проверяват срещу кода и реалната тестова схема, преди да определят PASS.
