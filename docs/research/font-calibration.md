# Шрифты и размеры: контрольная точка 2026-10-10

Последующее изменение: [история размеров и измерения заголовков](text-history.md). Исторический cache уже перенесён в веб-preview; ограничения ниже описывают первоначальную контрольную точку.

Профиль: XCTrack 0.9.12.6/91260, non-PRO, ru, Android API35, emulator-5554, 1080×2400, 420 dpi. Эталон и контролируемые показания описаны в [value-calibration.md](value-calibration.md). Исходные XCFG/APK и native screenshot не изменены. Новый [отчёт](font-calibration-comparison.json) содержит hashes, регионы и геометрию; предыдущий отчёт с Arial сохранён.

## Что реализовано

Числа и единицы рисуются шрифтом `droidsans_bold_xctrack_custom.ttf` из APK (resource `res/H5.ttf`, проверяется SHA256). Заголовки используют локальный Android `Roboto-Regular.ttf`, weight 700. Шрифты находятся только в игнорируемом `.local/fonts`, выдаются loopback Vite server по двум фиксированным адресам и не включаются в dist. Без файлов приложение показывает статус «приближённые шрифты» и работает с Arial; с файлами — «штатные шрифты». Это статус источника шрифтов, не сертификат pixel-perfect.

Chromium отклоняет оригинальный custom TTF: OTS сообщает `cmap: bad format 12 subtable group (startCharCode=0x1100BF...)`. В браузерной копии удалены две записи вне диапазона Unicode. `glyf`, `hmtx` и допустимые сопоставления не меняются; пересчитаны offsets/checksums. Стандартный Python, без дополнительных зависимостей. Synthetic test проверяет сохранение контуров/advances и контрольную сумму SFNT. Оригинальный APK не распаковывается с перезаписью и не модифицируется.

Перенесены ограничения `sm.a`/`theme.a.U`: начальные inverse width/height равны 1, поэтому узкий символ не растягивается сверх доступной ширины; font fit начинается с native размера 30 и округляется вниз до десятков. Координаты символов используют округлённые advances для приближения native Paint без subpixel text. Вертикальные метрики берутся из hhea, а не округлённого Canvas fontBoundingBox: value ascent1901/descent483, title1900/500, unitsPerEm2048. Делитель дробной единицы использует целочисленное деление native. Размеры виджетов по-прежнему вычисляются APK grid, экспортируемые координаты не меняются.

## Результат в исходном разрешении

Pixelmatch threshold0.1, includeAA=true; снимок actual SVG DOM, 1080×2400, без масштабирования. Все контрольные RGB и четыре границы overlay совпали.

| Область | Arial baseline | Штатные локальные шрифты |
|---|---:|---:|
| Весь экран | 3.1367% / 81304 px | 0.5813% / 15066 px |
| Speed + units | 5.8247% | 0.6694% |
| Vario + units | 10.7188% | 2.5031% |
| Missing altitude/time | 0.4048% | 0.2952% |
| Overlap/alpha | 3.7752% | 0.3816% |
| Missing/hide | 0.0952% | 0.0619% |

Whole-screen ratio уменьшился на 81.5%, но **это не процент точности**: пустые области доминируют. Bounding box пикселей точного цвета заполнения speed `0`: native и web left199/top163/right388/bottom448. Vario `+0,0`: обе ширины left581/right934; native top240/bottom399, web top238/bottom400. E2E проверяет точное совпадение первой коробки и отклонение второй не более 2 px. Это bounding box цветового заполнения, а не полная маска контура или ink-box со stroke.

## Ограничения и следующий критерий

Полного совпадения пока нет: заголовки имеют отличия в ширине/контуре, на краях чисел остаются расхождения hinting/anti-alias. Не переносился исторический cache максимальных метрик native: в симуляторе размер считается заново по текущему значению с начальными ограничениями. Android font selection и метрики разобраны статически, но самостоятельный runtime Paint probe не получен: `app_process` был Killed; составную сборку/установку вспомогательного APK автоматическая проверка отклонила с `blocked by policy`, без подробной причины. Вспомогательный APK не установлен. Результат проверен сравнением с настоящим сохранённым экраном XCTrack, а не подменой native oracle.

Следующий критерий — runtime glyph advances/default typeface, исторический cache, дополнительные controlled large/negative/unit-off native captures. Condensed title font, PRO и другие устройства требуют отдельной калибровки. Карты остаются схемами. Локальное использование extracted fonts не означает разрешение на их распространение; для поставки нужна отдельная проверка лицензий.

## Воспроизведение локальных шрифтов

```powershell
New-Item -ItemType Directory -Force .local/font-probe | Out-Null
& C:\opt\AndroidSDK\platform-tools\adb.exe -s emulator-5554 pull /system/fonts/Roboto-Regular.ttf .local/font-probe/android-title-source.ttf
python tools/prepare_fonts.py --apk research/apk/xctrack-latest.apk --title .local/font-probe/android-title-source.ttf
npm run check
$env:XCT_QA_SAMPLE='C:\path\to\your\private-sample.xcfg'
npm run test:e2e
```

Manifest содержит SHA256, не приватную конфигурацию. Browser captures/diff остаются `.local/calibration-*.png`; native reference не перезаписывается. Итоговая проверка: typecheck, ESLint, formatting, 23 Vitest, 6 Python, 5 E2E (включая исходный private sample). Проверены byte-preserving export и отсутствие изменения original hash.
