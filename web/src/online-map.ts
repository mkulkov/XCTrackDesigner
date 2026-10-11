export type MapSettings = {
  enabled: boolean
  latitude: number
  longitude: number
  zoom: number
  roads: boolean
  thermalTiles: string
  airspaceUrl: string
  interactive?: boolean
  followGps?: boolean
  rotation?: 'widget' | 'north' | 'heading' | 'track'
  showTrace?: boolean
  showTask?: boolean
  altitudeFilter?: boolean
}

export const initialMap: MapSettings = {
  enabled: true,
  latitude: 44.8,
  longitude: 78.8,
  zoom: 10,
  roads: true,
  thermalTiles: '',
  airspaceUrl: '',
  interactive: false,
  followGps: true,
  rotation: 'widget',
  showTrace: true,
  showTask: true,
  altitudeFilter: false,
}

export function worldPoint(longitude: number, latitude: number, zoom: number) {
  const size = 256 * 2 ** zoom
  const lat = (Math.max(-85.05112878, Math.min(85.05112878, latitude)) * Math.PI) / 180
  return {
    x: ((longitude + 180) / 360) * size,
    y: ((1 - Math.log(Math.tan(lat) + 1 / Math.cos(lat)) / Math.PI) / 2) * size,
  }
}

export function visibleTiles(
  settings: MapSettings,
  width: number,
  height: number,
  tileZoom = settings.zoom,
  rotated = false,
) {
  // A fixed logical viewport keeps request counts independent of native screenshot DPI.
  const scale = 512 / Math.max(width, height) / 2 ** (settings.zoom - tileZoom)
  const center = worldPoint(settings.longitude, settings.latitude, tileZoom)
  const spanWidth = rotated ? Math.hypot(width, height) : width
  const spanHeight = rotated ? Math.hypot(width, height) : height
  const left = center.x - (spanWidth * scale) / 2
  const top = center.y - (spanHeight * scale) / 2
  const count = 2 ** tileZoom
  const tiles = []
  for (let y = Math.floor(top / 256); y <= Math.floor((top + spanHeight * scale) / 256); y++) {
    if (y < 0 || y >= count) continue
    for (let x = Math.floor(left / 256); x <= Math.floor((left + spanWidth * scale) / 256); x++) {
      tiles.push({
        x: ((x % count) + count) % count,
        y,
        left: (x * 256 - center.x) / scale + width / 2,
        top: (y * 256 - center.y) / scale + height / 2,
        size: 256 / scale,
      })
    }
  }
  return tiles
}

export function tileUrl(template: string, zoom: number, x: number, y: number) {
  if (
    !['{z}', '{x}'].every((part) => template.includes(part)) ||
    (!template.includes('{y}') && !template.includes('{-y}'))
  ) {
    throw new Error('URL тайлов должен содержать {z}, {x}, {y}')
  }
  const url = template
    .replaceAll('{z}', String(zoom))
    .replaceAll('{x}', String(x))
    .replaceAll('{y}', String(y))
    .replaceAll('{-y}', String(2 ** zoom - 1 - y))
  if (new URL(url).protocol !== 'https:') throw new Error('Источник должен использовать HTTPS')
  return url
}

export type AirspaceLimit = { metres: number; reference: 'AMSL' | 'AGL' | 'unknown' }
export type AirspacePolygon = {
  name: string
  rings: [number, number][][]
  lower?: AirspaceLimit
  upper?: AirspaceLimit
  activation: 'unknown'
}

function xcontestLimit(raw: unknown): AirspaceLimit | undefined {
  const limit = raw as { hfeet?: unknown; htype?: unknown }
  if (typeof limit?.hfeet !== 'number' || !Number.isFinite(limit.hfeet)) return undefined
  return {
    metres: limit.hfeet * 0.3048,
    reference: limit.htype === 'AMSL' || limit.htype === 'AGL' ? limit.htype : 'unknown',
  }
}

// FL, schedules and NOTAM require additional data. Unknown bounds remain visible.
export function airspaceAltitudeState(
  zone: AirspacePolygon,
  amsl: number | null,
  agl: number | null = null,
): 'inside' | 'outside' | 'unknown' {
  const height = (limit?: AirspaceLimit) =>
    limit?.reference === 'AMSL' ? amsl : limit?.reference === 'AGL' ? agl : null
  const low = height(zone.lower)
  const high = height(zone.upper)
  if (
    (low !== null && zone.lower && low < zone.lower.metres) ||
    (high !== null && zone.upper && high > zone.upper.metres)
  )
    return 'outside'
  return low !== null && high !== null && zone.lower && zone.upper ? 'inside' : 'unknown'
}

export function parseXContest(value: unknown): AirspacePolygon[] {
  const root = value as { airspaces?: unknown }
  if (!Array.isArray(root?.airspaces) || root.airspaces.length > 5000)
    throw new Error('Некорректный ответ XContest')
  let points = 0
  return parseAirspaces({
    type: 'FeatureCollection',
    features: root.airspaces.map((raw) => {
      const zone = raw as {
        name?: unknown
        polygon?: unknown
        lowerLimit?: unknown
        upperLimit?: unknown
      }
      if (!Array.isArray(zone?.polygon) || zone.polygon.length < 3)
        throw new Error('Некорректный полигон XContest')
      const ring = zone.polygon.map((point: unknown) => {
        if (++points > 100000 || !Array.isArray(point) || point.length < 2)
          throw new Error('Некорректная точка XContest')
        return [point[1], point[0]]
      })
      if (ring[0]![0] !== ring.at(-1)![0] || ring[0]![1] !== ring.at(-1)![1])
        ring.push([...ring[0]!])
      return {
        type: 'Feature',
        properties: {
          name: zone.name,
          lower: xcontestLimit(zone.lowerLimit),
          upper: xcontestLimit(zone.upperLimit),
        },
        geometry: { type: 'Polygon', coordinates: [ring] },
      }
    }),
  })
}

