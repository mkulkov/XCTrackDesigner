# Графические приборы XCTrack 0.9.12.6

Дата: 2026-10-10. Источник — сохранённый APK версии 91260 и его JADX-разбор, описанный в [apk.md](apk.md). Эта проверка уточняет визуальный контракт пяти графических приборов. `web/src/NativeFlightGraphics.tsx` использует самостоятельно построенные SVG shapes, без копирования Android resources. Пиксельное совпадение этой реализации здесь не заявляется.

## Исправленные различия

| Класс | Что подтверждено кодом APK и перенесено | Что остаётся приближением |
|---|---|---|
| `WCompass` | Круг, деления через 30°, одна буква N вместо четырёх сторон/числового курса, двойная заливка стрелок, поворот rose, heading/bearing/navigation/wind flags, новый 70° сектор ветра, native цвета обычных White/Black themes. Нет добавленных редактором пояснений внутри прибора. | FlightState содержит один heading, он также используется как GPS bearing; отдельный магнитный heading отсутствует. POINT/OPTIMIZED/CYLINDER используют один task bearing. Нет специального EInk painter. |
| `WVarioColumn` | 40 сегментов, 0.2 m/s на сегмент основной шкалы ±4 m/s, overflow bands до ±7.8 m/s, пороговые цвета, отсутствие подписи/делений/числового значения. При missing value ничего не рисуется. | Avg — среднее предоставленных скоростей по окну, native вычисляет разность высот на границах окна; precision/антиалиасинг и edge insets отличаются. |
| `WVerticalGraph` | **График высоты во времени**, не vertical-speed graph. Точки без соединяющей линии, квантованный диапазон `vertical_step` в метрах, вертикальная двусторонняя стрелка с числом диапазона, окно `interval` в ms, `dot_size` в десятых долях mm и `dot_color`. При empty history blank. | История симулятора задаётся с меньшей плотностью, чем сенсорный ряд Android; метрики текста и pixel rasterization отличаются. |
| `WAltitudeDataGraph` | Горизонтальные bars по 100-метровым altitude bins, минимальный диапазон 10 bins, выбранный GRAPH_THERMAL/GRAPH_WIND/GRAPH_SPEED, максимум и минимум высоты справа, линия текущей высоты, native ARGB defaults, thickness/text_size. Это **не временной line graph**. | Расчёт среднего в bin независимый; native агрегирует собственные datasets. В FlightSample нет wind bearing/GPS bearing для стрелок внутри bins. Цвет скорости APK существует в коде, хотя не зарегистрирован в settings; его импортированный override учитывается. |
| `WSideView` | No GPS — blank; отсутствующий DEM не превращается в плоскую поверхность. Terrain profile только из явного input, native SIDE_BEARING/SIDE_NAVIG; расстояние, серый рельеф, aircraft marker, пункт назначения и final glide в navigation mode. | Bitmap painter coroutine `a0.invokeSuspend` не декомпилирован (JADX Overflow). SVG terrain projection и aircraft shape независимые. Отсутствие terrain означает blank в нашем preview; это выбор при missing input, не доказательство native blank при missing DEM. |

Общий физический масштаб воспроизводит `theme/a.b0`: mm = dpi / 25.4; при диагонали больше 127 mm применяется native display adjustment. По умолчанию используется исследовательский профиль 1080 × 2337 / 420 dpi; component принимает фактические `screenWidth`, `screenHeight`, `densityDpi` для другого preview viewport.

## Ссылки на сохранённый код

Все пути ниже относительно `research/apk/decompiled/sources/`:

- `org/xcontest/XCTrack/theme/a.java:360–441`, методы K/L: split arrows, 140° side points, rose radius/30° ticks/N; `:816–830` физический масштаб.
- `org/xcontest/XCTrack/theme/WhiteTheme.java:70–100`, `BlackTheme.java:75–98`: исходные RGB обычных тем. High-contrast и EInk требуют отдельной painter-проверки; boolean light не делает их одинаковыми.
- `org/xcontest/XCTrack/widget/w/WCompass.java:131–157`: defaults; `:183–281`: порядок wind sector/background/arrows и источники rotation. Enum `widget/w/n.java`: NORTH, HEADING, BEARING, TRAVEL_DIRECTION. Enum `wm/e.java`: POINT, OPTIMIZED, CYLINDER, NONE.
- `org/xcontest/XCTrack/widget/w/WVarioColumn.java:89–493`: диапазоны segments/colors; `:495–511`: separator size от физической theme metric. `org/xcontest/XCTrack/info/b.java:46–66` подтверждает avg в ms и разностный native estimator.
- `org/xcontest/XCTrack/widget/w/WVerticalGraph.java:97–109`, `:231–329`, `:332–371`: окно, dots, range arrow и размеры. `org/xcontest/XCTrack/info/n.java:85–88` подтверждает, что в f26056a передаётся **altitude**, а не скорость варио; `wm/x.java` — metre range options.
- `org/xcontest/XCTrack/widget/w/WAltitudeDataGraph.java:120–135`: высотный диапазон; `:137–187`: arrows в bins; `:190–220`: bars; `:234–670`: datasets, altitude/current marker и labels; `:675–713`: text size/thickness. `widget/w/g.java` — три graph enums.
- `org/xcontest/XCTrack/widget/w/WSideView.java:132–141`: defaults; `:204–213`: GPS/bitmap guard; `widget/w/a0.java:62–75`: ошибка декомпиляции большого bitmap painter. Без дополнительной DEX-проверки source parity для SideView не доказана.

## Проверка

`tests/native-flight-graphics.test.ts` проверяет физический масштаб, ±4/8 диапазоны варио, native empty state, dots altitude graph, выбранный altitude dataset, settings flags/ветровой сектор. `tests/graphic-widget.test.ts` обновляет assertions только этих пяти приборов; другие семейства не менялись. 6 целевых тестов и ESLint прошли. Android visual comparison и общие check/E2E выполняет интеграционный этап отдельно.
