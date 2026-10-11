export type Scenario = 'manual' | 'thermal' | 'glide' | 'no-data'
export function scenarioFrame(scenario: Scenario, seconds: number) {
  if (scenario === 'no-data') return { speed: null, vertical: null, altitude: null, time: null }
  const t = Math.max(0, seconds)
  const thermal = scenario === 'thermal'
  return {
    speed: thermal ? 30 + 5 * Math.sin(t / 8) : 42 + 3 * Math.sin(t / 12),
    vertical: thermal ? 2 + Math.sin(t / 6) : -1.2 + 0.3 * Math.sin(t / 10),
    altitude: thermal
      ? 1200 + 2 * t + 6 * (1 - Math.cos(t / 6))
      : Math.max(0, 1800 - 1.2 * t + 3 * (1 - Math.cos(t / 10))),
    time: t,
  }
}
