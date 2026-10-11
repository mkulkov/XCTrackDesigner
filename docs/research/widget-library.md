# Registered XCTrack widget catalog

Profile 0.9.12.6 / 91260. 78 registered classes from APK analysis; additional runtime evidence for 71 ordinary classes is described below.

## Интеграция и дополнительное runtime-доказательство

10.10.2026 весь реестр перенесён в `web/src/widget-catalog.json`: 78 классов, 11 категорий, поиск, PRO/debug metadata. Генератор `tools/generate-widget-catalog.mjs` объединяет APK schema с наблюдёнными native defaults, не копирует Java-код или графические ресурсы.

В emulator-5554 импортирован отдельный synthetic pages-only файл: 13 страниц, 78 exact CLASS, только bounds и служебная информация версии. XCTrack сообщил успешный импорт. Повторный full export сохранил первые 71 обычный CLASS, порядок и все заданные bounds; семь debug-классов отсутствуют в экспорте обычного режима. Поэтому runtime-доказательство сохранения относится к 71, а не ко всем 78. Поля preferences полностью совпали с pre-test backup. Исходные страницы восстановлены через native pages-only import pre-test backup; native UI сообщил успех. Физический телефон не использовался.

Санитизированный набор default settings: [widget-native-defaults.json](widget-native-defaults.json), без preferences и личных исходных файлов. Private inputs/full exports/captures: `.local/android-qa/widget-library.xcfg`, `widget-library-native-export.xcfg`, `library-before-backup.xcfg`, `library-restored.png`. Runtime подтвердил FreeText `text_size=25`, `text_padding=10`; исходные APK-неоднозначности ниже остаются частью provenance.

Редактор позволяет создавать все зарегистрированные классы, изменять положение/размер/порядок, копировать и экспортировать. Typed inspector показывает известные primitive settings и позволяет удалить override. Полный JSON-инспектор поддерживает arrays/objects, неизвестные поля и literal null; защищает CLASS/bounds, duplicate keys и лимиты парсера. Неизменённые token lexemes сохраняются, включая числа вне JS precision.

42 класса имеют числовой/текстовый/free-text preview (38 добавлены к исходным четырём). Независимые тестовые показания задаются через `Frame.widgetValues`; отсутствующие значения у новых классов обозначены `--`. Наследуемые варианты native format/conditional icons/полётные алгоритмы воспроизведены не полностью. FreeText поддерживает native text, ARGB, размер в десятых миллиметра, padding, bold/italic; SVG wrapping приблизителен.

Остальные классы имеют онлайн-карту либо схематический preview: кнопки, compass/vario column, пустые оси графиков и диагностические заглушки. Пиксельное соответствие этих схем не заявлено. WebView, intent, звонки, камера и кнопочные Android-действия в браузере не выполняются. PRO отметка не предоставляет entitlement; native приложение может показывать fallback.

Registered catalog complete. Setting extraction covers explicit wm constructors plus selected verified helper keys; other helper and inherited map settings require further research. Omitted defaults are unknown, never implied zero. Labels are research metadata; resource redistribution rights are not established.

The complete registration sequence and category/debug visibility come from widget/o.java:92, 150-171. WProFallback is an instantiation wrapper, not a registered catalog item.

Safe new export: exact CLASS plus bounds. Keep original unknown settings. Do not fill omitted defaults with zero.

