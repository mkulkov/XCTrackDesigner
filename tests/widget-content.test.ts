import { expect, test } from 'vitest'
import { contentSpecs } from '../web/src/widget-content'
import { reading, valueScene } from '../web/src/value-layout'
import type { Frame, Measure } from '../web/src/value-layout'
import type { Widget } from '../web/src/xcfg'

const widget = (name: string, extra = {}): Widget => ({
  CLASS: `org.xcontest.XCTrack.widget.w.${name}`,
  X1: 0,
  Y1: 0,
  X2: 10000,
  Y2: 10000,
  ...extra,
})
const frame: Frame = { speed: 36, vertical: -1, altitude: 1234, time: 3661 }
const measure: Measure = (text, size) => ({
  width: text.length * size * 0.6,
  ascent: size * 0.8,
  descent: size * 0.2,
})
const scene = (w: Widget, f = frame) => valueScene(w, {}, f, 540, 600, 1080, 2400, measure)

test('registered content has native class-specific unavailable states without invented readings', () => {
  for (const name of Object.keys(contentSpecs)) {
    const result = scene(widget(name))
    expect(result, name).not.toBeNull()
    expect(result?.hidden, name).toBe(false)
    if (
      !['WFreeText', 'WTime', 'WLocation', 'WExternalData', 'WBrightnessInfo', 'WLastKey'].includes(
        name,
      )
    )
      expect(
        result?.runs
          .filter((run) => run.role !== 'title')
          .every((run) => run.text === '' || !run.text.startsWith('--')),
        name,
      ).toBe(true)
  }
  expect(reading(widget('WAltitude'), {}, frame)?.text).toBe('')
  expect(reading(widget('WTime'), {}, frame)?.text).toBe('--:--:--')
  expect(reading(widget('WAltitudeAboveGround'), {}, frame)?.text).toBe('')
})

test('numeric sensors accept only explicit finite readings and use native formatting families', () => {
  const f = {
    ...frame,
    widgetValues: {
      WAirTemperature: -4.24,
      WAirHumidity: 67.8,
      WQNH: 101325,
      WWindSpeed: 10,
      WXCSpeed: 10,
    },
  }
  expect(reading(widget('WAirTemperature'), {}, f)).toMatchObject({ text: '-4,2', unit: '°C' })
  expect(reading(widget('WAirTemperature', { _units: 'FAHRENHEIT' }), {}, f)?.text).toBe('24,4')
  expect(reading(widget('WAirHumidity'), {}, f)).toMatchObject({ text: '68', unit: '%' })
  expect(reading(widget('WQNH'), {}, f)).toMatchObject({ text: '1013,25', unit: 'hPa' })
  expect(reading(widget('WWindSpeed'), { 'Unit.WindSpeed': 'm/s' }, f)?.text).toBe('10,0')
  expect(reading(widget('WXCSpeed'), {}, f)?.text).toBe('36,0')
  expect(
    reading(widget('WWindSpeed'), {}, { ...frame, widgetValues: { WWindSpeed: Infinity } })?.text,
  ).toBe('')
})

test('altitude override and signed altitude preserve independent sources', () => {
  const f = {
    ...frame,
    widgetValues: { WAltitude: 1000, WBaroAltitude: 900, WThermalAltGain: -45.8 },
  }
  expect(reading(widget('WAltitude', { _units: 'FOOT' }), {}, f)?.text).toBe('3281')
  expect(reading(widget('WBaroAltitude'), {}, f)?.text).toBe('900')
  expect(reading(widget('WThermalAltGain'), {}, f)?.text).toBe('-46')
})

test('glide is explicitly supplied, with native ratio prefix and headless setting', () => {
  const f = { ...frame, widgetValues: { WGlide: 8.34 } }
  expect(reading(widget('WGlide'), {}, f)?.text).toBe('1:8,3')
  expect(reading(widget('WGlide', { headless: true }), {}, f)?.text).toBe('8,3')
  expect(reading(widget('WCompGlideToGoal'), {}, f)?.text).toBe('')
  expect(scene(widget('WGlide'), f)?.runs[0]?.text).toBe('Качество / 2s')
})

