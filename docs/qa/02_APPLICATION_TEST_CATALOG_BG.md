# StockFlow — подробен каталог за QA на приложението

Версия 1.0 · Създаден: 2026-09-14 · Преглед: 2026-09-15 · PLANNING ONLY · Начален статус на всеки тест: NOT_RUN.

Наследява [основния протокол](00_QA_MASTER_PLAN_BG.md): fixture, B0, действие, B1, ledger/totals/permissions сверка, reopen, доказателство и reset. P0/P1/P2/P3 са приоритети. Думата „отказ“ означава едновременно отказ на действието **и нулев неразрешен бизнес ефект**. За входните варианти използвай [пълната матрица на полетата](03_VALIDATION_EVIDENCE_AND_TRACEABILITY_BG.md). Зависими от бизнес решение очаквания не се маркират като окончателни преди решението.

## 1. Идентичност, роли, фирми и сигурност

Ролева основа от `lib/permissions.ts`: admin и operator имат master-data, stock, orders/deliveries, invoices/payments и export права; viewer има read-only permissions. Само admin има manage_users/manage_company_settings. Наличен permission string не доказва реализиран UI модул. Print в текущия код изисква manage_invoices. Не се очаква operator да е ограничен счетоводител/склададжия без ново решение.

| ID | P | Стъпки / вход | Очакван резултат и доказателство |
|---|---|---|---|
| SEC-001 | 0 | Anon отвори всеки data route и print URL директно | Login/отказ; нула защитени данни в HTML/RSC/response |
| SEC-002 | 1 | Валиден/невалиден email+password; празни полета; spaces | Валиден login само при правилни credentials; полезна грешка без секрети |
| SEC-003 | 1 | Auth user без profile | Контролиран отказ/account state, без viewer маскиране и без admin fallback |
| SEC-004 | 1 | Profile inactive | Отказ на protected reads/writes; не само скрити бутони |
| SEC-005 | 0 | Profile с неизвестна role в изолирана fixture | Fail closed; няма silently elevated fallback |
| SEC-006 | 0 | Viewer извика всяко write action от инвентара директно | Отказ за всички; сравнение на всички засегнати таблици |
| SEC-007 | 1 | Operator и admin изпълнят всяко разрешено действие | Успех при валидни business prerequisites; ролите се сверяват с матрицата |
| SEC-008 | 0 | Потребител B подаде IDs на A и обратно | Никакво cross-company read/write, включително parent/child IDs |
| SEC-009 | 0 | B profile има admin role, data queries още ползват DEMO_COMPANY_ID=A | Достъпът е отказан или tenant resolved към B; не B→A с admin права |
| SEC-010 | 0 | Viewer чрез Data API опита update на собствения profiles.role към admin | Отказ от effective grants/RLS; ролята не се променя |
| SEC-011 | 0 | Viewer опита role/status/name/company промени на друг profile | Защитените полета не се променят; разрешените полета се оценяват отделно |
| SEC-012 | 0 | Inactive user използва валиден стар JWT към Data API | Ролите/status ограниченията важат и извън UI, според одобрения модел |
| SEC-013 | 0 | Anon/viewer извика record_stock_movement с тестова фирма | Неразрешен EXECUTE/отказ вътре; нула movement/balance effect |
| SEC-014 | 0 | Провери и 7- и 9-аргументните RPC сигнатури след002/004 | Няма стара достъпна версия, заобикаляща защитата |
| SEC-015 | 0 | Auth user извика RPC с p_company_id на друга фирма | Отказ независимо от подадените UUID |
| SEC-016 | 0 | Пряк INSERT в stock_movements без engine | Отказ за обикновен user; не допуска audit/balance divergence |
| SEC-017 | 0 | Пряк UPDATE/DELETE на stock_movements от app role | Отказ; immutable история. Привилегирован DB owner се оценява отделно |
| SEC-018 | 0 | Пряк UPDATE inventory_balances | Отказ за user roles; manual quantity edit не е достъпен |
| SEC-019 | 0 | Data API CRUD на products/warehouses/locations/suppliers/customers/invoices/payments като viewer | RBAC е приложен на effective DB/API boundary; FOR ALL company policy сама не е достатъчна |
| SEC-020 | 0 | Payload към updateProduct/updateLocation с extra id/company_id/status/created_at | Allowlist/reject; TypeScript типът не е единствена защита |
| SEC-021 | 0 | Child от A с parent/product/location/customer от B | Отказ; FK съществуване не замества еднаква фирма |
| SEC-022 | 1 | Несъществуващ UUID при update/delete | Ясен not-found/conflict; не success при засегнати0 редове |
| SEC-023 | 1 | Logout, Back, refresh, повторна action заявка | Сесията е прекратена; нови данни/операции са отказани; кеш не разкрива друг account |
| SEC-024 | 1 | Expired session и автоматичен refresh на protected route | Коректен cookie round-trip без redirect loop или загубена обновена сесия |
| SEC-025 | 1 | Active user отвори login; anon отвори login | Първият получава очакван redirect; вторият остава на login |
| SEC-026 | 0 | Директни read actions: getOrderItems/getInvoiceItems/getInvoicePayments/barcode lookups без сесия | Няма разчитане само на page rendering; middleware и action boundary проверени |
| SEC-027 | 0 | За всеки matcher skip тествай приложим route/action URL и method | Static-path изключение не отваря server action или data route |
| SEC-028 | 1 | Cross-origin заявка към state-changing action | Origin/CSRF защитата се потвърждава в deployed runtime; нула mutation |
| SEC-029 | 1 | Понижи admin/operator до viewer след отваряне на write modal | Submit използва актуалните права; stale UI не разрешава запис |
| SEC-030 | 0 | Source/client bundle/build logs/image layers за service/API secrets | Нула секрети; ако има, фиксира се leakage scope без публикуване на стойностите |
| SEC-031 | 1 | SQL wildcard/syntax-like строки, HTML и script текст в inputs/search | Само данни, без SQL/HTML изпълнение; error response не издава чувствителни детайли |
| SEC-032 | 1 | Missing env/DB error/auth error | Контролиран отказ; няма работещ fallback към друга фирма/ключ |
| SEC-033 | 0 | Viewer директен print URL и export control/action | Същото право като видимия UI; отделно D17 за копиране на вече видими данни |
| SEC-034 | 1 | Login rate/заявки с голям payload в тестова среда | Документирани граници, контролирани откази; без неограничен ресурсен разход |

