import { expect, test } from 'vitest'
import { windEdge, nativeMapScale } from '../web/src/native-navigation'

test('wind-from ray intersects inset edges with inward pointing arrow geometry', () => {
  expect(windEdge(540, 600, 270, 300, 0, 32)).toMatchObject({ x: 270, y: 32, dx: 0, dy: -32 })
  expect(windEdge(540, 600, 270, 300, 90, 32)?.x).toBeCloseTo(508)
  expect(windEdge(540, 600, 270, 300, 180, 32)?.y).toBeCloseTo(568)
  expect(windEdge(540, 600, 270, 300, 270, 32)?.x).toBeCloseTo(32)
  const shifted = windEdge(540, 600, 100, 200, 45, 32)!
  expect(shifted.y).toBeCloseTo(32)
  expect(shifted.x).toBeCloseTo(268)
  expect(windEdge(540, 600, -1, 300, 90, 32)).toBeNull()
  expect(windEdge(20, 20, 10, 10, 0, 32)).toBeNull()
})

test('native scale at thermal zoom 34 matches 300m bracket on 1080px display', () => {
  expect(nativeMapScale(34, 37.422, 1080).distance).toBe(300)
  expect(nativeMapScale(34, 37.422, 1080).pixels).toBeGreaterThan(300)
  expect(nativeMapScale(34, 37.422, 1080).pixels).toBeLessThan(330)
})
