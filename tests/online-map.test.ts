import { expect, test } from 'vitest'
import {
  initialMap,
  parseAirspaces,
  parseXContest,
  polygonPath,
  tileUrl,
  visibleTiles,
  worldPoint,
  mapPoint,
  mapRotation,
  panMap,
  trackDirection,
  airspaceAltitudeState,
} from '../web/src/online-map'
import { airspaceRoute } from '../tools/online-airspaces'

test('Mercator tile requests are bounded, wrapped and TMS inversion is explicit', () => {
  expect(worldPoint(0, 0, 2)).toEqual({ x: 512, y: 512 })
  const tiles = visibleTiles({ ...initialMap, longitude: 180, latitude: 85 }, 1080, 2400)
  expect(tiles.length).toBeLessThanOrEqual(9)
  expect(tiles.every((tile) => tile.x >= 0 && tile.x < 1024 && tile.y >= 0 && tile.y < 1024)).toBe(
    true,
  )
  expect(tileUrl('https://example.test/{z}/{x}/{-y}.png', 3, 2, 1)).toBe(
    'https://example.test/3/2/6.png',
  )
  expect(() => tileUrl('http://example.test/{z}/{x}/{y}', 3, 2, 1)).toThrow('HTTPS')
  expect(() => tileUrl('https://example.test/map', 3, 2, 1)).toThrow('URL')
  const native = visibleTiles({ ...initialMap, zoom: 15 }, 1080, 2400, 12)
  expect(native.length).toBeLessThanOrEqual(4)
  expect(native[0]!.size).toBe(9600)
})

test('XContest coordinates swap, close rings and reject malformed upstream data', () => {
  const polygons = parseXContest({
    airspaces: [
      {
        name: 'Zone',
        polygon: [
          [44, 78],
          [44.1, 78],
          [44, 78.1],
        ],
      },
    ],
  })
  expect(polygons[0]!.rings[0]).toEqual([
    [78, 44],
    [78, 44.1],
    [78.1, 44],
    [78, 44],
  ])
  expect(polygonPath(polygons[0]!, initialMap, 1080, 2400)).toMatch(/^M.* Z$/)
  expect(() =>
    parseXContest({
      airspaces: [
        {
          polygon: [
            [999, 78],
            [44, 78],
            [44, 79],
          ],
        },
      ],
    }),
  ).toThrow()
  expect(() =>
    parseAirspaces({
      type: 'FeatureCollection',
      features: [
        {
          geometry: {
            type: 'Polygon',
            coordinates: [
              [
                [1, 2],
                [3, 4],
                [5, 6],
                [7, 8],
              ],
            ],
          },
        },
      ],
    }),
  ).toThrow('замкнуто')
})

test('loopback relay accepts only fixed XContest routes', () => {
  expect(airspaceRoute('/__xcontest/files')).toBe('/api/v6/files')
  expect(airspaceRoute('/__xcontest/data/982')).toBe('/api/v6/data/982')
  for (const path of [
    '/__xcontest/data/../files',
    '/__xcontest/data/982?url=https://elsewhere.test',
    '/__xcontest/data/0',
    '/__xcontest/data/999999999999',
    '/__xcontest/activations/982',
  ])
    expect(airspaceRoute(path)).toBeNull()
})

test('map panning converts screen direction through rotation and disables GPS following', () => {
  const settings = { ...initialMap, longitude: 0, latitude: 0, followGps: true }
  expect(mapPoint(0, 0, settings, 1000, 1000)).toEqual({ x: 500, y: 500 })
  const east = panMap(settings, -100, 0, 1000, 1000)
  expect(east.longitude).toBeGreaterThan(0)
  expect(east.followGps).toBe(false)
  const rotated = panMap(settings, 0, 100, 1000, 1000, -90)
  expect(rotated.longitude).toBeCloseTo(east.longitude, 8)
  expect(rotated.latitude).toBeCloseTo(0, 8)
  expect(mapRotation({ ...settings, rotation: 'heading' }, 90, 180)).toBe(-90)
  expect(mapRotation({ ...settings, rotation: 'track' }, 90, 180)).toBe(-180)
  expect(mapRotation({ ...settings, rotation: 'track' }, null, null)).toBe(0)
  expect(
    trackDirection([
      { lat: 0, lon: 0 },
      { lat: 0, lon: 0.1 },
    ]),
  ).toBeCloseTo(90)
  expect(trackDirection([{ lat: 0, lon: 0 }])).toBeNull()
  const rotatedTiles = visibleTiles(settings, 1080, 2400, settings.zoom, true)
  expect(rotatedTiles.length).toBeLessThanOrEqual(16)
})

test('XContest height metadata is feet with an explicit reference and unknown activation', () => {
  const [zone] = parseXContest({
    airspaces: [
      {
        name: 'Height zone',
        polygon: [
          [0, 0],
          [0, 1],
          [1, 1],
        ],
        lowerLimit: { hfeet: 1000, htype: 'AMSL' },
        upperLimit: { hfeet: 2000, htype: 'AMSL' },
      },
    ],
  })
  expect(zone!.lower!.metres).toBeCloseTo(304.8)
  expect(zone!.activation).toBe('unknown')
  expect(airspaceAltitudeState(zone!, 400)).toBe('inside')
  expect(airspaceAltitudeState(zone!, 700)).toBe('outside')
  expect(airspaceAltitudeState(zone!, null)).toBe('unknown')
  const agl = { ...zone!, lower: { metres: 10, reference: 'AGL' as const } }
  expect(airspaceAltitudeState(agl, 400)).toBe('unknown')
  expect(airspaceAltitudeState(agl, 400, 50)).toBe('inside')
  const pressure = { ...zone!, upper: { metres: 600, reference: 'unknown' as const } }
  expect(airspaceAltitudeState(pressure, 400)).toBe('unknown')
  expect(airspaceAltitudeState(pressure, 200)).toBe('outside')
})
