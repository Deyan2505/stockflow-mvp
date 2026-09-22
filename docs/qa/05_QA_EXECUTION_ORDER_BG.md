# StockFlow — строг ред за изпълнение на QA

Версия 1.0 · 2026-09-15 · PLANNING ONLY.

Този документ определя последователността за бъдещото изпълнение. Той не променя приложение, база, deployment или тестови статуси. Използва се с [основния план](00_QA_MASTER_PLAN_BG.md), [регистъра](04_QA_RUN_REGISTER_BG.md) и протокола за доказателства в [документ 03](03_VALIDATION_EVIDENCE_AND_TRACEABILITY_BG.md).

## 1. Правило за започване

QA не започва с произволно натискане на бутоните. Първо се фиксира какво точно се тества. Следните точки трябва да имат писмен резултат:

- точен commit и списък/хеш на dirty файловете;
- версия на Node, package lock и build командата;
- точен Supabase test project, schema manifest и migration history;
- потвърждение, че средата не е production и няма реални клиентски данни;
- alias на тестовите фирми и потребители, без пароли в документацията;
- приложими бизнес решения D01–D20;
- начален fixture snapshot и начин за възстановяване;
- лице, което може да спре теста при нарушена наличност или чужд достъп.

Ако средата не може да бъде доказано различена от production, mutation тестовете не започват. Read-only inspection се ограничава до необходимото за идентификация и не извлича лични данни в evidence.

## 2. Фаза 0 — baseline и контрол на промените

### 2.1 Стъпки

1. Запиши UTC дата/час и локална бизнес зона.
2. Запиши Git HEAD, branch и `git status`; не почиствай чужди промени.
3. Изчисли SHA-256 на всички source, migration и config файлове в scope. `.env*` се записват само като име/наличност, без съдържание и без хеш, ако това може да подпомогне атака срещу слаба тайна.
4. Извлечи read-only manifest на таблици, колони, типове, defaults, NOT NULL, FK, CHECK, UNIQUE, indexes, triggers, functions, policies, grants и role membership.
5. Сравни двете migration папки и production/test migration history; определи един каноничен ред.
6. Свери всички маршрути, server actions и SQL functions с инвентарите в документ03.
7. Изпълни чист TypeScript, lint и build върху копие/checkout с документирани зависимости. Build не получава production secrets.
8. Създай baseline report. Всяка разлика спрямо този план се регистрира като plan update или defect; не се игнорира.

### 2.2 Изходни условия

- Има еднозначен build/schema target.
- Всички отклонения от HEAD и миграциите са видими.
- Clean build резултатът е записан; провалът е P1 за deployment, но не се прикрива чрез използване на стара `.next`.
- Регистърът още може да съдържа NOT_RUN; не може да съдържа PASS без evidence.

## 3. Фаза 1 — защита преди бизнес mutations

### 3.1 Ред

1. Изпълни DB-001, DB-002, DB-016 и SQL инвентара на policies/grants.
2. Изпълни SEC-001–005 за anon, missing/inactive/invalid profile.
3. Изпълни SEC-010–019 за profile escalation, RPC, movements и balances.
4. Изпълни SEC-008/009/012/015/021 с две фирми.
5. Разгъни SEC-006 и SEC-019 за всяко write действие от документа03.
6. Изпълни SEC-020 и VAL-019 за mass assignment на всички системни полета.
7. Провери тайни и build artifacts чрез SEC-030/OPS-002/007/017.

### 3.2 Стоп критерии

Незабавно прекрати write тестовете при:

- anon/viewer може да създава или променя бизнес данни извън правата;
- потребител вижда или променя чужда фирма;
- profile role/status/company може да се повиши през неподходящ клиентски път;
- RPC приема неразрешен caller или произволна фирма;
- service/OpenAI ключ е в browser bundle, Git, image layer или evidence.

Запази минимални доказателства, без допълнителна експлоатация. Резултатът е NO-GO до корекция и пълно повторение на security набора.

## 4. Фаза 2 — основен складов ledger

