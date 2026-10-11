# Исследование hyperknot/xctrack-config

Дата проверки: 2026-10-10. Источник: https://github.com/hyperknot/xctrack-config.
Локальная неизменённая копия: `research/vendor/xctrack-config`.
Закреплённый commit: `8e416bed7b6a5ff34dcfdda7ad28bb4e2fa19017` (2022-08-09T21:26:30+02:00, сообщение `update`).
Проверено через `git rev-parse HEAD`, `git log -1`, `git status --short` (пустой).
Upstream-скрипты не запускались. Чтение JSON выполнялось стандартным PowerShell ConvertFrom-Json.

## Что это за источник

Это коллекция двух пресетов, а не исходный код XCTrack и не спецификация полного формата. README:1-10 описывает импорт через Preferences / Testing & Debug → Import configuration и каталог XCTrack/Config.
README:15-35 разделяет landscape для планшетов и portrait для телефонов. В копии 12 отслеживаемых файлов: два .xcfg, process.py, lib/utils.py, lib/__init__.py, compare-comp.sh, README, LICENSE, .gitignore и три изображения.

## Структура формата

Файлы .xcfg — обычный UTF-8 JSON: lib/utils.py:7-21 использует json.loads/json.dump, с отступом 2 и сортировкой ключей при записи.
В обоих примерах верхние поля: `info`, `layout`, `preferences`.
`layout` содержит массив страниц для `portrait` или `landscape`. Страница имеет `CLASS`, массив `navigations` и массив `widgets`.
В каждом файле две страницы: `org.xcontest.XCTrack.widget.wp.WPXCAssistant` (17 widgets) и `org.xcontest.XCTrack.widget.wp.WPCompetition` (24 widgets), всего 41.
Доказательство структуры: screens/hyperknot-landscape.xcfg:1-28 и screens/hyperknot-portrait.xcfg:1-26.

Виджет имеет полностью квалифицированный `CLASS`, `UUID`, четыре границы `X1/X2/Y1/Y2`, общие настройки и свойства конкретного класса.
Числа, булевы значения, строки и вложенные объекты встречаются одновременно; например `rotation` и `mapWidget_scale`: landscape:270-315.
Нельзя свести настройки к плоскому словарю строк. Обязательность и defaults полей источник не описывает.

## Координаты и порядок

Во всех 82 виджетах примеров границы находятся в диапазоне 0…10000; X1 < X2 и Y1 < Y2.
Полные границы 10000 видны в landscape:30-35,270-275,454-459; portrait:29-33.
**Вывод по примерам, не подтверждённая спецификация:** координаты нормированы отдельно по ширине и высоте страницы; кандидат преобразования для preview — x = X/10000 × width, y = Y/10000 × height.
Upstream не содержит кода рендера, обработки safe area, статуса Android, округления либо правил пересечений; эти детали нужно проверять в целевом XCTrack.
process.py:67-73 сортирует widgets по CLASS. Поэтому порядок в этих примерах не является доказательством порядка наложения/отрисовки. Сохранять исходный порядок и значения до отдельной проверки.

## Виджеты

Оба файла содержат общие классы WAirTime, WAirspaceProximity, WAltitude, WAltitudeAboveGround, WBaroAltitude, WCompass, WGlide, WSpeed, WStatusLine, WThermalAssistant, WTime, WVerticalSpeed, WWindSpeed, WXCAssistant, WXCSpeed, WOptiResult, WOptiUnfinishedTriangle, WNextTurnpointAlt, WNextTurnpointDistance и competition-классы WCompMap, WCompAltitudeOverGoal, WCompGlideToGoal, WCompTimeAtStart.
В landscape дополнительно встречаются WCompPercentage, WCompSpeedToStart; в portrait — WNextTurnpoint, WNextTurnpointGlideTo.
Это только каталог наблюдавшихся классов, а не полный каталог виджетов XCTrack.

Общие наблюдавшиеся поля: `_bg`, `_border`, `_title`, `_unit`, `_units`, `_hide_labels`, `_theme`, `titletext`.
Примеры специализированных настроек: воздушное пространство landscape:30-44; thermal assistant:174-199; XC map:270-323; competition map:454-497.
Карты ссылаются на OpenStreet, terrain, airspaces, rain radar, live tracklogs и waypoints логическими флагами; данных карт в репозитории нет.
Цвет `tracklog_color` представлен отрицательным integer (landscape:494); точный цветовой формат по одному примеру не доказан.
Названия вроде `interval`, `line_thickness`, `maxDistance` сами по себе не доказывают единицы измерения.

