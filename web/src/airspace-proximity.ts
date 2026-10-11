import type { AirspacePolygon } from './online-map'
import type { FlightState, Position } from './flight-engine'

// Local tangent-plane distance to polygon boundaries, for preview only.
// Schedules, FL conversion and warnings are not inferred from contours.
export function nearbyAirspaces(
  zones: AirspacePolygon[],
  position: Position,
): NonNullable<FlightState['airspaces']> {
  const radians = Math.PI / 180
  const project = ([lon, lat]: [number, number]) => ({
    x:
      (((((lon - position.lon + 180) % 360) + 360) % 360) - 180) *
      radians *
      6371000 *
      Math.cos(position.lat * radians),
    y: (lat - position.lat) * radians * 6371000,
  })
  return zones
    .map((zone) => {
      let minimum = Infinity
      const contains = zone.rings.map((ring) => {
        let inside = false
        for (let index = 0; index < ring.length; index++) {
          const a = project(ring[index]!)
          const b = project(ring[(index + 1) % ring.length]!)
          const dx = b.x - a.x,
            dy = b.y - a.y
          const length = dx * dx + dy * dy
          const ratio = length ? Math.max(0, Math.min(1, -(a.x * dx + a.y * dy) / length)) : 0
          minimum = Math.min(minimum, Math.hypot(a.x + ratio * dx, a.y + ratio * dy))
          if (a.y > 0 !== b.y > 0 && 0 < a.x + (-a.y * dx) / dy) inside = !inside
        }
        return inside
      })
      return {
        name: zone.name,
        distance: minimum,
        inside: contains[0] === true && !contains.slice(1).some(Boolean),
        ...(zone.lower?.reference === 'AMSL' ? { floor: zone.lower.metres } : {}),
        ...(zone.upper?.reference === 'AMSL' ? { ceiling: zone.upper.metres } : {}),
      }
    })
    .filter((zone) => Number.isFinite(zone.distance))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 8)
}
