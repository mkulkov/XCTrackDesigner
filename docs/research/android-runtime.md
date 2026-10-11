# XCTrack 0.9.12.6: эмулятор, native screenshots и import/export

Дата работы: 2026-10-10. Это runtime evidence, дополнение к первоначальному статическому исследованию.

## Среда

Запущен существующий AVD **Medium_Phone**, Android 15 / API 35, x86_64, serial **emulator-5554**.
SDK: `C:\opt\AndroidSDK`. Cold boot через `-no-snapshot-load`, без wipe-data; `sys.boot_completed=1`.
Экран физически 1080×2400, density 420 dpi; landscape capture 2400×1080. Полётный fullscreen занимает весь capture без status/navigation bars; Settings/SAF dialogs имеют другую content area.
Это существующий AVD с другими приложениями: их данные не очищались.

Установлен ранее исследованный APK с SHA256 `27ab4d0fb2b74a0dd5c148afa55e827882a9632276defb4d137989ca642c4b9f`.
`adb install` → Success; `dumpsys package` подтверждает **91260 / 0.9.12.6**; запуск `org.xcontest.XCTrack.startup.StartupActivity`, после запуска foreground `org.xcontest.XCTrack.ui.MainActivity`.
XContest login пропущен. Первичные разрешения выданы в эмуляторе через штатные диалоги. Battery exception не изменялась. Подключённые реальные телефоны не использовались: в каждой ADB-команде указан serial эмулятора.

## Выполненные проверки

1. Оригинальный XCFG скопирован ADB push в `/sdcard/Download/xct-qa-source.xcfg`. Оригинал на ПК не изменён.
2. Native Preferences → Export & import config → Import → OTHER → Android DocumentsUI → Downloads → source. Выбран **Replace all**, подтверждён диалог; native результат **Configuration successfully imported**.
3. После переключения языка native XCTrack запросил force stop. Перезапуск через ADB применил русский язык.
4. Сняты XC и Competition обеих ориентаций. Landscape включён временно через native «Экран → Ориентация → Альбом».
5. Через native «Экспортировать настройки → Все настройки» получен **export1**, скачан в `.local/android-qa/native-export-01.xcfg`.
6. **export1** повторно импортирован через native список Config в режиме Replace all. Успех подтверждён UI; перезапуск восстановил исходный portrait setting. Получен **export2**.
7. Native «Только окна» создал **pages**: `2026-10-10_pages-00.xcfg`, 34 012 bytes. Его root keys — `info`, `layout`; `info.exportType="pages"`, версия 91260.
8. **pages** импортирован в режиме **«Заменить только окна»**, native success подтверждён. После этого создан **export3**.
9. Сравнены JSON-деревья всех четырёх native exports; эмулятор оставлен работающим, XCTrack foreground в portrait.

## Результаты сравнения

Безопасный отчёт [native-roundtrip.json](native-roundtrip.json): hashes, sizes и JSON pointers изменений, без значений личных настроек.
Полные файлы экспорта находятся только в `.local/android-qa/` (excluded из Git) и в Config эмулятора. Все backup exports имеют 57 177 bytes.

| Сравнение | Layout целиком | Preferences | Отличия JSON leaf paths |
|---|---|---|---:|
| source → export1 | **равен** | отличается | 47 |
| export1 → export2 после полного reimport | **равен** | отличается | 5 |
| export2 → export3 после pages-only import | **равен** | **равны** | 1 |
| pages.layout → export2.layout | **равен** | в pages нет preferences | — |

Source → export1: `info.device` и `info.timeCreated` обновлены; 40 lat/lon значений 20 task waypoints пересериализованы с максимальным абсолютным отклонением около `3.7313e-6` градуса; пять позиций sensor `filters` изменили порядок.
Это native normalization, а не точный lossless JSON round-trip. Точный внутренний тип координат не установлен одной runtime проверкой.
Sensor filters — массив строк категорий BARO/AIR_CONDITIONS/EXTRA/GPS/COMPASS; набор сохранился, порядок изменился. При export1 → export2 ещё четыре позиции filters поменялись и обновилось timeCreated; координаты waypoints больше не отличаются.
После pages-only import единственное отличие полного export — `info.timeCreated`; остальные настройки и раскладка действительно сохранились.

