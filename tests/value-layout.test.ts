import { expect, test } from 'vitest'
import {
  fit,
  reading,
  valueScene,
  newSceneCache,
  newFitCache,
  fitLines,
} from '../web/src/value-layout'
import type { Measure } from '../web/src/value-layout'
import type { Widget } from '../web/src/xcfg'
const widget = (name = 'WVerticalSpeed', extra = {}): Widget => ({
  CLASS: 'org.xcontest.XCTrack.widget.w.' + name,
  X1: 0,
  Y1: 0,
  X2: 10000,
  Y2: 10000,
  ...extra,
})
const frame = { speed: 36, vertical: 1.24, altitude: 1234.5, time: 3661 }
const measure: Measure = (text, size) => ({
  width: text.length * size * 0.6,
  ascent: size * 0.8,
  descent: size * 0.2,
})
test('native time is hours:minutes; variometer is signed, localized and colored', () => {
  expect(reading(widget('WAirTime'), {}, frame)?.text).toBe('1:01')
  expect(reading(widget(), {}, frame)).toMatchObject({ text: '+1,2', tone: 'green', unit: 'м/с' })
  expect(reading(widget(), {}, { ...frame, vertical: -0.3 })).toMatchObject({
    text: '-0,3',
    tone: 'normal',
  })
  expect(reading(widget(), {}, { ...frame, vertical: -1 })).toMatchObject({
    text: '-1,0',
    tone: 'red',
  })
})
test('units and speed overrides follow verified enums; unknown units/classes are diagnostic', () => {
  expect(reading(widget('WSpeed', { _units: 'M_S' }), {}, frame)?.text).toBe('10,0')
  expect(reading(widget('WSpeed', { _units: 'MP_H' }), {}, frame)?.text).toBe('22')
  expect(reading(widget('WSpeed', { _units: 'KT' }), {}, frame)?.text).toBe('19')
  expect(reading(widget('WAMSL'), { 'Unit.Altitude': 'ft' }, frame)?.text).toBe('4050')
  expect(reading(widget('WSpeed', { _units: 'future' }), {}, frame)).toBeNull()
  expect(reading({ ...widget('WSpeed'), CLASS: 'unknown.WSpeed' }, {}, frame)).toBeNull()
})
test('no data keeps title/background unless ValueWidget hide_labels is enabled', () => {
  const empty = { speed: null, vertical: null, altitude: null, time: null }
  const scene = valueScene(widget('WAMSL'), {}, empty, 540, 600, 1080, 2400, measure)!
  expect(scene.hidden).toBe(false)
  expect(scene.runs.map((run) => run.text)).toEqual(['AMSL'])
  expect(
    valueScene(widget('WAMSL', { _hide_labels: true }), {}, empty, 540, 600, 1080, 2400, measure)
      ?.hidden,
  ).toBe(true)
  expect(
    valueScene(widget('WAirTime', { _hide_labels: true }), {}, empty, 540, 600, 1080, 2400, measure)
      ?.hidden,
  ).toBe(false)
})
test('non-PRO title overrides are ignored; populated data retains labels with hide_labels', () => {
  const scene = valueScene(
    widget('WVerticalSpeed', { titletext: 'custom', _hide_labels: true }),
    { 'Display.WidgetTitleColor': -1 },
    frame,
    540,
    600,
    1080,
    2400,
    measure,
  )!
  expect(scene.runs[0]).toMatchObject({ text: 'Вертикальная скорость / 2s', color: '#7f7f7f' })
  expect(scene.runs.map((run) => run.text)).toContain('+1,2')
  expect(scene.runs[1]?.stroke).toBeUndefined()
})
test('native fit uses 3px margin and rounds sizes greater than 30 down to tens', () => {
  const run = fit('123', 0, 0, 540, 600, measure)!
  expect(run.size % 10).toBe(0)
  expect(run.x).toBeGreaterThanOrEqual(3)
  expect(run.x + measure('123', run.size).width).toBeLessThanOrEqual(537)
  expect(fit('123', 0, 0, 5, 600, measure)).toBeNull()
})
test('native initial inverse metrics cap narrow glyph expansion', () => {
  expect(fit('0', 0, 0, 405, 600, measure)?.size).toBe(390)
})
test('historical fit shrinks for a wider reading and does not grow back', () => {
  const cache = newFitCache()
  const initial = fit('0', 0, 0, 405, 600, measure, 'right', cache)!
  const wide = fit('12345', 0, 0, 405, 600, measure, 'right', cache)!
  const returned = fit('0', 0, 0, 405, 600, measure, 'right', cache)!
  expect(wide.size).toBeLessThan(initial.size)
  expect(returned.size).toBe(wide.size)
  expect(returned.x + measure('0', returned.size).width).toBe(402)
  expect(fit('0', 0, 0, 405, 600, measure)!.size).toBe(initial.size)
})
test('two-line unit cache uses total line height and survives repeated frames', () => {
  const cache = newFitCache()
  const first = fitLines(['км', 'ч'], 405, 21, 540, 600, measure, 'center', cache)
  const second = fitLines(['км', 'ч'], 405, 21, 540, 600, measure, 'center', cache)
  expect(second).toEqual(first)
  expect(cache.maxHeight).toBe(2)
  expect(first[1]!.y - first[0]!.y).toBe(first[0]!.size)
})
test('value/unit history stays separate and missing input preserves previous fit', () => {
  const cache = newSceneCache()
  const w = widget('WSpeed')
  const render = (speed: number | null) =>
    valueScene(w, {}, { ...frame, speed }, 540, 600, 1080, 2400, measure, cache)!
  const initial = render(0)
  const wide = render(12345)
  const saved = structuredClone(cache)
  render(null)
  expect(cache).toEqual(saved)
  const restored = render(0)
  expect(restored.runs[1]!.size).toBe(wide.runs[1]!.size)
  expect(restored.runs[2]!.size).toBe(initial.runs[2]!.size)
})
