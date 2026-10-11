import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { expect, test } from 'vitest'
import { NativeStatusButtons } from '../web/src/NativeStatusButtons'
import type { Frame } from '../web/src/value-layout'
import type { Widget } from '../web/src/xcfg'

const empty: Frame = { speed: null, vertical: null, altitude: null, time: null }
const render = (
  name: string,
  options = {},
  frame: Frame = empty,
  width = 400,
  height = 100,
  light = true,
) => {
  const widget: Widget = {
    CLASS: `org.xcontest.XCTrack.widget.w.${name}`,
    X1: 0,
    Y1: 0,
    X2: 10000,
    Y2: 10000,
    ...options,
  }
  return renderToStaticMarkup(
    createElement(
      'svg',
      null,
      createElement(NativeStatusButtons, { widget, frame, width, height, light }),
    ),
  )
}
const flight: Frame = {
  ...empty,
  flight: {
    position: null,
    heading: null,
    wind: null,
    history: [],
    track: [],
    task: null,
    status: 'simulation',
    gps: true,
    elapsed: 0,
    batteryPercent: 73,
    live: false,
  },
}

test('status strip uses native colors, icon slots and 20-percent battery bands', () => {
  const output = render('WStatusLine', {}, flight)
  expect(output).toContain('#e8e8e8')
  expect(output).toContain('data-status-icon="gps-ok"')
  expect(output).toContain('data-battery-bars="3"')
  expect(output).toContain('73%')
  expect(output).not.toContain('LIVE')
  expect(output).not.toContain('Датчики')
  expect(render('WStatusLine', {}, empty, 400, 100, false)).toContain('#606060')
  expect(render('WStatusLine')).toContain('? %')
  expect(render('WStatusLine')).toContain('#ffaa33')
})

test('all status switches hide their slot and live is only drawn when enabled', () => {
  const off = render(
    'WStatusLine',
    {
      showGps: false,
      showSensors: false,
      showBatteryIcon: false,
      showBatteryPercent: false,
      showLive: false,
      showTime: false,
    },
    flight,
  )
  expect(off).not.toContain('data-status-icon')
  expect(off).not.toContain('<text')
  const live = {
    ...flight,
    flight: { ...flight.flight!, live: true },
    widgetValues: { WTime: '12:34:56' },
  }
  expect(render('WStatusLine', { showTime: true }, live)).toContain('12:34:56')
  expect(render('WStatusLine', {}, live)).toContain('✔LIVE')
  expect(render('WStatusLine', { showLiveLabel: false }, live)).not.toContain('LIVE')
})

test('buttons use shortcut glyphs and shapes without rounded control frames or Android captions', () => {
  expect(render('WButtonZoom')).toContain('>+</text>')
  expect(render('WButtonZoom', { type: 'ACTION_ZOOM_OUT' })).toContain('>–</text>')
  for (const name of [
    'WButtonZoom',
    'WButtonBrightness',
    'WButtonVario',
    'WButtonCamera',
    'WButtonNavig',
    'WButtonPhone',
    'WButtonIntentLauncher',
  ]) {
    const output = render(name)
    expect(output).toContain(`data-renderer="${name}"`)
    expect(output).not.toContain('<rect')
    expect(output).not.toContain('Действие Android')
    expect(output).not.toMatch(/NaN|Infinity|href=|<script/)
  }
  expect(render('WButtonVario')).toContain('Вариометр')
  expect(render('WButtonVario', { showTitle: false })).not.toContain('Вариометр')
  expect(render('WButtonZoom', { _theme: 'WhiteTheme' })).toContain('fill="#ffffc0"')
  expect(render('WButtonZoom', { _theme: 'WhiteTheme' })).toContain('stroke="#000"')
  expect(render('WButtonZoom', { _theme: 'BlackTheme' }, empty, 400, 100, false)).toContain(
    'fill="#ffffc0"',
  )
  expect(render('WButtonZoom', { _theme: 'BlackTheme' }, empty, 400, 100, false)).not.toContain(
    'stroke="#000"',
  )
})

test('task summary no-task and message no-message states leave no diagnostic text', () => {
  expect(render('WCompTaskSummary')).toContain('<rect')
  expect(render('WCompTaskSummary')).toContain('#fff592')
  expect(render('WCompTaskSummary', {}, empty, 400, 100, false)).toContain('#3c3c3c')
  expect(render('WCompTaskSummary')).not.toContain('<text')
  expect(render('WLiveMessage')).not.toContain('<text')
  const output = render(
    'WCompTaskSummary',
    {},
    { ...empty, widgetValues: { WCompTaskSummary: 'Race\nStart 12:00\nGoal' } },
  )
  expect(output).toContain('Start 12:00')
})

test('log obeys mm font size, padding, ARGB, native limit-before-filter and reverse order', () => {
  const f = { ...empty, widgetValues: { WLogPeek: 'old yes\nkeep yes\nother\nlast yes' } }
  const output = render(
    'WLogPeek',
    {
      lines_count: 3,
      filter: 'yes',
      reverse: true,
      text_size: 20,
      text_padding: 8,
      color_text: -65536,
    },
    f,
  )
  expect(output).not.toContain('old yes')
  expect(output).not.toContain('other')
  expect(output.indexOf('last yes')).toBeLessThan(output.indexOf('keep yes'))
  expect(output).toContain('x="8"')
  expect(output).toContain('#ff0000ff')
  expect(output).toContain('font-family="monospace"')
})

test('renders inert text, handles tiny/narrow dimensions, and declines unrelated classes', () => {
  for (const name of [
    'WStatusLine',
    'WCompTaskSummary',
    'WLogPeek',
    'WLiveMessage',
    'WButtonVario',
  ]) {
    expect(render(name, {}, empty, 1, 1)).not.toMatch(/NaN|Infinity/)
  }
  expect(
    render('WButtonIntentLauncher', { name: '<script>hi</script>', action: 'javascript:alert(1)' }),
  ).toContain('&lt;script&gt;')
  expect(
    render('WButtonIntentLauncher', { name: 'safe', action: 'javascript:alert(1)' }),
  ).not.toContain('javascript')
  expect(render('WCompass')).toBe('<svg></svg>')
})
