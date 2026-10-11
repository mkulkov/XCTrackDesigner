import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { expect, test } from 'vitest'
import { GraphicWidget } from '../web/src/GraphicWidget'
import { widgetLibrary } from '../web/src/widget-library'
import type { FlightFrame } from '../web/src/flight-engine'
import type { Widget } from '../web/src/xcfg'

const frame: FlightFrame = {
  speed: 36,
  vertical: 2,
  altitude: 1800,
  time: 80,
  flight: {
    position: { lat: 43.01, lon: 77.01 },
    heading: 90,
    wind: { speed: 3, from: 270 },
    gps: true,
    elapsed: 80,
    status: 'simulation',
    history: [
      { seconds: 60, lat: 43, lon: 77, altitude: 1760, vertical: 2, speed: 10 },
      { seconds: 70, lat: 43.005, lon: 77.008, altitude: 1780, vertical: 2, speed: 12 },
      { seconds: 80, lat: 43.01, lon: 77.01, altitude: 1800, vertical: 2, speed: 10 },
    ],
    track: [
      { lat: 43, lon: 77 },
      { lat: 43.01, lon: 77.01 },
    ],
    task: {
      nextIndex: 0,
      distance: 2000,
      bearing: 45,
      arrivalSeconds: 200,
      requiredGlide: 4,
      goalAltitude: 1300,
      arrivalHeight: 200,
      waypoints: [{ name: 'Цель', lat: 43.02, lon: 77.02, altitude: 1300, radius: 400 }],
    },
    batteryPercent: 73,
    sensors: true,
    live: false,
    terrain: [
      { distance: 0, altitude: 1400 },
      { distance: 2000, altitude: 1300 },
    ],
    airspaces: [{ name: 'TMA', distance: 500, floor: 900, ceiling: 2500, inside: false }],
  },
}
const empty: FlightFrame = {
  speed: null,
  vertical: null,
  altitude: null,
  time: null,
  flight: {
    position: null,
    heading: null,
    wind: null,
    history: [],
    track: [],
    task: null,
    status: 'no-data',
    gps: false,
    elapsed: 0,
  },
}
const widget = (name: string, options = {}): Widget => ({
  CLASS: `org.xcontest.XCTrack.widget.w.${name}`,
  X1: 0,
  Y1: 0,
  X2: 10000,
  Y2: 10000,
  ...options,
})
const render = (name: string, options = {}, f = frame) =>
  renderToStaticMarkup(
    createElement(
      'svg',
      null,
      createElement(GraphicWidget, {
        widget: widget(name, options),
        frame: f,
        width: 400,
        height: 300,
        light: true,
      }),
    ),
  )

