import { describe, expect, it } from 'vitest'
import {
  buildFlightFrame,
  defaultFlightSettings,
  distanceBetween,
  enrichManualFrame,
  igcFrame,
  parseIGC,
} from '../web/src/flight-engine'

const igc = (records: string[]) => `AXXXTEST\nHFDTE101026\n${records.join('\n')}\n`
const b = (
  clock: string,
  latitude = '4300000',
  longitude = '07600000',
  baro = '01000',
  gps = '01200',
  validity = 'A',
) => `B${clock}${latitude}N${longitude}E${validity}${baro}${gps}`

describe('connected flight model', () => {
  it('seeks deterministically with bounded history and SI widget values', () => {
    const frame = buildFlightFrame(100.5, 'thermal')
    expect(frame).toEqual(buildFlightFrame(100.5, 'thermal'))
    expect(frame.flight.history.length).toBeLessThanOrEqual(61)
    expect(frame.flight.history.at(-1)?.seconds).toBe(100.5)
    expect(frame.widgetValues?.WAirSpeed).toBe(defaultFlightSettings.airSpeed)
    expect(frame.widgetValues?.WWindSpeed).toBe(3)
    expect(frame.flight.position?.lat).toBeGreaterThan(43)
    expect(frame.altitude).toBeGreaterThan(defaultFlightSettings.initialAltitude)
    expect(frame.widgetValues?.WAltitudeAboveGround).toBeUndefined()
    expect(buildFlightFrame(86400, 'glide').flight.track.length).toBeLessThanOrEqual(6001)
  })
  it.each([
    [
      'thermal',
      -33.3965810861948,
      179.02832128108662,
      13806.958063196556,
      30.21178365186286,
      338.559605620324,
    ],
    [
      'glide',
      -33.134576751774205,
      -179.78605751482405,
      -7702.375,
      14.75607089614906,
      15.966843581321655,
    ],
  ] as const)(
    'preserves long %s flight samples across stride and longitude boundaries',
    (scenario, lat, lon, altitude, speed, heading) => {
      const settings = {
        ...defaultFlightSettings,
        latitude: -33.9,
        longitude: 179.95,
        windSpeed: 17,
        windFrom: 123,
        airSpeed: 19,
        glideRatio: 12,
      }
      const frame = buildFlightFrame(6001.5, scenario, settings)
      expect(frame.flight.position?.lat).toBe(lat)
      expect(frame.flight.position?.lon).toBe(lon)
      expect(frame.altitude).toBe(altitude)
      expect(frame.speed).toBe(speed * 3.6)
      expect(frame.flight.heading).toBe(heading)
      expect(frame.flight.track).toHaveLength(3002)
      expect(frame.flight.history).toHaveLength(61)
      // A sampled track point must agree with a direct seek using the same settings.
      expect(frame.flight.track[1]).toEqual(buildFlightFrame(2, scenario, settings).flight.position)
      expect(frame.flight.history[0]).toEqual(
        buildFlightFrame(5942, scenario, settings).flight.position,
      )
      expect(frame.flight.track.at(-1)).toEqual(frame.flight.position)
      expect(frame.flight.history.at(-1)).toEqual(frame.flight.position)
      settings.windSpeed = 0
      expect(buildFlightFrame(6001.5, scenario, settings).flight.position).not.toEqual(
        frame.flight.position,
      )
      settings.windSpeed = 17
      expect(buildFlightFrame(6001.5, scenario, settings)).toEqual(frame)
    },
  )
  it('uses explicitly supplied route elevation; leaves missing terrain and sensors unknown', () => {
    const settings = {
      ...defaultFlightSettings,
      task: [{ name: 'Goal', lat: 43.3, lon: 77, altitude: 1000, radius: 400 }],
    }
    const frame = buildFlightFrame(20, 'glide', settings)
    expect(frame.flight.task?.distance).toBeGreaterThan(0)
    expect(frame.flight.task?.goalAltitude).toBe(1000)
    expect(frame.flight.task?.arrivalSeconds).toBeGreaterThan(0)
    expect(frame.widgetValues?.WCompDistanceToESS).toBeNull()
    expect(frame.flight.terrain).toBeUndefined()
    expect(frame.flight.sensors).toBeNull()
    expect(buildFlightFrame(20, 'no-data').flight.gps).toBe(false)
  })
  it('preserves exact manual telemetry and individual overrides', () => {
    const source = {
      speed: 40,
      vertical: 1.23,
      altitude: 1234,
      time: 500,
      widgetValues: { WWindSpeed: 10 },
    }
    const frame = enrichManualFrame(source, defaultFlightSettings, 200)
    expect({
      speed: frame.speed,
      vertical: frame.vertical,
      altitude: frame.altitude,
      time: frame.time,
    }).toEqual({ speed: 40, vertical: 1.23, altitude: 1234, time: 500 })
    expect(frame.widgetValues?.WWindSpeed).toBe(10)
    expect(frame.flight.wind).toEqual({ speed: 3, from: 270 })
  })
  it('accepts explicit model inputs without inventing absent sensor or terrain data', () => {
    const settings = {
      ...defaultFlightSettings,
      gpsAvailable: false,
      batteryPercent: 75,
      sensors: false,
      live: true,
      terrainProfile: [
        { distance: 0, altitude: 700 },
        { distance: 1000, altitude: 900 },
      ],
    }
    const frame = buildFlightFrame(10, 'glide', settings)
    expect(frame.flight.gps).toBe(false)
    expect(frame.speed).toBeNull()
    expect(frame.flight.position).toBeNull()
    expect(frame.widgetValues?.WAltitude).toBeNull()
    expect(frame.widgetValues?.WTakeoffDistance).toBeNull()
    expect(frame.widgetValues?.WNextTurnpointDistance).toBeNull()
    expect(frame.widgetValues?.WGlide).toBeNull()
    expect(frame.flight.task).toBeNull()
    expect(frame.flight.batteryPercent).toBe(75)
    expect(frame.flight.sensors).toBe(false)
    expect(frame.flight.terrain).toEqual(settings.terrainProfile)
    const replay = parseIGC(igc([b('120000'), b('120010')]))
    expect(igcFrame(replay, 5, settings).flight.sensors).toBeUndefined()
    expect(igcFrame(replay, 5, settings).flight.wind).toBeNull()
    expect(igcFrame(replay, 5, settings).flight.terrain).toEqual(settings.terrainProfile)
  })
})

