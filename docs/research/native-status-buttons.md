# Status line, buttons and task/message widgets, XCTrack 91260

Evidence is APK-derived unless identified otherwise. Original APK/resources and native screenshots remain in private research directories; none is copied into browser assets. `NativeStatusButtons.tsx` draws independent SVG geometry and reuses the editor's existing optional local font loader.

## Observed drawing paths

| Class | APK drawing behavior | Editor behavior |
|---|---|---|
| WStatusLine | Fills its own theme background, two horizontal 1px borders. GPS/sensor/live slots grow from the left; clock/battery percent/icon grow from the right. Normal horizontal padding 5px, error padding 12px, vertical padding 2px; cumulative widths shrink when necessary. Battery chooses 0/25/50/75/100 bitmap bands at 20/40/60/80 percent. Unknown battery is `? %`, orange error slots. | Same placement, switches, padding, palette and bands; independently drawn satellite/Bluetooth/battery/replay shapes. Unconfigured external sensors and disabled live do not produce invented text slots. |
| WButtonZoom | Theme.W fitted centered `+` or `–`, no button frame. | Native shortcut text. |
| WButtonBrightness | Theme.W centered `🔆` or `🔅`. | Native Unicode label; browser emoji rasterization varies. |
| WButtonCamera | Theme.W camera private-use glyph U+E4C7. | Existing local font glyph if available; independent camera path otherwise. |
| WButtonNavig | Theme.W flag glyph U+E4CD plus arrow or disabled diameter sign. | Next/previous/disabled state from simulated navigation. |
| WButtonVario | Optional top title, then fitted variometer/audio shortcut U+E8A4+U+E4C8/U+E4C9. Native acoustic vario default is disabled. | Title switch; optional local glyph or independent speaker/mute geometry. Explicit `widgetValues.WButtonVario='on'` enables preview state only. |
| WButtonPhone | Call-mode glyph U+E4CA/B/C with optional contact name, fitted together. | Local glyph if available; independently drawn handset fallback with name. Android dialing is never executed. |
| WButtonIntentLauncher | Fitted rocket then the name split at newlines. | Fitted Unicode rocket and inert name; action is never executed. PRO class metadata is not treated as current account entitlement. |
| WCompTaskSummary | Nine-patch background card even outside competition navigation; text absent without a competition task. Text inset 8px; list includes race/start type, start/deadline, blank line, waypoint names/radii with `> current <`. | Empty card with no diagnostic title when task absent. Simulated task uses equivalent list structure; exact competition gates/type/deadline need inputs beyond the current FlightTask model. Explicit multiline widgetValues can supply a controlled display. |
| WLiveMessage | No content when no recent messages. Recent messages newest first, count limit, author and age labels. Fitted left-aligned multiline text. | Empty output when absent; supplied multiline simulation values newest first with count limit. Message identity/age are explicit text, not invented. |
| WLogPeek | Android TextView, monospace; text_size/10 millimetres; text_padding pixels; ARGB colors; most recent line-count selection before substring filter and optional reverse. Empty log is empty text. | SVG monospace text, existing profile 420dpi conversion, colors/padding/filter/order and blank missing state. |

WhiteTheme status constants are #e8e8e8 / #808080 / #000000; BlackTheme #606060 / #c0c0c0 / #ffffff. Error slot color is #ffaa33. Native screenshot `.local/android-qa/native-widget-display-before.png` runtime-confirms the white strip, orange failed external sensor slots, green battery bars and percent/time arrangement.

Button NORMAL colors follow Theme.U: WhiteTheme pale yellow #ffffc0 with black stroke; BlackTheme pale yellow without stroke; WhiteHCTheme black and BlackHCTheme white. WidgetPreview supplies the computed theme through a preview-only widget object, so inherited display preferences also apply.

The task-summary nine-patch center is #fff592 in light themes and #3c3c3c in dark themes; the independently drawn shadow follows three observed black alpha bands (19/38/80). Card bounds expand 5px at screen edges, text retains the source 8px inset. The APK bitmap is inspected for constants only, never redistributed.

## Source pointers

`research/apk/decompiled/sources/org/xcontest/XCTrack/widget/w/{WStatusLine,c0,f0,h0,WButtonZoom,WButtonBrightness,WButtonCamera,WButtonNavig,WButtonVario,WButtonPhone,WButtonIntentLauncher,WCompTaskSummary,WLiveMessage,WLogPeek,r}.java`, `theme/{a,WhiteTheme,BlackTheme}.java`, `config/t0.java` (`Sensors.AcousticVario.Enabled=false`), and original values/values-ru strings.

`theme.a.U/W/V` reserves 3px inset and fits the full multiline block; the browser uses independent approximate font metrics. No font pixel parity is claimed. Status transport icons are a schematic equivalent of bitmap semantics, not reproductions of copyrighted bitmap files. Full sensor enumeration, charging/SafeSky overlay, live protocol state, competition start gates and native message expiry require richer simulation inputs. This rendering work neither changes XCFG defaults nor executes imported actions.

## Checks

Targeted tests verify fitted zoom labels, absence of invented control frames, blank no-task/messages states, status flags and bands, ARGB/mm/padding/log semantics, inert imported strings and finite output at tiny dimensions. Parent integration runs the project's required check and browser suite.