test('every complex registry widget has an independent inert preview with absent and supplied inputs', () => {
  for (const entry of widgetLibrary.filter(
    (e) => !['value', 'text', 'free-text'].includes(e.family),
  )) {
    for (const f of [empty, frame]) {
      const output = render(entry.name, {}, f)
      expect(output, entry.name).toContain(`data-renderer="${entry.name}"`)
      expect(output, entry.name).not.toMatch(/NaN|Infinity|<iframe|<script|href=/)
    }
  }
})
test('compass reflects heading, navigation, wind and visible label options', () => {
  const output = render('WCompass', {
    rotation: 'NORTH',
    showWind: true,
    showHeading: true,
    showBearing: true,
  })
  expect(output).toContain('data-compass-arrow="heading"')
  expect(output).toContain('data-compass-arrow="navigation"')
  expect(output).toContain('data-compass-arrow="wind"')
  expect(output).not.toContain('90°')
  expect(output).not.toContain('Цель 45°')
  expect(render('WCompass', { showWind: false })).not.toContain('data-compass-arrow="wind"')
  expect(render('WCompass', {}, empty)).not.toContain('--')
})
test('graphs use explicit history and selected source; wind history is not invented', () => {
  expect(render('WVerticalGraph', { dot_color: -65536, dot_size: 10 })).toContain(
    'data-series="vertical-altitude"',
  )
  expect(render('WVerticalGraph', { dot_color: -65536 })).toContain('#ff0000')
  expect(render('WAltitudeDataGraph')).toContain('data-series="altitude-bins"')
  expect(render('WAltitudeDataGraph', { type: 'GRAPH_SPEED' })).toContain(
    'data-series="altitude-bins"',
  )
  expect(render('WAltitudeDataGraph', { type: 'GRAPH_WIND' })).not.toContain('data-altitude-bin=')
  expect(
    render(
      'WAltitudeDataGraph',
      { type: 'GRAPH_WIND' },
      {
        ...frame,
        flight: {
          ...frame.flight,
          history: frame.flight.history.map((p) => ({ ...p, windSpeed: 3 })),
        },
      },
    ),
  ).toContain('data-series="altitude-bins"')
  expect(render('WVerticalGraph', { interval: 1000 })).toContain('<circle')
  expect(render('WVerticalGraph', {}, empty)).not.toContain('<text')
})
test('thermal trace, circle and scale depend on data and settings', () => {
  const output = render('WThermalAssistant', {
    drawCircle: true,
    drawScale: true,
    nav_showWind: true,
  })
  expect(output).toContain('data-series="thermal-track"')
  expect(output).toContain('stroke-dasharray="5 5"')
  expect(output).toContain('км')
  expect(render('WThermalAssistant', { drawCircle: false, drawScale: false })).not.toContain(
    'stroke-dasharray',
  )
  expect(render('WThermalAssistant', {}, empty)).not.toContain('<text')
})
test('sideview and task summary preserve unavailable inputs while displaying configured navigation', () => {
  expect(render('WSideView')).toContain('data-series="terrain"')
  expect(render('WSideView', { type: 'SIDE_NAVIG' })).toContain('data-series="arrival"')
  expect(
    render('WSideView', {}, { ...frame, flight: { ...frame.flight, terrain: undefined } }),
  ).not.toContain('<text')
  expect(render('WCompTaskSummary')).toContain('Цель r=400 м')
  expect(render('WCompTaskSummary')).toContain('&gt; Цель r=400 м &lt;')
  expect(render('WCompTaskSummary', {}, empty)).not.toContain('<text')
})
test('status, airspaces, messages, log filter and button settings are reflected without actions', () => {
  expect(render('WStatusLine', { showTime: true })).toContain('data-status-icon="gps-ok"')
  expect(render('WStatusLine', { showTime: true })).toContain('73%')
  expect(render('WStatusLine', { showGps: false })).not.toContain('GPS')
  expect(render('WAirspaceProximity')).toContain('TMA')
  expect(render('WAirspaceProximity', { maxDistance: 100 })).not.toContain('<text')
  expect(render('WAirspaceProximity', {}, empty)).not.toContain('<text')
  expect(
    render(
      'WLogPeek',
      { filter: 'yes' },
      { ...frame, widgetValues: { WLogPeek: 'no\nyes\nother' } },
    ),
  ).toContain('>yes</text>')
  expect(
    render(
      'WLogPeek',
      { filter: 'yes' },
      { ...frame, widgetValues: { WLogPeek: 'no\nyes\nother' } },
    ),
  ).not.toContain('>other</text>')
  expect(
    render('WButtonPhone', {
      contact: { fullName: 'Пилот', phoneNumber: '123' },
      showContactName: true,
    }),
  ).toContain('Пилот')
  expect(
    render('WButtonIntentLauncher', { name: 'Локальная кнопка', action: 'javascript:alert(1)' }),
  ).toContain('Локальная кнопка')
  expect(render('WWebView', { url: 'javascript:alert(1)' })).toContain('Веб-содержимое отключено')
})

test('airspace proximity separates native text blocks along the configured axis', () => {
  const f = {
    ...frame,
    flight: {
      ...frame.flight,
      airspaces: [
        { name: 'TMA', distance: 500, floor: 900, ceiling: 2500, inside: false },
        { name: 'CTR', distance: 800, floor: 0, ceiling: 1200, inside: false },
      ],
    },
  }
  const horizontal = render('WAirspaceProximity', { _splitdirection: 'HORIZONTAL' }, f)
  expect(horizontal).toContain('data-airspace-panel="1" transform="translate(0 150)"')
  expect(horizontal).toContain('stroke="#ff3232"')
  expect(render('WAirspaceProximity', { _splitdirection: 'VERTICAL' }, f)).toContain(
    'data-airspace-panel="1" transform="translate(200 0)"',
  )
  expect(render('WAirspaceProximity', { _showoriginalheightline: false }, f)).not.toContain(
    '900 – 2500',
  )
})
