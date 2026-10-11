# План разработки и контрольные точки

Дата: 2026-10-10. Пользовательская граница: сначала исследование; полноценный редактор не начинать до завершения этого этапа.

## Текущий статус после выполнения оставшихся функциональных этапов

Этот раздел заменяет ранние записи «ещё не начат» ниже; они сохранены как история исследования.

| Этап | Выполнено | Граница |
|---|---|---|
| 1. Исследование | XCFG, upstream, APK, native import/export, полный реестр 78 классов | Полная спецификация закрытых алгоритмов не получена |
| 2. Совместимость | Lossless импорт/экспорт, native grid и базовая калибровка | Доведение шрифтов остановлено пользователем; pixel parity не заявляется |
| 3. Редактор | Страницы, слои, drag/resize, каталог, typed/JSON настройки, история | PRO зависит от native entitlement; Android-действия инертны |
| 4. Симуляция | Общая модель позиции/ветра/показаний, маршрут, дистанции/ETA/прибытие, replay/seek, история | Учебная модель, не native flight algorithms; нет автоматического XContest scoring/ESS |
| 5. Графика и карты | Компас, графики, thermal trace, профиль, status/task/proximity; pan/zoom/GPS-follow/rotation, трек/маршрут, высотный фильтр зон | Компоновка ряда приборов перенесена из APK; [покрытие всех 78 классов](research/widget-rendering-coverage.md); профиль рельефа задаётся явно; FL/NOTAM/активации неизвестны; KK7 localhost заблокирован поставщиком |
| 6. Локальная поставка | IGC replay, optional IndexedDB черновик, обработка отсутствующих данных, production build и launcher | Node.js требуется; другие версии только просмотр, до отдельного исследования |

Офлайн-карты, аккаунты и облачное размещение исключены из текущей области. Native-like воспроизведение всех сложных графических деталей и собственных закрытых алгоритмов XCTrack остаётся возможным дальнейшим исследованием, а не выполненным критерием. Рабочий доступ к KK7 требует разрешённого поставщиком источника/конфигурации.

Запуск: [local-release.md](local-release.md). Контракт симуляции и ограничения: [simulation.md](simulation.md). Итоговые проверки фиксируются в [implementation.md](implementation.md).

Продолжение исследования: [runtime QA на эмуляторе](research/android-runtime.md) выполнено — native backup и pages-only import/export, четыре скриншота sample. Веб-importer/exporter реализован и проверен также через native import изменённой копии. Получен стабильный stationary calibration reference: native geometry/alpha/z-order и null states измерены. Controlled negative/large sensor values и font metrics остаются впереди.

Настройка проекта выполнена: React/TypeScript/Vite, ESLint/Prettier, Vitest/Playwright/Chromium, PNG diff и Android helpers. См. [setup](setup.md). Профиль 91260 разрешает scoped coordinate edits; остальные версии доступны только для просмотра.

## Этап 1 — исследование и проектирование (первичный анализ завершён)

Артефакты: SHA256 и безопасный inventory sample, pinned upstream, version-verified APK inventory, выводы о совместимости, архитектура, этот план.
Выход: факты отделены от гипотез; неизвестные параметры и ограничения занесены в docs. Исходники XCTrack не изменены.
Visual/runtime calibration остаётся отдельной контрольной точкой: первичное статическое исследование не подтверждает полное визуальное совпадение.
Нельзя объявить APK исследованным по одной странице download или только по `info` в XCFG.

## Этап 2 — совместимость и калибровка (базовые проверки выполнены)

Последняя сверка: перенесено правило integer measuring size Android Minikin; whole-frame diff 10029 px, title bbox ≤1 px на эталоне 100%. Добавлен отдельный эталон 140% и строгий opt-in gate pixel parity =0, который пока не проходит. [Исследование и ограничения](research/minikin-size.md). Эти данные обновляют прежние показатели ниже, а не означают завершение этапа.

Продолжение: подключены штатные локальные шрифты и история размеров чисел/единиц; добавлен явный сброс. Stationary visual diff 0.58125%, без регрессии после кеша. [История и оставшиеся различия заголовков](research/text-history.md). Динамический native oracle и полное совпадение текста остаются открытыми критериями.