test('distance transitions units and clock is independent of elapsed flight time', () => {
  expect(
    reading(
      widget('WNextTurnpointDistance'),
      {},
      { ...frame, widgetValues: { WNextTurnpointDistance: 1500 } },
    ),
  ).toMatchObject({ text: '[1,5]', unit: 'км' })
  expect(
    reading(
      widget('WTime', { showSec: false }),
      {},
      { ...frame, widgetValues: { WTime: '09:12:34' } },
    )?.text,
  ).toBe('09:12')
  expect(reading(widget('WTime', { showSec: false }), {}, frame)?.text).toBe('--:--')
})

test('direction uses independent bearing and native sixteen compass sectors', () => {
  const f = { ...frame, widgetValues: { WWindDirection: 45, WBearing: -90 } }
  expect(reading(widget('WWindDirection'), {}, f)?.text).toBe('СВ')
  expect(reading(widget('WBearing', { degrees: true }), {}, f)?.text).toBe('270°')
})

test('FreeText uses literal native text and settings without title, units or HTML execution', () => {
  const w = widget('WFreeText', {
    text: '<script>x</script>\nHello',
    text_padding: 20,
    text_size: 25,
    text_bold: true,
    text_italic: true,
    color_text: -65536,
    color_bg: -16777216,
    titletext: 'ignored',
  })
  const before = structuredClone(w)
  const result = scene(w)!
  expect(result.runs[0]).toMatchObject({
    text: '<script>x</script>',
    x: 20,
    color: '#ff0000ff',
    fontWeight: 'bold',
    fontStyle: 'italic',
  })
  expect(result.runs.some((run) => run.role === 'title')).toBe(false)
  expect(result.contentBackground).toBe('#000000ff')
  expect(w).toEqual(before)
})

test('new value hide behavior uses missing data but does not suppress text widgets', () => {
  expect(scene(widget('WAltitude', { _hide_labels: true }))?.hidden).toBe(true)
  expect(scene(widget('WWindDirection', { _hide_labels: true }))?.hidden).toBe(false)
  expect(
    scene(widget('WWindSpeed', { _hide_labels: true }), {
      ...frame,
      widgetValues: { WWindSpeed: 0 },
    })?.hidden,
  ).toBe(false)
})

test('unknown classes and unsupported enums remain diagnostics', () => {
  expect(reading(widget('WMap'), {}, frame)).toBeNull()
  expect(reading(widget('constructor'), {}, frame)).toBeNull()
  expect(reading(widget('WAirTemperature', { _units: 'future' }), {}, frame)).toBeNull()
  expect(reading(widget('WAltitude', { _units: 'future' }), {}, frame)).toBeNull()
})

test('native sensor absence leaves title only or formatter units instead of fake dashes', () => {
  expect(scene(widget('WAltitude'))?.runs.map((r) => r.text)).toEqual(['GPS Высота'])
  const air = scene(widget('WAirSpeed', { _hide_labels: true }))!
  expect(air.hidden).toBe(false) // Native formatter NaN result is non-null.
  expect(air.runs.map((r) => r.text)).toContain('км')
  expect(air.runs.some((r) => r.text === '--')).toBe(false)
  expect(reading(widget('WExternalData', { suffix: ' kg' }), {}, frame)?.text).toBe('- kg')
  expect(scene(widget('WExternalData', { _hide_labels: true }))?.hidden).toBe(true)
})

test('navigation brackets reflect target and can be disabled without changing SI inputs', () => {
  const f = { ...frame, widgetValues: { WNextTurnpointDistance: 1555, WNextTurnpointAlt: -20.1 } }
  expect(reading(widget('WNextTurnpointDistance'), {}, f)?.text).toBe('[1,5]')
  expect(
    reading(widget('WNextTurnpointDistance', { navigation_target: 'CYLINDER' }), {}, f)?.text,
  ).toBe('(1,5)')
  expect(
    reading(widget('WNextTurnpointDistance', { navigation_target: 'POINT' }), {}, f)?.text,
  ).toBe('1,5')
  expect(reading(widget('WNextTurnpointAlt', { use_brackets: false }), {}, f)?.text).toBe('-21')
  expect(
    reading(
      widget('WTakeoffCourse', { degrees: true }),
      {},
      { ...f, widgetValues: { WTakeoffCourse: 90 } },
    )?.text,
  ).toBe('90')
})

