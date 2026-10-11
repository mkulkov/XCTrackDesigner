import { expect, test } from 'vitest'
import { scenarioFrame } from '../web/src/simulation'
test('simulation is deterministic at any seek position and uses a null frame for missing sensors', () => {
  expect(scenarioFrame('thermal', 120)).toEqual(scenarioFrame('thermal', 120))
  expect(scenarioFrame('thermal', 120).altitude).toBeGreaterThan(
    scenarioFrame('thermal', 0).altitude!,
  )
  expect(scenarioFrame('glide', 120).altitude).toBeLessThan(scenarioFrame('glide', 0).altitude!)
  expect(scenarioFrame('glide', -10)).toEqual(scenarioFrame('glide', 0))
  expect(scenarioFrame('no-data', 300)).toEqual({
    speed: null,
    vertical: null,
    altitude: null,
    time: null,
  })
})
