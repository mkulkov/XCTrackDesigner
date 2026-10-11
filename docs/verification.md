# Проверки этапа исследования

Дата: 2026-10-10. Эта запись относится к исследованию, не к готовому редактору.

Позже по запросу пользователя выполнена [runtime проверка](research/android-runtime.md): Android API35 emulator-5554, native install/start 91260, sample import, full backup export/reimport, pages-only export/import, 4 flight screenshots. [JSON comparison](research/native-roundtrip.json) подтверждает layout equality всех exports и preferences equality после pages-only import. Первоначальная таблица и список «не выполнялось» ниже относятся к статическому этапу; runtime/импорт теперь проверены в указанном объёме. Pixel diff/browser editor ещё не проверялись.

| Проверка | Результат |
|---|---|
| Исходный XCFG parse / inventory | 4 pages, 56 widgets, 23 classes, 40 overlap pairs, 0 geometry issues в primary layout |
| Оригинал до/после | SHA256 одинаков: `6574578a818a0a83bc363a4d247d1582ddbc751a98a35a9dfff5da3861114c8b` |
| `python -m unittest discover -s tests -v` | 5/5 pass: overlap/unknown, private field exclusion, duplicate keys, invalid geometry, non-JSON number, read-only/overwrite protection (часть проверок объединена в один test) |
| `python -m py_compile tools/inspect_xcfg.py tests/test_inspect_xcfg.py` | pass |
| Повторное вычисление inventory | соответствует сохранённому `sample-inventory.json` |
| Upstream | pinned `8e416bed7b6a5ff34dcfdda7ad28bb4e2fa19017`, vendor git status чистый, scripts не выполнялись |
| APK manifest и signature | aapt подтверждает 0.9.12.6 / 91260; apksigner v1/v2 verifies; SHA256 в APK doc |
| Native class coverage | 23/23 sample classes найдены; mapping в `docs/research/native-widget-map.json` |
| Decompilation | полный JADX сообщил 196 ошибок методов; критическая геометрия повторно извлечена без подстановок констант |
| Локальные относительные Markdown links | проверены на существование target files |
| Финальный набор файлов проекта | только docs, read-only analysis tool/tests, .gitignore; исследовательские APK/vendor excluded из Git |

## Не выполнялось

- React typecheck/build и browser interaction tests: приложение ещё не реализовано по границе первого этапа.
- Android установка/запуск, native import/export edited backup, screenshot capture/diff.
- Проверка всех native formatter/default states, flight algorithms, real map/terrain/airspace datasets.
- Распространение извлечённых ресурсов или лицензирование fonts.

Исходный backup не изменён. Исследовательские выводы достаточны для выбора архитектуры и последовательности прототипирования; точное визуальное воспроизведение остаётся проверяемой целью следующих этапов.

## Checkpoint реализации прототипа, 2026-10-10

- `npm run check`: passed, 16 Vitest + 5 Python tests, TypeScript/ESLint/Prettier и Vite production build.
- `XCT_QA_SAMPLE=<private sample>; npm run test:e2e`: 4/4 Chromium tests. Synthetic import/edit/undo/redo/export, read-only version, invalid upload, simulation isolation, responsive loaded preview и реальный sample 4 pages / 56 widgets.
- Sample no-op download: byte-identical; changed export отличается ровно `/layout/portrait/0/widgets/0/X2`.
- Native import edited copy «только окна»: success. Native re-export layout equal web export, preferences equal previous native backup. [Path-only report](research/web-native-roundtrip.json).
- Preview приблизительный: font/theme/locale/formatters и сложные widgets не прошли pixel calibration. Условные подложки карт помогают видеть прозрачные текстовые слои, но не воспроизводят map data.

Исторические «не выполнялось» выше относятся к начальному research checkpoint; текущая реализация и ограничения описаны в [implementation](implementation.md).

## Checkpoint калибровки ValueWidget

`npm run check`: 22 Vitest + 5 Python, typecheck/lint/format/build pass. `XCT_QA_SAMPLE=<private>; npm run test:e2e`: 5/5 Chromium pass. Geometry/color reference проверяется calibration E2E по сохранённому native screenshot; duplicate stable capture имеет тот же SHA256. Private sample no-op/edit и simulation/export isolation повторно проверены.

[Результаты pixel comparison](research/value-calibration.md): geometry/alpha points и overlay edges совпали; fonts/value layout ещё различаются. Static/unit tests negative values и conversions не заменяют native sensor-state QA. Калибровочный экран заменял только layout на emulator-5554; после проверки восстановлена предыдущая раскладка через native pages-only replacement.
