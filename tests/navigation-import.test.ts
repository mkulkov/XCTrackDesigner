import { describe, expect, it } from 'vitest'
import { parseCompetitionTask, parseWaypoints } from '../web/src/navigation-import'

const task = () => ({
  taskType: 'CLASSIC',
  version: 1,
  turnpoints: ['TAKEOFF', 'SSS', 'ESS', undefined].map((type, i) => ({
    type,
    radius: 400,
    waypoint: { name: `P${i}`, lat: 44 + i / 10, lon: 78, altSmoothed: 1200 },
  })),
  sss: { timeGates: ['09:30:15Z'] },
  goal: { type: 'LINE', deadline: '15:00:00Z' },
})

describe('navigation import', () => {
  it('reads actual GEO DMS structure with signed hemispheres', () => {
    const points = parseWaypoints(
      '$FormatGEO\nB31 N 44 44 02.13 E 078 35 36.05 946 B31\nS01 S 12 30 00 W 001 00 00 100 South',
      'points.wpt',
    )
    expect(points[0]!.lat).toBeCloseTo(44.733925)
    expect(points[0]!.lon).toBeCloseTo(78.5933472)
    expect(points[1]).toMatchObject({ lat: -12.5, lon: -1, altitude: 100 })
  })
  it('reads CUP quotes, feet, hemispheres and ignores related tasks', () => {
    const points = parseWaypoints(
      'name,code,country,lat,lon,elev,desc\n"A, B",A,KZ,4430.000N,07830.000E,1000ft,"quote ""text"""\n-----Related Tasks-----\nTask',
      'points.cup',
    )
    expect(points[0]).toMatchObject({
      name: 'A, B',
      lat: 44.5,
      lon: 78.5,
      altitude: 304.8,
      description: 'quote "text"',
    })
  })
  it('preserves TAKEOFF, ESS and goal line while importing UTC gates', () => {
    const result = parseCompetitionTask(JSON.stringify(task()), 'race.xctsk')
    expect(result.name).toBe('race')
    expect(result.startTime).toBe(34215)
    expect(result.deadline).toBe(54000)
    expect(result.turnpoints.map((p) => p.type)).toEqual(['TAKEOFF', 'SSS', 'ESS', 'GOAL'])
    expect(result.turnpoints[3]!.goalType).toBe('LINE')
  })
  it('retains ESS when it is also the goal', () => {
    const source = task()
    source.turnpoints.pop()
    expect(parseCompetitionTask(JSON.stringify(source), 'race.xctsk').turnpoints[2]).toMatchObject({
      type: 'ESS',
      goalType: 'LINE',
    })
  })
  it('rejects malformed coordinates, task ordering and limits', () => {
    expect(() => parseWaypoints('$FormatGEO\nA N 44 60 00 E 078 00 00 0', 'a.wpt')).toThrow(/GEO/)
    expect(() => parseWaypoints('x'.repeat(4 * 1024 * 1024 + 1), 'a.wpt')).toThrow(/4 МБ/)
    const source = task()
    source.turnpoints[0]!.waypoint.lat = 91
    expect(() => parseCompetitionTask(JSON.stringify(source), 'a.xctsk')).toThrow(/Координаты/)
    source.turnpoints[0]!.waypoint.lat = 44
    source.turnpoints[1]!.radius = -1
    expect(() => parseCompetitionTask(JSON.stringify(source), 'a.xctsk')).toThrow(/Радиус/)
    source.turnpoints[1]!.radius = 400
    source.sss.timeGates = ['24:00:00Z']
    expect(() => parseCompetitionTask(JSON.stringify(source), 'a.xctsk')).toThrow(/HH:MM:SSZ/)
  })
  it('rejects unsupported task version explicitly', () => {
    expect(() => parseCompetitionTask('{"taskType":"CLASSIC","version":2}', 'a.xctsk')).toThrow(
      /версии 1/,
    )
  })
})