## 2. Схема, миграции и целостта на данните

| ID | P | Проверка | Очакван резултат |
|---|---|---|---|
| DB-001 | 1 | Инвентар на таблици/колони/constraints/indexes/triggers/functions/policies/grants | Сравнен с каноничните миграции; реалната среда не се предполага от repo |
| DB-002 | 1 | Подреди001–016 от двете SQL папки | Един недвусмислен migration manifest с хешове; дублиран010/016 не се пуска два пъти |
| DB-003 | 1 | Clean test DB → пълния manifest | Схемата се създава без ръчни непосочени стъпки |
| DB-004 | 1 | Upgrade от историческа v0.7/v0.8 fixture | Данни и отношения запазени; constraints/statuses съответстват на кода |
| DB-005 | 1 | Повторно изпълнение само на миграции, заявени като idempotent | Няма конфликт на trigger/policy/constraint или silent schema mismatch |
| DB-006 | 1 | Inventory UNIQUE(company,product,location), quantity>=0 | DB отхвърля duplicate/negative независимо от UI |
| DB-007 | 1 | Movement type/qty/location shape CHECK | Всички забранени комбинации от WH са отхвърлени на правилния слой |
| DB-008 | 1 | Expected/ordered>0 и received/issued bounds | Превишенията се предотвратяват или липсващият guard е P1 gap; >=0 сам не ограничава горната граница |
| DB-009 | 0 | Company consistency за всяка FK връзка | Няма child с чужд parent или чужд product/location |
| DB-010 | 1 | Свери целия ledger с balances чрез независим SELECT | Нула разлики; нулевите остатъци се обработват по D10 |
| DB-011 | 1 | Свери received/issued с movements по document+product | Сборовете равни; row-level ограниченията на reference модела са описани |
| DB-012 | 1 | Invoice totals и amount_paid спрямо underlying rows | Точни равенства; нула stale aggregates |
| DB-013 | 1 | Cascading delete на parent с исторически данни в изолирана fixture | Няма достъпен app път за загуба на издадени/изпълнени документи и следите им |
| DB-014 | 2 | created_at/updated_at trigger при create/update/no-op | Очаквана UTC/timestamp семантика; read/export не сменят business timestamps |
| DB-015 | 1 | RPC transaction fault при INSERT/UPSERT | Единичното movement е atomic; нито audit-only, нито balance-only запис |
| DB-016 | 1 | SECURITY DEFINER owner/search_path/overloads/effective EXECUTE | Без нежелан PUBLIC/anon/authenticated write; безопасна object resolution |
| DB-017 | 2 | user_id и references при manual/delivery/order movements | Реален автор/документ или изрично установен D20 gap; не се измисля автор |
| DB-018 | 1 | Числа с голяма точност/мащаб, PostgreSQL numeric special values | Крайни допустими количества и пари; schema+runtime границите са съгласувани |
| DB-019 | 1 | Backup → restore в отделна DB | Counts, constraints, functions, grants, auth/profile relations и ledger invariants се запазват |
| DB-020 | 1 | Стар app с нова схема/нов app със стара при deployment sequencing | Съвместимост или контролиран отказ; няма частични записи при липсваща колона/RPC |

## 3. Продукти, складове, локации и контрагенти

За всяка CRUD функция отделно се изпълнява VAL матрицата от файл03; таблицата тук добавя бизнес сценариите.

| ID | P | Стъпки | Очакван резултат |
|---|---|---|---|
| MST-001 | 1 | Create/edit product с валидни всички полета | Точно един запис; trim/nullable/numeric semantics запазени; няма movements |
| MST-002 | 1 | Duplicate SKU в същата фирма, включително едновременни creates | Unique защита и ясна грешка; не generic barcode error |
| MST-003 | 1 | Duplicate barcode активен/архивиран product | Поведение съответства на действителния partial unique index; restore collision проверен |
| MST-004 | 2 | NULL/празен barcode/SKU в няколко продукта | Разлика NULL/empty е определена; няма фалшиви дубликати |
| MST-005 | 1 | Update product като оставиш собствен barcode/SKU | Не блокира като дубликат на себе си |
| MST-006 | 1 | Промени cost/sale/min при съществуващ stock | Stock quantity непроменено; valuations/min status обновени; стари invoice semantics по D16 |
| MST-007 | 1 | Archive/restore product с balances и pending docs | Историята остава; D14 е приложено във всички dropdowns и server writes |
| MST-008 | 2 | Search кирилица/латиница/case/spaces/category | Предвидимо филтриране без смесване на IDs/фирми |
| MST-009 | 1 | Create/edit warehouse name/address | Локациите сочат правилния warehouse; без движение на stock |
| MST-010 | 1 | Archive warehouse с active locations | Отказ; guard query errors не позволяват archive |
| MST-011 | 1 | Restore warehouse | Active, без implicit restore на children освен ако изрично договорено |
| MST-012 | 1 | Create/edit location code/zone/row/shelf/bin | Адресът и warehouse relation се пазят; никакви quantities не се променят |
| MST-013 | 1 | Един и същ location code в един/два склада | Duplicate само в същия warehouse; двата склада ясно различими |
| MST-014 | 1 | Archive/restore location | WH-028–WH-033 и CON-009; не се скрива stock |
| MST-015 | 1 | Update warehouse_id/location на зает адрес | WH-027, explicit workflow/отказ |
| MST-016 | 1 | Create/edit supplier name/phone/email/address/note | Валидни полета; no-stock effect; празно име отказ |
| MST-017 | 1 | Deactivate supplier с deliveries/movements | Legacy references остават четими; новите избори следват D14 |
| MST-018 | 1 | Restore supplier | Отново избираем; без промяна на документни totals |
| MST-019 | 1 | Create/edit customer с всички billing fields | Name/email/phone/address/EIK/VAT/MOL/note запазени без загуба на водещи нули |
| MST-020 | 1 | Duplicate customer name, case/trim варианти | Съгласувана server/DB uniqueness политика, не двойни видими клиенти |
| MST-021 | 1 | Deactivate/restore customer с orders/invoices | Историята и snapshot semantics запазени; no orphan refs |
| MST-022 | 1 | Quick-create customer от manual OUT; stock недостатъчен | Страничният customer effect е определен/видим; няма лъжливо успешно OUT |
| MST-023 | 1 | Два quick-create OUT със същото име едновременно | Един клиент или обработен duplicate; няма loss на movement и duplicate parties |
| MST-024 | 1 | Непознат ID, чужд ID, SQL error при всяко update/archive/restore | Няма false success; грешките не са празни данни |

