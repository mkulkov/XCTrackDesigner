import { expect, test } from 'vitest'
import { widgetLibrary } from '../web/src/widget-library'
import { reading, valueScene, newSceneCache } from '../web/src/value-layout'
import type { Widget } from '../web/src/xcfg'

test('every catalog value/text widget has its text layout rather than the generic placeholder', () => {
  const frame = { speed: null, vertical: null, altitude: null, time: null }
  const prefs = { 'Display.Language': 'ru', 'Display.Theme': 'WhiteTheme' }
  for (const entry of widgetLibrary.filter((e) =>
    ['value', 'text', 'free-text'].includes(e.family),
  )) {
    const w: Widget = {
      CLASS: `org.xcontest.XCTrack.widget.w.${entry.name}`,
      X1: 0,
      Y1: 0,
      X2: 10000,
      Y2: 10000,
    }
    expect(reading(w, prefs, frame), entry.name).not.toBeNull()
    const scene = valueScene(
      w,
      prefs,
      frame,
      400,
      300,
      1080,
      2337,
      (text, size) => ({
        width: text.length * size * 0.6,
        ascent: size * 0.8,
        descent: size * 0.2,
      }),
      newSceneCache(),
    )
    expect(scene, entry.name).not.toBeNull()
    expect(JSON.stringify(scene), entry.name).not.toMatch(/NaN|Infinity/)
  }
})
