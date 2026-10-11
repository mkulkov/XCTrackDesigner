# Thermal Assistant, XCTrack 0.9.12.6

APK-derived: `WThermalAssistant.onDraw` draws coloured segments, not dots. Segment width is `5 * factor * (line_thickness / 10)`, with factor 1 below 1 m/s, linear up to 3 at 5 m/s, then capped. `theme.a.H` supplies grey negative lift, green, yellow and red positive lift and opacity. The web preview now uses these rules.

`om.h` builds alternating zoom sequences 256, 362, 512, 724, …; `om.b.o/p` supplies normalized Mercator coordinates. Manual thermal zoom uses these native transforms. Longitude wrapping and latitude clamping protect simulation inputs.

The Thermal Assistant remains a flight trace widget even when online basemap display is enabled for XC/competition maps. Missing position leaves its content blank, as native `onDraw` does. Existing bounds and selection remain editable.

Limits: automatic scale, wind drift and identified thermal centres remain independent approximations. Particle-drift opacity depends on altitude difference in native code; the current preview uses age opacity. EInk-specific thermal painting and navigation overlay geometry are not reproduced exactly. This is source-derived segment geometry, not complete native algorithm or pixel parity.

Runtime reference retained without modification: `.local/android-qa/native-widget-display-before.png`, emulator-5554, 1080×2400. It verifies the stationary sample appearance; it does not verify airborne thermal history.

## Airspace proximity

`WAirspaceProximity.onDraw/F/H/L` lays out named zones as separate text blocks, with optional original/recomputed height lines and a 4px red divider. `_splitdirection` AUTO uses side-by-side blocks when width exceeds height; HORIZONTAL stacks them, VERTICAL places them side by side. Empty inputs draw no diagnostic placeholder. The preview now follows this layout and its missing-data rule. Zone selection, warning backgrounds, directional distances and native activation/state filtering remain independent approximations; the current simulator provides only name, distance, floor/ceiling and inside flag.