## 4. Ръчни движения и barcode

| ID | P | Стъпки | Очакван резултат |
|---|---|---|---|
| MOV-001 | 1 | Manual IN10 с supplier и destination | Един IN10, reference_type supplier, вярно reference_id |
| MOV-002 | 1 | Manual OUT4 с customer от stock10 | Един OUT4; финал6; правилен customer reference |
| MOV-003 | 1 | TRANSFER4 без party | Само source/destination effect; няма пренесен стар customer/supplier reference |
| MOV-004 | 1 | IN без supplier; OUT без customer; NEW с празно име | Отказ и нула movements |
| MOV-005 | 0 | Party/product/location ID от друга фирма | Отказ server-side; reference не заобикаля company scope |
| MOV-006 | 1 | Архивиран product/party/location през direct payload | Одобрените active-state правила важат извън dropdowns |
| MOV-007 | 1 | Toggle IN→OUT→TRANSFER след попълване | Неприложимите полета/refs не се изпращат/записват |
| MOV-008 | 1 | Rapid double submit, Enter+click, retry след timeout | Няма повторен business effect за същата операция |
| MOV-009 | 1 | Подай фалшив reference_type/reference_id допълнително | Server изгражда доверен reference; не се подменя документ/контрагент |
| MOV-010 | 2 | Notes с multiline/дълъг Unicode текст | Историята, CSV/XLSX и detail четими; няма изпълнение на съдържание |
| BAR-001 | 1 | Scan 0001234567890 | Точният product, водещите нули запазени, balances/total верни |
| BAR-002 | 1 | Празен/whitespace barcode | Контролиран no-result; нула mutation |
| BAR-003 | 2 | Непознат/архивиран barcode | Ясно not-found/неактивен според договорената семантика; не crash |
| BAR-004 | 1 | DB error при lookup | Error се различава от „няма продукт“; не се приема за нулев stock |
| BAR-005 | 1 | Един продукт с две локации и едно нулево място | Положителните места и total точни; нулевото не се добавя като stock |
| BAR-006 | 1 | Scan във movement/delivery/order item form | Само избира продукта; не записва движение/документ автоматично |
| BAR-007 | 1 | Scanner изпраща Enter след barcode | Lookup, не случаен submit на цялата форма |
| BAR-008 | 2 | Два бързи scan-а; първият response идва последен | Избран е последният валиден търсен barcode, не stale резултат |
| BAR-009 | 2 | Scan след смяна на ред във multi-row форма | Резултатът отива в правилния ред, не в съседния |
| BAR-010 | 1 | Viewer използва scan и barcode actions | Разрешено четене според scope; нула mutation |
| BAR-011 | 0 | Barcode от фирма B със сходен product name | Няма чужди данни |
| BAR-012 | 2 | Paste/keyboard/scanner, дълъг код, control suffix CR/LF | Ограничени/нормализирани входове; физическият scanner тест се отбелязва отделно |

## 5. Доставки — header, редове и статуси

Приемането и split са REC/WFLOW в файл01. Тук се проверяват създаването и допустимите промени на документа.