| CLASS | Group | Base | Family | Pro | Own confirmed setting keys |
|---|---|---|---|---|---|
| WStatusLine | wgSystem | org.xcontest.XCTrack.widget.d0 | graphic | false | showGps, showSensors, showLive, showLiveLabel, showBatteryIcon, showBatteryPercent, showTime |
| WBrightnessInfo | wgSystem | TextWidget | text | true | — |
| WLastEvent | wgSystem | TextWidget | text | false | — |
| WTime | wgFlying | TextWidget | text | false | showSec |
| WSpeed | wgFlying | ValueWidget | value | false | _units, backwardDetection |
| WAirSpeed | wgFlying | ValueWidget | value | false | speed_avg, speed_type |
| WBearing | wgFlying | TextWidget | text | false | degrees |
| WAltitude | wgFlying | ValueWidget | value | false | _units |
| WBaroAltitude | wgFlying | ValueWidget | value | false | _units, _altType |
| WAMSL | wgFlying | ValueWidget | value | false | — |
| WFL | wgFlying | ValueWidget | value | false | _decimals |
| WAltitudeAboveGround | wgFlying | ValueWidget | value | false | — |
| WTakeoffHeightAbove | wgFlying | ValueWidget | value | false | — |
| WVerticalSpeed | wgFlying | ValueWidget | value | false | avg |
| WVarioColumn | wgFlying | org.xcontest.XCTrack.widget.d0 | graphic | false | avg |
| WGlide | wgFlying | ValueWidget | value | false | avg, showVario, headless |
| WLocation | wgFlying | TextWidget | text | false | _format |
| WAirTime | wgFlying | TextWidget | text | false | — |
| WSunset | wgFlying | ValueWidget | value | true | relative, showBefore |
| WSunsetCivil | wgFlying | WSunset | value | true | — |
| WVerticalGraph | wgFlying | org.xcontest.XCTrack.widget.d0 | graphic | false | interval, vertical_step, dot_size, dot_color |
| WAltitudeMaximum | wgFlying | ValueWidget | value | true | — |
| WNettoVario | wgFlying | ValueWidget | value | false | netto_avg |
| WWindSpeed | wgAir | ValueWidget | value | false | — |
| WWindDirection | wgAir | TextWidget | text | false | degrees |
| WThermalAssistant | wgAir | org.xcontest.XCTrack.widget.d0 | graphic | false | mapScale, drawCircle, drawScale, mapWidget_showAirspaces, rotation, interval, includeWindAlgorithm, line_thickness, mapWidget_drawBearing, postponedFloorLimit, postponedDisplayDistance, fontSize |
| WThermalAltGain | wgAir | ValueWidget | value | false | — |
| WAltitudeDataGraph | wgAir | org.xcontest.XCTrack.widget.d0 | graphic | true | type, line_thickness, color_thermal, color_wind, color_speed |
| WQNH | wgAir | ValueWidget | value | false | — |
| WAirTemperature | wgAir | ValueWidget | value | false | _units |
| WAirHumidity | wgAir | ValueWidget | value | false | — |
| WXCAssistant | wgXContest | MapWidget | map | false | faiAreas, faiAreasMinMax, legDistance, legPercentage, closingCircle, routes |
| WOptiResult | wgXContest | ValueWidget | value | false | — |
| WOptiUnfinishedTriangle | wgXContest | ValueWidget | value | false | — |
| WXCSpeed | wgXContest | ValueWidget | value | false | — |
| WCompass | wgNavigation | org.xcontest.XCTrack.widget.d0 | graphic | false | navigation_target, showHeading, showBearing, showWind, showBackground, newWindArrow, rotation |
| WCompassDigital | wgNavigation | ValueWidget | value | false | target, relative |
| WSideView | wgNavigation | org.xcontest.XCTrack.widget.d0 | graphic | false | finalGlideAvg, type |
| WNextTurnpoint | wgNavigation | WeightedTextWidget | text | false | — |
| WNextTurnpointDistance | wgNavigation | WNextTurnpointSomething | value | false | — |
| WNextTurnpointTimeOfArrival | wgNavigation | WNextTurnpointSpeedSomething | value | false | time_format |
| WNextTurnpointAlt | wgNavigation | WNextTurnpointSomething | value | false | altitude, glide, speed_avg |
| WNextTurnpointGlideTo | wgNavigation | WNextTurnpointSomething | value | false | headless |
| WAirspaceProximity | wgNavigation | org.xcontest.XCTrack.widget.d0 | graphic | false | _shownearinside, postponedFloorLimit, postponedDisplayDistance, _showrecomputedheightline, _showoriginalheightline, _splitdirection |
| WTakeoffDistance | wgNavigation | ValueWidget | value | false | — |
| WTakeoffCourse | wgNavigation | ValueWidget | value | false | degrees |
| WCompMap | wgCompetition | MapWidget | map | false | — |
| WCompDistanceToGoal | wgCompetition | ValueWidget | value | false | — |
| WCompDistanceToESS | wgCompetition | ValueWidget | value | true | — |
| WCompAltitudeOverGoal | wgCompetition | ValueWidget | value | false | — |
| WCompAltitudeOverESS | wgCompetition | ValueWidget | value | true | — |
| WCompGlideToGoal | wgCompetition | ValueWidget | value | false | headless |
| WCompGlideToESS | wgCompetition | ValueWidget | value | true | headless |
| WCompTimeToStart | wgCompetition | WeightedTextWidget | text | false | — |
| WCompTimeAtStart | wgCompetition | WNextTurnpointSpeedSomething | value | false | time_format |
| WCompSpeedToStart | wgCompetition | WNextTurnpointSomething | value | false | — |
| WCompPercentage | wgCompetition | ValueWidget | value | true | — |
| WCompTaskSummary | wgCompetition | org.xcontest.XCTrack.widget.d0 | graphic | false | — |
| WLiveMessage | wgLivetracking | org.xcontest.XCTrack.widget.d0 | graphic | false | line_count, show_time |
| WButtonNavig | wgButtons | org.xcontest.XCTrack.widget.d0 | button | false | type, longClick |
| WButtonPhone | wgButtons | org.xcontest.XCTrack.widget.d0 | button | false | contact, showContactName, callType, backgroundCall |
| WButtonCamera | wgButtons | org.xcontest.XCTrack.widget.d0 | button | false | longClick |
| WButtonZoom | wgButtons | org.xcontest.XCTrack.widget.d0 | button | false | type |
| WButtonVario | wgButtons | org.xcontest.XCTrack.widget.d0 | button | false | showTitle, longClick |
| WButtonBrightness | wgButtons | org.xcontest.XCTrack.widget.d0 | button | true | type, longClick |
| WButtonIntentLauncher | wgButtons | org.xcontest.XCTrack.widget.d0 | button | true | longClick, name, action |
| WFreeText | wgOthers | org.xcontest.XCTrack.widget.d0 | free-text | false | text, color_text, color_bg, text_bold, text_italic, text_size, text_padding |
| WWebView | wgOthers | org.xcontest.XCTrack.widget.d0 | webview | true | url, initialScale, refreshInterval, scrollSettings, allowGsp, allowXCTrackJS, allowClickPassing, allowInteraction, saveButtonPos |
| WExternalData | wgOthers | TextWidget | text | false | index, suffix, _hide_labels |
| WLastKey | wgTesting | TextWidget | text | false | — |
| WLogPeek | wgTesting | org.xcontest.XCTrack.widget.d0 | graphic | false | reverse, filter, color_text, color_bg |
| WDebugDetectedActivity | debug_wgDebug | TextWidget | debug | false | — |
| WDebugActivelook | debug_wgDebug | org.xcontest.XCTrack.widget.d0 | debug | false | — |
| WDebug | debug_wgDebug | TextWidget | debug | false | — |
| WDebugFPS | debug_wgDebug | TextWidget | debug | false | — |
| WDebugSystemInfo | debug_wgDebug | TextWidget | debug | false | — |
| WDebugFont | debug_wgDebug | org.xcontest.XCTrack.widget.d0 | debug | false | includeWindAlgorithm |
| WVTM | debug_wgDebug | org.xcontest.XCTrack.widget.d0 | debug | false | rotation, theme |