test('paired competition distances support imperial units and threshold from util/p', () => {
  const f = { ...frame, widgetValues: { WTakeoffDistance: 1609.344 } }
  expect(
    reading(widget('WTakeoffDistance'), { 'Unit.CompetitionDistance': 'ft,mi' }, f),
  ).toMatchObject({ text: '1,0', unit: 'миль' })
  const small = { ...frame, widgetValues: { WTakeoffDistance: 100 } }
  expect(
    reading(widget('WTakeoffDistance'), { 'Unit.CompetitionDistance': 'ft,mi' }, small),
  ).toMatchObject({ text: '328', unit: 'фт' })
  expect(
    reading(widget('WTakeoffDistance'), { 'Unit.CompetitionDistance': 'nm' }, f),
  ).toMatchObject({ text: '0', unit: 'nm' })
})

test('arrival time uses numeric duration and native time_format rather than wall clock', () => {
  const f = { ...frame, widgetValues: { WNextTurnpointTimeOfArrival: 3661, WCompTimeAtStart: -61 } }
  const w = widget('WNextTurnpointTimeOfArrival', { use_brackets: false })
  expect(reading(w, {}, f)?.text).toBe('1:01:01')
  expect(reading({ ...w, time_format: 'HM' }, {}, f)?.text).toBe('1:01')
  expect(reading({ ...w, time_format: 'WITH_UNITS' }, {}, f)?.text).toBe('1 час 1 мин')
  expect(
    reading(widget('WCompTimeAtStart', { time_format: 'HMS', use_brackets: false }), {}, f),
  ).toMatchObject({ text: '-0:01:01', tone: 'red' })
})

test('GPS location native formats use two right-aligned lines and UTM three lines', () => {
  const f = { ...frame, widgetValues: { WLocation: '43.25 -76.5' } }
  expect(reading(widget('WLocation'), {}, f)?.text).toBe('43.2500 N\n76.5000 W')
  expect(reading(widget('WLocation', { _format: 'DEG_MIN' }), {}, f)?.text).toBe(
    "43° 15.0000' N\n76° 30.0000' W",
  )
  expect(reading(widget('WLocation', { _format: 'DEG_MIN_SEC' }), {}, f)?.text).toBe(
    '43° 15\' 0" N\n76° 30\' 0" W',
  )
  const centralMeridian = { ...frame, widgetValues: { WLocation: '0 3' } }
  expect(reading(widget('WLocation', { _format: 'UTM' }), {}, centralMeridian)?.text).toBe(
    '31 N\n0500000\n0000000',
  )
  expect(reading(widget('WLocation', { _format: 'DEG_MIN' }), {}, frame)?.text).toBe(
    "--° --.----' -\n--° --.----' -",
  )
  const runs = scene(widget('WLocation'), f)!.runs.slice(1)
  expect(runs).toHaveLength(2)
  for (const run of runs) expect(run.x + measure(run.text, run.size).width).toBe(537)
})

test('weighted next point and countdown use separate 2:1 line regions and caches', () => {
  const f = {
    ...frame,
    widgetValues: { WNextTurnpoint: 'TP1\nDescription', WCompTimeToStart: 125 },
  }
  const result = scene(widget('WNextTurnpoint'), f)!
  expect(result.runs.slice(1).map((r) => r.text)).toEqual(['TP1', 'Description'])
  expect(result.runs[1]!.size).toBeGreaterThan(result.runs[2]!.size)
  expect(reading(widget('WCompTimeToStart'), {}, f)?.text).toBe('-02:05')
  expect(scene(widget('WCompTimeToStart', { _hide_labels: true }))?.hidden).toBe(true)
  expect(
    reading(widget('WCompPercentage'), {}, { ...frame, widgetValues: { WCompPercentage: 42.5 } })
      ?.text,
  ).toBe('42%')
  expect(
    reading(widget('WCompPercentage'), {}, { ...frame, widgetValues: { WCompPercentage: 101 } })
      ?.text,
  ).toBe('')
})

