import { expect, test } from 'vitest'
import { mercatorY, thermalColor, thermalZoomScale } from '../web/src/thermal-rendering'

test('native thermal colours progress through grey, green, yellow and red', () => {
  expect(thermalColor(-2, 0)).toEqual({ color: 'rgb(128,128,128)', alpha: 1 })
  expect(thermalColor(1, 0).color).toBe('rgb(0,255,0)')
  expect(thermalColor(2, 0).color).toBe('rgb(255,255,0)')
  expect(thermalColor(5, 0).color).toBe('rgb(255,0,0)')
  expect(thermalColor(2, 1).alpha).toBe(55 / 255)
})
test('native Mercator zoom alternates integer doubling sequences', () => {
  expect([0, 1, 2, 3, 34].map(thermalZoomScale)).toEqual([256, 362, 512, 724, 33554432])
  expect(mercatorY(0)).toBeCloseTo(0.5)
  expect(mercatorY(90)).toBeCloseTo(0)
})