export function parseAirspaces(value: unknown): AirspacePolygon[] {
  const root = value as { type?: unknown; features?: unknown }
  if (root?.type !== 'FeatureCollection' || !Array.isArray(root.features)) {
    throw new Error('Ожидается GeoJSON FeatureCollection')
  }
  if (root.features.length > 5000) throw new Error('Слишком много геозон (максимум 5000)')
  const result: AirspacePolygon[] = []
  let points = 0
  for (const raw of root.features) {
    const feature = raw as {
      geometry?: { type?: string; coordinates?: unknown }
      properties?: { name?: unknown; lower?: unknown; upper?: unknown }
    }
    const geometry = feature?.geometry
    if (!geometry || !['Polygon', 'MultiPolygon'].includes(geometry.type ?? '')) continue
    const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates
    if (!Array.isArray(polygons)) throw new Error('Некорректные координаты геозоны')
    for (const polygon of polygons) {
      if (!Array.isArray(polygon)) throw new Error('Некорректный полигон')
      const rings: [number, number][][] = polygon.map((ring: unknown) => {
        if (!Array.isArray(ring) || ring.length < 4) throw new Error('Некорректное кольцо')
        const coordinates: [number, number][] = ring.map((coordinate: unknown) => {
          if (++points > 100000) throw new Error('Слишком много точек геозон')
          if (
            !Array.isArray(coordinate) ||
            coordinate.length < 2 ||
            !Number.isFinite(coordinate[0]) ||
            !Number.isFinite(coordinate[1]) ||
            Math.abs(coordinate[0]) > 180 ||
            Math.abs(coordinate[1]) > 90
          ) {
            throw new Error('Некорректная широта/долгота')
          }
          return [coordinate[0] as number, coordinate[1] as number]
        })
        const first = coordinates[0]!
        const last = coordinates.at(-1)!
        if (first[0] !== last[0] || first[1] !== last[1])
          throw new Error('Кольцо должно быть замкнуто')
        return coordinates
      })
      const limit = (raw: unknown): AirspaceLimit | undefined => {
        const candidate = raw as AirspaceLimit
        return candidate &&
          typeof candidate.metres === 'number' &&
          Number.isFinite(candidate.metres) &&
          ['AMSL', 'AGL', 'unknown'].includes(candidate.reference)
          ? { metres: candidate.metres, reference: candidate.reference }
          : undefined
      }
      result.push({
        name: String(feature.properties?.name ?? 'Геозона').slice(0, 256),
        rings,
        lower: limit(feature.properties?.lower),
        upper: limit(feature.properties?.upper),
        activation: 'unknown',
      })
    }
  }
  return result
}

export function polygonPath(
  polygon: AirspacePolygon,
  settings: MapSettings,
  width: number,
  height: number,
) {
  return polygon.rings
    .map(
      (ring) =>
        ring
          .map(([lon, lat], index) => {
            const p = mapPoint(lon, lat, settings, width, height)
            return `${index === 0 ? 'M' : 'L'}${p.x},${p.y}`
          })
          .join(' ') + ' Z',
    )
    .join(' ')
}

export function mapPoint(
  lon: number,
  lat: number,
  settings: MapSettings,
  width: number,
  height: number,
) {
  const center = worldPoint(settings.longitude, settings.latitude, settings.zoom)
  const p = worldPoint(lon, lat, settings.zoom)
  const scale = 512 / Math.max(width, height)
  const size = 256 * 2 ** settings.zoom
  const dx = ((p.x - center.x + size * 1.5) % size) - size / 2
  return { x: dx / scale + width / 2, y: (p.y - center.y) / scale + height / 2 }
}

export function trackDirection(points: readonly { lat: number; lon: number }[]): number | null {
  if (points.length < 2) return null
  const a = points.at(-2)!,
    b = points.at(-1)!
  if (a.lat === b.lat && a.lon === b.lon) return null
  const lat1 = (a.lat * Math.PI) / 180,
    lat2 = (b.lat * Math.PI) / 180
  const dlon = ((b.lon - a.lon) * Math.PI) / 180
  return (
    ((Math.atan2(
      Math.sin(dlon) * Math.cos(lat2),
      Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dlon),
    ) *
      180) /
      Math.PI +
      360) %
    360
  )
}

export function mapRotation(settings: MapSettings, heading: number | null, track: number | null) {
  const angle = -(settings.rotation === 'heading'
    ? (heading ?? 0)
    : settings.rotation === 'track'
      ? (track ?? 0)
      : 0)
  return angle || 0
}

export function panMap(
  settings: MapSettings,
  dx: number,
  dy: number,
  width: number,
  height: number,
  rotation = 0,
): MapSettings {
  const angle = (-rotation * Math.PI) / 180
  const scale = 512 / Math.max(width, height)
  const center = worldPoint(settings.longitude, settings.latitude, settings.zoom)
  const x = center.x - (dx * Math.cos(angle) - dy * Math.sin(angle)) * scale
  const y = center.y - (dx * Math.sin(angle) + dy * Math.cos(angle)) * scale
  const size = 256 * 2 ** settings.zoom
  return {
    ...settings,
    followGps: false,
    longitude: (((((x / size) * 360) % 360) + 360) % 360) - 180,
    latitude: Math.max(
      -85,
      Math.min(85, (Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / size))) * 180) / Math.PI),
    ),
  }
}