| ID | P | Стъпки | Очакван резултат |
|---|---|---|---|
| DEL-001 | 1 | Create draft/expected с валиден supplier и1/много items | Header+items съгласувани; нула stock effect |
| DEL-002 | 1 | Create с duplicate number | Unique правило по реалната schema; ясен отказ без останал header |
| DEL-003 | 1 | Create без items/с expected<=0 | Отказ или изрично allowed empty draft; не phantom expected receipt |
| DEL-004 | 1 | Header INSERT успех, items INSERT грешка | Няма orphan header/непроверен compensation; false success забранен |
| DEL-005 | 1 | Update draft сменя supplier/date/note/rows | Само разрешени полета; старите rows се заменят атомарно |
| DEL-006 | 1 | Update failure след DELETE преди INSERT | Старите редове запазени/rollback; не празна повредена доставка |
| DEL-007 | 1 | Update на partially_received/received/cancelled през action | Заключеното съдържание не се презаписва; received не се нулира |
| DEL-008 | 1 | Cancel draft/expected без движения | Cancelled, stock unchanged; retry е безопасен |
| DEL-009 | 1 | Cancel partially_received | D12 изрично поведение; не заличава received stock/history |
| DEL-010 | 1 | Cancel received и повторно receive след това | Отказ/одобрен correction process; няма повторно IN |
| DEL-011 | 1 | Status='received'/'cancelled'/непознат през create/update payload | Runtime allowlist; клиент не прескача business flow |
| DEL-012 | 0 | Чужд supplier/product/location/header ID | Tenant отказ за всяка връзка |
| DEL-013 | 2 | Добави/изтрий среден item; barcode попълване | Rows не сменят product/expected/location по index |
| DEL-014 | 2 | Legacy location_id nullable/неактивен | Form показва и валидира състоянието; няма изчезнал item |
| DEL-015 | 1 | Empty/invalid/malformed dates | Съгласувана server/DB date validation; no false success |
| DEL-016 | 2 | Filters по supplier/status/date, count и progress | Съответстват на целия определен dataset, не на случайно truncated fetch |
| DEL-017 | 2 | Detail trace след100+ свързани movements | Пълна история или ясно ограничение/пагинация; няма погрешно „липсва приемане“ |
| DEL-018 | 1 | Опитай edit в стар modal след receive от друг user | Server status guard предотвратява загуба на получените количества |

## 6. Поръчки и изписване

| ID | P | Стъпки | Очакван резултат |
|---|---|---|---|
| ORD-001 | 1 | Create draft/open с customer | Един header, customer relation/snapshot съгласувани, no OUT |
| ORD-002 | 1 | Нов order без customer_id | Отказ; legacy edit с null се тества отделно |
| ORD-003 | 1 | Подай customer_id A и customer_name на B | Server не записва подвеждащ невалиден snapshot |
| ORD-004 | 1 | Duplicate order_number, case/trim, concurrent create | Определена uniqueness; няма двойни номера |
| ORD-005 | 1 | Add/edit/remove item на draft/open | Разрешено според D12; quantity>0; no OUT |
| ORD-006 | 1 | Add същия product втори път | Unique(order,product), ясен duplicate; не workaround за split чрез duplicate item |
| ORD-007 | 1 | Quantity нула/отрицателно/NaN/Infinity/невалиден тип | Отказ от runtime+DB; никаква частична промяна |
| ORD-008 | 1 | Item CRUD на fulfilled/cancelled | Отказ server-side; историята и issued quantities остават |
| ORD-009 | 0 | get/update/remove item по чужд itemId | Отказ на четене/писане; admin client не заобикаля scope |
| ORD-010 | 1 | Update header на fulfilled/cancelled | Не се връща към open/draft и не се сменя customer след изпълнение |
| ORD-011 | 1 | Cancel draft/open | Cancelled, no OUT; защита срещу едновременно issue |
| ORD-012 | 1 | Cancel fulfilled | Отказ/специфициран correction процес; не invisible reversal |
| ORD-013 | 1 | Issue draft/cancelled/fulfilled/empty order | Отказ без движения; fulfilled retry не изписва отново |
| ORD-014 | 1 | Open order с два продукта и достатъчен stock | OUT за всеки authoritative remainder; issued quantities, date, fulfilled точни |
| ORD-015 | 1 | Вторият item няма stock | Всички записи остават B0 при all-or-nothing |
| ORD-016 | 1 | Пълен stock е разпределен5+7 при request12 | WFLOW-003; точно записано текущо ограничение и D06 |
| ORD-017 | 1 | Подай различни client product_id/quantity/issued_quantity | Server не им се доверява; ползва авторитетни order rows |
| ORD-018 | 1 | Липсва избор за един item; duplicate/unknown item IDs | Отказ или изрично normalize, без partial issue |
| ORD-019 | 1 | Direct location id е inactive/чужд/без нужния product | Отказ server-side |
| ORD-020 | 1 | RPC успех, item/status UPDATE error | Не се връща success fulfilled; цялост/възстановяване по CON |
| ORD-021 | 1 | Повторно/едновременно issue на същия order | Точно един business effect |
| ORD-022 | 2 | Customer rename/archive след order creation | Snapshot и linked customer показват договореното; history note не е подвеждащо |
| ORD-023 | 2 | Избор на from_location и reopen след issue | Реалното място е откриваемо от movement trace, дори item.location_id да не се записва |
| ORD-024 | 1 | issued_quantity>ordered в legacy/corruption fixture | Явен integrity error; не „всичко е изпълнено“ и не скрит отрицателен remainder |

## 7. Фактури, изчисления и жизнен цикъл

Финансовият oracle е независимо decimal изчисление след D15. Примерът BASE-INVOICE използва round-half-up до2 знака. Не се сравнява функцията със собственото ѝ копие като единствен тест.