Реализованы пункты 1–2 и приближённый SVG preview пункта 5: импорт backup/pages, lossless экспорт, координаты и undo/redo, ручные показания четырёх классов. Native grid mapping перенесён; geometry/alpha calibration выполнена на одной stationary page. ValueWidget/TextWidget drawing paths разделены, text fit/unit regions/null states перенесены. Font/cache и остальные состояния требуют следующей калибровки: [value-calibration](research/value-calibration.md). См. [implementation](implementation.md). Широкий drag/drop editor ещё не начат.

1. Создать React/TypeScript/Vite shell и native version profile 91260.
2. Реализовать lossless source-document importer/exporter и открытые типы; unknown widget placeholders; diagnostics. Сначала no-op export, затем один known-property patch.
3. Получить native screenshots 0.9.12.6: основной portrait/landscape, отдельный calibration page с overlaps, прозрачностью, title/unit и themes. Зафиксировать resolution, density, content rectangle, units/language, controlled data, data sources.
4. Сверить APK-derived coordinate rounding, font metrics, z-order и colors с эталонами.
5. Read-only preview одной страницы: WSpeed + WVerticalSpeed + WAMSL + WAirTime; прочие классы сохраняются и отображаются диагностически.

Готовность: byte-identical no-op, edited semantic preservation, typecheck/build, воспроизводимый measured visual diff простых виджетов. Если screenshots недоступны — prototype явно approximate, gate точности остаётся открытым.

## Этап 3 — основной визуальный редактор (текущий)

Page/orientation selector, layer list, selection, move/resize/snap, duplicate/delete, add known widgets, settings inspector, undo/redo.
Начать с чисел/времени, затем direction/status/buttons. Defaults новых виджетов из version profile; без догадок о неизвестных enums.
Предпросмотр границ/наложений и сохранение новой конфигурации через download; original file не перезаписывается.

Готовность: reopen экспортированного документа даёт те же известные settings/bounds/order; unknown fields и untouched preferences равны; все команды обратимы; pointer hit tests для overlaps; smoke на portrait/landscape. Native import edited копии — самостоятельное подтверждение, требуется тестовая среда.

## Этап 4 — симуляция и навигационные виджеты

Virtual clock, null-aware SI frame, deterministic сценарии, manual controls, play/pause/seek, независимость sim/config.
WGlide, turnpoint/goal/arrival отображают явно выбранные simulation models; отдельные test cases для no-task/no-terrain/no-GPS и единиц.
Готовность: replay одинакового сценария даёт одинаковые значения/frames, FPS не меняет averages, sim changes не меняют export. Алгоритмы не называются native-identical без oracle.

## Этап 5 — thermal, task summary и карты

Thermal trace/circle/wind, native-like task summary, rotation and zoom controls, deterministic offline map layers.
Затем изучить Mapsforge/VTM themes, terrain datasets, airspace и waypoint import как самостоятельные подсистемы. Проверить resource rights и data licensing до включения assets.
Готовность: каждый сложный renderer имеет capability/accuracy status, reference dataset и visual tests; mock map не выдаётся за карту XCTrack.

## Этап 6 — расширение и выпуск локального приложения

IGC replay, optional IndexedDB drafts, missing-input diagnostics, дополнительные widget classes и версии после отдельного исследования.
Документация запуска, privacy/locality, compatibility matrix; locked dependencies, offline build smoke, export/import на тестовом Android с резервной копией.
Не добавлять cloud/login/upload как часть этого запроса.

## Риски и способы закрытия

| Риск | Решение / критерий |
|---|---|
| Полный backup затронет unrelated preferences | raw tree + scoped patches + preservation tests |
| Координаты похожи, pixels отличаются | APK rounding + calibrated content area и device density |
| Browser fonts/rasterization отличаются от Android | font rights/metrics + measured glyph/geometry diff |
| Upstream старее target | рассматривать как исторический пример, не schema authority |
| Карты не содержатся в backup | offline fixtures, отдельные data adapters и explicit missing inputs |
| Closed-source native algorithms | ограничить claims, oracle-controlled values и documented approximations |
| PRO-specific appearance/options | сохранить поля; доступность функций проверять на конкретной native среде |
| Дубликаты keys/unknown types | strict parsing diagnostics, запрет «успешного» частичного экспорта |

