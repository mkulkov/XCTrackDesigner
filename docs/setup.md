# Среда разработки и инструменты

Этот документ фиксирует первоначальную настройку среды 2026-10-10. Текущий importer/exporter и prototype UI описаны в [implementation](implementation.md); результаты ниже относятся к setup checkpoint.

## Установлено и выбрано

| Компонент | Версия / состояние | Назначение |
|---|---|---|
| Node.js / npm | имеющиеся 24.18.0 / 11.16.0 | JS toolchain; package engines требует Node >=24.15, <25 |
| React / React DOM | 19.3.0, установлены локально | UI будущего редактора |
| Vite + `@vitejs/plugin-react` | 8.3.4 / 6.1.2, установлены и настроены | React compilation, HMR, production build |
| TypeScript | **6.0.3**, strict | совместим с typescript-eslint 8.71.1 (`>=4.8.4 <6.1.0`); latest 7.0.2 намеренно не выбран |
| ESLint + typescript-eslint | 10.12.0 / 8.71.1 | flat config, TypeScript rules |
| React Hooks / React Refresh plugins | 7.1.1 / 0.5.7 | правила hooks и совместимость Fast Refresh |
| Prettier | 3.9.10 | единый формат source/config files |
| Vitest | 5.0.3 | Node unit tests, сейчас проверки PNG comparator |
| Playwright Test | 1.64.0 | reproducible browser tests, isolated local preview server |
| Playwright Chromium | v1248 / Chrome for Testing 156.0.8078.4 | установлен вместе с matching Headless Shell и FFmpeg в пользовательский cache |
| pixelmatch / pngjs | 8.0.0 / 7.0.0 | PNG comparison без масштабирования native эталонов |
| VS Code ESLint / Prettier extensions | 3.0.34 / 12.4.0, установлены через существующий VS Code CLI | editor diagnostics и format-on-save |
| Python / Git / Java | имеющиеся 3.11.9 / 2.45.1 / 21.0.1 | существующие XCFG tools, version control, APK analysis |
| Android SDK | имеющийся `C:\opt\AndroidSDK` | ADB, emulator, aapt; build-tools 35.0.0 |
| JADX | имеющийся 1.5.6 в `research/apk/tools/jadx` | targeted static APK analysis |
| Codex Playwright MCP | уже доступен, navigation проверена | интерактивная работа агента с локальной browser page |

Все npm dependencies сохранены **точными версиями** в package.json и package-lock.json. `.npmrc` включает save-exact и engine-strict; глобальные Node/npm не переустанавливались.
VS Code настройки находятся только в `.vscode/`, TypeScript SDK указывает на локальный compiler. Расширения устанавливаются в существующий VS Code; это не новые account connections.
Codex plugins/skills optimizer, router и plugin-management доступны в текущей среде. Дублирующий MCP-сервер не добавлялся; интерактивный Playwright MCP и npm test runner выполняют разные задачи. Внешние сервисы, cloud plugins и дополнительные map/render libraries на этом этапе не нужны.

## Запуск на этом ПК

```powershell
Set-Location '<project-directory>'
npm run doctor
npm run dev
```

App: **http://127.0.0.1:5173/**. Остановка dev server — Ctrl+C в его terminal.
Production build: `npm run build`; preview: `npm run preview` → http://127.0.0.1:4173/.
Shell показывает профиль исследованной версии и две графические диагностические области SVG/Canvas. Это не renderer native widgets и не интерфейс импорта.

## Восстановление после checkout

```powershell
npm ci
npx playwright install chromium
npm run doctor
npm run check
npm run test:e2e
```

`test:e2e` требует свежего dist, который создаёт `check` или `build`. Используется отдельный port 4174; существующий сервер на этом port не переиспользуется. Test traces/screenshots/report сохраняются в `.local/`.
Python tools работают без pip dependencies. Полные private native exports и research APK/vendor не входят в Git; на новом checkout их наличие требуется только для native research, не для web build. Doctor сообщает отсутствующие research tools.

## Проверки и команды

