# Текстовые и числовые виджеты: профиль 91260

Обновлено 2026-10-10. Источник правил ниже — локальная декомпиляция APK XCTrack 0.9.12.6, `research/apk/decompiled/sources/`. Это APK-derived evidence; unit-тесты подтверждают независимую реализацию этих правил, а не пиксельное совпадение Android/browser.

## Перенесённые правила

| Правило | Первичный источник | Реализация |
|---|---|---|
| При отсутствии значения ValueWidget сохраняет заголовок, а не добавляет `--`; `_hide_labels` скрывает виджет только при `null` | `org/xcontest/XCTrack/widget/ValueWidget.java:954–980`; `androidx/fragment/app/k.java:210–213` | Отдельные признаки отсутствующего native значения и существующего formatter-результата. AirSpeed/Netto/Wind/QNH с пустым formatter-текстом могут сохранять единицы |
| Время без GPS показывает `--:--:--`/`--:--` | `widget/w/WTime.java:60–90` | Сохранены особые заглушки WTime и showSec |
| Местоположение имеет DEG, DEG_MIN, DEG_MIN_SEC и UTM, несколько строк и правое выравнивание | `widget/w/WLocation.java:50–145`; `theme/a.java:745–756` | Координаты из явной GPS-позиции; строки native форматов; независимая WGS84 UTM-конверсия. Для отсутствующих координат используются соответствующие native placeholders |
| Следующая точка и время до старта используют отдельные области строк с весами 2:1 | `widget/w/WNextTurnpoint.java:41–42,59–99`; `widget/w/WCompTimeToStart.java:47–54,66–134`; `widget/WeightedTextWidget.java:392–439` | Добавлены WNextTurnpoint/WCompTimeToStart; раздельный fit cache и области главного/второго текста. Следующая точка может брать имя из текущего simulation task |
| Процент скоростной секции — текст `N%` без отдельной unit-области, округление Math.rint | `widget/w/WCompPercentage.java:43–72` | Добавлен WCompPercentage, ties-to-even, допустимые 0..100. Ввод — явно рассчитанный процент, не native модель leading points |
| Навигационная цель меняет скобки: OPTIMIZED `[value]`, CYLINDER `(value)`, POINT без скобок | `widget/WNextTurnpointSomething.java:32–35,176–194`; `wm/g0.java:10–22`; `wm/e.java:31–39` | use_brackets/navigation_target для наследников WNextTurnpointSomething, без изменения исходного XCFG или входов симуляции |
| Дистанция выбирает единицу пары при достижении одной большой единицы; точность и floor определяются formatter | `util/p.java:21–67`; `util/e1.java:172–177`; `widget/w/WTakeoffDistance.java:42`; `widget/w/WCompDistanceToGoal.java:38` | Unit.CompetitionDistance, m/km/ft/yd/mi/nm; малая единица пары целая, большие единицы и одиночные по native порогам |
| Прибытие показывает интервал, а не текущее время; доступны COMPACT/HMS/HM/WITH_UNITS | `widget/w/WNextTurnpointTimeOfArrival.java:46–103`; `widget/w/WCompTimeAtStart.java:47–106`; `wm/f.java:17–21`; `util/x.java:253–380` | Вход числом — длительность в секундах; поддержаны native time_format, знак, infinity за native пределом. Явные текстовые значения остаются готовыми display strings |
| Netto, thermal gain и высота прибытия имеют разные положительные/отрицательные тона | `widget/w/WNettoVario.java:62–76`; `widget/w/WThermalAltGain.java:33–42`; `widget/w/WCompAltitudeOverGoal.java:84–87`; `widget/w/WCompAltitudeOverESS.java:76–79` | Переданы зеленый/красный/обычный тон; netto_avg отображается в заголовке |
| Glide может показывать положительное варио вместо качества | `widget/w/WGlide.java:70–94` | showVario использует явный SI-вход вертикальной скорости. Расчёт native average/glide engine не утверждается |
| ExternalData без данных выводит `-` плюс suffix или скрывается; BrightnessInfo без состояния — `?` | `widget/w/WExternalData.java:85–119`; `widget/w/WBrightnessInfo.java:38–54` | Сохранены отдельные no-data состояния, suffix и _hide_labels |
| Текст/weighted текст применяет theme stroke; WhiteEInkTheme имеет чёрные показания/единицы | `theme/a.java:777–801`; `theme/WhiteEInkTheme.java:58–61,157–170` | Поддержана пятая тема; текстовые строки получают outline согласно теме |
| Цифровой компас имеет абсолютный или относительный режим, число со стрелкой и degree-область | `widget/w/WCompassDigital.java` getValue; `util/u.java:25–65`; `widget/w/o.java:26–38` | Относительный угол к явному heading, native семь секторов стрелки, target для bearing/heading/navigation/wind, знак цвета. При отсутствии необходимого heading/task — пустое значение |
| Закат/гражданские сумерки имеют абсолютное время или +h:mm, порог showBefore и warning tone | `widget/w/WSunset.java` getValue; `widget/w/l0.java:25–30`; `widget/w/WSunsetCivil.java:24–28` | Явный display clock или секунды; sunset remaining задаётся независимо для tone/showBefore. Астрономическая модель не подменяется фиктивным расчётом |
| XC result/unfinished triangle используют general-distance formatter (500), отдельный track bitmap слева | `widget/w/WOptiResult.java:33–62`; `widget/w/WOptiUnfinishedTriangle.java:33–57`; `widget/ValueWidget.java:985–1016`; `util/x.java:126–131` | Добавлены value scenes, Unit.Distance и floor. При явном `WidgetValues[CLASS.type]` open/flat/fai рисуется независимый SVG track icon с цветным фоном; score/route selection не угадывается |

Калиброванные WSpeed/WVerticalSpeed/WAMSL/WAirTime сохраняют существующий drawing path и числовое форматирование. Defaults применяются существующим WidgetPreview только при отрисовке и не записываются в XCFG.

## Проверка и границы

- `tests/widget-content.test.ts` и `tests/value-layout.test.ts`: 28 тестов, включая native no-data, скобки, единицы, интервалы, UTM на центральном меридиане, weighted fit, tones, WhiteEInkTheme, digital compass, sunset и optimization icons.
- TypeScript и ESLint для изменённых файлов проходят. Общая сборка/E2E выполняются интегратором после изменений графических renderer-ов.
- Изменения не доказывают соответствия native flight computations, фильтров сенсоров, усреднения, gate scheduling или raster/font metrics. Время до старта и процент принимаются явными данными; native task algorithm не заменён утверждением о паритете.
- GPS-координаты из IGC не создают отсутствующие ветер, высоту рельефа, внешние сенсоры или task значения. Неизвестные настройки по-прежнему сохраняются lossless.
- MAN-флаг и динамические цветовые пороги WWindSpeed, расширенные data-index ExternalData и вычисление altitude/glide по разным navigation_target требуют дальнейшего переноса native state engine. Rendering скобок не означает переноса этого алгоритма.
- Дополнительные simulation inputs: WSunset/WSunsetCivil числом — локальные секунды от полуночи в ABSOLUTE_TIME или секунды до события в RELATIVE_TIME; `<CLASS>.remaining` задаёт время до события для tone/showBefore. После заката готовый текст `GAME OVER`/следующее событие должен приходить из модели: renderer сам не вычисляет завтрашний закат. WOptiResult/WOptiUnfinishedTriangle числом — метры, `<CLASS>.type` — явный open/flat/fai. Число WCompassDigital — абсолютное направление; renderer вычисляет только относительный угол к имеющемуся heading.

