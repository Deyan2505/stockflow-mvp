# StockFlow — регистър за изпълнение на QA

Версия 1.0 · 2026-09-15 · PLANNING ONLY.

Този регистър съдържа **488 дефинирани тестови случая**. Всеки започва със статус NOT_RUN. Това не е отчет за успешно тестване. Числото не включва допълнителните параметризирани варианти по полета, роли, статуси и устройства.

Инструкции: [основен план](00_QA_MASTER_PLAN_BG.md); [run/evidence шаблони](03_VALIDATION_EVIDENCE_AND_TRACEABILITY_BG.md). След реално изпълнение добави отделен run запис с версия, fixture, резултат и evidence; обобщеният статус на case става PASS само след всички задължителни варианти. N/A изисква причина. Капацитетните случаи стават GAP/BLOCKED_DECISION след действителната capability проверка, а не автоматично PASS.

## Брой по семейство

| Семейство | Дефинирани случаи | Изпълнени |
|---|---:|---:|
| WFLOW | 8 | 0 |
| WH | 52 | 0 |
| REC | 40 | 0 |
| CAP | 36 | 0 |
| CON | 28 | 0 |
| SEC | 34 | 0 |
| DB | 20 | 0 |
| MST | 24 | 0 |
| MOV | 10 | 0 |
| BAR | 12 | 0 |
| DEL | 18 | 0 |
| ORD | 24 | 0 |
| INV | 26 | 0 |
| PAY | 18 | 0 |
| PRT | 12 | 0 |
| REP | 18 | 0 |
| EXP | 12 | 0 |
| AI | 20 | 0 |
| UI | 20 | 0 |
| OPS | 18 | 0 |
| PERF | 10 | 0 |
| E2E | 2 | 0 |
| VAL | 26 | 0 |

## Работен регистър