**Главный результат:** штатный XCTrack принимает sample backup и собственные backup/pages exports. Для этого образца без widget edits native сохраняет полное `layout`, включая порядок, координаты и settings всех 56 виджетов. Это не доказательство универсальной поддержки unknown fields или совместимости будущего exporter редактора.

## Скриншоты

| Capture | Размер | Состояние |
|---|---|---|
| [portrait-xc.png](screenshots/portrait-xc.png) | 1080×2400 | WPXCAssistant, native ru, imported sample |
| [portrait-competition.png](screenshots/portrait-competition.png) | 1080×2400 | WPCompetition, native ru |
| [landscape-xc.png](screenshots/landscape-xc.png) | 2400×1080 | WPXCAssistant, native ru |
| [landscape-competition.png](screenshots/landscape-competition.png) | 2400×1080 | WPCompetition, native ru |
| [import-options.png](screenshots/import-options.png) | 1080×2400 | full backup modes |
| [import-success.png](screenshots/import-success.png) | 1080×2400 | source import success |
| [export-success.png](screenshots/export-success.png) | 1080×2400 | native full export path |
| [reimport-success.png](screenshots/reimport-success.png) | 2400×1080 | native backup reimport success |
| [pages-import-options.png](screenshots/pages-import-options.png) | 1080×2400 | pages-only file recognized |
| [pages-import-success.png](screenshots/pages-import-success.png) | 1080×2400 | pages-only import success |

Hashes и условия capture: [screenshots/manifest.json](screenshots/manifest.json). Изображения сохранены напрямую через `adb screencap`, без изменения размеров/цветов.
Наблюдается clipping длинных русских подписей в native виджетах; будущий renderer не должен самовольно переносить их на строки ради удобства. Поздние widgets видны поверх карты; это runtime свидетельство штатной композиции конкретного sample, а не изолированный тест всех z-order/alpha состояний.

## Ограничения этих эталонов

Состояние стационарного эмулятора: полёт не проигрывался, показания GPS/баро/внешних сенсоров не контролировались покадрово. Native часы меняются, доступность GPS менялась между captures. Импортированные внешние сенсоры не подключены, statusline показывает предупреждения.
Road/terrain datasets исходного телефона не установлены; видны белые/чёрные области карт и native overlays. Это эталоны виджетов в условиях отсутствующих данных, не эталоны полноценной карты телефона.
Нет XContest login/PRO entitlement; платные особенности не подтверждены. Emulator evidence не доказывает реальные сенсоры, полётные алгоритмы, физический multitouch или работу на телефоне пользователя.
Захваты пригодны для размеров, fonts, clipping, native labels/themes и initial visual comparison. **Deterministic golden suite** всё ещё требует fixed clock/data/position, calibration page, контролируемые no-data/negative/large values и одинаковые map datasets.

## Воспроизведение

```powershell
& 'C:\opt\AndroidSDK\platform-tools\adb.exe' -s emulator-5554 shell am start -n org.xcontest.XCTrack/org.xcontest.XCTrack.startup.StartupActivity
python tools/android_snapshot.py --serial emulator-5554 --capture .local/android-qa/current.png
python tools/compare_native_roundtrip.py "$env:XCT_QA_SAMPLE" .local/android-qa/native-export-01.xcfg .local/android-qa/native-export-02.xcfg .local/android-qa/native-export-03.xcfg .local/android-qa/native-pages-01.xcfg --out docs/research/native-roundtrip.json
```

UI navigation: в flight screen свайп вниз раскрывает native меню; в portrait Settings в нижнем левом блоке, в landscape четвёртый блок. Меню быстро закрывается автоматически; тап должен следовать сразу после свайпа. Layout/Value widgets рисуются Canvas и отсутствуют в UIAutomator tree; нужны native screenshots.
`android_snapshot.py` принимает только serial `emulator-*`, сохраняет UI dump в `.local`, снимает PNG через binary subprocess stdout. Script не устанавливает приложение и не изменяет конфигурацию. `compare_native_roundtrip.py` выводит JSON pointers, а не private values, и запрещает overwrite inputs.

Исходный backup SHA256 после всех проверок: `6574578a818a0a83bc363a4d247d1582ddbc751a98a35a9dfff5da3861114c8b`, совпадает с исходным исследованием. Vendor/APK исходники не менялись. В ограниченном scan последних 1000 logcat lines не обнаружено FATAL EXCEPTION / Process XCTrack; это не полный lifecycle/crash тест.
