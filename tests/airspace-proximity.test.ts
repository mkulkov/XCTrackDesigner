import { expect, test } from 'vitest'
import { nearbyAirspaces } from '../web/src/airspace-proximity'

test('proximity considers holes, sorts boundaries and retains only known AMSL heights', () => {
  const rings: [number, number][][] = [
    [
      [-0.02, -0.02],
      [0.02, -0.02],
      [0.02, 0.02],
      [-0.02, 0.02],
    ],
    [
      [-0.001, -0.001],
      [0.001, -0.001],
      [0.001, 0.001],
      [-0.001, 0.001],
    ],
  ]
  const zone = {
    name: 'Synthetic',
    rings,
    activation: 'unknown' as const,
    lower: { reference: 'AMSL' as const, metres: 1000 },
    upper: { reference: 'unknown' as const, metres: 2000 },
  }
  const center = nearbyAirspaces([zone], { lat: 0, lon: 0 })[0]!
  expect(center.inside).toBe(false)
  expect(center.distance).toBeCloseTo(111.195, 1)
  expect(center.floor).toBe(1000)
  expect(center.ceiling).toBeUndefined()
  expect(nearbyAirspaces([zone], { lat: 0.01, lon: 0.01 })[0]!.inside).toBe(true)
  expect(nearbyAirspaces([], { lat: 0, lon: 0 })).toEqual([])
})