### 4.1 Начална подготовка

1. Възстанови празна test fixture база.
2. Създай master data чрез разрешените actions.
3. Създай началните количества само с IN movements.
4. Изпълни SQL ledger сверка; изисква0 разлики преди следващия тест.
5. Снимай B0 за movements, balances, products, locations и warehouses.

### 4.2 Ред на тестовете

1. WH-011–014 и VAL quantity/location shape — невалидните базови входове.
2. MOV-001–009 — manual entry points и parties.
3. WH-001–010 — разпределение, точно изчерпване и transfer.
4. WH-015–025 — occupancy, minimum semantics и еднакви кодове/имена.
5. WH-036–039 — decimals и несъпоставими единици.
6. DB-006/007/010/015/018 — constraints, ledger и единична RPC atomicity.
7. CON-001/002/011/012/023/028 — едновременност и retry.

След всяка mutation група: B1, ledger query, movement count/reference проверка, refresh, втори клиент и fixture reset. Ако ledger се разминава, не се продължава към delivery/order тестове.

## 5. Фаза 3 — физически локации и допълнително място

### 5.1 Текущо реализирано поведение

1. Изпълни WFLOW-001/002/005–008 и REC-001–040.
2. Изпълни WH-026–035 и WH-040–052.
3. Провери receive, manual IN и TRANSFER към едно и също място — правилата за occupancy не могат да зависят само от един UI.
4. Изпълни физическата сверка с оператор върху синтетично определения QA набор.
5. За всеки product създай резултат `общо → склад → точна локация → количество → последно обясняващо движение`.

### 5.2 Капацитет

1. Изпълни CAP-001 като capability audit.
2. Ако моделът липсва, отбележи CAP-002–036 като GAP/BLOCKED_DECISION според конкретната зависимост. Не ги превръщай в FAIL на непоискана функция или PASS на обещание.
3. Реши D01–D09, D10, D19 и D20 преди бъдеща имплементация.
4. След отделно възложена реализация изпълни всички CAP cases и WFLOW-004 отначало.

### 5.3 Минимален приемателен резултат

Без capacity feature системата може да бъде приета само с ясно записано ограничение: операторът ръчно избира и потвърждава местата; системата не гарантира физическо побиране и не предлага доказано свободен капацитет. Тя все пак трябва точно да показва текущите количества по всички места и неприетия остатък.

## 6. Фаза 4 — доставки и поръчки

### 6.1 Доставки

1. DEL-001–006: create/update и fault между header/rows.
2. DEL-007–012: status guards и tenant relations.
3. REC целият набор: partial, split, duplicate IDs, stale locations и retry.
4. CON-004–010/015/016/024/026/027: конкурентност и прекъсване.
5. DB-011: received quantities срещу movements.

### 6.2 Поръчки

1. ORD-001–012: header/item CRUD и lifecycle.
2. ORD-013–024: issue, authoritative quantities и traceability.
3. WFLOW-003 и D06: достатъчна обща наличност, разпределена по места.
4. CON-003/013/014/024–028: double issue, cancel/edit races и retry.
5. DB-011: issued quantities срещу OUT movements.

### 6.3 Стоп критерии

- Един провал оставя movement без съответния received/issued резултат или обратно.
- Повторна заявка дублира stock effect.
- Приключен документ може да бъде редактиран така, че историята вече не го обяснява.
- Достатъчен total се представя като наличен от избран bin, когато той няма количеството.
- Статусът е received/fulfilled, а редовете или движенията не са пълни.

Всеки от тези резултати е P1 и блокира реална складова работа.

## 7. Фаза 5 — фактури, плащания и печат

1. Потвърди D15/D16 и точния decimal oracle.
2. Изпълни INV-001–011 за inputs, редове, ДДС и rounding.
3. Изпълни INV-012–026 за import, issue, locking, snapshots и error paths.
4. Изпълни PAY-001–018, включително едновременни плащания и retry.
5. Изпълни CON-017–022.
6. Изпълни DB-012 независимо от UI.
7. Изпълни PRT-001–012 и визуално провери generated PDF/print preview.
8. Потвърди, че фактуриране, плащане и печат не създават складови движения.