| Команда | Что проверяет / делает |
|---|---|
| `npm run check` | TypeScript → ESLint → format check → Vitest → Python tests → Vite build |
| `npm run test:e2e` | Chromium: React/SVG/Canvas pixel initialization, no console errors/remote requests, narrow viewport |
| `npm run test:watch` | Vitest watch mode |
| `npm run format` | форматирует только web source, JS/TS tools/tests/configs; docs/research excluded |
| `npm run android:status` | explicit emulator serial, AVD identity, boot flag, size/density, XCTrack package path |
| `npm run android:start` | повторно использует Medium_Phone либо запускает cold boot, без wipe-data |
| `npm run android:capture` | `.local/android-qa/current.png` и UI dump |
| `npm run visual:diff -- reference.png actual.png --out .local/visual/diff.png` | diff summary + PNG; nonzero exit, если превышен allowed changed ratio |

PNG comparator не меняет reference/actual, запрещает overwrite inputs и отклоняет разные размеры. `--threshold 0.1` — per-pixel color sensitivity; `--max-diff 0` — допустимая доля изменившихся pixels. Эти параметры не являются утверждёнными критериями native parity. Anti-aliasing pixels включены в сравнение.

Android script: `tools/android.ps1`, actions Start/Status/Install/Capture. По умолчанию serial emulator-5554 и AVD Medium_Phone. Другие serials принимаются только вида emulator-*, AVD identity дополнительно проверяется.
SDK path берётся из ANDROID_SDK_ROOT / ANDROID_HOME или fallback `C:\opt\AndroidSDK`; для другого ПК используйте env или `-SdkRoot`.
Action Install — явная команда для сохранённого APK с проверкой SHA256 исследованного 91260; startup не устанавливает и не сбрасывает приложение автоматически. Данные других AVD/apps/телефонов не затрагиваются.

## Изоляция данных

Vite root — **web**, publicDir выключен. Dev file access разрешён только web и node_modules; `.local`, research, XCFG и env-files явно denied. Server и preview привязаны к 127.0.0.1, ports strict.
Проверены HTTP 403 для `/@fs/.../.local/android-qa/native-export-01.xcfg`, research APK и docs inventory. Native exports не импортируются в browser bundle. Production dist содержит лишь HTML/CSS/JS shell, без backup/шрифтов APK/карт/аналитики.
`.gitignore` исключает node_modules, dist, .local, research binaries/vendor, browser traces, caches и XCFG. `.playwright-mcp` diagnostics также excluded.
`AGENTS.md` закрепляет локальные project boundaries и команды проверки для следующих задач.

## Выполненная проверка настройки

- `npm run check`: pass; **4 Vitest + 5 Python tests**, strict typecheck, lint, formatting, production build.
- `npm run test:e2e`: **2/2 Chromium tests pass**. Рендер Canvas проверен по реальному RGBA pixel; SVG виден, responsive shell без горизонтального overflow. Remote browser requests не обнаружены.
- Codex Playwright MCP открыл dev URL, accessibility tree соответствует shell; console errors/warnings — 0.
- `npm run doctor`: dependencies, existing SDK/JADX и установленный Chromium найдены; Java 21.0.1 проверена отдельно/doctor.
- `npm run android:status` и `android:start` подтвердили готовый Medium_Phone с 1080×2400 / 420 dpi и XCTrack package, без повторного запуска второго AVD.
- PNG CLI сравнил native portrait capture с самим собой: 0 changed pixels; mismatch/different-pixels/invalid threshold cases покрыты unit tests. Это проверка comparator, не parity приложения с XCTrack.
- `npm audit`: **0 известных уязвимостей** на момент настройки. Это результат audit, не гарантия безопасности зависимостей.
- SHA256 исходного XCFG остаётся `6574578a818a0a83bc363a4d247d1582ddbc751a98a35a9dfff5da3861114c8b`.

## Первичные справочники

[Vite setup](https://vite.dev/guide/), [Playwright configuration](https://playwright.dev/docs/test-configuration), [ESLint flat configuration](https://eslint.org/docs/latest/use/configure/configuration-files). Совместимость конкретных версий дополнительно проверена через npm registry engines/peerDependencies; фактические установленные версии — package-lock.json.