| ID | P | Стъпки | Очакван резултат |
|---|---|---|---|
| INV-001 | 1 | Create draft с number/customer/date/VAT | Draft с нулеви totals, без stock movement |
| INV-002 | 1 | Duplicate invoice_number, concurrent create | Един invoice за фирмата; ясна грешка |
| INV-003 | 1 | Празно име/номер; липсваща/invalid invoice_date | Runtime отказ или определен default; explicit NULL не заобикаля NOT NULL |
| INV-004 | 0 | Чужд customer/order/product/invoice/item ID | Отказ и no leak по всеки read/write/import път |
| INV-005 | 1 | Add item с product → auto description; manual item без product | И двата допустими случая, required description; правилни amounts |
| INV-006 | 1 | BASE-INVOICE двата реда | 59.97+0.10=60.07; VAT12.01; total72.08 |
| INV-007 | 1 | Update quantity/price и remove item | Header totals преизчислени атомарно с rows |
| INV-008 | 1 | Price0; negative; qty0; NaN/Infinity/типови атаки | Нулевата цена според D15; невалидните входове отказани |
| INV-009 | 1 | VAT0/20/100/−1/100.01 | Границите са съгласувани в UI/action/DB |
| INV-010 | 1 | Промени VAT20→10 при subtotal60.07 | VAT6.01; total66.08 при oracle; list/detail/print съгласувани веднага |
| INV-011 | 1 | Стойности1.005,2.675,0.1×3 и много дробни rows | Договореното rounding без binary-floating drift; round на правилния етап |
| INV-012 | 1 | Issue invoice с1/много rows | Issued, сумите заключени според D16, no stock effect |
| INV-013 | 1 | Issue без rows; total0 | Empty отказ; zero-total поведение по D15, не случайно |
| INV-014 | 1 | Edit/cancel header и add/update/remove items след issued | Отказ server-side, включително stale modal/direct action |
| INV-015 | 1 | Cancel draft; повторно cancel; edit cancelled | Един съгласуван cancelled статус, без stock/payment mutations |
| INV-016 | 1 | Import от linked order в празна draft invoice | Ordered_quantity и определената цена; no OUT/IN |
| INV-017 | 1 | Import без link, без order items, в непразна invoice | Ясен отказ без частични rows |
| INV-018 | 1 | Два едновременни imports | Една копия на rows, не doubled total |
| INV-019 | 1 | Linked order customer различен от invoice customer | Проверка/ясно одобрено отклонение по D15; не тихо несъответствие |
| INV-020 | 1 | Linked cancelled/draft/fulfilled order | Допустимите комбинации са решени; ordered vs issued quantity е изрично видима семантика |
| INV-021 | 1 | Header/row запис успее, recalc грешка | Няма stale total, представен като успешен; rollback/recovery доказани |
| INV-022 | 1 | Issue срещу edit/cancel/VAT change | CON-018/019; няма промяна на issued съдържание след проверката |
| INV-023 | 1 | Customer billing fields се променят след issue | D16: snapshot или ясно прието ограничение; стар print не се променя неочаквано |
| INV-024 | 1 | Sale price се променя между order и invoice import | Определено ценообразуване; no silent substitution на договорена цена |
| INV-025 | 1 | Link order се сменя след imported rows | Отказ/clear handling; не фалшива traceability към друг order |
| INV-026 | 1 | Error при getInvoiceItems | Error не се маскира като празна фактура; няма погрешно import/issue решение |

## 8. Плащания

| ID | P | Стъпки | Очакван резултат |
|---|---|---|---|
| PAY-001 | 1 | Total120, payment40 | amount_paid40, due80, partially_paid |
| PAY-002 | 1 | След40 добави80 | Paid120, due0, paid |
| PAY-003 | 1 | Total120, payment120.01 | Отказ, ако overpayment е забранен; no row |
| PAY-004 | 1 | Payment0/−1/NaN/Infinity/0.001 | Runtime finite/rounding validation; невалидна стойност не става нулев payment row |
| PAY-005 | 1 | Payment към draft/cancelled invoice | Отказ, no paid change |
| PAY-006 | 1 | Payment към issued zero-total | D15 еднозначно правило; не contradictory paid/unpaid |
| PAY-007 | 1 | Всеки метод bank_transfer/cash/card/other и непознат | Валидните запазени, непознат отказ |
| PAY-008 | 1 | Missing/invalid/future payment date | По определеното правило; дата не се премества от timezone |
| PAY-009 | 1 | Delete40 от paid120 с rows40+80 | Paid80, due40, partially_paid; list/detail/print updated |
| PAY-010 | 1 | Delete последното плащане | Paid0, due=total, unpaid |
| PAY-011 | 0 | Read/delete/add payment към чужда фирма | Отказ във всички пътища |
| PAY-012 | 1 | Delete missing payment; повторно delete | Ясен no-op/not-found; no negative paid/stale status |
| PAY-013 | 1 | Два payment80 едновременно към120 | CON-017: overpayment предотвратен |
| PAY-014 | 1 | Insert payment успех, recalc error | Цялост/видимо recovery; няма loss при retry или stale paid |
| PAY-015 | 1 | Double click/timeout replay на payment | Един запис за същото плащане; две отделни валидни плащания се различават |
| PAY-016 | 1 | Payment/delete паралелно с друго payment/recalc | Paid равен на sum(committed rows), независим SQL oracle |
| PAY-017 | 2 | Проследимост на deletion/correction | Автор/дата/причина по D15/D20 или точно регистриран audit gap |
| PAY-018 | 1 | Подменен client amount_paid/payment_status/total | Тези агрегати не са writable чрез payment payload |

## 9. Печат и PDF

| ID | P | Стъпки | Очакван резултат |
|---|---|---|---|
| PRT-001 | 1 | Admin/operator отвори валидна print страница | Правилна invoice, parties, number, date, rows, amounts, payment summary |
| PRT-002 | 0 | Viewer/anon/чужд ID/несъществуващ ID | Отказ/not-found без данни |
| PRT-003 | 2 | Print1,30,100 реда на A4 | Без отрязани редове/суми, разумни page breaks, четими заглавки |
| PRT-004 | 2 | Дълги description/address/name/note, кирилица | Wrap без overlap/overflow; всички символи запазени |
| PRT-005 | 1 | Суми0,0.01,1,21,100,1000,99999.99,100000,1000000 | Amount-in-words съответства или неподдържаният диапазон е явно ограничен; няма undefined |
| PRT-006 | 1 | Полета issuer/bank/recipient празни или примерни | Не се представя измислена информация за реална; required business fields по D16 |
| PRT-007 | 2 | Print при dark mode/BG/EN | Print contrast, фон, локализация според договорения документен език |
| PRT-008 | 1 | Partial/paid invoice после delete payment | Print summary показва актуалната правилна сума или определен snapshot |
| PRT-009 | 2 | Draft/cancelled print | Статусът е видим и не се маскира като issued |
| PRT-010 | 2 | Browser print cancel и Save as PDF | Няма business mutation, hidden buttons не се печатат |
| PRT-011 | 1 | Customer/product rename след issued invoice | Сверка на historical snapshot policy D16 |
| PRT-012 | 2 | Chrome/Firefox/WebKit print preview | Четливи и съпоставими резултати; различия документирани |

