import { expect, test } from 'vitest'
import { mapTrackPaint, widgetColor, widgetMapRotation } from '../web/src/widget-paint'
import type { Widget } from '../web/src/xcfg'
import { buildFlightFrame } from '../web/src/flight-engine'

const widget = (settings = {}): Widget => ({
  CLASS: 'org.xcontest.XCTrack.widget.w.WXCAssistant',
  X1: 0,
  Y1: 0,
  X2: 10000,
  Y2: 10000,
  ...settings,
})

test('track paint preserves signed ARGB alpha and configured thickness', () => {
  expect(widgetColor(-27091, 'none')).toBe('#ff962dff')
  expect(widgetColor(0x80123456, 'none')).toBe('#12345680')
  expect(widgetColor(0, 'none')).toBe('#00000000')
  expect(
    mapTrackPaint(widget({ tracklog_color: 0x80123456, line_thickness: 20 }), 1080, 2400),
  ).toEqual({ color: '#12345680', width: 19.2 })
})

test('map rotation uses nested imported settings and available simulation directions', () => {
  const flight = buildFlightFrame(20, 'glide').flight
  expect(widgetMapRotation(widget({ rotation: { value: 'HEADING_AT_TOP' } }), flight)).toBe(
    -(flight.heading ?? 0),
  )
  expect(widgetMapRotation(widget({ rotation: { value: 'WIND_AT_TOP' } }), flight)).toBe(
    -(flight.wind?.from ?? 0),
  )
  expect(widgetMapRotation(widget({ rotation: { value: 'NORTH_AT_TOP' } }), flight)).toBeCloseTo(0)
})