## Темы, шрифты и assets

Глобально: `Display.Theme = WhiteHCTheme`, `EarthModel = WGS84`, ориентация PORTRAIT/LANDSCAPE (landscape:792-796; portrait:684-688).
Локальные темы: `_theme = WhiteTheme` либо пустая строка (landscape:25,42,278). Семантика пустой строки и точные цвета не определены.
`fontSize = SMALL` присутствует у карты и thermal assistant (landscape:185,282,463,704).
Файлов шрифтов, family, metrics, renderer, определения палитр, SVG/icon set, web-зависимостей и package manifest нет. Поэтому пиксельное совпадение preview на основе только этого репозитория невозможно подтвердить.

Assets: `images/landscape-xc.jpg`, `images/landscape-comp.jpg` — иллюстрации README:23,27; `images/qr2.png` — QR README:41.
Это демонстрационные изображения, а не runtime-assets виджетов. Нет portrait screenshot.
Отдельных лицензий для изображений нет; общий LICENSE распространяет MIT-условия на software/documentation, но не доказывает происхождение всех показанных элементов приложения.

## Лицензия

LICENSE:1-13 — MIT, Copyright (c) 2017 Zsolt Ero; при копировании существенных частей необходимо сохранить copyright и permission notice.
LICENSE:15-21 — отказ от гарантий. Это лицензия данного репозитория, не лицензия исходников, шрифтов, карт или ресурсов приложения XCTrack.

## Совместимость с 0.9.12.6 / 91260

Landscape имеет `info.versionCode = 90760`, `versionName = 0.9.7.6` (landscape:2-4).
Portrait имеет `70022`, `0.7.0.4-beta1` (portrait:2-4).
В upstream нет примера 91260, version migration, полного schema или тестов импорта в 0.9.12.6. Совместимость целевого backup должна исследоваться отдельно на его оригинале; это исследование его не заменяет.
Сохранение неизвестных верхних полей, CLASS/UUID, вложенных объектов и preferences без изменений — разумное требование для будущего редактора.
Нельзя подменять info значениями upstream, пересортировывать widgets либо использовать process.py как безопасный round-trip:
process.py:15-24 оставляет только layout, два поля info и три выбранные preferences; остальные настройки теряются.
process.py:26-30 содержит одинаковое присваивание landscape = portrait для обоих флагов por2lan/lan2por; lan2por выглядит ошибочным по названию.
process.py:38-54 удаляет страницы/ориентации по флагам. compare-comp.sh:3,20,22-30 удаляет временные файлы/поля и переименовывает результаты.
Эти инструменты пригодны как свидетельство преобразований автора, а не как реализация будущего редактора.

## SHA-256 исходных примеров

| Файл | SHA-256 |
| --- | --- |
| screens/hyperknot-landscape.xcfg | 64050CFF536584583D21C6D854B7E6A32468C44CC90552F18D4743D6DE17A17C |
| screens/hyperknot-portrait.xcfg | 9F07648AEC22CE88589A94FDA6D2C048E3A811273DB9680378D5B55EA115E919 |
| images/landscape-comp.jpg | A46CADB3B7A7C6FA7B096ED33743E1EB8C6E3F9A395E69083F0106D7931B5CE6 |
| images/landscape-xc.jpg | A81A5809AABEC50265C64154FF13B3D72FEB7AC326E4EFDF7146F19AD6C1046D |
| images/qr2.png | E166BB1478F349D5243FFFD302DB42559624206B7BBA5262C4809FB80476AA2D |

## Выполненная проверка и границы доказательств

Оба JSON успешно разобраны; посчитаны страницы и виджеты, проверены прямоугольники, получены SHA-256, git status чистый.
Проверка статическая. Не выполнялись upstream-скрипты, импорт на устройстве, рендер XCTrack, runtime-проверка, изменение пользовательского backup или реализация редактора.
Все номера строк относятся к закреплённой локальной копии; онлайн permalink: https://github.com/hyperknot/xctrack-config/tree/8e416bed7b6a5ff34dcfdda7ad28bb4e2fa19017.