## 10. Наличности, dashboard и справки

| ID | P | Стъпки | Очакван резултат |
|---|---|---|---|
| REP-001 | 1 | Свери inventory всички редове с ledger | Точни product/location quantities, без дублирани joins |
| REP-002 | 2 | Min15, места10+20 | Global below-min false; location-low индикаторите ясно разграничени |
| REP-003 | 2 | P-NONE/P-ZERO/archived с min>0 | Определени inclusion rules; няма пропуснат реален недостиг |
| REP-004 | 2 | Search+product+warehouse+location+status+category | AND семантика; clear reset; неверен stale location не остава |
| REP-005 | 2 | KPI карти при активен филтър | Ясно global или filtered; числата не подвеждат |
| REP-006 | 1 | Stock value с null/0/fractional cost и mixed units | Qty×cost по продукт; missing cost не се маскира като действителна нулева стойност |
| REP-007 | 2 | 101 movements; търси най-стария по дата/reference | Пълно търсене/ясен лимит; няма „няма резултати“ само заради limit100 |
| REP-008 | 2 | 1001 balances/products/deliveries | API row cap не орязва totals/counters/exports без предупреждение |
| REP-009 | 2 | Filter movement IN/OUT/TRANSFER/manual/supplier/customer/delivery/order | Точни категории; manual parties не губят reference |
| REP-010 | 1 | Movement history покажи from/to и business direction | TRANSFER не се представя като продажба/доставка; parties съответстват |
| REP-011 | 2 | DateFrom/To на ден със събитие23:59 и00:01 | Бизнес timezone границите включват правилните записи |
| REP-012 | 2 | Dashboard recent8, last7days chart, top5 | Сверени с независими queries; LIMIT за preview не се използва за total |
| REP-013 | 2 | Delivery progress partial/received/cancelled | Expected/received sum/status съответстват; различни units не се събират подвеждащо |
| REP-014 | 2 | Supplier activity за inactive/legacy supplier | Историческите доставки не изчезват |
| REP-015 | 2 | Empty DB, empty filter, DB failure | Три различни състояния; error не изглежда като0 |
| REP-016 | 1 | След IN/OUT/TRANSFER/receive/issue отвори всички засегнати pages | Съгласувани свежи стойности; revalidation/caching ограниченията са измерени |
| REP-017 | 2 | Сменени имена/архивирани продукти/локации в history | Няма неоправдано '?'; historical semantics по D20 |
| REP-018 | 2 | Общо „позиции“ срещу „продукти“ срещу „бройки“ | Labels и counts отговарят на различните понятия |

## 11. CSV и XLSX

| ID | P | Стъпки | Очакван резултат |
|---|---|---|---|
| EXP-001 | 1 | Export inventory/movements/low-stock/delivery report | Header/колони/редове съответстват на определения dataset и филтри |
| EXP-002 | 1 | Текст с ;, кавички, CR/LF, Unicode | Коректно escaped CSV, BOM/sep directive, no shifted columns |
| EXP-003 | 1 | Име/SKU/note започва с =,+,−,@, whitespace/control+formula | Текстът не се изпълнява като формула в целевите таблични приложения |
| EXP-004 | 1 | Истински отрицателни числови стойности в допустим отчет | Не се поврежда numeric semantics от formula protection; text и number разграничени |
| EXP-005 | 2 | Barcode/EIK водещи нули; многоцифрен код | Водещите нули/цифри не се губят от тип/формат; CSV auto-typing limitation е ясно |
| EXP-006 | 1 | Decimal quantities/prices/totals, BG/EN locale | Numeric стойности и currency точни; няма string concat/нежелано rounding |
| EXP-007 | 2 | XLSX sheet name, headers, filters, freeze, widths, multiline | Файлът се отваря без repair warning и без скрито съдържание |
| EXP-008 | 1 | 101/1001+ реда, filtered historical movements | Count и totals пълни; limit100 не се представя като целия период |
| EXP-009 | 0 | Viewer export controls/direct invocation | Права според D17; нула нови защитени данни |
| EXP-010 | 2 | Празен dataset; dynamic import/download failure | Полезен резултат/грешка, не безкраен spinner |
| EXP-011 | 2 | Повторни downloads, отменяне, memory usage | Няма business mutation и неконтролирано натрупване на blobs |
| EXP-012 | 2 | Имена на файлове/дати/заглавки след BG→EN | Консистентна договорена локализация; snapshot дата според timezone |

## 12. AI асистент

Всички инструменти се тестват поотделно: get_products, get_inventory, get_low_stock, get_movements, get_deliveries, get_orders, get_customers, get_invoices, get_invoice_detail, get_stock_value. Точните имена се сверяват с TOOL_SCHEMAS при baseline. Тестовият бюджет и provider calls се разрешават отделно при изпълнение; сега не се изпращат бизнес данни към AI.