## Реестр следующих исследований

- Полные native defaults/labels/options для всех 23 классов, включая title overrides и no-data format.
- Pixel output для Android Canvas/Paint, statusline icon spacing, native fonts и API-dependent typeface.
- Семантика map scale, pan/zoom, map themes и terrain, сравнение conditional PRO rendering.
- Full backup versus layout-only native export/import behaviour и action/page switching.
- Как версия/метаданные backup изменяются самим XCTrack при повторном экспорте.

Длительности не оценены: цена точности зависит от доступности native screenshots и объёма complex map rendering. Переход к каждому этапу по измеренным критериям, без расширения реализации заранее.

## Обновление приоритета: редактор

Пользователь остановил работу над полным соответствием шрифтов. Этап 3 начат: реализованы drag/resize на SVG-холсте, ограничение границ, привязка к шагу native grid, отмена жеста и единичная команда undo/redo. Следующие задачи: устойчивые идентификаторы и структурный patch API, затем добавление/удаление/дублирование виджетов и страниц, inspector штатных настроек. Существующая калибровка сохраняется как регрессия; pixel parity не блокирует развитие редактора.


Структурные команды этапа 3: выполнены token splice API, внутренние устойчивые widgetIds/pageIds, duplicate/delete/reorder для виджетов и страниц, поддержка пустой страницы, защита последнего виджета и undo/redo. Есть каталог четырёх простых виджетов, новая конфигурация, копирование импортированных шаблонов, inspector оформления и keyboard commands.

## Онлайн-слои вместо офлайн-карт

По последнему запросу пользователя отдельный Mapsforge reader и хранение карт стран исключены из текущего направления редактора. Реализованы Mercator OSM-подложка с дорогами, KK7 TMS heatmap и XContest v6 контуры через ограниченный loopback relay. Данные загружаются по включению/кнопкам, в XCFG не записываются. Каталог зон выбирается онлайн; GeoJSON HTTPS поддержан как дополнительный источник. Источники и доказательства — [data-sources.md](research/data-sources.md).

Завершённый checkpoint: `npm run check` — 43 unit + 6 Python; браузерные тесты — 12 passed, 1 skipped (исследование шрифтов остановлено пользователем). Native roundtrip редакторских структурных команд проверен на эмуляторе, defaults добавляются самим XCTrack. Для сети E2E использует mocks; реальный браузер подтвердил OSM и 197 зон XContest. KK7 отклоняет localhost: нужна разрешённая конфигурация источника/согласование поставщика, это отдельная внешняя зависимость.

Следующие функциональные этапы: связывание карты с FlightFrame/GPS, управление центром/масштабом через карту в отдельном режиме от drag виджетов, настройки картографических виджетов, IGC replay. Обработка высот и активаций зон требует отдельного адаптера и проверки сроков действия; текущие контуры не считать активными. Не возвращаться к доведению шрифтов без нового запроса пользователя.

## Перенос библиотеки XCTrack

Перенесён полный зарегистрированный каталог профиля 91260: 78 классов, категории/поиск/PRO/debug, native default settings из контролируемого export для 71 обычного класса. Все доступны для размещения и structural editing, известные primitive settings — в inspector, остальные/unknown — в JSON editor. Native import всего набора успешно выполнен; обычный export исключает 7 debug-классов. Preferences сохранены, исходные страницы эмулятора восстановлены.

Разделы управления экраном и раскладкой добавлены 2026-10-11: глобальные параметры Display/Unit, операции страниц и доступность по native режимам навигации. Изменения проходят через token patch и общую историю. Android-проверка новых preference controls и восстановления стандартных раскладок остаётся отдельной задачей; [границы реализации](research/screen-page-layout.md).

Добавлены 38 basic renderers (всего 42 с исходными четырьмя), FreeText, независимые simulation inputs. Сложная графика остаётся схематической; расширение conditional rendering, navigation/task state и графиков требует отдельных native references. Перенос каталога не считать завершением полётных алгоритмов либо полной visual parity. [Исследование и доказательства](research/widget-library.md).
