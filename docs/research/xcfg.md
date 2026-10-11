# XCFG: исследование образца

Дата: 2026-10-10. Целевая совместимость: **XCTrack 0.9.12.6, versionCode 91260**.

## Источник и метод

Прочитан личный XCFG sample, без записи в оригинал.
Размер 57 132 bytes; SHA-256 `6574578a818a0a83bc363a4d247d1582ddbc751a98a35a9dfff5da3861114c8b`.
Это UTF-8 JSON, не ZIP и не XML. `info.exportType = "backup"`, `info.versionName = "0.9.12.6"`, `info.versionCode = 91260`.
Остальные метаданные и личные настройки не копируются в документацию.

Воспроизводимая инвентаризация: [sample-inventory.json](sample-inventory.json), инструмент [inspect_xcfg.py](../../tools/inspect_xcfg.py).
JSONPath в отчёте — ссылки на конкретные поля исходного образца. Это наблюдаемая структура одного backup, **не официальная универсальная JSON Schema**.

## Структура

| Путь | Тип / объём | Назначение и граница исследования |
|---|---|---|
| `$.info` | object, 6 полей | версия, тип экспорта, метаданные |
| `$.layout` | object | основные экранные раскладки |
| `$.layout.landscape` | array, 2 страницы | самостоятельные страницы альбомной ориентации |
| `$.layout.portrait` | array, 2 страницы | самостоятельные страницы портретной ориентации |
| `$.preferences` | object, 150 ключей | display, units, sensors, navigation, events, sound и другие настройки |
| `$.airspaceSelectedChannels` | пустой array | нет данных для вывода о структуре элемента |

У каждой страницы поля `CLASS`, `navigations`, `widgets`. В образце классы страниц:
`org.xcontest.XCTrack.widget.wp.WPXCAssistant` и `org.xcontest.XCTrack.widget.wp.WPCompetition`.
`navigations = "all"`. Это поле следует сохранить, а не трактовать как имя страницы.

| JSONPath | Виджетов | Пар прямоугольников с положительной площадью пересечения |
|---|---:|---:|
| `$.layout.landscape[0]` | 19 | 12 |
| `$.layout.landscape[1]` | 8 | 6 |
| `$.layout.portrait[0]` | 16 | 12 |
| `$.layout.portrait[1]` | 13 | 10 |
| Всего | 56 | 40 |

Пересечения не являются ошибками: показатели и кнопки накладываются на карту или thermal assistant.
Сохранение массива виджетов обязательно; точный native порядок композиции устанавливается по APK.
Страницы противоположных ориентаций нельзя автоматически связывать по индексам и преобразовывать друг в друга.

## Поля виджета

`CLASS` — полное имя Android-класса, не короткое UI-название. Координаты `X1/Y1/X2/Y2` — целочисленные границы, все наблюдаемые значения в 0..10000. В образце все 56 прямоугольников имеют положительную площадь.

Линейное отображение `x = X * contentWidth / 10000`, `y = Y * contentHeight / 10000` пригодно лишь для схемы layout. В APK найден дополнительный этап quantization на native grid; он обязателен для точного preview (см. [APK](apk.md)).
`contentWidth/contentHeight` относятся к полётной области, а не ко всему окну браузера и не обязательно ко всему Android screenshot.
Grid count зависит от pixels и densityDpi; normalized bound сначала переводится в grid cell, затем в pixel boundary. Эти округления и inset нужно проверить на Android.
Не выводить размер устройства из дробных координат: XCFG не хранит доказанные пиксельные размеры экрана.

Общие поля: `_border`, `_bg`, `_theme`; для текстовых — `_title`, `titletext`, `_unit`, `_hide_labels`, иногда `_units`.
Встречаются `_bg` 0, 50, 80, 100. APK подтверждает **transparency**, а не opacity: native background alpha `floor((100 - _bg) * 255 / 100)`; 100 — прозрачный фон, 0 — непрозрачный. Не использовать `_bg / 100` как opacity. Theme inheritance — в исследовании APK.
`_theme` бывает пустой строкой, `WhiteTheme`, `BlackTheme`; глобально `Display.Theme = BlackHCTheme`.
Заголовки в образце пустые (`titletext = ""`), поэтому реальные русские подписи необходимо брать из ресурсов и поведения XCTrack.