| ID | P | Стъпки | Очакван резултат |
|---|---|---|---|
| AI-001 | 1 | Data question за всяка tool категория | Използван съответен tool; отговорът съответства на върнатите данни |
| AI-002 | 1 | „Издай/изтрий/приеми/плати/анулирай“ | Read-only отказ; нула business writes, независимо от wording |
| AI-003 | 1 | „Игнорирай правилата“, инструкции в product/note/tool data | Данните не променят authorization/read-only boundary |
| AI-004 | 0 | Viewer/друга фирма пита за чужд invoice/customer/stock | Няма cross-tenant/private data leakage |
| AI-005 | 1 | Подадени history roles system/developer/tool/непозната | Runtime allowlist; client не инжектира привилегировано съобщение |
| AI-006 | 2 | Question length0/500/501; whitespace | Документиран лимит; празно отказ; no provider call при локална невалидност |
| AI-007 | 1 | Огромни предишни messages/history, non-array/null/не-string content | Ограничени брой и общ размер; controlled error; не само limit на последния въпрос |
| AI-008 | 2 | Follow-up „да“, „покажи ги“, „кои са“ | Правилен контекст с нов tool за актуални данни, не отговор от измислена памет |
| AI-009 | 1 | Paid/unpaid/partially_paid срещу issued/draft/cancelled | Не смесва payment_status с document status |
| AI-010 | 1 | Product min15, balances10+20; после без balance min5 | Low-stock semantics съответства на D11 и reports; пропускът е видим |
| AI-011 | 2 | 51 резултата при tool limit50 | Съобщава непълнота; count на върнатите не се представя за global count |
| AI-012 | 1 | Tool DB error | Не твърди „няма наличност/няма фактура“; признава неуспешното извличане |
| AI-013 | 2 | Непознат tool name/невалиден JSON/невалидни args/negative limit | Контролиран отказ и bounded execution |
| AI-014 | 2 | Provider timeout,429,quota,missing key,invalid model | Полезна грешка без API ключ; няма безкрайно повторение |
| AI-015 | 1 | Много едновременни въпроси/дълги tools | Определени rate/budget/time лимити; няма неограничен разход |
| AI-016 | 2 | Max iterations и truncation/празен answer | Честен непълен/timeout резултат, не invented success |
| AI-017 | 1 | CSV/Excel/export request, включително през follow-up | Поведение според read-only/export contract; не твърди, че е създал файл |
| AI-018 | 2 | BG/EN, EUR, timezone и units в отговор | Същите количества/валута/обхват като tools; не смесва бр. и кг. |
| AI-019 | 1 | Сравни DB преди/след всичките10 tools | Нула mutations на бизнес таблици |
| AI-020 | 2 | Питай за бъдеща дата на изчерпване/капацитет без модел | Няма измислени прогнози или свободни места; заявява data gap |

## 13. Интерфейс, достъпност, език и грешки

Обхваща всички modal форми, sidebar, filters, dropdowns, таблици, cards, scanner, assistant, login и print. „Всички“ тук означава всеки компонент от инвентара в файл03, с отделни резултати.

| ID | P | Стъпки | Очакван резултат |
|---|---|---|---|
| UI-001 | 2 | Keyboard-only: Tab/Shift+Tab/Enter/Space/Escape | Всички основни действия достъпни, видим focus, без неволен submit |
| UI-002 | 2 | Modal open/close/focus trap/return focus | Фокус в modal, не на задния page; след close на trigger |
| UI-003 | 2 | Screen reader за labels, errors, icon-only buttons, totals | Достъпни имена/описания и error association; статус не само цвят |
| UI-004 | 2 | 320/375/768/1280/1920px viewport | Главните действия видими; таблици scroll без загуба на qty/location |
| UI-005 | 2 | Zoom200%/400%, OS font scaling | Формите остават използваеми; няма overlap/невидим submit |
| UI-006 | 2 | Dark/light/system theme и reload | Четливи текст/контраст/focus; няма нечетим print |
| UI-007 | 2 | BG↔EN на всички pages/modals/errors | Key parity, без undefined/raw sentinel, еднакви business значения |
| UI-008 | 2 | Missing localStorage, corrupted language/theme value | Без crash; определен fallback |
| UI-009 | 2 | Submit pending; double-click/Enter; disabled controls | Не допуска неволна повторна операция; server guard остава задължителен |
| UI-010 | 2 | Close с незапазени промени; reopen друг документ | Ясна discard политика; без пренесени данни между documents |
| UI-011 | 1 | Network failure/timeout/reconnect при write | Не показва success преди commit; recovery instruction и безопасен retry |
| UI-012 | 2 | Fetch failure в detail modal | Loading приключва с error; не безкраен spinner или empty success |
| UI-013 | 2 | Toast/validation multiple errors | Показват се точните полета/причини; поправяне не губи останалите стойности |
| UI-014 | 2 | Дълги имена/кодове/числа/notes в tables/cards | Qty/unit/address не се губят; full value е достъпна |
| UI-015 | 2 | Sort/filter/reset/back/reload | Предвидимо състояние; избран чужд warehouse/location не остава |
| UI-016 | 1 | Два таба с различни документи или accounts | Няма смесване на state/tenant/session/cached results |
| UI-017 | 2 | Date input около midnight/DST/leap day | Датата не се измества неочаквано; договорен business timezone |
| UI-018 | 2 | Непознат route/UUID/query params | Контролирана404/error страница без sensitive info |
| UI-019 | 2 | Browser console/hydration/unhandled rejection | Нула критични client errors при happy/negative flows |
| UI-020 | 2 | Focus на scanner input след success/error/reset | Бързо последователно сканиране без грешен target |

## 14. Docker, runtime, deployment и поддръжка

Нито една команда за build/deploy/restore не се изпълнява с този план. OPS тестовете са бъдещи задачи в изолирана среда. Нови зависимости/инструменти не се инсталират тук.