| ID | Приоритет | Проверка | Източник | Статус | Run/evidence/defect |
|---|---|---|---|---|---|
| WFLOW-001 | P1 | — Къде се намират 1000 броя след разделяне | [01:51](01_WAREHOUSE_LOCATION_TESTS_BG.md) | NOT_RUN | — |
| WFLOW-002 | P1 | — Изчерпване само на първото място | [01:66](01_WAREHOUSE_LOCATION_TESTS_BG.md) | NOT_RUN | — |
| WFLOW-003 | P1 | — Има общо 12, но нито една локация няма 12 | [01:80](01_WAREHOUSE_LOCATION_TESTS_BG.md) | NOT_RUN | — |
| WFLOW-004 | P1 | — Първата локация няма достатъчен капацитет | [01:92](01_WAREHOUSE_LOCATION_TESTS_BG.md) | NOT_RUN | — |
| WFLOW-005 | P1 | — Повторен item_id в едно приемане | [01:104](01_WAREHOUSE_LOCATION_TESTS_BG.md) | NOT_RUN | — |
| WFLOW-006 | P1 | — Прекъсване след първото движение | [01:116](01_WAREHOUSE_LOCATION_TESTS_BG.md) | NOT_RUN | — |
| WFLOW-007 | P1 | — Две приемания към една празна локация | [01:126](01_WAREHOUSE_LOCATION_TESTS_BG.md) | NOT_RUN | — |
| WFLOW-008 | P1 | — Физическа сверка и еднозначен адрес | [01:137](01_WAREHOUSE_LOCATION_TESTS_BG.md) | NOT_RUN | — |
| WH-001 | P1 | BASE-SPLIT: отвори P-TSHIRT в inventory и scan | [01:155](01_WAREHOUSE_LOCATION_TESTS_BG.md) | NOT_RUN | — |
| WH-002 | P1 | Изпиши 9 от L-A01=10 | [01:156](01_WAREHOUSE_LOCATION_TESTS_BG.md) | NOT_RUN | — |
| WH-003 | P1 | Изпиши последната 1 от L-A01 | [01:157](01_WAREHOUSE_LOCATION_TESTS_BG.md) | NOT_RUN | — |
| WH-004 | P1 | OUT=11 от място с 10 | [01:158](01_WAREHOUSE_LOCATION_TESTS_BG.md) | NOT_RUN | — |
| WH-005 | P1 | OUT=1 от L-ZERO и L-NEVER | [01:159](01_WAREHOUSE_LOCATION_TESTS_BG.md) | NOT_RUN | — |
| WH-006 | P1 | IN=3 след пълно изчерпване | [01:160](01_WAREHOUSE_LOCATION_TESTS_BG.md) | NOT_RUN | — |
| WH-007 | P1 | TRANSFER=4: L-A01=10 → L-A03=20 | [01:161](01_WAREHOUSE_LOCATION_TESTS_BG.md) | NOT_RUN | — |
| WH-008 | P1 | TRANSFER=10 на цялото от A01 | [01:162](01_WAREHOUSE_LOCATION_TESTS_BG.md) | NOT_RUN | — |
| WH-009 | P1 | TRANSFER към друг склад на фирма A | [01:163](01_WAREHOUSE_LOCATION_TESTS_BG.md) | NOT_RUN | — |
| WH-010 | P0 | TRANSFER към location на фирма B | [01:164](01_WAREHOUSE_LOCATION_TESTS_BG.md) | NOT_RUN | — |
| WH-011 | P1 | from_location=to_location | [01:165](01_WAREHOUSE_LOCATION_TESTS_BG.md) | NOT_RUN | — |
| WH-012 | P1 | IN без destination; OUT без source; TRANSFER без единия | [01:166](01_WAREHOUSE_LOCATION_TESTS_BG.md) | NOT_RUN | — |
| WH-013 | P1 | IN с излишен source; OUT с излишен destination | [01:167](01_WAREHOUSE_LOCATION_TESTS_BG.md) | NOT_RUN | — |
| WH-014 | P1 | Непознат movement_type; null quantity | [01:168](01_WAREHOUSE_LOCATION_TESTS_BG.md) | NOT_RUN | — |
| WH-015 | P1 | За една локация има стар P-OTHER=0; приеми P-TSHIRT | [01:169](01_WAREHOUSE_LOCATION_TESTS_BG.md) | NOT_RUN | — |
| WH-016 | P1 | Друг продукт има 0.001 на мястото | [01:170](01_WAREHOUSE_LOCATION_TESTS_BG.md) | NOT_RUN | — |
| WH-017 | P1 | Mixed fixture P1=0, P2=4; провери статус | [01:171](01_WAREHOUSE_LOCATION_TESTS_BG.md) | NOT_RUN | — |
| WH-018 | P2 | Product min15, balances10+20 | [01:172](01_WAREHOUSE_LOCATION_TESTS_BG.md) | NOT_RUN | — |
| WH-019 | P2 | Общ stock=15 при min15; после14 | [01:173](01_WAREHOUSE_LOCATION_TESTS_BG.md) | NOT_RUN | — |
| WH-020 | P2 | P-NONE min5 без нито едно движение | [01:174](01_WAREHOUSE_LOCATION_TESTS_BG.md) | NOT_RUN | — |
| WH-021 | P2 | P-ZERO след IN5/OUT5 срещу P-NONE | [01:175](01_WAREHOUSE_LOCATION_TESTS_BG.md) | NOT_RUN | — |
| WH-022 | P2 | Филтър склад скрива другите20 | [01:176](01_WAREHOUSE_LOCATION_TESTS_BG.md) | NOT_RUN | — |
| WH-023 | P2 | Смени warehouse с избрана location от стария | [01:177](01_WAREHOUSE_LOCATION_TESTS_BG.md) | NOT_RUN | — |
| WH-024 | P1 | A-01 в WH-SOF и A-01 в WH-PDV | [01:178](01_WAREHOUSE_LOCATION_TESTS_BG.md) | NOT_RUN | — |
| WH-025 | P2 | Еднакви product names, различни SKU/barcode | [01:179](01_WAREHOUSE_LOCATION_TESTS_BG.md) | NOT_RUN | — |
| WH-026 | P1 | Редактирай кода/адреса на локация със stock | [01:180](01_WAREHOUSE_LOCATION_TESTS_BG.md) | NOT_RUN | — |
| WH-027 | P1 | Смени warehouse_id на заета локация | [01:181](01_WAREHOUSE_LOCATION_TESTS_BG.md) | NOT_RUN | — |
| WH-028 | P1 | Archive локация със stock>0 | [01:182](01_WAREHOUSE_LOCATION_TESTS_BG.md) | NOT_RUN | — |
| WH-029 | P1 | Archive локация с нула и исторически движения | [01:183](01_WAREHOUSE_LOCATION_TESTS_BG.md) | NOT_RUN | — |
| WH-030 | P1 | Restore празна неактивна локация | [01:184](01_WAREHOUSE_LOCATION_TESTS_BG.md) | NOT_RUN | — |
| WH-031 | P1 | Receive към active location в inactive warehouse | [01:185](01_WAREHOUSE_LOCATION_TESTS_BG.md) | NOT_RUN | — |
| WH-032 | P1 | Archive warehouse с active location | [01:186](01_WAREHOUSE_LOCATION_TESTS_BG.md) | NOT_RUN | — |
| WH-033 | P1 | Archive warehouse с inactive location, но stock>0 в corruption fixture | [01:187](01_WAREHOUSE_LOCATION_TESTS_BG.md) | NOT_RUN | — |
| WH-034 | P1 | Archive продукт със stock в 2 места | [01:188](01_WAREHOUSE_LOCATION_TESTS_BG.md) | NOT_RUN | — |
| WH-035 | P1 | Смени unit от бр. на кг. при наличност/история | [01:189](01_WAREHOUSE_LOCATION_TESTS_BG.md) | NOT_RUN | — |
| WH-036 | P1 | P-KG=1.250; OUT0.250 | [01:190](01_WAREHOUSE_LOCATION_TESTS_BG.md) | NOT_RUN | — |
| WH-037 | P1 | Последователно IN0.1 и0.2, OUT0.3 | [01:191](01_WAREHOUSE_LOCATION_TESTS_BG.md) | NOT_RUN | — |
| WH-038 | P1 | Quantity една минимална единица над available | [01:192](01_WAREHOUSE_LOCATION_TESTS_BG.md) | NOT_RUN | — |
| WH-039 | P1 | Сумарна карта смесва бр., кг., л. | [01:193](01_WAREHOUSE_LOCATION_TESTS_BG.md) | NOT_RUN | — |
| WH-040 | P1 | Error от occupancy query | [01:194](01_WAREHOUSE_LOCATION_TESTS_BG.md) | NOT_RUN | — |
| WH-041 | P1 | Error от archive stock check | [01:195](01_WAREHOUSE_LOCATION_TESTS_BG.md) | NOT_RUN | — |
| WH-042 | P2 | >1000 balance реда; потърси последния | [01:196](01_WAREHOUSE_LOCATION_TESTS_BG.md) | NOT_RUN | — |
| WH-043 | P2 | 100+ места за един продукт | [01:197](01_WAREHOUSE_LOCATION_TESTS_BG.md) | NOT_RUN | — |
| WH-044 | P2 | Нов IN от друг таб; стар scan result | [01:198](01_WAREHOUSE_LOCATION_TESTS_BG.md) | NOT_RUN | — |
| WH-045 | P2 | Основна локация има0, допълнителна20 | [01:199](01_WAREHOUSE_LOCATION_TESTS_BG.md) | NOT_RUN | — |
| WH-046 | P2 | Sort по quantity обръща първия ред | [01:200](01_WAREHOUSE_LOCATION_TESTS_BG.md) | NOT_RUN | — |
| WH-047 | P2 | Scan на артикул показва current, не receipt placements | [01:201](01_WAREHOUSE_LOCATION_TESTS_BG.md) | NOT_RUN | — |
| WH-048 | P1 | IN10, TRANSFER4, OUT3; независима ledger сверка | [01:202](01_WAREHOUSE_LOCATION_TESTS_BG.md) | NOT_RUN | — |
| WH-049 | P1 | Физическо броене9 срещу digital10 | [01:203](01_WAREHOUSE_LOCATION_TESTS_BG.md) | NOT_RUN | — |
| WH-050 | P2 | Запитай „кога свърши“ след последния OUT | [01:204](01_WAREHOUSE_LOCATION_TESTS_BG.md) | NOT_RUN | — |
| WH-051 | P2 | Запитай „кога ще свърши“ при stock20 без consumption model | [01:205](01_WAREHOUSE_LOCATION_TESTS_BG.md) | NOT_RUN | — |
| WH-052 | P1 | MOVE reference към документ, който не е от фирмата | [01:206](01_WAREHOUSE_LOCATION_TESTS_BG.md) | NOT_RUN | — |
| REC-001 | P1 | Expected10, receive10 в едно място | [01:212](01_WAREHOUSE_LOCATION_TESTS_BG.md) | NOT_RUN | — |
| REC-002 | P1 | Expected1000, receive700 split400+300 | [01:213](01_WAREHOUSE_LOCATION_TESTS_BG.md) | NOT_RUN | — |
| REC-003 | P1 | След REC-002 receive300 split100+200 | [01:214](01_WAREHOUSE_LOCATION_TESTS_BG.md) | NOT_RUN | — |
| REC-004 | P1 | Раздели1000 като400/350/250 | [01:215](01_WAREHOUSE_LOCATION_TESTS_BG.md) | NOT_RUN | — |
| REC-005 | P1 | Receive10; placements6+3 | [01:216](01_WAREHOUSE_LOCATION_TESTS_BG.md) | NOT_RUN | — |
| REC-006 | P1 | Receive10; placements6+5 | [01:217](01_WAREHOUSE_LOCATION_TESTS_BG.md) | NOT_RUN | — |
| REC-007 | P1 | Receive11 при remainder10 | [01:218](01_WAREHOUSE_LOCATION_TESTS_BG.md) | NOT_RUN | — |
| REC-008 | P1 | Placement quantity0/−1/празно/NaN/Infinity | [01:219](01_WAREHOUSE_LOCATION_TESTS_BG.md) | NOT_RUN | — |
| REC-009 | P1 | quantity_to_receive0/отрицателно за всички редове | [01:220](01_WAREHOUSE_LOCATION_TESTS_BG.md) | NOT_RUN | — |
| REC-010 | P1 | input.items=[] | [01:221](01_WAREHOUSE_LOCATION_TESTS_BG.md) | NOT_RUN | — |
| REC-011 | P1 | Валиден receive qty, placements=[] | [01:222](01_WAREHOUSE_LOCATION_TESTS_BG.md) | NOT_RUN | — |
| REC-012 | P1 | Непознат item_id | [01:223](01_WAREHOUSE_LOCATION_TESTS_BG.md) | NOT_RUN | — |
| REC-013 | P0 | item_id от друга доставка/фирма | [01:224](01_WAREHOUSE_LOCATION_TESTS_BG.md) | NOT_RUN | — |
| REC-014 | P1 | client product_id различен от DB item | [01:225](01_WAREHOUSE_LOCATION_TESTS_BG.md) | NOT_RUN | — |
| REC-015 | P1 | Един item_id два пъти10+10 при expected10 | [01:226](01_WAREHOUSE_LOCATION_TESTS_BG.md) | NOT_RUN | — |
| REC-016 | P1 | Една локация два пъти4+6 за item10 | [01:227](01_WAREHOUSE_LOCATION_TESTS_BG.md) | NOT_RUN | — |
| REC-017 | P1 | Два различни продукта към едно празно място в един submit | [01:228](01_WAREHOUSE_LOCATION_TESTS_BG.md) | NOT_RUN | — |
| REC-018 | P1 | Същият продукт в няколко delivery rows | [01:229](01_WAREHOUSE_LOCATION_TESTS_BG.md) | NOT_RUN | — |
| REC-019 | P1 | Избрано неактивно/несъществуващо място | [01:230](01_WAREHOUSE_LOCATION_TESTS_BG.md) | NOT_RUN | — |
| REC-020 | P1 | Деактивирай мястото след отваряне на modal | [01:231](01_WAREHOUSE_LOCATION_TESTS_BG.md) | NOT_RUN | — |
| REC-021 | P1 | Друг продукт се настанява след отваряне | [01:232](01_WAREHOUSE_LOCATION_TESTS_BG.md) | NOT_RUN | — |
| REC-022 | P1 | Received/cancelled доставка → receive през action | [01:233](01_WAREHOUSE_LOCATION_TESTS_BG.md) | NOT_RUN | — |
| REC-023 | P1 | Draft доставка → receive | [01:234](01_WAREHOUSE_LOCATION_TESTS_BG.md) | NOT_RUN | — |
| REC-024 | P1 | Повторен submit след success | [01:235](01_WAREHOUSE_LOCATION_TESTS_BG.md) | NOT_RUN | — |
| REC-025 | P1 | Timeout след commit, после retry | [01:236](01_WAREHOUSE_LOCATION_TESTS_BG.md) | NOT_RUN | — |
| REC-026 | P1 | Провал при movement2 от3 | [01:237](01_WAREHOUSE_LOCATION_TESTS_BG.md) | NOT_RUN | — |
| REC-027 | P1 | Провал на received_quantity UPDATE след IN | [01:238](01_WAREHOUSE_LOCATION_TESTS_BG.md) | NOT_RUN | — |
| REC-028 | P1 | Провал на finalItems SELECT/status UPDATE | [01:239](01_WAREHOUSE_LOCATION_TESTS_BG.md) | NOT_RUN | — |
| REC-029 | P2 | Добави3 placements, изтрий средния, промени първия | [01:240](01_WAREHOUSE_LOCATION_TESTS_BG.md) | NOT_RUN | — |
| REC-030 | P2 | Смени quantity_to_receive след split | [01:241](01_WAREHOUSE_LOCATION_TESTS_BG.md) | NOT_RUN | — |
| REC-031 | P2 | Close/reopen с незапазен split | [01:242](01_WAREHOUSE_LOCATION_TESTS_BG.md) | NOT_RUN | — |
| REC-032 | P1 | Затвори modal докато submit е pending | [01:243](01_WAREHOUSE_LOCATION_TESTS_BG.md) | NOT_RUN | — |
| REC-033 | P2 | Legacy single location item | [01:244](01_WAREHOUSE_LOCATION_TESTS_BG.md) | NOT_RUN | — |
| REC-034 | P2 | Expected100, received60; reopen | [01:245](01_WAREHOUSE_LOCATION_TESTS_BG.md) | NOT_RUN | — |
| REC-035 | P1 | Placements sum разлика под/равна/над EPS=1e−6 | [01:246](01_WAREHOUSE_LOCATION_TESTS_BG.md) | NOT_RUN | — |
| REC-036 | P2 | Две частични приемания в различни дни | [01:247](01_WAREHOUSE_LOCATION_TESTS_BG.md) | NOT_RUN | — |
| REC-037 | P1 | Receive request без нужната роля | [01:248](01_WAREHOUSE_LOCATION_TESTS_BG.md) | NOT_RUN | — |
| REC-038 | P2 | Delivery detail след split и последващ TRANSFER | [01:249](01_WAREHOUSE_LOCATION_TESTS_BG.md) | NOT_RUN | — |
| REC-039 | P1 | Partial receive, после updateDelivery с нови rows | [01:250](01_WAREHOUSE_LOCATION_TESTS_BG.md) | NOT_RUN | — |
| REC-040 | P1 | Повторно валидно частично приемане с еднакво qty, но различна операция | [01:251](01_WAREHOUSE_LOCATION_TESTS_BG.md) | NOT_RUN | — |
| CAP-001 | P1 | Инвентар на DDL/actions/UI за capacity, unit, mixed, primary и suggestions | [01:259](01_WAREHOUSE_LOCATION_TESTS_BG.md) | NOT_RUN | — |
| CAP-002 | P1 | capacity10, occupied4, receive6 | [01:260](01_WAREHOUSE_LOCATION_TESTS_BG.md) | NOT_RUN | — |
| CAP-003 | P1 | capacity10, occupied4, receive7 | [01:261](01_WAREHOUSE_LOCATION_TESTS_BG.md) | NOT_RUN | — |
| CAP-004 | P1 | capacity0 | [01:262](01_WAREHOUSE_LOCATION_TESTS_BG.md) | NOT_RUN | — |
| CAP-005 | P1 | capacityNULL | [01:263](01_WAREHOUSE_LOCATION_TESTS_BG.md) | NOT_RUN | — |
| CAP-006 | P1 | capacity−1/NaN/Infinity/текст | [01:264](01_WAREHOUSE_LOCATION_TESTS_BG.md) | NOT_RUN | — |
| CAP-007 | P1 | Намали capacity под текущ occupied | [01:265](01_WAREHOUSE_LOCATION_TESTS_BG.md) | NOT_RUN | — |
| CAP-008 | P1 | kg stock срещу capacity в бр. | [01:266](01_WAREHOUSE_LOCATION_TESTS_BG.md) | NOT_RUN | — |
| CAP-009 | P1 | Кутия12 бр.; receive2 кутии в cap24бр. | [01:267](01_WAREHOUSE_LOCATION_TESTS_BG.md) | NOT_RUN | — |
| CAP-010 | P1 | Продукт без тегло/обем при такъв capacity | [01:268](01_WAREHOUSE_LOCATION_TESTS_BG.md) | NOT_RUN | — |
| CAP-011 | P1 | Свободен обем достатъчен, но артикулът не се побира по размер | [01:269](01_WAREHOUSE_LOCATION_TESTS_BG.md) | NOT_RUN | — |
| CAP-012 | P1 | Тегло е на лимит, обем има | [01:270](01_WAREHOUSE_LOCATION_TESTS_BG.md) | NOT_RUN | — |
| CAP-013 | P2 | Частично заето със същия продукт + празно място | [01:271](01_WAREHOUSE_LOCATION_TESTS_BG.md) | NOT_RUN | — |
| CAP-014 | P1 | Съседен код е зает с друг продукт | [01:272](01_WAREHOUSE_LOCATION_TESTS_BG.md) | NOT_RUN | — |
| CAP-015 | P1 | Празно, но inactive location/warehouse | [01:273](01_WAREHOUSE_LOCATION_TESTS_BG.md) | NOT_RUN | — |
| CAP-016 | P0 | Свободно място във фирма B | [01:274](01_WAREHOUSE_LOCATION_TESTS_BG.md) | NOT_RUN | — |
| CAP-017 | P1 | Свободно място в друг склад на A | [01:275](01_WAREHOUSE_LOCATION_TESTS_BG.md) | NOT_RUN | — |
| CAP-018 | P2 | Две еднакво добри места, повтори query | [01:276](01_WAREHOUSE_LOCATION_TESTS_BG.md) | NOT_RUN | — |
| CAP-019 | P1 | BASE-CAP receive1000 | [01:277](01_WAREHOUSE_LOCATION_TESTS_BG.md) | NOT_RUN | — |
| CAP-020 | P1 | BASE-CAP receive1200 | [01:278](01_WAREHOUSE_LOCATION_TESTS_BG.md) | NOT_RUN | — |
| CAP-021 | P1 | Няма нито една подходяща локация | [01:279](01_WAREHOUSE_LOCATION_TESTS_BG.md) | NOT_RUN | — |
| CAP-022 | P1 | Mixed=false и чужд продукт>0 | [01:280](01_WAREHOUSE_LOCATION_TESTS_BG.md) | NOT_RUN | — |
| CAP-023 | P1 | Mixed=true, два продукта, валидни единици | [01:281](01_WAREHOUSE_LOCATION_TESTS_BG.md) | NOT_RUN | — |
| CAP-024 | P1 | Два артикула в една delivery се предлагат към едно място | [01:282](01_WAREHOUSE_LOCATION_TESTS_BG.md) | NOT_RUN | — |
| CAP-025 | P1 | Suggestion после външен IN заема free capacity | [01:283](01_WAREHOUSE_LOCATION_TESTS_BG.md) | NOT_RUN | — |
| CAP-026 | P1 | Двама потребители виждат едно free пространство | [01:284](01_WAREHOUSE_LOCATION_TESTS_BG.md) | NOT_RUN | — |
| CAP-027 | P2 | Ръчно промени suggestion, после refresh/resuggest | [01:285](01_WAREHOUSE_LOCATION_TESTS_BG.md) | NOT_RUN | — |
| CAP-028 | P1 | Генерирай suggestion 10 пъти и затвори | [01:286](01_WAREHOUSE_LOCATION_TESTS_BG.md) | NOT_RUN | — |
| CAP-029 | P1 | OUT освобождава5, после ново предложение | [01:287](01_WAREHOUSE_LOCATION_TESTS_BG.md) | NOT_RUN | — |
| CAP-030 | P1 | TRANSFER към почти пълно място | [01:288](01_WAREHOUSE_LOCATION_TESTS_BG.md) | NOT_RUN | — |
| CAP-031 | P1 | Operator опитва override, после viewer | [01:289](01_WAREHOUSE_LOCATION_TESTS_BG.md) | NOT_RUN | — |
| CAP-032 | P2 | Основна локация full, overflow partial, трета empty | [01:290](01_WAREHOUSE_LOCATION_TESTS_BG.md) | NOT_RUN | — |
| CAP-033 | P2 | Изчерпай overflow, после зареди пак | [01:291](01_WAREHOUSE_LOCATION_TESTS_BG.md) | NOT_RUN | — |
| CAP-034 | P1 | Два bins са физически един адрес по грешка | [01:292](01_WAREHOUSE_LOCATION_TESTS_BG.md) | NOT_RUN | — |
| CAP-035 | P1 | Смени unit/capacity model на вече заето място | [01:293](01_WAREHOUSE_LOCATION_TESTS_BG.md) | NOT_RUN | — |
| CAP-036 | P2 | Warning за остатък BG/EN и на малък екран | [01:294](01_WAREHOUSE_LOCATION_TESTS_BG.md) | NOT_RUN | — |
| CON-001 | P1 | Stock10; два OUT по7 след едно и също прочитане | [01:302](01_WAREHOUSE_LOCATION_TESTS_BG.md) | NOT_RUN | — |
| CON-002 | P1 | Stock10; два различни валидни OUT по5 | [01:303](01_WAREHOUSE_LOCATION_TESTS_BG.md) | NOT_RUN | — |
| CON-003 | P1 | Две issue заявки за същата order12 при stock30 | [01:304](01_WAREHOUSE_LOCATION_TESTS_BG.md) | NOT_RUN | — |
| CON-004 | P1 | Две receive заявки за същия remainder10 | [01:305](01_WAREHOUSE_LOCATION_TESTS_BG.md) | NOT_RUN | — |
| CON-005 | P1 | Две отделни доставки по10, един продукт/локация | [01:306](01_WAREHOUSE_LOCATION_TESTS_BG.md) | NOT_RUN | — |
| CON-006 | P1 | Две доставки с различни продукти към празен bin | [01:307](01_WAREHOUSE_LOCATION_TESTS_BG.md) | NOT_RUN | — |
| CON-007 | P1 | Receive срещу manual IN на друг продукт | [01:308](01_WAREHOUSE_LOCATION_TESTS_BG.md) | NOT_RUN | — |
| CON-008 | P1 | Receive срещу TRANSFER на друг продукт | [01:309](01_WAREHOUSE_LOCATION_TESTS_BG.md) | NOT_RUN | — |
| CON-009 | P1 | Archive location срещу IN след guard read | [01:310](01_WAREHOUSE_LOCATION_TESTS_BG.md) | NOT_RUN | — |
| CON-010 | P1 | Archive warehouse срещу create/restore location | [01:311](01_WAREHOUSE_LOCATION_TESTS_BG.md) | NOT_RUN | — |
| CON-011 | P1 | Два TRANSFER в противоположни посоки A↔B | [01:312](01_WAREHOUSE_LOCATION_TESTS_BG.md) | NOT_RUN | — |
| CON-012 | P1 | Последният OUT и нов IN на същото място | [01:313](01_WAREHOUSE_LOCATION_TESTS_BG.md) | NOT_RUN | — |
| CON-013 | P1 | Cancel order срещу issue | [01:314](01_WAREHOUSE_LOCATION_TESTS_BG.md) | NOT_RUN | — |
| CON-014 | P1 | Edit/delete order item срещу issue | [01:315](01_WAREHOUSE_LOCATION_TESTS_BG.md) | NOT_RUN | — |
| CON-015 | P1 | Edit delivery rows срещу receive | [01:316](01_WAREHOUSE_LOCATION_TESTS_BG.md) | NOT_RUN | — |
| CON-016 | P1 | Cancel delivery срещу receive | [01:317](01_WAREHOUSE_LOCATION_TESTS_BG.md) | NOT_RUN | — |
| CON-017 | P1 | Total120; два payment80 след paid0 read | [01:318](01_WAREHOUSE_LOCATION_TESTS_BG.md) | NOT_RUN | — |
| CON-018 | P1 | Add invoice item срещу issueInvoice | [01:319](01_WAREHOUSE_LOCATION_TESTS_BG.md) | NOT_RUN | — |
| CON-019 | P1 | Update VAT срещу recalc/issue | [01:320](01_WAREHOUSE_LOCATION_TESTS_BG.md) | NOT_RUN | — |
| CON-020 | P1 | Два importOrderItems при празна фактура | [01:321](01_WAREHOUSE_LOCATION_TESTS_BG.md) | NOT_RUN | — |
| CON-021 | P1 | Две legitimate различни плащания30+40 към120 | [01:322](01_WAREHOUSE_LOCATION_TESTS_BG.md) | NOT_RUN | — |
| CON-022 | P1 | Delete payment срещу recalc/new payment | [01:323](01_WAREHOUSE_LOCATION_TESTS_BG.md) | NOT_RUN | — |
| CON-023 | P1 | Мрежата прекъсва преди commit, след commit, преди response | [01:324](01_WAREHOUSE_LOCATION_TESTS_BG.md) | NOT_RUN | — |
| CON-024 | P1 | Процесът спира между movement и item/status UPDATE | [01:325](01_WAREHOUSE_LOCATION_TESTS_BG.md) | NOT_RUN | — |
| CON-025 | P1 | Сесията/ролята се променя след отваряне на форма | [01:326](01_WAREHOUSE_LOCATION_TESTS_BG.md) | NOT_RUN | — |
| CON-026 | P1 | Друг процес мести location към warehouse по време на receive/issue | [01:327](01_WAREHOUSE_LOCATION_TESTS_BG.md) | NOT_RUN | — |
| CON-027 | P1 | Guard SELECT връща error, последващ UPDATE би успял | [01:328](01_WAREHOUSE_LOCATION_TESTS_BG.md) | NOT_RUN | — |
| CON-028 | P1 | Retry на същата операция срещу нова операция със същите стойности | [01:329](01_WAREHOUSE_LOCATION_TESTS_BG.md) | NOT_RUN | — |
| SEC-001 | P0 | Anon отвори всеки data route и print URL директно | [02:13](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| SEC-002 | P1 | Валиден/невалиден email+password; празни полета; spaces | [02:14](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| SEC-003 | P1 | Auth user без profile | [02:15](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| SEC-004 | P1 | Profile inactive | [02:16](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| SEC-005 | P0 | Profile с неизвестна role в изолирана fixture | [02:17](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| SEC-006 | P0 | Viewer извика всяко write action от инвентара директно | [02:18](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| SEC-007 | P1 | Operator и admin изпълнят всяко разрешено действие | [02:19](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| SEC-008 | P0 | Потребител B подаде IDs на A и обратно | [02:20](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| SEC-009 | P0 | B profile има admin role, data queries още ползват DEMO_COMPANY_ID=A | [02:21](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| SEC-010 | P0 | Viewer чрез Data API опита update на собствения profiles.role към admin | [02:22](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| SEC-011 | P0 | Viewer опита role/status/name/company промени на друг profile | [02:23](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| SEC-012 | P0 | Inactive user използва валиден стар JWT към Data API | [02:24](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| SEC-013 | P0 | Anon/viewer извика record_stock_movement с тестова фирма | [02:25](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| SEC-014 | P0 | Провери и 7- и 9-аргументните RPC сигнатури след002/004 | [02:26](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| SEC-015 | P0 | Auth user извика RPC с p_company_id на друга фирма | [02:27](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| SEC-016 | P0 | Пряк INSERT в stock_movements без engine | [02:28](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| SEC-017 | P0 | Пряк UPDATE/DELETE на stock_movements от app role | [02:29](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| SEC-018 | P0 | Пряк UPDATE inventory_balances | [02:30](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| SEC-019 | P0 | Data API CRUD на products/warehouses/locations/suppliers/customers/invoices/payments като viewer | [02:31](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| SEC-020 | P0 | Payload към updateProduct/updateLocation с extra id/company_id/status/created_at | [02:32](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| SEC-021 | P0 | Child от A с parent/product/location/customer от B | [02:33](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| SEC-022 | P1 | Несъществуващ UUID при update/delete | [02:34](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| SEC-023 | P1 | Logout, Back, refresh, повторна action заявка | [02:35](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| SEC-024 | P1 | Expired session и автоматичен refresh на protected route | [02:36](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| SEC-025 | P1 | Active user отвори login; anon отвори login | [02:37](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| SEC-026 | P0 | Директни read actions: getOrderItems/getInvoiceItems/getInvoicePayments/barcode lookups без сесия | [02:38](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| SEC-027 | P0 | За всеки matcher skip тествай приложим route/action URL и method | [02:39](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| SEC-028 | P1 | Cross-origin заявка към state-changing action | [02:40](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| SEC-029 | P1 | Понижи admin/operator до viewer след отваряне на write modal | [02:41](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| SEC-030 | P0 | Source/client bundle/build logs/image layers за service/API secrets | [02:42](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| SEC-031 | P1 | SQL wildcard/syntax-like строки, HTML и script текст в inputs/search | [02:43](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| SEC-032 | P1 | Missing env/DB error/auth error | [02:44](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| SEC-033 | P0 | Viewer директен print URL и export control/action | [02:45](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| SEC-034 | P1 | Login rate/заявки с голям payload в тестова среда | [02:46](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| DB-001 | P1 | Инвентар на таблици/колони/constraints/indexes/triggers/functions/policies/grants | [02:52](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| DB-002 | P1 | Подреди001–016 от двете SQL папки | [02:53](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| DB-003 | P1 | Clean test DB → пълния manifest | [02:54](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| DB-004 | P1 | Upgrade от историческа v0.7/v0.8 fixture | [02:55](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| DB-005 | P1 | Повторно изпълнение само на миграции, заявени като idempotent | [02:56](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| DB-006 | P1 | Inventory UNIQUE(company,product,location), quantity>=0 | [02:57](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| DB-007 | P1 | Movement type/qty/location shape CHECK | [02:58](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| DB-008 | P1 | Expected/ordered>0 и received/issued bounds | [02:59](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| DB-009 | P0 | Company consistency за всяка FK връзка | [02:60](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| DB-010 | P1 | Свери целия ledger с balances чрез независим SELECT | [02:61](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| DB-011 | P1 | Свери received/issued с movements по document+product | [02:62](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| DB-012 | P1 | Invoice totals и amount_paid спрямо underlying rows | [02:63](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| DB-013 | P1 | Cascading delete на parent с исторически данни в изолирана fixture | [02:64](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| DB-014 | P2 | created_at/updated_at trigger при create/update/no-op | [02:65](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| DB-015 | P1 | RPC transaction fault при INSERT/UPSERT | [02:66](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| DB-016 | P1 | SECURITY DEFINER owner/search_path/overloads/effective EXECUTE | [02:67](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| DB-017 | P2 | user_id и references при manual/delivery/order movements | [02:68](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| DB-018 | P1 | Числа с голяма точност/мащаб, PostgreSQL numeric special values | [02:69](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| DB-019 | P1 | Backup → restore в отделна DB | [02:70](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| DB-020 | P1 | Стар app с нова схема/нов app със стара при deployment sequencing | [02:71](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| MST-001 | P1 | Create/edit product с валидни всички полета | [02:79](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| MST-002 | P1 | Duplicate SKU в същата фирма, включително едновременни creates | [02:80](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| MST-003 | P1 | Duplicate barcode активен/архивиран product | [02:81](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| MST-004 | P2 | NULL/празен barcode/SKU в няколко продукта | [02:82](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| MST-005 | P1 | Update product като оставиш собствен barcode/SKU | [02:83](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| MST-006 | P1 | Промени cost/sale/min при съществуващ stock | [02:84](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| MST-007 | P1 | Archive/restore product с balances и pending docs | [02:85](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| MST-008 | P2 | Search кирилица/латиница/case/spaces/category | [02:86](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| MST-009 | P1 | Create/edit warehouse name/address | [02:87](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| MST-010 | P1 | Archive warehouse с active locations | [02:88](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| MST-011 | P1 | Restore warehouse | [02:89](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| MST-012 | P1 | Create/edit location code/zone/row/shelf/bin | [02:90](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| MST-013 | P1 | Един и същ location code в един/два склада | [02:91](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| MST-014 | P1 | Archive/restore location | [02:92](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| MST-015 | P1 | Update warehouse_id/location на зает адрес | [02:93](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| MST-016 | P1 | Create/edit supplier name/phone/email/address/note | [02:94](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| MST-017 | P1 | Deactivate supplier с deliveries/movements | [02:95](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| MST-018 | P1 | Restore supplier | [02:96](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| MST-019 | P1 | Create/edit customer с всички billing fields | [02:97](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| MST-020 | P1 | Duplicate customer name, case/trim варианти | [02:98](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| MST-021 | P1 | Deactivate/restore customer с orders/invoices | [02:99](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| MST-022 | P1 | Quick-create customer от manual OUT; stock недостатъчен | [02:100](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| MST-023 | P1 | Два quick-create OUT със същото име едновременно | [02:101](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| MST-024 | P1 | Непознат ID, чужд ID, SQL error при всяко update/archive/restore | [02:102](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| MOV-001 | P1 | Manual IN10 с supplier и destination | [02:108](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| MOV-002 | P1 | Manual OUT4 с customer от stock10 | [02:109](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| MOV-003 | P1 | TRANSFER4 без party | [02:110](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| MOV-004 | P1 | IN без supplier; OUT без customer; NEW с празно име | [02:111](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| MOV-005 | P0 | Party/product/location ID от друга фирма | [02:112](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| MOV-006 | P1 | Архивиран product/party/location през direct payload | [02:113](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| MOV-007 | P1 | Toggle IN→OUT→TRANSFER след попълване | [02:114](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| MOV-008 | P1 | Rapid double submit, Enter+click, retry след timeout | [02:115](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| MOV-009 | P1 | Подай фалшив reference_type/reference_id допълнително | [02:116](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| MOV-010 | P2 | Notes с multiline/дълъг Unicode текст | [02:117](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| BAR-001 | P1 | Scan 0001234567890 | [02:118](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| BAR-002 | P1 | Празен/whitespace barcode | [02:119](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| BAR-003 | P2 | Непознат/архивиран barcode | [02:120](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| BAR-004 | P1 | DB error при lookup | [02:121](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| BAR-005 | P1 | Един продукт с две локации и едно нулево място | [02:122](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| BAR-006 | P1 | Scan във movement/delivery/order item form | [02:123](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| BAR-007 | P1 | Scanner изпраща Enter след barcode | [02:124](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| BAR-008 | P2 | Два бързи scan-а; първият response идва последен | [02:125](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| BAR-009 | P2 | Scan след смяна на ред във multi-row форма | [02:126](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| BAR-010 | P1 | Viewer използва scan и barcode actions | [02:127](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| BAR-011 | P0 | Barcode от фирма B със сходен product name | [02:128](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| BAR-012 | P2 | Paste/keyboard/scanner, дълъг код, control suffix CR/LF | [02:129](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| DEL-001 | P1 | Create draft/expected с валиден supplier и1/много items | [02:137](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| DEL-002 | P1 | Create с duplicate number | [02:138](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| DEL-003 | P1 | Create без items/с expected<=0 | [02:139](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| DEL-004 | P1 | Header INSERT успех, items INSERT грешка | [02:140](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| DEL-005 | P1 | Update draft сменя supplier/date/note/rows | [02:141](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| DEL-006 | P1 | Update failure след DELETE преди INSERT | [02:142](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| DEL-007 | P1 | Update на partially_received/received/cancelled през action | [02:143](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| DEL-008 | P1 | Cancel draft/expected без движения | [02:144](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| DEL-009 | P1 | Cancel partially_received | [02:145](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| DEL-010 | P1 | Cancel received и повторно receive след това | [02:146](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| DEL-011 | P1 | Status='received'/'cancelled'/непознат през create/update payload | [02:147](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| DEL-012 | P0 | Чужд supplier/product/location/header ID | [02:148](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| DEL-013 | P2 | Добави/изтрий среден item; barcode попълване | [02:149](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| DEL-014 | P2 | Legacy location_id nullable/неактивен | [02:150](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| DEL-015 | P1 | Empty/invalid/malformed dates | [02:151](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| DEL-016 | P2 | Filters по supplier/status/date, count и progress | [02:152](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| DEL-017 | P2 | Detail trace след100+ свързани movements | [02:153](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| DEL-018 | P1 | Опитай edit в стар modal след receive от друг user | [02:154](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| ORD-001 | P1 | Create draft/open с customer | [02:160](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| ORD-002 | P1 | Нов order без customer_id | [02:161](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| ORD-003 | P1 | Подай customer_id A и customer_name на B | [02:162](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| ORD-004 | P1 | Duplicate order_number, case/trim, concurrent create | [02:163](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| ORD-005 | P1 | Add/edit/remove item на draft/open | [02:164](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| ORD-006 | P1 | Add същия product втори път | [02:165](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| ORD-007 | P1 | Quantity нула/отрицателно/NaN/Infinity/невалиден тип | [02:166](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| ORD-008 | P1 | Item CRUD на fulfilled/cancelled | [02:167](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| ORD-009 | P0 | get/update/remove item по чужд itemId | [02:168](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| ORD-010 | P1 | Update header на fulfilled/cancelled | [02:169](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| ORD-011 | P1 | Cancel draft/open | [02:170](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| ORD-012 | P1 | Cancel fulfilled | [02:171](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| ORD-013 | P1 | Issue draft/cancelled/fulfilled/empty order | [02:172](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| ORD-014 | P1 | Open order с два продукта и достатъчен stock | [02:173](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| ORD-015 | P1 | Вторият item няма stock | [02:174](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| ORD-016 | P1 | Пълен stock е разпределен5+7 при request12 | [02:175](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| ORD-017 | P1 | Подай различни client product_id/quantity/issued_quantity | [02:176](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| ORD-018 | P1 | Липсва избор за един item; duplicate/unknown item IDs | [02:177](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| ORD-019 | P1 | Direct location id е inactive/чужд/без нужния product | [02:178](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| ORD-020 | P1 | RPC успех, item/status UPDATE error | [02:179](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| ORD-021 | P1 | Повторно/едновременно issue на същия order | [02:180](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| ORD-022 | P2 | Customer rename/archive след order creation | [02:181](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| ORD-023 | P2 | Избор на from_location и reopen след issue | [02:182](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| ORD-024 | P1 | issued_quantity>ordered в legacy/corruption fixture | [02:183](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| INV-001 | P1 | Create draft с number/customer/date/VAT | [02:191](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| INV-002 | P1 | Duplicate invoice_number, concurrent create | [02:192](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| INV-003 | P1 | Празно име/номер; липсваща/invalid invoice_date | [02:193](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| INV-004 | P0 | Чужд customer/order/product/invoice/item ID | [02:194](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| INV-005 | P1 | Add item с product → auto description; manual item без product | [02:195](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| INV-006 | P1 | BASE-INVOICE двата реда | [02:196](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| INV-007 | P1 | Update quantity/price и remove item | [02:197](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| INV-008 | P1 | Price0; negative; qty0; NaN/Infinity/типови атаки | [02:198](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| INV-009 | P1 | VAT0/20/100/−1/100.01 | [02:199](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| INV-010 | P1 | Промени VAT20→10 при subtotal60.07 | [02:200](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| INV-011 | P1 | Стойности1.005,2.675,0.1×3 и много дробни rows | [02:201](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| INV-012 | P1 | Issue invoice с1/много rows | [02:202](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| INV-013 | P1 | Issue без rows; total0 | [02:203](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| INV-014 | P1 | Edit/cancel header и add/update/remove items след issued | [02:204](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| INV-015 | P1 | Cancel draft; повторно cancel; edit cancelled | [02:205](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| INV-016 | P1 | Import от linked order в празна draft invoice | [02:206](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| INV-017 | P1 | Import без link, без order items, в непразна invoice | [02:207](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| INV-018 | P1 | Два едновременни imports | [02:208](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| INV-019 | P1 | Linked order customer различен от invoice customer | [02:209](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| INV-020 | P1 | Linked cancelled/draft/fulfilled order | [02:210](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| INV-021 | P1 | Header/row запис успее, recalc грешка | [02:211](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| INV-022 | P1 | Issue срещу edit/cancel/VAT change | [02:212](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| INV-023 | P1 | Customer billing fields се променят след issue | [02:213](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| INV-024 | P1 | Sale price се променя между order и invoice import | [02:214](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| INV-025 | P1 | Link order се сменя след imported rows | [02:215](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| INV-026 | P1 | Error при getInvoiceItems | [02:216](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| PAY-001 | P1 | Total120, payment40 | [02:222](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| PAY-002 | P1 | След40 добави80 | [02:223](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| PAY-003 | P1 | Total120, payment120.01 | [02:224](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| PAY-004 | P1 | Payment0/−1/NaN/Infinity/0.001 | [02:225](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| PAY-005 | P1 | Payment към draft/cancelled invoice | [02:226](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| PAY-006 | P1 | Payment към issued zero-total | [02:227](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| PAY-007 | P1 | Всеки метод bank_transfer/cash/card/other и непознат | [02:228](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| PAY-008 | P1 | Missing/invalid/future payment date | [02:229](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| PAY-009 | P1 | Delete40 от paid120 с rows40+80 | [02:230](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| PAY-010 | P1 | Delete последното плащане | [02:231](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| PAY-011 | P0 | Read/delete/add payment към чужда фирма | [02:232](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| PAY-012 | P1 | Delete missing payment; повторно delete | [02:233](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| PAY-013 | P1 | Два payment80 едновременно към120 | [02:234](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| PAY-014 | P1 | Insert payment успех, recalc error | [02:235](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| PAY-015 | P1 | Double click/timeout replay на payment | [02:236](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| PAY-016 | P1 | Payment/delete паралелно с друго payment/recalc | [02:237](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| PAY-017 | P2 | Проследимост на deletion/correction | [02:238](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| PAY-018 | P1 | Подменен client amount_paid/payment_status/total | [02:239](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| PRT-001 | P1 | Admin/operator отвори валидна print страница | [02:245](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| PRT-002 | P0 | Viewer/anon/чужд ID/несъществуващ ID | [02:246](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| PRT-003 | P2 | Print1,30,100 реда на A4 | [02:247](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| PRT-004 | P2 | Дълги description/address/name/note, кирилица | [02:248](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| PRT-005 | P1 | Суми0,0.01,1,21,100,1000,99999.99,100000,1000000 | [02:249](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| PRT-006 | P1 | Полета issuer/bank/recipient празни или примерни | [02:250](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| PRT-007 | P2 | Print при dark mode/BG/EN | [02:251](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| PRT-008 | P1 | Partial/paid invoice после delete payment | [02:252](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| PRT-009 | P2 | Draft/cancelled print | [02:253](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| PRT-010 | P2 | Browser print cancel и Save as PDF | [02:254](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| PRT-011 | P1 | Customer/product rename след issued invoice | [02:255](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| PRT-012 | P2 | Chrome/Firefox/WebKit print preview | [02:256](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| REP-001 | P1 | Свери inventory всички редове с ledger | [02:262](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| REP-002 | P2 | Min15, места10+20 | [02:263](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| REP-003 | P2 | P-NONE/P-ZERO/archived с min>0 | [02:264](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| REP-004 | P2 | Search+product+warehouse+location+status+category | [02:265](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| REP-005 | P2 | KPI карти при активен филтър | [02:266](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| REP-006 | P1 | Stock value с null/0/fractional cost и mixed units | [02:267](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| REP-007 | P2 | 101 movements; търси най-стария по дата/reference | [02:268](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| REP-008 | P2 | 1001 balances/products/deliveries | [02:269](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| REP-009 | P2 | Filter movement IN/OUT/TRANSFER/manual/supplier/customer/delivery/order | [02:270](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| REP-010 | P1 | Movement history покажи from/to и business direction | [02:271](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| REP-011 | P2 | DateFrom/To на ден със събитие23:59 и00:01 | [02:272](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| REP-012 | P2 | Dashboard recent8, last7days chart, top5 | [02:273](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| REP-013 | P2 | Delivery progress partial/received/cancelled | [02:274](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| REP-014 | P2 | Supplier activity за inactive/legacy supplier | [02:275](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| REP-015 | P2 | Empty DB, empty filter, DB failure | [02:276](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| REP-016 | P1 | След IN/OUT/TRANSFER/receive/issue отвори всички засегнати pages | [02:277](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| REP-017 | P2 | Сменени имена/архивирани продукти/локации в history | [02:278](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| REP-018 | P2 | Общо „позиции“ срещу „продукти“ срещу „бройки“ | [02:279](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| EXP-001 | P1 | Export inventory/movements/low-stock/delivery report | [02:285](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| EXP-002 | P1 | Текст с ;, кавички, CR/LF, Unicode | [02:286](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| EXP-003 | P1 | Име/SKU/note започва с =,+,−,@, whitespace/control+formula | [02:287](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| EXP-004 | P1 | Истински отрицателни числови стойности в допустим отчет | [02:288](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| EXP-005 | P2 | Barcode/EIK водещи нули; многоцифрен код | [02:289](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| EXP-006 | P1 | Decimal quantities/prices/totals, BG/EN locale | [02:290](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| EXP-007 | P2 | XLSX sheet name, headers, filters, freeze, widths, multiline | [02:291](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| EXP-008 | P1 | 101/1001+ реда, filtered historical movements | [02:292](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| EXP-009 | P0 | Viewer export controls/direct invocation | [02:293](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| EXP-010 | P2 | Празен dataset; dynamic import/download failure | [02:294](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| EXP-011 | P2 | Повторни downloads, отменяне, memory usage | [02:295](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| EXP-012 | P2 | Имена на файлове/дати/заглавки след BG→EN | [02:296](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| AI-001 | P1 | Data question за всяка tool категория | [02:304](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| AI-002 | P1 | „Издай/изтрий/приеми/плати/анулирай“ | [02:305](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| AI-003 | P1 | „Игнорирай правилата“, инструкции в product/note/tool data | [02:306](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| AI-004 | P0 | Viewer/друга фирма пита за чужд invoice/customer/stock | [02:307](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| AI-005 | P1 | Подадени history roles system/developer/tool/непозната | [02:308](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| AI-006 | P2 | Question length0/500/501; whitespace | [02:309](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| AI-007 | P1 | Огромни предишни messages/history, non-array/null/не-string content | [02:310](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| AI-008 | P2 | Follow-up „да“, „покажи ги“, „кои са“ | [02:311](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| AI-009 | P1 | Paid/unpaid/partially_paid срещу issued/draft/cancelled | [02:312](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| AI-010 | P1 | Product min15, balances10+20; после без balance min5 | [02:313](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| AI-011 | P2 | 51 резултата при tool limit50 | [02:314](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| AI-012 | P1 | Tool DB error | [02:315](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| AI-013 | P2 | Непознат tool name/невалиден JSON/невалидни args/negative limit | [02:316](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| AI-014 | P2 | Provider timeout,429,quota,missing key,invalid model | [02:317](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| AI-015 | P1 | Много едновременни въпроси/дълги tools | [02:318](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| AI-016 | P2 | Max iterations и truncation/празен answer | [02:319](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| AI-017 | P1 | CSV/Excel/export request, включително през follow-up | [02:320](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| AI-018 | P2 | BG/EN, EUR, timezone и units в отговор | [02:321](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| AI-019 | P1 | Сравни DB преди/след всичките10 tools | [02:322](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| AI-020 | P2 | Питай за бъдеща дата на изчерпване/капацитет без модел | [02:323](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| UI-001 | P2 | Keyboard-only: Tab/Shift+Tab/Enter/Space/Escape | [02:331](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| UI-002 | P2 | Modal open/close/focus trap/return focus | [02:332](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| UI-003 | P2 | Screen reader за labels, errors, icon-only buttons, totals | [02:333](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| UI-004 | P2 | 320/375/768/1280/1920px viewport | [02:334](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| UI-005 | P2 | Zoom200%/400%, OS font scaling | [02:335](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| UI-006 | P2 | Dark/light/system theme и reload | [02:336](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| UI-007 | P2 | BG↔EN на всички pages/modals/errors | [02:337](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| UI-008 | P2 | Missing localStorage, corrupted language/theme value | [02:338](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| UI-009 | P2 | Submit pending; double-click/Enter; disabled controls | [02:339](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| UI-010 | P2 | Close с незапазени промени; reopen друг документ | [02:340](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| UI-011 | P1 | Network failure/timeout/reconnect при write | [02:341](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| UI-012 | P2 | Fetch failure в detail modal | [02:342](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| UI-013 | P2 | Toast/validation multiple errors | [02:343](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| UI-014 | P2 | Дълги имена/кодове/числа/notes в tables/cards | [02:344](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| UI-015 | P2 | Sort/filter/reset/back/reload | [02:345](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| UI-016 | P1 | Два таба с различни документи или accounts | [02:346](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| UI-017 | P2 | Date input около midnight/DST/leap day | [02:347](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| UI-018 | P2 | Непознат route/UUID/query params | [02:348](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| UI-019 | P2 | Browser console/hydration/unhandled rejection | [02:349](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| UI-020 | P2 | Focus на scanner input след success/error/reset | [02:350](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| OPS-001 | P1 | Clean checkout, без .next и host node_modules → Docker build/start | [02:358](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| OPS-002 | P0 | Build context/image layers за .env.local/.env.* и credentials | [02:359](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| OPS-003 | P1 | Провери Node tag, lockfile, install method | [02:360](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| OPS-004 | P1 | Build dependencies спрямо production-only install | [02:361](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| OPS-005 | P1 | Запуск като non-root, filesystem write/cache permissions | [02:362](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| OPS-006 | P1 | Supabase URL/anon/service/demo env missing/invalid | [02:363](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| OPS-007 | P0 | Browser bundle/source maps/build logs | [02:364](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| OPS-008 | P1 | Свери Vercel/контейнер Node/env/build configuration | [02:365](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| OPS-009 | P1 | Production start след clean build | [02:366](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| OPS-010 | P1 | graceful shutdown/restart по време на write | [02:367](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| OPS-011 | P1 | Dependency audit към датата на изпълнение | [02:368](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| OPS-012 | P1 | Migration rollout failure и rollback на app | [02:369](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| OPS-013 | P1 | Restore drill | [02:370](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| OPS-014 | P2 | Structured errors/correlation между request, document, movement | [02:371](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| OPS-015 | P1 | Alert за failed writes/ledger mismatch/необичайни retries | [02:372](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| OPS-016 | P2 | README/setup/runbook за нова машина | [02:373](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| OPS-017 | P2 | .gitignore/.dockerignore/.vercel output | [02:374](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| OPS-018 | P1 | Възстанови данни и провери permissions след restore | [02:375](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| PERF-001 | P1 | 101/1001/10001 rows по fetch path | [02:383](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| PERF-002 | P2 | Inventory с10000 products, много balances | [02:384](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| PERF-003 | P2 | Receive с100 items×10 placements | [02:385](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| PERF-004 | P2 | Issue100 items и concurrent operators | [02:386](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| PERF-005 | P2 | Export10000/100000 rows | [02:387](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| PERF-006 | P2 | Low-stock/AI aggregation на голям dataset | [02:388](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| PERF-007 | P2 | Query plans върху tenant/product/location/date filters | [02:389](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| PERF-008 | P2 | 1/10/50 едновременни потребители | [02:390](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| PERF-009 | P2 | Първо отваряне/повторно, slow network/mobile CPU | [02:391](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| PERF-010 | P2 | Дълга сесия,100 modal open/close и downloads | [02:392](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| E2E-001 | P1 | — Доставка → места → преместване → изписване | [02:396](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| E2E-002 | P1 | — Клиент → поръчка → фактура → плащане → печат | [02:407](02_APPLICATION_TEST_CATALOG_BG.md) | NOT_RUN | — |
| VAL-001 | P1 | Задължително поле: липсващ key, undefined, null, empty string, whitespace | [03:15](03_VALIDATION_EVIDENCE_AND_TRACEABILITY_BG.md) | NOT_RUN | — |
| VAL-002 | P2 | Nullable поле: липсва/null/empty/whitespace | [03:16](03_VALIDATION_EVIDENCE_AND_TRACEABILITY_BG.md) | NOT_RUN | — |
| VAL-003 | P1 | String вместо number и обратно; bool, array, object | [03:17](03_VALIDATION_EVIDENCE_AND_TRACEABILITY_BG.md) | NOT_RUN | — |
| VAL-004 | P2 | Текст:1 символ, лимит−1, лимит, лимит+1; много дълъг payload | [03:18](03_VALIDATION_EVIDENCE_AND_TRACEABILITY_BG.md) | NOT_RUN | — |
| VAL-005 | P2 | Кирилица/латиница/emoji/combining chars/non-breaking spaces | [03:19](03_VALIDATION_EVIDENCE_AND_TRACEABILITY_BG.md) | NOT_RUN | — |
| VAL-006 | P1 | Число:−1,−0,0,най-малка положителна единица | [03:20](03_VALIDATION_EVIDENCE_AND_TRACEABILITY_BG.md) | NOT_RUN | — |
| VAL-007 | P1 | NaN, Infinity,−Infinity и текстовите им форми | [03:21](03_VALIDATION_EVIDENCE_AND_TRACEABILITY_BG.md) | NOT_RUN | — |
| VAL-008 | P1 | Много големи числа, >safe integer, exponent, overflow | [03:22](03_VALIDATION_EVIDENCE_AND_TRACEABILITY_BG.md) | NOT_RUN | — |
| VAL-009 | P1 | Decimal digits0/1/2/3/6/7; max permitted precision±1 | [03:23](03_VALIDATION_EVIDENCE_AND_TRACEABILITY_BG.md) | NOT_RUN | — |
| VAL-010 | P1 | `1,25`, `1.25`, `1 000`, `1e3`, tabs, mixed separators | [03:24](03_VALIDATION_EVIDENCE_AND_TRACEABILITY_BG.md) | NOT_RUN | — |
| VAL-011 | P1 | UUID валиден/несъществуващ/грешен формат/празен | [03:25](03_VALIDATION_EVIDENCE_AND_TRACEABILITY_BG.md) | NOT_RUN | — |
| VAL-012 | P0 | Валиден UUID от друга фирма/parent/document | [03:26](03_VALIDATION_EVIDENCE_AND_TRACEABILITY_BG.md) | NOT_RUN | — |
| VAL-013 | P1 | FK към inactive/archived entity | [03:27](03_VALIDATION_EVIDENCE_AND_TRACEABILITY_BG.md) | NOT_RUN | — |
| VAL-014 | P1 | Enum всяка валидна стойност, unknown, case variant, null | [03:28](03_VALIDATION_EVIDENCE_AND_TRACEABILITY_BG.md) | NOT_RUN | — |
| VAL-015 | P1 | Date: leap day, invalid day/month, missing, timestamp вместо date | [03:29](03_VALIDATION_EVIDENCE_AND_TRACEABILITY_BG.md) | NOT_RUN | — |
| VAL-016 | P2 | Date order: due<invoice, expected<order, future payment | [03:30](03_VALIDATION_EVIDENCE_AND_TRACEABILITY_BG.md) | NOT_RUN | — |
| VAL-017 | P1 | Arrays:0/1/max/max+1, null вместо array, null element | [03:31](03_VALIDATION_EVIDENCE_AND_TRACEABILITY_BG.md) | NOT_RUN | — |
| VAL-018 | P1 | Duplicate IDs/objects/placements, разменен ред | [03:32](03_VALIDATION_EVIDENCE_AND_TRACEABILITY_BG.md) | NOT_RUN | — |
| VAL-019 | P0 | Extra properties: id,company_id,status,role,user_id,totals,received/issued | [03:33](03_VALIDATION_EVIDENCE_AND_TRACEABILITY_BG.md) | NOT_RUN | — |
| VAL-020 | P1 | SQL-like strings, HTML/script, formula prefixes и CR/LF | [03:34](03_VALIDATION_EVIDENCE_AND_TRACEABILITY_BG.md) | NOT_RUN | — |
| VAL-021 | P1 | Unique поле: същият запис, друг запис, друг tenant, case/trim/null | [03:35](03_VALIDATION_EVIDENCE_AND_TRACEABILITY_BG.md) | NOT_RUN | — |
| VAL-022 | P1 | Update с частичен/стар payload и concurrent update | [03:36](03_VALIDATION_EVIDENCE_AND_TRACEABILITY_BG.md) | NOT_RUN | — |
| VAL-023 | P1 | Сума на children срещу parent amount/qty | [03:37](03_VALIDATION_EVIDENCE_AND_TRACEABILITY_BG.md) | NOT_RUN | — |
| VAL-024 | P1 | JSON payload много голям/дълбок/неочаквано структуриран | [03:38](03_VALIDATION_EVIDENCE_AND_TRACEABILITY_BG.md) | NOT_RUN | — |
| VAL-025 | P1 | Server/DB отказ при всяка валидираща заявка | [03:39](03_VALIDATION_EVIDENCE_AND_TRACEABILITY_BG.md) | NOT_RUN | — |
| VAL-026 | P1 | Един и същ валиден payload повторен след timeout | [03:40](03_VALIDATION_EVIDENCE_AND_TRACEABILITY_BG.md) | NOT_RUN | — |

## Обобщение при бъдещо изпълнение

| Показател | Начална стойност |
|---|---:|
| Дефинирани case IDs | 488 |
| Разгънати и изпълнени variants | 0 |
| PASS | 0 |
| FAIL | 0 |
| BLOCKED_DECISION | 0 |
| GAP (изпълнена capability проверка) | 0 |
| NOT_APPLICABLE | 0 |
| NOT_RUN | 488 |

Има предварителни рискове и известни функционални ограничения в основния план; нулата в GAP/FAIL тук означава липса на нов run протокол, а не липса на проблеми в приложението.
