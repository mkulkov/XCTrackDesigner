# Статический разбор XCTrack 0.9.12.6

Дата: 2026-10-10. Только исследование APK; приложение не установлено и не запускалось. Исходные XCFG и телефон не изменялись.

Последующая runtime проверка выполнена по отдельному запросу пользователя: [эмулятор, native screenshots и import/export](android-runtime.md). Ниже сохранены границы первоначального статического анализа.

## Происхождение и воспроизводимость

Официальная [страница скачивания](https://xctrack.org/Download.html) ведёт на [production APK](https://dev.xctrack.org/xctrack-latest.apk). Загруженный файл `research/apk/xctrack-latest.apk` имеет размер **33 710 858 байт**, SHA-256 **27ab4d0fb2b74a0dd5c148afa55e827882a9632276defb4d137989ca642c4b9f**. Ссылка latest изменяемая; для этого исследования идентичность определяется сохранённым хешем.

`aapt dump badging` из Android SDK build-tools 35.0.0 подтвердил `org.xcontest.XCTrack`, **versionName 0.9.12.6 / versionCode 91260**, minSdk 21, targetSdk 36. Доказательства: `research/apk/badging.txt`, `provenance.json`, `archive-inventory.txt`.

`apksigner verify --verbose` завершился с `Verifies`: схемы v1 и v2 проходят, один подписант. Сертификат CN=Petr Chromec, O=XContest; SHA-256 сертификата `513134f67c4efc51f7650bb2657e1f45fc4244e224cd3f9d61051c252700f593`. `signature.txt` содержит вывод и предупреждения о META-INF. Проверка подписи обеспечивает целостность этого файла, но отдельного независимого pin официального сертификата здесь нет.

Код исследован [JADX](https://github.com/skylot/jadx) 1.5.6 из официального GitHub release; URL загрузки инструмента сохранён в `jadx-release.json`. Полный разбор завершился с 196 ошибками методов (`jadx.log`); декомпиляция не равна исходному коду и не доказывает поведение методов с ошибками. Исходные DEX остались внутри неизменённого APK. `decompiled/` — только производные исследовательские данные.

**Ловушка JADX:** обычный вывод ошибочно заменил числовой делитель 10000 ссылкой на чужую `ModuleDescriptor.MODULE_VERSION` (140). Геометрию повторно извлечено с `--no-replace-consts --single-class org.xcontest.XCTrack.widget.d0`; использовать `research/apk/d0-raw.java`, не символически подставленные константы обычного вывода.

## Геометрия, слои, фон

Все ссылки ниже относительны к `research/apk/decompiled/sources/`, кроме специально указанного raw-файла.

- `d0-raw.java:279–290`: импорт CLASS/X1/Y1/X2/Y2 преобразует каждую координату в целое число ячеек: `(coord * gridCount + 5000) / 10000` с целочисленным делением. Затем границы корректируются методом E. Это двухступенчатая геометрия, а не непосредственный процент экрана.
- `org/xcontest/XCTrack/ui/i0.java:43–77`: физическая сетка зависит от доступного размера экрана, fullscreen/insets и densityDpi. Размер желаемой ячейки `max(8, 0.11952191 * densityDpi)`, число ячеек `round(screenPixels / cellSize)`, фактический шаг `screenPixels / count`. Методы b/c (:89–95) возвращают `round(cellIndex * step)`.
- `widget/d0.java:132–134`: Android layout задаётся четырьмя преобразованными границами. `ui/r0.java:43–48` измеряет ширину как разность преобразованных X2/X1, аналогично высоту.
- `widget/i0.java:207–252`: список виджетов загружается по порядку JSON-массива; неизвестный CLASS логируется и пропускается. `ui/r0.java:19–25` добавляет Android children в этом порядке. Последующий виджет обычно рисуется над предыдущим по стандартному порядку Android ViewGroup; это обоснованный вывод из кода контейнера, который ещё требует проверки overlap-скриншотом.
- `d0-raw.java:257–264`: `_bg` — **прозрачность**, альфа заливки `((100 - _bg) * 255) / 100`; при 100 заливка отсутствует. Цвет берётся из темы; прямоугольник заканчивается на width−1/height−1.
- `widget/d0.java:349–356`: сначала фон, затем опциональная `_border`. У верхнего/левого края экрана начало рамки −1 вместо 0.5. `_theme` может переопределить тему отдельного виджета (:74–82).

## Текст и темы

`widget/TextWidget.java:265–291`: сначала базовый фон/рамка, затем заголовок при `_title=true`, затем строки контента. Заголовок может заменяться строковым setting (`getTitle`, :245–246). Высота заголовка определяется метриками шрифта: `floor((descent-ascent)/1.5)` (`theme/a.java:353–355`); его baseline −ascent, X — половина ширины (:803–809).

`theme/a.java:706–770`: текст автоматически вписывается в область с отступами 3 px с каждой стороны, измеряет максимальную ширину строк и суммарные метрики высоты, выбирает минимум двух допустимых размеров. При размере >30 px округляет вниз к кратному 10. Выравнивание кодируется битами (1 left, 2 right, 8 bottom; иначе centre); строки рисуются Android Paint с ascent/descent. Эти размеры нельзя корректно заменить одним CSS font-size. Кэш `sm.a` сохраняет ограничения измерений, поэтому последовательность значений тоже может влиять на масштаб.

`widget/ValueWidget.java:954–998` использует отдельный путь чисел, единиц и иконок. При null и активном hide-setting может вообще не рисовать виджет; иначе фон/заголовок возможны без значения. Числовые виджеты нельзя моделировать как универсальный TextWidget с произвольным текстом.

Основные шрифты подключены через Android resources в `org/xcontest/XCTrack/c.java:395–396`: `res/font/droidsans_bold_xctrack_custom.ttf` и `roboto_condensed_bold.ttf`. Заголовок использует DEFAULT_BOLD либо condensed по настройке (`theme/a.java:833–854`); основной Paint создаётся с пользовательским droidsans (:143–154). `assets/fonts/Assistant-SemiBold.ttf` существует, но его присутствие не доказывает использование для flight widgets. Ресурсы `assets/maverick/*.sifz` относятся к отдельному стеку очков; не переносить их как основной UI.

Право распространять извлечённые шрифты/ресурсы в будущем веб-редакторе не установлено. Наличие файла в APK не является лицензией на его повторное распространение; перед публикацией нужны отдельные условия/разрешение либо законно доступная замена с явно измеренными визуальными отличиями.

`ValueWidget.java:93–100` задаёт `_title=true`, `_unit=true`, `_hide_labels=false` по умолчанию; `wm/u.java:32` связывает пользовательскую строку заголовка с ключом `titletext`. `_unit` управляет отдельной отрисовкой единиц, а глобальные `Unit.*` определяют выбранные единицы/формат. Превью должно отличать boolean `_title` от строкового `titletext`.

`decompiled/resources/res/values/arrays.xml` содержит пять тем: BlackTheme, BlackHCTheme, WhiteTheme, WhiteHCTheme, WhiteEInkTheme. Есть отдельные Java-классы для каждой; например WhiteTheme задаёт белый основной фон и чёрный текст (:94–100). VTM map themes в assets — отдельные темы карты, а не замена UI theme.

## Инвентаризация и границы доказательств

В APK три DEX и native ABI arm64-v8a, armeabi-v7a, x86, x86_64. `widget-class-inventory.txt` содержит 81 явно именованный класс W*. Регистрация — `widget/o.java:92`: среди прочих WAltitude, WVerticalSpeed, WCompass, WCompMap, WNextTurnpoint, WStatusLine, WFreeText, WWebView. Базы MapWidget/TextWidget/ValueWidget и многочисленные обфусцированные helpers требуют отдельного сопоставления с конкретной XCFG.

Все 23 класса текущего обезличенного inventory найдены в этом APK; машинное сопоставление — `research/apk/sample23-native-map.json` (класс, непосредственная база, путь, собственный onDraw). Числовые WAMSL/WAltitude/WAltitudeAboveGround/WCompAltitudeOverGoal/WCompGlideToGoal/WGlide/WSpeed/WThermalAltGain/WVerticalSpeed/WWindSpeed наследуют ValueWidget. WAirTime/WTime/WWindDirection — TextWidget. WCompMap/WXCAssistant — MapWidget. WNextTurnpointAlt/WNextTurnpointGlideTo и WNextTurnpointTimeOfArrival используют промежуточные базы. Собственный Canvas onDraw имеют WButtonNavig, WButtonZoom, WCompTaskSummary, WStatusLine, WThermalAssistant: их визуальное поведение не покрывается одним универсальным текстовым renderer.

Для точного визуального контракта ещё нужны эталонные screenshots XCTrack **этой версии** на согласованном Android: размер полезной области и densityDpi, одинаковая тема/шрифтовые settings, title/unit/null состояния, перекрытия с `_bg` 0/50/100, icon scaling и карты с одинаковыми данными. Статический APK подтверждает формулы и наличие ресурсов, но не доказывает пиксельное совпадение браузерного preview. В этом исследовании runtime/device проверки не проводились.