test('netto and thermal native tones, averaging title and glide showVario are rendered', () => {
  const f = { ...frame, vertical: 2.14, widgetValues: { WNettoVario: -0.5, WThermalAltGain: 50 } }
  expect(reading(widget('WNettoVario'), {}, f)?.tone).toBe('normal')
  expect(reading(widget('WThermalAltGain'), {}, f)?.tone).toBe('green')
  expect(scene(widget('WNettoVario', { netto_avg: 500 }), f)?.runs[0]?.text).toBe(
    'Нетто варио / 0.5s',
  )
  expect(reading(widget('WGlide', { showVario: true }), {}, f)).toMatchObject({
    text: '+2,1',
    unit: 'м/с',
    tone: 'green',
    missing: false,
  })
  const eink = valueScene(
    widget('WThermalAltGain', { _theme: 'WhiteEInkTheme' }),
    {},
    f,
    540,
    600,
    1080,
    2400,
    measure,
  )!
  expect(eink.runs[1]).toMatchObject({ color: '#000', stroke: undefined })
})

test('digital compass follows native relative arrow sectors and absolute degree unit', () => {
  const f = { ...frame, widgetValues: { WBearing: 100, WCompassDigital: 130 } }
  expect(reading(widget('WCompassDigital'), {}, f)).toMatchObject({
    text: '⬈30',
    unit: '°',
    tone: 'green',
  })
  expect(
    reading(
      widget('WCompassDigital'),
      {},
      { ...f, widgetValues: { WBearing: 100, WCompassDigital: 10 } },
    ),
  ).toMatchObject({ text: '⬅90', tone: 'red' })
  expect(reading(widget('WCompassDigital', { relative: false }), {}, f)).toMatchObject({
    text: '130',
    unit: '°',
    tone: 'normal',
  })
  expect(reading(widget('WCompassDigital', { target: 'N_BEARING' }), {}, f)).toMatchObject({
    title: 'Компас Курс',
  })
  expect(reading(widget('WCompassDigital'), {}, frame)?.text).toBe('')
})

test('sunset has explicit absolute/remaining inputs, time threshold and twilight classes', () => {
  const f = {
    ...frame,
    widgetValues: { WSunset: 18 * 3600 + 31 * 60, 'WSunset.remaining': 1200, WSunsetCivil: 3700 },
  }
  expect(reading(widget('WSunset'), {}, f)).toMatchObject({ text: '18:31', tone: 'orange' })
  expect(reading(widget('WSunset', { showBefore: 900000 }), {}, f)?.text).toBe('')
  expect(reading(widget('WSunsetCivil', { relative: 'RELATIVE_TIME' }), {}, f)?.text).toBe('+1:01')
  expect(reading(widget('WSunset'), {}, frame)?.text).toBe('')
})

test('optimization distances use general units, native 500 threshold and independently drawn track icon', () => {
  const f = {
    ...frame,
    widgetValues: {
      WOptiResult: 123456,
      'WOptiResult.type': 'flat',
      WOptiUnfinishedTriangle: 500999,
      'WOptiUnfinishedTriangle.type': 'fai',
    },
  }
  expect(reading(widget('WOptiResult'), {}, f)).toMatchObject({ text: '123,4', unit: 'км' })
  expect(reading(widget('WOptiUnfinishedTriangle'), {}, f)).toMatchObject({
    text: '500',
    unit: 'км',
  })
  const result = scene(widget('WOptiResult'), f)!
  expect(result.symbol).toMatchObject({ x: 1, width: 84, height: 84, background: '#00a522' })
  expect(result.runs[1]!.x).toBeGreaterThanOrEqual(87)
  expect(scene(widget('WOptiResult'), frame)?.symbol).toBeUndefined()
  expect(
    reading(
      widget('WOptiResult'),
      { 'Unit.Distance': 'ft,mi', 'Unit.CompetitionDistance': 'm,km' },
      { ...f, widgetValues: { WOptiResult: 1609.344 } },
    ),
  ).toMatchObject({ text: '1,0', unit: 'миль' })
})
