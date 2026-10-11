import { expect, test } from 'vitest'
import { cellStep, gestureBounds } from '../web/src/editor-geometry'

const bounds = { X1: 2000, Y1: 3000, X2: 6000, Y2: 7000 }
test('moving clamps the whole widget without changing its size', () => {
  expect(gestureBounds(bounds, 'move', 9000, -9000, 1080, 2400, false)).toEqual({
    X1: 6000,
    Y1: 0,
    X2: 10000,
    Y2: 4000,
  })
})
test('resizing cannot cross the opposite corner and retains one native cell', () => {
  const resized = gestureBounds(bounds, 'nw', 9000, 9000, 1080, 2400, false)
  expect(resized.X2 - resized.X1).toBe(Math.ceil(cellStep(1080)))
  expect(resized.Y2 - resized.Y1).toBe(Math.ceil(cellStep(2400)))
  expect(resized.X2).toBe(bounds.X2)
})
test('snapping uses native cell increments and a zero gesture preserves exact coordinates', () => {
  expect(gestureBounds(bounds, 'move', 10, 10, 1080, 2400, true)).toBe(bounds)
  const moved = gestureBounds(bounds, 'move', 500, 0, 1080, 2400, true)
  expect(moved.X1 - bounds.X1).toBe(Math.round(cellStep(1080)))
})