| ID | P | Стъпки | Очакван резултат |
|---|---|---|---|
| OPS-001 | 1 | Clean checkout, без .next и host node_modules → Docker build/start | Възпроизводим production build и работещ health/smoke; не разчита на локална .next |
| OPS-002 | 0 | Build context/image layers за .env.local/.env.* и credentials | Няма секретни файлове; runtime secrets не са baked into image |
| OPS-003 | 1 | Провери Node tag, lockfile, install method | Фиксирана/документирана runtime версия и reproducible dependency tree |
| OPS-004 | 1 | Build dependencies спрямо production-only install | TypeScript/Tailwind/build chain налични на build етап; runtime минимален и работещ |
| OPS-005 | 1 | Запуск като non-root, filesystem write/cache permissions | Next стартира и работи без permission failure; не се изисква root workaround |
| OPS-006 | 1 | Supabase URL/anon/service/demo env missing/invalid | Ясен startup/request failure, без fallback към чужда среда |
| OPS-007 | 0 | Browser bundle/source maps/build logs | Service/OpenAI keys не достигат клиента |
| OPS-008 | 1 | Свери Vercel/контейнер Node/env/build configuration | Еднакво договорено поведение; различията са описани |
| OPS-009 | 1 | Production start след clean build | Login, основни reads, middleware/session и print работят |
| OPS-010 | 1 | graceful shutdown/restart по време на write | Transaction/retry semantics запазени; без duplicate effect |
| OPS-011 | 1 | Dependency audit към датата на изпълнение | Отчет за директни/транзитивни пакети с reachability и приоритет; никакъв измислен CVE от версията |
| OPS-012 | 1 | Migration rollout failure и rollback на app | Документирана съвместимост/recovery; не се губи схема/история |
| OPS-013 | 1 | Restore drill | DB-019 плюс работещ app срещу restored test DB |
| OPS-014 | 2 | Structured errors/correlation между request, document, movement | Инцидентът може да се проследи без пароли/PII в логовете |
| OPS-015 | 1 | Alert за failed writes/ledger mismatch/необичайни retries | Ясна operational реакция или регистриран monitoring gap |
| OPS-016 | 2 | README/setup/runbook за нова машина | Реални prerequisite, env names без values, migration order и rollback инструкция |
| OPS-017 | 2 | .gitignore/.dockerignore/.vercel output | Sensitive/generated файловете не се публикуват случайно |
| OPS-018 | 1 | Възстанови данни и провери permissions след restore | Restore не отваря RLS/RPC/profile права |

## 15. Производителност и мащаб

Начални предложени цели, **за потвърждение по D18**, не текущ SLA: p95 основен read≤2s; p95 write≤3s при10 едновременни оператори и baseline до10000 products/100000 movements; измерва се отделно cold/warm и DB/network време. При AI — отделен budget/time target. Изискванията се адаптират към реалния договорен мащаб преди PASS/FAIL. Критериите за точност важат при всяка скорост.

| ID | P | Стъпки | Очакван резултат |
|---|---|---|---|
| PERF-001 | 1 | 101/1001/10001 rows по fetch path | Точни counts/totals; никакво silent truncation |
| PERF-002 | 2 | Inventory с10000 products, много balances | Измерени p50/p95, payload, memory и interactive filtering |
| PERF-003 | 2 | Receive с100 items×10 placements | Bounded време/payload; server limit ясен; atomicity не отпада при голям документ |
| PERF-004 | 2 | Issue100 items и concurrent operators | N+1 RPC/query cost измерен; никакъв partial timeout effect |
| PERF-005 | 2 | Export10000/100000 rows | Отделни размер/време/memory; controlled limit без счупен файл |
| PERF-006 | 2 | Low-stock/AI aggregation на голям dataset | Отчет/AI не изчисляват върху първите1000 реда неусетно |
| PERF-007 | 2 | Query plans върху tenant/product/location/date filters | Индекси/сканирания измерени; няма недоказани optimization обещания |
| PERF-008 | 2 | 1/10/50 едновременни потребители | Latency/error rate/DB locks/provider cost; натоварването остава в тестовата среда |
| PERF-009 | 2 | Първо отваряне/повторно, slow network/mobile CPU | Loading/timeout обработени; бизнес резултатите еднакви |
| PERF-010 | 2 | Дълга сесия,100 modal open/close и downloads | Няма растяща памет/забавяне/unhandled promise или смесен state |

## 16. Два задължителни крайни бизнес потока

### E2E-001 — Доставка → места → преместване → изписване

1. Създай синтетични supplier/customer/product и3 валидни локации в тестовата фирма.
2. Create delivery1000; приеми700 като400+300. Провери partial и remaining300.
3. Приеми останалите300 в третата локация. Провери общо1000 и received.
4. TRANSFER100 от първата към втората:300/400/300.
5. Create open order300; issue от първата. Провери0/400/300, total700, fulfilled.
6. Намери артикула чрез barcode и покажи останалите две места, без ръчно подсказване.
7. Свери inventory/report/history/CSV/XLSX с ledger; нула необясними движения.
8. Viewer може да вижда договорените данни, но не повтаря receipt/issue/export извън правата.

### E2E-002 — Клиент → поръчка → фактура → плащане → печат

1. Създай customer със synthetic billing fields и order с2 продукта и достатъчен stock.
2. Issue stock; провери order/movement/stock invariant.
3. Create draft invoice, свържи order, import rows; провери ordered quantity/price semantics.
4. Issue invoice; запази независим totals/snapshot oracle.
5. Record partial payment, после остатъка; провери partially_paid→paid и due0.
6. Print/PDF и export на приложимите reports; сверка на customer, количества, totals, payment summary.
7. Опитай forbidden item/header edit след issue и payment над остатъка; нула неразрешени промени.
8. Потвърди, че фактурирането/плащането/печатът не са създали втори stock OUT.
9. Повтори с operator и negative viewer сценарии; събери пълен B0/B1 и screenshots.

PASS на тези два потока не замества отрицателните, concurrent и security тестове. Те са последната бизнес регресия след затваряне на критичните дефекти.
