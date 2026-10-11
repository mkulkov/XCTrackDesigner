# XCTrack Screen Designer

Локальное веб-приложение для визуального конструирования и симуляции экранов XCTrack.
Целевая версия первого профиля: **0.9.12.6 / 91260**.

Доступен локальный редактор: **импорт/экспорт XCFG, страницы обеих ориентаций, слои, drag/resize, undo/redo и каталог 78 виджетов** со штатными настройками. 42 класса имеют числовой/текстовый preview и ручную симуляцию; сложные виджеты отображаются приблизительно. Подключены онлайн-карты и геозоны. Сохранение исходных данных проверено на пользовательском backup. Дальнейшая калибровка шрифтов остановлена по запросу пользователя. Подробности: [реализация и ограничения](docs/implementation.md).

## Запуск и проверки

Для отдельного окна Windows: запустите `release/XCTrack-Screen-Designer-0.1.0-win-x64.exe`. Это переносимый EXE со встроенным Chromium и Node.js. Сборка из исходников: `npm run desktop:pack`; запуск для разработки: `npm run desktop`. См. [локальная поставка](docs/local-release.md).

Для готовой локальной сборки: `Start-Designer.cmd` или `npm start`, затем http://127.0.0.1:4173/. Подробности и черновики: [локальная поставка](docs/local-release.md). Доступны связанная симуляция, графические виджеты, маршрут и локальный IGC replay; алгоритмы учебные, подробности — [simulation.md](docs/simulation.md).

```powershell
npm run doctor
npm run dev
```

Локальная страница: **http://127.0.0.1:5173/**. Проверки: `npm run check`, затем `npm run test:e2e`. Android: `npm run android:status`, `npm run android:start`, `npm run android:capture`.
Dependencies и commands: [настройка проекта](docs/setup.md). После checkout: `npm ci`, `npx playwright install chromium`; npm dependencies закреплены lockfile.

## Документация

- [Совместимость и решение](docs/research/compatibility.md)
- [Структура XCFG и анализ образца](docs/research/xcfg.md)
- [Безопасный машинный inventory](docs/research/sample-inventory.json)
- [Исследование hyperknot/xctrack-config](docs/research/upstream.md)
- [Исследование APK 0.9.12.6](docs/research/apk.md)
- [Android runtime: эмулятор, скриншоты, импорт/экспорт](docs/research/android-runtime.md)
- [Архитектура приложения](docs/architecture.md)
- [Поэтапный план и критерии готовности](docs/development-plan.md)
- [Проверки первого этапа](docs/verification.md)
- [Инструменты, плагины и настройка](docs/setup.md)

## Воспроизведение анализа

Python 3.11+, без сторонних dependencies. Из каталога проекта:

```powershell
python tools/inspect_xcfg.py "$env:XCT_QA_SAMPLE" --out docs/research/sample-inventory.json
python -m unittest discover -s tests -v
```

Инструмент читает оригинал, создаёт inventory в другом файле и запрещает запись результата поверх input. Отчёт содержит display/units и структуру layout; не включает значения Pilot.Name, sensors или Navigation.State. Это инвентаризация, не полноценный XCFG validator/exporter.

Upstream checkout находится в `research/vendor/xctrack-config`; APK и результаты локального анализа — в `research/apk`. Они исключены из Git. Provenance, hashes и exact evidence paths сохранены в документации; decompiled материалы не входят в приложение.
Исходный backup не копируется в проект и не изменяется.

## Основные решения

Сохранять исходное JSON-дерево и неизвестные поля; править только выбранные параметры. Ориентации независимы, перекрытия разрешены, порядок виджетов сохраняется.
Native preview учитывает density-dependent grid, font metrics, темы и transparency. Симуляция хранится отдельно от экспортируемой конфигурации.
Точность сложных карт и полётных алгоритмов требует native reference captures и внешних datasets; статический APK анализ не подтверждает визуальное совпадение.

Реализованы lossless importer/exporter, создание конфигурации, drag/resize, координатный инспектор, undo/redo, добавление/дублирование/удаление/порядок виджетов и страниц обеих ориентаций, копирование импортированных шаблонов, оформление и сценарии показаний. [Калибровка шрифтов](docs/research/font-calibration.md) сохранена; дальнейшее доведение шрифтов остановлено по запросу пользователя.

По запросу пользователя запущен Medium_Phone (API 35 / emulator-5554), установлен XCTrack 0.9.12.6. Native import/export экспортированного редактором pages-файла сохранил указанные CLASS, порядок, bounds и настройки; XCTrack добавил свои defaults. Настройки preferences не изменились, исходный layout эмулятора восстановлен. Приватные экспорты остаются в `.local/android-qa/`, безопасное доказательство — [editor-native-roundtrip.json](docs/research/editor-native-roundtrip.json).

## Библиотека виджетов

Рабочий экран: коллекция с поиском и описанием слева, экран в центре, настройки выбранного размещённого виджета справа. Перетащите элемент коллекции на экран; добавление и размещение отменяются одним шагом. Выбор класса коллекции не меняет выделение на экране. Список размещённых виджетов не отображается; перекрытые элементы можно выбирать Alt+кликом.

В каталоге доступны все 78 зарегистрированных виджетов XCTrack 0.9.12.6: категории, поиск по названию/CLASS, отметки PRO и диагностики. Добавленные элементы поддерживают обычные команды редактора. В inspector есть штатные primitive settings и отдельный JSON editor сложных/unknown настроек. 42 класса имеют числовой/текстовый/free-text preview; сложные виджеты отображаются приблизительно. Для дополнительных показаний задайте независимое тестовое значение в панели выбранного виджета; оно не экспортируется в XCFG. Android-кнопки и WebView не исполняются.

[Полный каталог, настройки и результаты native проверки](docs/research/widget-library.md). Чтобы обновить производный каталог после исследования: `node tools/generate-widget-catalog.mjs`, затем `npm run format`.

## Онлайн-карта

В предпросмотре раскройте «Онлайн-карта и слои» и включите подключение. В импортированных WXCAssistant, WThermalAssistant и WCompMap появляются OSM-подложка с дорогами, необязательные термики KK7 и геозоны. Центр и масштаб задаются в панели; каталог наборов XContest загружается отдельной кнопкой. Также поддержан HTTPS GeoJSON. Эти параметры не входят в XCFG. Приложение не хранит офлайн-карты; использует обычный HTTP cache браузера.

Онлайн-стиль отличается от XCTrack. Зоны отображают границы без расписаний/NOTAM. KK7 сейчас отклоняет localhost-запросы в встроенном браузере; слой сообщает ошибку и допускает другой URL поставщика. [Исследование источников и ограничения](docs/research/data-sources.md). Relay XContest работает в `npm run dev` и `npm run preview`; для простого размещения dist на статическом сервере его нужно предоставить отдельно.
