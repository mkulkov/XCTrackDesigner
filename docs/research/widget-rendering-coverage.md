# Widget rendering coverage, 91260

Coverage describes the selected preview path, not pixel parity. All 78 registered classes remain available. Native source-derived painters and independent simulation approximations are explicitly distinguished.

Configuration propagation and remaining per-setting gaps: [simulation-settings-audit.md](simulation-settings-audit.md).

| Class | Preview | Evidence / boundary |
|---|---|---|
| `WStatusLine` | NativeStatusButtons | APK geometry/layout; independent simulation and icons |
| `WBrightnessInfo` | widget-content / value-layout | APK format/layout; supplied simulation readings |
| `WLastEvent` | widget-content / value-layout | APK format/layout; supplied simulation readings |
| `WTime` | widget-content / value-layout | APK format/layout; supplied simulation readings |
| `WSpeed` | value-layout calibrated path | APK layout / previous stationary calibration |
| `WAirSpeed` | widget-content / value-layout | APK format/layout; supplied simulation readings |
| `WBearing` | widget-content / value-layout | APK format/layout; supplied simulation readings |
| `WAltitude` | widget-content / value-layout | APK format/layout; supplied simulation readings |
| `WBaroAltitude` | widget-content / value-layout | APK format/layout; supplied simulation readings |
| `WAMSL` | value-layout calibrated path | APK layout / previous stationary calibration |
| `WFL` | widget-content / value-layout | APK format/layout; supplied simulation readings |
| `WAltitudeAboveGround` | widget-content / value-layout | APK format/layout; supplied simulation readings |
| `WTakeoffHeightAbove` | widget-content / value-layout | APK format/layout; supplied simulation readings |
| `WVerticalSpeed` | value-layout calibrated path | APK layout / previous stationary calibration |
| `WVarioColumn` | NativeFlightGraphics | APK geometry/layout; independent simulation and icons |
| `WGlide` | widget-content / value-layout | APK format/layout; supplied simulation readings |
| `WLocation` | widget-content / value-layout | APK format/layout; supplied simulation readings |
| `WAirTime` | value-layout calibrated path | APK layout / previous stationary calibration |
| `WSunset` | widget-content / value-layout | APK format/layout; explicit inputs, independent symbols |
| `WSunsetCivil` | widget-content / value-layout | APK format/layout; explicit inputs, independent symbols |
| `WVerticalGraph` | NativeFlightGraphics | APK geometry/layout; independent simulation and icons |
| `WAltitudeMaximum` | widget-content / value-layout | APK format/layout; supplied simulation readings |
| `WNettoVario` | widget-content / value-layout | APK format/layout; supplied simulation readings |
| `WWindSpeed` | widget-content / value-layout | APK format/layout; supplied simulation readings |
| `WWindDirection` | widget-content / value-layout | APK format/layout; supplied simulation readings |
| `WThermalAssistant` | GraphicWidget thermal | APK segment colors/width/manual zoom; independent auto scale/drift |
| `WThermalAltGain` | widget-content / value-layout | APK format/layout; supplied simulation readings |
| `WAltitudeDataGraph` | NativeFlightGraphics | APK geometry/layout; independent simulation and icons |
| `WQNH` | widget-content / value-layout | APK format/layout; supplied simulation readings |
| `WAirTemperature` | widget-content / value-layout | APK format/layout; supplied simulation readings |
| `WAirHumidity` | widget-content / value-layout | APK format/layout; supplied simulation readings |
| `WXCAssistant` | OnlineMap / GraphicWidget | Online providers; independent overlay/viewport |
| `WOptiResult` | widget-content / value-layout | APK format/layout; explicit inputs, independent symbols |
| `WOptiUnfinishedTriangle` | widget-content / value-layout | APK format/layout; explicit inputs, independent symbols |
| `WXCSpeed` | widget-content / value-layout | APK format/layout; supplied simulation readings |
| `WCompass` | NativeFlightGraphics | APK geometry/layout; independent simulation and icons |
| `WCompassDigital` | widget-content / value-layout | APK format/layout; explicit inputs, independent symbols |
| `WSideView` | NativeFlightGraphics | APK geometry/layout; independent simulation and icons |
| `WNextTurnpoint` | widget-content / value-layout | APK format/layout; supplied simulation readings |
| `WNextTurnpointDistance` | widget-content / value-layout | APK format/layout; supplied simulation readings |
| `WNextTurnpointTimeOfArrival` | widget-content / value-layout | APK format/layout; supplied simulation readings |
| `WNextTurnpointAlt` | widget-content / value-layout | APK format/layout; supplied simulation readings |
| `WNextTurnpointGlideTo` | widget-content / value-layout | APK format/layout; supplied simulation readings |
| `WAirspaceProximity` | GraphicWidget | APK split/multiline/no-data layout; independent zone selection |
| `WTakeoffDistance` | widget-content / value-layout | APK format/layout; supplied simulation readings |
| `WTakeoffCourse` | widget-content / value-layout | APK format/layout; supplied simulation readings |
| `WCompMap` | OnlineMap / GraphicWidget | Online providers; independent overlay/viewport |
| `WCompDistanceToGoal` | widget-content / value-layout | APK format/layout; supplied simulation readings |
| `WCompDistanceToESS` | widget-content / value-layout | APK format/layout; supplied simulation readings |
| `WCompAltitudeOverGoal` | widget-content / value-layout | APK format/layout; supplied simulation readings |
| `WCompAltitudeOverESS` | widget-content / value-layout | APK format/layout; supplied simulation readings |
| `WCompGlideToGoal` | widget-content / value-layout | APK format/layout; supplied simulation readings |
| `WCompGlideToESS` | widget-content / value-layout | APK format/layout; supplied simulation readings |
| `WCompTimeToStart` | widget-content / value-layout | APK format/layout; supplied simulation readings |
| `WCompTimeAtStart` | widget-content / value-layout | APK format/layout; supplied simulation readings |
| `WCompSpeedToStart` | widget-content / value-layout | APK format/layout; supplied simulation readings |
| `WCompPercentage` | widget-content / value-layout | APK format/layout; supplied simulation readings |
| `WCompTaskSummary` | NativeStatusButtons | APK geometry/layout; independent simulation and icons |
| `WLiveMessage` | NativeStatusButtons | APK geometry/layout; independent simulation and icons |
| `WButtonNavig` | NativeStatusButtons | APK geometry/layout; independent simulation and icons |
| `WButtonPhone` | NativeStatusButtons | APK geometry/layout; independent simulation and icons |
| `WButtonCamera` | NativeStatusButtons | APK geometry/layout; independent simulation and icons |
| `WButtonZoom` | NativeStatusButtons | APK geometry/layout; independent simulation and icons |
| `WButtonVario` | NativeStatusButtons | APK geometry/layout; independent simulation and icons |
| `WButtonBrightness` | NativeStatusButtons | APK geometry/layout; independent simulation and icons |
| `WButtonIntentLauncher` | NativeStatusButtons | APK geometry/layout; independent simulation and icons |
| `WFreeText` | widget-content / value-layout | APK format/layout; supplied simulation readings |
| `WWebView` | GraphicWidget | Independent approximation / inert platform action |
| `WExternalData` | widget-content / value-layout | APK format/layout; supplied simulation readings |
| `WLastKey` | widget-content / value-layout | APK format/layout; supplied simulation readings |
| `WLogPeek` | NativeStatusButtons | APK geometry/layout; independent simulation and icons |
| `WDebugDetectedActivity` | GraphicWidget | Independent approximation / inert platform action; debug-only native class |
| `WDebugActivelook` | GraphicWidget | Independent approximation / inert platform action; debug-only native class |
| `WDebug` | GraphicWidget | Independent approximation / inert platform action; debug-only native class |
| `WDebugFPS` | GraphicWidget | Independent approximation / inert platform action; debug-only native class |
| `WDebugSystemInfo` | GraphicWidget | Independent approximation / inert platform action; debug-only native class |
| `WDebugFont` | GraphicWidget | Independent approximation / inert platform action; debug-only native class |
| `WVTM` | GraphicWidget | Independent approximation / inert platform action; debug-only native class |

Details: [text](native-text-parity.md), [flight graphics](native-flight-graphics.md), [status/buttons](native-status-buttons.md), [thermal](native-thermal-rendering.md).

Remaining: pixel font matching (paused by user), EInk painters, closed flight computations, native SideView bitmap, real Android WebView/intent/hardware behaviours. No online map provider is claimed to duplicate XCTrack offline cartography.
