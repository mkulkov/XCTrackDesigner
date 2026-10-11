# Калибровка простых виджетов 0.9.12.6

Дата: 2026-10-10. APK 91260; Medium_Phone, emulator-5554, API35, 1080×2400, 420 dpi, fullscreen portrait. Установка без PRO, язык приложения ru, Unit.Speed km/h, Unit.VerticalSpeed m/s, Unit.Altitude m, Display.WidgetTitleSize 100, title outline false. Исходные файлы и ранее полученные screenshots не изменены.

Этот документ сохраняет первоначальный Arial baseline. Последующая калибровка штатных шрифтов и размеров: [font-calibration.md](font-calibration.md).

## Native эталон

Синтетическая, не содержащая личных данных страница: [calibration.xcfg](../../tests/fixtures/calibration.xcfg). Импортирована штатным меню «Заменить только окна». Восемь widgets проверяют White/WhiteHC/Black/BlackHC, единицы, title, `_bg=50`, overlap и no-data/hide_labels. `titletext` специально присутствует: в этой native установке он игнорируется без PRO.

[Native capture](screenshots/calibration-values-portrait.png). SHA256: `48db60a6cac070d942502f6d93982d9086bfdd6aea8b23b9ebc45c3dca0e7a4b`. Второй capture через несколько минут имеет тот же hash. Нет изменяющихся часов/statusline/карты. Наблюдаемые входы: speed 0, vario 0, AMSL unavailable, полёт не начат (AirTime empty). Это устойчивый stationary reference, а не доказательство управления всеми sensor inputs: реальные полётные/negative/large native значения пока не получены.

После QA обратно импортированы только окна из предыдущего приватного backup. Preferences не заменялись, сохранённые backup-файлы не изменялись. Веб-прототип экспортирует копии, не меняет original backup.

## Перенесённые правила

- `ValueWidget.onDraw` строки 954–1108: `_hide_labels && value==null` прекращает рисование всего widget. При наличии значения title/unit сохраняются. Null без hide_labels рисует background/border/title, но не число и не unit.
- `WAirTime` наследует TextWidget и использует `%d:%02d` (hours:minutes), без seconds. Null flight даёт пустой список текстов. `_hide_labels` не переносится на этот другой drawing path.
- `theme.a.I/a0` строки 353–356 / 803–810: title center x=width/2, baseline=-ascent, reserved height=floor((descent-ascent)/1.5). `a.b0` строки 817–853: размер title зависит от dpi, diagonal, Display.WidgetTitleSize и outline. Используем viewport dpi=420; browser Arial metrics заменяют Android fonts, поэтому baseline/height пока приближённые.
- `theme.a.U` строки 706–770: margin 3px, fit по ширине и полной font height, размеры >30 округляются вниз до десятков. С unit число занимает 3/4 ширины и выравнивается вправо, unit имеет отдельную четверть; дробные единицы выводятся двумя строками с разделителем. Native исторический metric cache пока не перенесён.
- `WVerticalSpeed` строки 34–76: default avg=2000 ms; title suffix `/ 2s`; color GREEN при >=0, RED при <=-1, иначе NORMAL, до преобразования единиц. Native formatter `util.x` 99–104 / `util.r` использует signed DecimalFormat и Math.round; Common m/s выводится до десятых, ru decimal comma. Проверены zero в native; другие значения проверены static + web unit tests, не native runtime.
- `WSpeed` + `w/b0`: overrides SYS_UNIT/KM_H/M_S/MP_H/KT. Conversions из `util.e1`: km/h 3.6, mph 2.236936292054402, kt 1.943844 на SI m/s. В UI ручная скорость пока km/h, не универсальный SI frame.
- `wm.u.i` строки 166–171 и `t0.L/M`: custom title PRO-gated. Title color в `theme.b0` также gated; non-PRO #7f7f7f. В первом профиле custom title/color не применяются, но сохраняются в XCFG. PRO режим не симулируется.
- Themes: NORMAL WhiteTheme/BlackTheme #ffffc0, WhiteHC #000, BlackHC #fff; GREEN #a0ffa0, RED #ffa0a0. White числовые значения имеют native-like black outline 10px (WhiteHC NORMAL без outline); SIMPLE units White #505050 / Black #f0f0f0; borders #808080. Color/background constants и наблюдаемый stationary screenshot согласованы; glyph shapes требуют отдельной проверки.

## Измерения

[Безопасный отчёт](calibration-comparison.json). Web screenshot сформирован из actual SVG в 1080×2400 через Canvas, без selection overlay, CSS scaling или resize native reference. Распределение данных для сравнения: speed=0, vario=0, AMSL=null, time=null. Все шесть контрольных RGB points совпали; RGB=128 plateau границы overlay совпали: left295/top1300/right833/bottom1698. Geometry box из APK grid: x295/y1300/width540/height400. Цветовые plateau края учитывают native width-1 и border, не подменяют box bounds.

Pixelmatch threshold0.1, includeAA=true:

| Область | Доля отличающихся пикселей |
|---|---:|
| Весь экран | 3.1367% (81304 pixels) |
| Speed + units | 5.8247% |
| Vario + units | 10.7188% |
| Missing altitude/time | 0.4048% |
| Overlap/alpha | 3.7752% |
| Missing/hide | 0.0952% |

Это baseline расхождения, **не процент визуальной точности**: пустые площади уменьшают whole-screen ratio. Основные видимые различия — custom native glyphs против Arial, font metrics/fit/cached sizes и Android versus browser rasterization. Проверен только один размер/язык/stationary state. Не объявлять pixel-perfect, general theme parity или native-identical flight algorithms.

## Воспроизведение и следующий шаг

`npm run check` и `npm run test:e2e`. Calibration E2E всегда сравнивает geometry/color points с сохранённым native reference, генерирует `.local/calibration-web.png`, `.local/calibration-diff.png` и JSON измерений. Альтернативный эталон через XCT_QA_NATIVE; приватный sample по XCT_QA_SAMPLE. Native эталон не перезаписывается тестом.

Следующая контрольная точка: лицензированный font adapter/Android metric measurements, metric cache и native zero/negative/large/unit-off cases. Complex maps и широкий drag/drop editor остаются отдельно.

Заключительный full export после восстановления проверен: layout и preferences равны backup до calibration; отличается только info.timeCreated. [Restore report](calibration-restore.json). Оригинальный пользовательский backup повторно проверен по исходному SHA256.