describe('bounded IGC replay', () => {
  it('interpolates valid coordinates and GPS altitude independently of barometer', () => {
    const replay = parseIGC(
      igc([b('120000'), b('120010', '4300060', '07600060', '01020', '01240')]),
    )
    const frame = igcFrame(replay, 5)
    expect(replay.date).toBe('2026-10-10')
    expect(replay.duration).toBe(10)
    expect(frame.flight.position?.lat).toBeCloseTo(43.0005)
    expect(frame.altitude).toBe(1220)
    expect(frame.vertical).toBe(4)
    expect(frame.widgetValues?.WBaroAltitude).toBe(1010)
    expect(frame.widgetValues?.WWindSpeed).toBeNull()
    expect(frame.flight.wind).toBeNull()
    expect(frame.widgetValues?.WTime).toBe('12:00:05')
    expect(igcFrame(replay, 5)).toEqual(frame)
    expect(igcFrame(replay, 99).time).toBe(10)
  })
  it('handles midnight rollover, duplicate timestamps and invalid fixes', () => {
    const replay = parseIGC(
      igc([
        b('235959'),
        b('000001'),
        b('000001'),
        b('000002', undefined, undefined, undefined, undefined, 'V'),
        b('000003'),
      ]),
    )
    expect(replay.duration).toBe(4)
    expect(replay.fixes).toHaveLength(3)
    expect(igcFrame(replay, 2).widgetValues?.WTime).toBe('00:00:01')
    expect(replay.warnings).toHaveLength(2)
  })
  it('does not invent values in long GPS gaps or missing headers', () => {
    const replay = parseIGC([b('120000'), b('121000')].join('\n'))
    expect(igcFrame(replay, 100).flight.position).toBeNull()
    expect(igcFrame(replay, 0).speed).toBeNull()
    expect(replay.date).toBeNull()
    expect(replay.warnings).toHaveLength(2)
    expect(() => parseIGC(igc([b('120000', '9100000'), b('120010')]))).toThrow(/две/)
    expect(() => parseIGC('Bmalformed')).toThrow(/две/)
    expect(() => parseIGC(' '.repeat(20 * 1024 * 1024 + 1))).toThrow(/20 МиБ/)
  })
  it('crosses the antimeridian on the short arc and computes route without unknown polar', () => {
    const replay = parseIGC(
      igc([
        b('120000', '0000000', '17959000'),
        b('120010', '0000000', '17959000').replace('E', 'W'),
      ]),
    )
    const frame = igcFrame(replay, 5, {
      ...defaultFlightSettings,
      task: [{ name: 'Goal', lat: 0, lon: -179.9, altitude: 1000, radius: 50 }],
    })
    expect(Math.abs(frame.flight.position!.lon)).toBeCloseTo(180)
    expect(distanceBetween(replay.fixes[0]!, replay.fixes[1]!)).toBeLessThan(4000)
    expect(frame.flight.task?.arrivalHeight).toBeNull()
    expect(frame.flight.task?.requiredGlide).toBeGreaterThan(0)
  })
})
