import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { expect, test } from 'vitest'
import {
  NativeFlightGraphics,
  nativeVarioSegments,
  nativeAltitudeBins,
  nativeGraphicMetric,
} from '../web/src/NativeFlightGraphics'
import { buildFlightFrame } from '../web/src/flight-engine'
import type { Frame } from '../web/src/value-layout'

const render = (name: string, frame: Frame, options = {}) =>
  renderToStaticMarkup(
    createElement(NativeFlightGraphics, {
      widget: {
        CLASS: `org.xcontest.XCTrack.widget.w.${name}`,
        X1: 0,
        Y1: 0,
        X2: 10000,
        Y2: 10000,
        ...options,
      },
      frame,
      width: 400,
      height: 300,
      light: true,
    }),
  )

test('native physical metric includes large-display correction', () => {
  expect(nativeGraphicMetric(320, 480, 160)).toBeCloseTo(160 / 25.4)
  expect(nativeGraphicMetric(1080, 2337, 420)).toBeGreaterThan(420 / 25.4)
})
test('vario uses twenty segments per 4 m/s with native overflow band', () => {
  expect(nativeVarioSegments(2)).toEqual({ first: 10, last: 19, overflowFirst: 1, overflowLast: 0 })
  expect(nativeVarioSegments(-2).first).toBe(20)
  expect(nativeVarioSegments(-2).last).toBe(29)
  expect(nativeVarioSegments(6)).toEqual({ first: 0, last: 9, overflowFirst: 10, overflowLast: 19 })
  expect(nativeVarioSegments(-6)).toEqual({
    first: 30,
    last: 39,
    overflowFirst: 20,
    overflowLast: 29,
  })
  expect(nativeVarioSegments(9).last).toBe(0)
  expect(nativeVarioSegments(-9).first).toBe(39)
  expect(
    render('WVarioColumn', { speed: null, time: null, altitude: null, vertical: 2 }),
  ).not.toContain('<text')
})
test('native vertical graph displays altitude over time, dots and metres, no connecting curve', () => {
  const frame = buildFlightFrame(60, 'thermal')
  const output = render('WVerticalGraph', frame, { dot_color: -65536, vertical_step: 50 })
  expect(output).toContain('data-series="vertical-altitude"')
  expect(output).toContain('fill="#ff0000ff"')
  expect(output).toContain('<circle')
  expect(output).not.toContain('<polyline')
  expect(output).not.toContain('m/s')
  // Native graph uses (400 - 2 * round(12.4)) / 40 with integer division.
  expect(output).toContain('d="M9 21 L13.5 12 L18 21')
  expect(
    render('WVerticalGraph', {
      ...frame,
      flight: {
        ...frame.flight,
        history: frame.flight.history.map((p) => ({ ...p, vertical: null })),
      },
    }),
  ).toContain('<circle')
})
test('altitude graph buckets by height and uses selected data availability', () => {
  const samples = [
    { seconds: 0, lat: 0, lon: 0, altitude: 1210, vertical: 2, speed: 10 },
    { seconds: 10, lat: 0, lon: 0, altitude: 1230, vertical: 4, speed: 20 },
  ]
  expect(nativeAltitudeBins(samples, 'GRAPH_THERMAL')).toEqual([{ altitude: 12, value: 3 }])
  expect(nativeAltitudeBins(samples, 'GRAPH_SPEED')).toEqual([{ altitude: 12, value: 15 }])
  expect(nativeAltitudeBins(samples, 'GRAPH_WIND')).toEqual([])
  const frame = buildFlightFrame(60, 'thermal')
  expect(render('WAltitudeDataGraph', frame)).toContain('data-altitude-bin=')
  expect(render('WAltitudeDataGraph', frame, { type: 'GRAPH_WIND' })).toContain(
    'data-altitude-bin=',
  )
})
test('native empty inputs remain blank; absent terrain is not a flat profile', () => {
  const empty = buildFlightFrame(0, 'no-data')
  for (const name of ['WVarioColumn', 'WVerticalGraph', 'WAltitudeDataGraph', 'WSideView']) {
    const result = render(name, empty)
    expect(result).not.toMatch(/<text|<circle|<rect|<path|<line|<polygon/)
    expect(result).not.toMatch(/NaN|Infinity/)
  }
  const populated = buildFlightFrame(60, 'thermal')
  expect(render('WSideView', populated)).not.toContain('<polygon')
  expect(render('WCompass', empty)).toContain('data-compass-background="true"')
  expect(render('WCompass', empty, { showBackground: false })).not.toContain('<circle')
})
test('compass has native rose and split arrows controlled by native flags', () => {
  const frame = buildFlightFrame(60, 'thermal')
  const enabled = render('WCompass', frame, {
    showHeading: true,
    showWind: true,
    rotation: 'NORTH',
  })
  expect(enabled).toContain('data-compass-arrow="heading"')
  expect(enabled).toContain('data-compass-arrow="wind"')
  expect(enabled).not.toContain('°')
  expect(enabled).toContain(
    'fill="#404040" stroke="#fff" stroke-width="4" paint-order="stroke fill"',
  )
  expect(
    render('WCompass', frame, { showHeading: false, showWind: false, navigation_target: 'NONE' }),
  ).not.toContain('data-compass-arrow=')
  expect(render('WCompass', frame, { showWind: true, newWindArrow: true })).toContain(
    'data-compass-arrow="wind-sector"',
  )
})