P1 са stale totals, overpayment, промяна на издадена фактура, неправилен customer/document link или нееднозначна recovery след частичен запис.

## 8. Фаза 6 — справки, експорти, AI и интерфейс

1. REP-001–018 с независими DB queries, включително rows отвъд100/1000.
2. EXP-001–012; отвори резултатите в договорените таблични приложения и провери formula injection.
3. BAR-001–012 с keyboard/paste и реален scanner, ако е наличен.
4. AI-001–020 с synthetic data, ограничен test budget и DB before/after.
5. UI-001–020 за всеки маршрут/форма от документа03.
6. PERF-001–010 след потвърден реалистичен обем и SLA.

Стопирай съответния модул, ако error се показва като „няма данни“, export пропуска редове без предупреждение, AI разкрива чужда фирма/измисля складови стойности, или read-only действие създава business mutation.

## 9. Фаза 7 — deployment, backup и възстановяване

1. OPS-001–009: clean image/build/start, env и runtime parity.
2. OPS-010–012: shutdown, dependencies и migration rollout failure.
3. DB-019 + OPS-013/018: backup/restore, после повторна проверка на grants/RLS и ledger.
4. OPS-014–016: logs, alerts и runbook.
5. Изпълни smoke подмножество: login, product read, inventory read, едно IN/TRANSFER/OUT, една partial delivery, една order issue, invoice/payment/print, viewer denial.
6. След smoke отново изпълни ledger и financial reconciliation.

Не се приема deployment, който работи само защото host `.next`, `node_modules` или `.env.local` са попаднали в образа.

## 10. Фаза 8 — пълна регресия и решение

1. Всички P0/P1 fixes имат минимален regression test и пълен засегнат набор от документ03.
2. Изпълни E2E-001 и E2E-002 с нови fixtures, не с остатъците от defect reproduction.
3. Повтори основните role/tenant негативни тестове.
4. Повтори ledger, document movement, invoice и payment SQL сверки.
5. Провери, че броят FAIL/BLOCKED/GAP/NOT_RUN в регистъра съответства на реалните run записи.
6. Подготви release decision с конкретен обхват и ограничения.

## 11. Формат на GO/NO-GO решението

```text
Release candidate / commit / schema manifest:
Среда и дата:
Договорен продукт и tenant модел:
Изпълнени case IDs / разгънати variants:
P0: open/closed/not-run:
P1: open/closed/not-run:
P2/P3 и приет риск:
BLOCKED_DECISION/GAP/N/A с причина:
Ledger reconciliation result:
Delivery/order document reconciliation result:
Invoice/payment reconciliation result:
Security matrix result:
Clean build/deploy/restore result:
Физическа warehouse acceptance:
Капацитетът гарантира ли се: да/не + точна граница:
Известни ограничения и operational workaround:
Решение: GO / CONDITIONAL GO / NO-GO
Одобрил, роля, дата и условия:
```

`CONDITIONAL GO` не може да се използва за отворен P0, за P1 с риск от загуба/дублиране на количество или пари, за недоказана фирмена изолация или за тайна в клиентски/published artifact. Неизпълнен критичен тест остава основание за NO-GO, докато не бъде изпълнен или release обхватът не бъде официално намален.

## 12. Първи практически пакет за изпълнение

Когато бъде изрично възложено реалното тестване, първият ограничен пакет е:

1. QA-0 baseline manifest без mutation.
2. DB-001/002/016 и SEC-001–019 върху отделна test среда.
3. Създаване на минималните COMP-A/COMP-B fixtures.
4. WH-001–016, REC-001–028, ORD-013–021 и CON-001–008.
5. Ledger/document reconciliation.
6. Междинен P0/P1 отчет и решение дали е безопасно да се продължи към финансовия и UI слоя.

Този ред поставя най-опасните неизвестни в началото: права, фирмена изолация, неизменяем ledger, повторно приемане/изписване и частични операции.