## Integration limits

ValueWidget.java:93-100 supplies _title=true, _unit=true, _hide_labels=false; TextWidget.java:62-64 supplies _title=true plus titletext helper. These are different drawing contracts; numbers, units and null states use ValueWidget logic. titletext is a string, not _title.

WFreeText.java:61-74, 123-145 uses Android TextView rather than TextWidget: text, foreground/background colors, text_size, text_padding, bold and italic. Size is encoded in tenths and converted to Android millimetres. Its merged helper constructor w/p.java:18-29 makes guessed defaults unsafe.

WWebView.java:111-131 has url, initialScale, scrollSettings, refreshInterval, allowGsp (exact native spelling), allowXCTrackJS, allowClickPassing, allowInteraction and saveButtonPos. wm/m0.java:27-51 serializes scrollSettings as two integers. Native uses Android WebView, not a text canvas. A local editor placeholder should not execute URLs, intents, geolocation or native JS.

WButtonIntentLauncher.java:55-59 confirms longClick=true, name=test, action=org.xcontest.XCTrack.Event.TEST. Other buttons have distinct canvas and native actions; preview is illustrative. WButtonZoom does not have a confirmed longClick constructor setting.

Settings from helper composition, inherited MapWidget, graph helpers and unrecognized obfuscated settings are incomplete. JSON records exact pointers and distinguishes direct settings from inherited settings; raw JSON editing remains necessary. Registration completeness is not renderer or setting-schema completeness.