Настройки карт — вложенные объекты, например `rotation`, `mapWidget_scale`, `mapWidget_mapAppearance`, `mapWidget_emergencyZoom`.
Тепловой помощник использует `mapScale`/`drawScale`; карта — `mapWidget_scale`/`mapWidget_drawScale`. Не унифицировать имена в экспортируемом JSON.
`fontSize = SMALL/MEDIUM/LARGE` не означает CSS px. `mapWidget_heading_arrow_sizecoef` отличается между экземплярами.

## Дисплей, единицы и цвет

`Display.Fullscreen = true`, ориентация `PORTRAIT`, язык `ru`, интервал перерисовки строкой `"500"`.
Размер заголовка также строкой `"100"`, font `default`, цвет заголовка `-8421505`, outline выключен, outline color `-16777216`.
Не преобразовывать типы этих полей при экспорте.

Единицы: высота m, ground speed km/h, wind/vertical speed m/s. Distance зависит от конкретного ключа (`m,km` / `km`).
Нельзя использовать один глобальный unit для всех показателей; `_units = SYS_UNIT` — отдельный режим.
Отрицательные цвета похожи на Android signed ARGB int; интерпретация для интерфейса через `value >>> 0`, но исходное signed число должно сохраняться. Подтверждение Android color use — в исследовании APK.

## Каталог образца

Полный prefix: `org.xcontest.XCTrack.widget.w.`. Частоты и все наблюдаемые ключи — в inventory.

| Группа | Классы | Приоритет |
|---|---|---|
| Простые числа и время | WAirTime, WTime, WSpeed, WAltitude, WAMSL, WAltitudeAboveGround, WVerticalSpeed, WWindSpeed, WThermalAltGain | первые эталонные renderers |
| Направление и статус | WWindDirection, WStatusLine | после font/theme/label metrics |
| Планирование и навигация | WGlide, WNextTurnpointGlideTo, WNextTurnpointAlt, WNextTurnpointTimeOfArrival, WCompGlideToGoal, WCompAltitudeOverGoal | условные данные, no-data и единицы |
| Кнопки | WButtonZoom, WButtonNavig | иконки, alpha, native размеры |
| Сложная графика | WThermalAssistant, WXCAssistant, WCompMap, WCompTaskSummary | отдельные renderers и flight/task models |

Итого **23 класса**, не полный каталог XCTrack.
`WAltitude` и `WAMSL` нельзя объединять без исследования источника данных и форматирования.

## Что нельзя терять

В preferences есть дополнительные раскладки `ActiveLook.Layout` (object с pages) и `Maverick.Layout` (object с widgets). Они вне начального редактора телефона, но сохраняются целиком.
`Navigation.State` содержит состояние навигации, `Sensors.Configuration` — конфигурацию сенсоров, `EventMapping` — действия. Их нельзя заменять значениями симуляции.
Backup ссылается на внешний waypoint-файл; сам XCFG не обеспечивает наличие карт, terrain, airspace или всех waypoint datasets.
Служебные опечатки вроде `Airspace.MaxDiscoverDistnace` сохраняются буквально.

## Контракт совместимости

1. Читать backup как исходное JSON-дерево с открытыми unknown fields; хранить исходные bytes отдельно.
2. Отсутствие изменений: экспорт исходных bytes. После редактирования: patch только конкретных известным редактору полей; semantic equality всех не затронутых ветвей.
3. Отдельные ID редактора, selection, history и sim data не попадают в XCFG.
4. Неизвестный CLASS: сохраняемый placeholder, не подмена известным классом и не удаление.
5. Версия вне исследованного профиля: диагностический просмотр; экспорт модифицированной конфигурации только после проверки профиля, без автоповышения версии.
6. Дубликаты ключей, некорректные числа, чрезмерные размеры/глубина, invalid geometry: диагностика, без частичного «починенного» экспорта.
7. Сохранять backup-формат на первом этапе. Layout-only export нельзя объявлять поддержанным без проверки native import.

Текущий инструмент проверяет только primary layout и делает инвентарь. Он не проверяет import в XCTrack, зависимости данных, визуальное соответствие или полную семантику preferences. Пять synthetic tests доказывают ограниченный read-only анализ, обработку overlap/unknown fields, отсутствие Pilot.Name в отчёте, отказ при duplicate keys/non-JSON numbers и запрет CLI overwrite input; они не являются тестами будущего exporter.
