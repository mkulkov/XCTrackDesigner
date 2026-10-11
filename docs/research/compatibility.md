# Совместимость и границы исследования

Целевой профиль — 0.9.12.6 / 91260. Дата исследования 2026-10-10.

Таблица ниже фиксирует исходный этап. Последующее [runtime исследование](android-runtime.md) подтвердило import sample, backup reimport и pages-only import в Android эмуляторе; получены четыре native screenshots. Для образца layout не изменился, pages-only import сохранил preferences. Детерминированная pixel calibration и exporter веб-приложения ещё не реализованы.

| Источник / функция | Установлено | Не установлено / статус |
|---|---|---|
| Пользовательский backup | UTF-8 JSON, 4 основных pages, 56 widgets, 23 classes; `info` соответствует target | native import изменённого документа не выполнен |
| hyperknot/xctrack-config | pinned commit 2022, MIT, исторические JSON presets | нет renderer/schema, версии 90760 и 70022 не доказывают target compatibility |
| Официальный APK | manifest 0.9.12.6 / 91260; native resources и targeted code evidence | decompiled code требует проверки; static analysis не pixel oracle |
| Grid bounds | normalized 0..10000 в XCFG, density-dependent grid в native code | нужны density и реальная content area Android для точного pixel mapping |
| `_bg` | transparency, обратная alpha | anti-aliasing/composition сравнить screenshot diff |
| Text/fonts/themes | ресурсы и базовые drawing paths в APK | все per-class defaults и render states ещё не откалиброваны |
| Export backup | контракт scoped patches спроектирован | importer/exporter веб-приложения ещё не реализован |
| Maps/thermal/navigation | параметры в sample и native classes | нет всех внешних datasets, точности алгоритмов или visual proof |
| React/TS/SVG/Canvas | архитектурный стек выбран | shell/build и редактор относятся к следующему этапу |

## Решение

XCFG пригоден для локального редактирования через lossless JSON document model. Использовать upstream converter напрямую нельзя: он удаляет часть данных и сортирует виджеты.
Главный риск точности — не parsing, а native grid/DPI, Android text metrics, per-class formatters, карта и отсутствующие flight inputs.
Поэтому следующий шаг — importer/exporter и небольшой calibration preview; широкий drag/drop editor — после контрольной точки совместимости и базового renderer.

Исследовательский этап завершает первоначальный статический анализ и проектирование, **не полную спецификацию всех внутренних алгоритмов XCTrack**.
Доказанный pixel-perfect статус сейчас отсутствует. Точность каждого renderer должна иметь собственный уровень: unknown, approximate, APK-derived, screenshot-verified.

## Первичные публичные источники

- [hyperknot/xctrack-config, закреплённый commit](https://github.com/hyperknot/xctrack-config/tree/8e416bed7b6a5ff34dcfdda7ad28bb4e2fa19017): исходные пресеты/утилиты/лицензия; подробные пути в [upstream.md](upstream.md).
- [XCTrack download](https://xctrack.org/Download.html): официальный маршрут к distribution APK; сам APK проверен независимо по manifest, подробности в [apk.md](apk.md). Адрес `latest` изменяемый, SHA256 и version всегда проверять заново.
- [XCTrack FAQ](https://xctrack.org/Faq.html): XCTrack не является open source. MIT upstream нельзя переносить на приложение.
- [XCTrack JavaScript Interface](https://xctrack.org/JavaScriptInterface.html): с 0.9.12 отдельный opt-in API для Web page widget (`XCTrack.getLocation()`); это не API экспорта всех native widgets и не web renderer.
- [XCTrack Open Data](https://xctrack.org/XCTrackOpenData.html): входной текстовый `$XCTOD` protocol внешних данных, не XCFG и не renderer API.
- [XCTrack manual](https://xctrack.org/Manual.html): дополнительные сведения об устройствах/картах; некоторые разделы исторические, при расхождении приоритет target APK и проверке версии.

## Evidence hierarchy

1. Sample-observed: JSON paths и file SHA256.
2. Repository-observed: pinned commit и строки файлов.
3. APK-derived: manifest, resource inventory, targeted raw decompilation; помечать unrecovered methods.
4. Runtime-verified: действия и import в изолированной native среде (ещё нет).
5. Screenshot-verified: controlled native capture и измеренный diff (ещё нет).

Оригинальный XCFG не копируется в tracked fixtures, не меняется и не выполняется. Репозиторий и APK анализируются как данные. Проект не устанавливает XCTrack и не меняет конфигурацию телефона.

## Web-export compatibility checkpoint

Первый прототип и [native roundtrip изменённого backup](web-native-roundtrip.json) проверены: изменено одно coordinate field, native import «только окна» успешен, re-export layout совпадает, preferences сохранены. No-op byte identity и 4 pages / 56 widgets проверены браузерным тестом. Таблица первого исследования выше историческая; importer/exporter теперь реализован в описанном объёме. Font/geometry/alpha pixel calibration остаётся открытой. Реализация: [implementation](../implementation.md).
