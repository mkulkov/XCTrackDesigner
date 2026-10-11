import type { Frame } from './value-layout'
import type { WidgetValues } from './widget-content'

export type Position = { lat: number; lon: number }
export type Turnpoint = Position & { name: string; altitude: number | null; radius: number }
export type FlightSettings = {
  latitude: number
  longitude: number
  initialAltitude: number
  airSpeed: number
  windSpeed: number
  windFrom: number
  glideRatio: number
  startTime: number
  task: Turnpoint[]
  terrainProfile?: { distance: number; altitude: number }[]
  batteryPercent?: number | null
  sensors?: boolean | null
  live?: boolean | null
  gpsAvailable?: boolean
}
export const defaultFlightSettings: FlightSettings = {
  latitude: 43.2567,
  longitude: 76.9286,
  initialAltitude: 1800,
  airSpeed: 11.7,
  windSpeed: 3,
  windFrom: 270,
  glideRatio: 9,
  startTime: 12 * 3600,
  task: [],
}
export type FlightSample = Position & {
  seconds: number
  altitude: number | null
  vertical: number | null
  speed: number | null
  windSpeed?: number | null
}
export type FlightTask = {
  nextIndex: number
  distance: number
  bearing: number | null
  arrivalSeconds: number | null
  requiredGlide: number | null
  goalAltitude: number | null
  arrivalHeight: number | null
  waypoints: readonly Turnpoint[]
}
export type FlightState = {
  position: Position | null
  heading: number | null
  wind: { speed: number; from: number } | null
  history: FlightSample[]
  track: Position[]
  task: FlightTask | null
  status: 'simulation' | 'replay' | 'no-data'
  gps: boolean
  elapsed: number
  batteryPercent?: number | null
  sensors?: boolean | null
  live?: boolean | null
  terrain?: { distance: number; altitude: number }[]
  airspaces?: {
    name: string
    distance: number
    floor?: number
    ceiling?: number
    inside: boolean
  }[]
}
export type FlightFrame = Frame & { flight: FlightState }
export type IGCFix = Position & {
  seconds: number
  gpsAltitude: number
  baroAltitude: number
}
export type IGCReplay = {
  fixes: readonly IGCFix[]
  duration: number
  date: string | null
  startTime: number
  warnings: string[]
}

const radians = Math.PI / 180
const earth = 6371000
const wrap = (n: number) => ((((n + 180) % 360) + 360) % 360) - 180
const angle = (n: number) => ((n % 360) + 360) % 360
const boundedSeconds = (n: number) => Math.min(86400, Math.max(0, Number.isFinite(n) ? n : 0))

export function distanceBetween(a: Position, b: Position) {
  const lat = (b.lat - a.lat) * radians
  const lon = wrap(b.lon - a.lon) * radians
  const h =
    Math.sin(lat / 2) ** 2 +
    Math.cos(a.lat * radians) * Math.cos(b.lat * radians) * Math.sin(lon / 2) ** 2
  return 2 * earth * Math.asin(Math.sqrt(Math.min(1, h)))
}
export function bearingBetween(a: Position, b: Position) {
  if (distanceBetween(a, b) < 0.01) return null
  const lon = wrap(b.lon - a.lon) * radians
  return angle(
    Math.atan2(
      Math.sin(lon) * Math.cos(b.lat * radians),
      Math.cos(a.lat * radians) * Math.sin(b.lat * radians) -
        Math.sin(a.lat * radians) * Math.cos(b.lat * radians) * Math.cos(lon),
    ) / radians,
  )
}
function advance(origin: Position, east: number, north: number): Position {
  const angular = Math.hypot(east, north) / earth
  const heading = Math.atan2(east, north)
  const lat = origin.lat * radians
  const nextLat = Math.asin(
    Math.sin(lat) * Math.cos(angular) + Math.cos(lat) * Math.sin(angular) * Math.cos(heading),
  )
  return {
    lat: nextLat / radians,
    lon: wrap(
      origin.lon +
        Math.atan2(
          Math.sin(heading) * Math.sin(angular) * Math.cos(lat),
          Math.cos(angular) - Math.sin(lat) * Math.sin(nextLat),
        ) /
          radians,
    ),
  }
}
function clock(seconds: number) {
  const s = Math.floor(((seconds % 86400) + 86400) % 86400)
  return `${Math.floor(s / 3600)
    .toString()
    .padStart(2, '0')}:${Math.floor((s / 60) % 60)
    .toString()
    .padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`
}
function normalizeSettings(settings: FlightSettings): FlightSettings {
  const number = (v: number, fallback: number, min: number, max: number) =>
    Number.isFinite(v) ? Math.max(min, Math.min(max, v)) : fallback
  return {
    latitude: number(settings.latitude, defaultFlightSettings.latitude, -85, 85),
    longitude: number(settings.longitude, defaultFlightSettings.longitude, -180, 180),
    initialAltitude: number(settings.initialAltitude, 1800, -500, 9000),
    airSpeed: number(settings.airSpeed, 11.7, 0, 100),
    windSpeed: number(settings.windSpeed, 3, 0, 100),
    windFrom: angle(number(settings.windFrom, 270, -3600, 3600)),
    glideRatio: number(settings.glideRatio, 9, 1, 100),
    startTime: number(settings.startTime, 43200, 0, 86399),
    task: settings.task
      .slice(0, 100)
      .filter(
        (p) =>
          Number.isFinite(p.lat) &&
          Math.abs(p.lat) <= 90 &&
          Number.isFinite(p.lon) &&
          Math.abs(p.lon) <= 180 &&
          Number.isFinite(p.radius) &&
          p.radius > 0 &&
          (p.altitude === null || Number.isFinite(p.altitude)),
      ),
    terrainProfile: settings.terrainProfile
      ?.slice(0, 200)
      .filter((p) => Number.isFinite(p.distance) && p.distance >= 0 && Number.isFinite(p.altitude)),
    batteryPercent:
      typeof settings.batteryPercent === 'number' && Number.isFinite(settings.batteryPercent)
        ? Math.max(0, Math.min(100, settings.batteryPercent))
        : null,
    sensors: typeof settings.sensors === 'boolean' ? settings.sensors : null,
    live: typeof settings.live === 'boolean' ? settings.live : null,
    gpsAvailable: settings.gpsAvailable !== false,
  }
}
function emptyFrame(elapsed: number): FlightFrame {
  return {
    speed: null,
    vertical: null,
    altitude: null,
    time: null,
    flight: {
      position: null,
      heading: null,
      wind: null,
      history: [],
      track: [],
      task: null,
      status: 'no-data',
      gps: false,
      elapsed,
    },
  }
}
function simulationSampler(thermal: boolean, s: FlightSettings) {
  const turnRate = Math.PI / 30
  const wind = (s.windFrom + 180) * radians
  const east = s.windSpeed * Math.sin(wind)
  const north = s.windSpeed * Math.cos(wind)
  const course = 75 * radians
  const glideEast = s.airSpeed * Math.sin(course)
  const glideNorth = s.airSpeed * Math.cos(course)
  const sink = s.airSpeed / s.glideRatio
  // Frame settings stay fixed while generating the current sample, history and track.
  return (t: number): FlightSample => {
    const airEast = thermal ? s.airSpeed * Math.sin(turnRate * t) : glideEast
    const airNorth = thermal ? s.airSpeed * Math.cos(turnRate * t) : glideNorth
    const position = advance(
      { lat: s.latitude, lon: s.longitude },
      thermal
        ? (s.airSpeed / turnRate) * (1 - Math.cos(turnRate * t)) + east * t
        : (airEast + east) * t,
      thermal
        ? (s.airSpeed / turnRate) * Math.sin(turnRate * t) + north * t
        : (airNorth + north) * t,
    )
    return {
      ...position,
      seconds: t,
      speed: Math.hypot(airEast + east, airNorth + north),
      windSpeed: s.windSpeed,
      vertical: thermal ? 2 + Math.sin(t / 6) : -sink,
      altitude: thermal
        ? s.initialAltitude + 2 * t + 6 * (1 - Math.cos(t / 6))
        : s.initialAltitude - sink * t,
    }
  }
}

function historyAt(t: number, sample: (seconds: number) => FlightSample | null) {
  const result: FlightSample[] = []
  for (let i = Math.max(0, Math.floor(t) - 60); i <= t; i++) {
    const p = sample(i)
    if (p) result.push(p)
  }
  if (t % 1 !== 0) {
    const p = sample(t)
    if (p) result.push(p)
  }
  return result.slice(-61)
}
function taskAt(
  position: Position,
  altitude: number | null,
  speed: number | null,
  track: Position[],
  settings: FlightSettings,
  allowPolar: boolean,
): FlightTask | null {
  if (!settings.task.length) return null
  let nextIndex = 0
  // Progress is recomputed from the bounded track, so seeking has no hidden state.
  for (const p of track) {
    const target = settings.task[nextIndex]
    if (target && distanceBetween(p, target) <= target.radius) nextIndex++
  }
  const complete = nextIndex >= settings.task.length
  const target = settings.task[Math.min(nextIndex, settings.task.length - 1)]!
  let distance = complete ? 0 : Math.max(0, distanceBetween(position, target) - target.radius)
  for (let i = nextIndex + 1; i < settings.task.length; i++)
    distance += distanceBetween(settings.task[i - 1]!, settings.task[i]!)
  const goalAltitude = settings.task.at(-1)!.altitude
  return {
    nextIndex,
    distance,
    bearing: complete ? null : bearingBetween(position, target),
    arrivalSeconds: speed !== null && speed > 0.1 ? distance / speed : null,
    requiredGlide:
      altitude !== null && goalAltitude !== null && altitude > goalAltitude
        ? distance / (altitude - goalAltitude)
        : null,
    goalAltitude,
    arrivalHeight:
      allowPolar && altitude !== null && goalAltitude !== null
        ? altitude - distance / settings.glideRatio - goalAltitude
        : null,
    waypoints: settings.task,
  }
}
function connectedValues(
  p: FlightSample,
  first: FlightSample,
  heading: number | null,
  history: FlightSample[],
  task: FlightTask | null,
  startTime: number,
): Record<string, number | string | null> {
  const maximum = Math.max(...history.map((h) => h.altitude ?? -Infinity), p.altitude ?? -Infinity)
  const lift = p.altitude !== null && first.altitude !== null ? p.altitude - first.altitude : null
  const toStart = distanceBetween(p, first)
  const elapsed = p.seconds
  const next = task?.waypoints[task.nextIndex]
  const nextDistance = next ? Math.max(0, distanceBetween(p, next) - next.radius) : null
  const nextHeight =
    next?.altitude !== undefined && next.altitude !== null && p.altitude !== null
      ? p.altitude - next.altitude
      : null
  return {
    WAltitude: p.altitude,
    WAltitudeMaximum: Number.isFinite(maximum) ? maximum : null,
    WTakeoffHeightAbove: lift,
    WTakeoffDistance: toStart,
    WTakeoffCourse: bearingBetween(p, first),
    WBearing: heading,
    WXCSpeed: elapsed > 0 ? toStart / elapsed : null,
    WGlide:
      p.vertical !== null && p.vertical < -0.05 && p.speed !== null ? p.speed / -p.vertical : null,
    WLocation: `${p.lat.toFixed(5)} ${p.lon.toFixed(5)}`,
    WTime: clock(startTime + elapsed),
    WCompDistanceToGoal: task?.distance ?? null,
    WCompDistanceToESS: null,
    WCompGlideToGoal: task?.requiredGlide ?? null,
    WCompGlideToESS: null,
    WCompAltitudeOverGoal: task?.arrivalHeight ?? null,
    WCompAltitudeOverESS: null,
    WNextTurnpointDistance: nextDistance,
    WNextTurnpointAlt: nextHeight,
    WNextTurnpointGlideTo:
      nextHeight !== null && nextHeight > 0 && nextDistance !== null
        ? nextDistance / nextHeight
        : null,
    WNextTurnpointTimeOfArrival:
      p.speed !== null && p.speed > 0.1 && nextDistance !== null ? nextDistance / p.speed : null,
  }
}
function suppressGPS(values: Record<string, number | string | null>) {
  for (const key of Object.keys(values)) {
    if (
      key === 'WAltitude' ||
      key === 'WAltitudeMaximum' ||
      key === 'WBearing' ||
      key === 'WLocation' ||
      key === 'WXCSpeed' ||
      key === 'WGlide' ||
      key === 'WTakeoffDistance' ||
      key === 'WTakeoffCourse' ||
      key.startsWith('WNextTurnpoint') ||
      key.startsWith('WComp')
    )
      values[key] = null
  }
  return values
}

/** An explicit educational model, not XCTrack's proprietary flight/navigation algorithm. */
export function buildFlightFrame(
  seconds: number,
  scenario: 'thermal' | 'glide' | 'no-data',
  settings = defaultFlightSettings,
): FlightFrame {
  const t = boundedSeconds(seconds)
  if (scenario === 'no-data') return emptyFrame(t)
  const s = normalizeSettings(settings)
  const sample = simulationSampler(scenario === 'thermal', s)
  const p = sample(t)
  const history = historyAt(t, sample)
  const track: Position[] = []
  const stride = Math.max(1, Math.ceil(t / 6000))
  for (let i = 0; i < t; i += stride) track.push(sample(i))
  track.push(p)
  const heading =
    t > 0 ? bearingBetween(sample(Math.max(0, t - 0.01)), p) : bearingBetween(p, sample(0.01))
  const task = taskAt(p, p.altitude, p.speed, track, s, true)
  const values = connectedValues(p, sample(0), heading, history, task, s.startTime)
  values.WAltitudeMaximum = Math.max(s.initialAltitude, p.altitude!)
  values.WBaroAltitude = p.altitude
  values.WAirSpeed = s.airSpeed
  values.WWindSpeed = s.windSpeed
  values.WWindDirection = s.windFrom
  values.WThermalAltGain = scenario === 'thermal' ? p.altitude! - s.initialAltitude : null
  if (!s.gpsAvailable) suppressGPS(values)
  return {
    speed: s.gpsAvailable ? p.speed! * 3.6 : null,
    vertical: p.vertical,
    altitude: p.altitude,
    time: t,
    widgetValues: values,
    flight: {
      position: s.gpsAvailable ? p : null,
      heading: s.gpsAvailable ? heading : null,
      wind: { speed: s.windSpeed, from: s.windFrom },
      history,
      track: s.gpsAvailable ? track : [],
      task: s.gpsAvailable ? task : null,
      status: 'simulation',
      gps: s.gpsAvailable!,
      elapsed: t,
      terrain: s.terrainProfile,
      batteryPercent: s.batteryPercent,
      sensors: s.sensors,
      live: s.live,
    },
  }
}

/** Manual telemetry stays exact; position is a separately declared straight-line model. */
export function enrichManualFrame(
  frame: Frame,
  settings = defaultFlightSettings,
  seconds = 0,
): FlightFrame {
  const s = normalizeSettings(settings)
  const t = boundedSeconds(seconds)
  const speed = frame.speed === null ? null : frame.speed / 3.6
  if (speed === null || frame.altitude === null) return { ...frame, flight: emptyFrame(t).flight }
  const heading = 75
  const sample = (i: number): FlightSample => ({
    ...advance(
      { lat: s.latitude, lon: s.longitude },
      speed * Math.sin(heading * radians) * i,
      speed * Math.cos(heading * radians) * i,
    ),
    seconds: i,
    altitude: frame.altitude,
    vertical: frame.vertical,
    speed,
    windSpeed: s.windSpeed,
  })
  const p = sample(t)
  const history = historyAt(t, sample)
  const track = history.map(({ lat, lon }) => ({ lat, lon }))
  const task = taskAt(p, frame.altitude, speed, track, s, true)
  const values = connectedValues(p, sample(0), heading, history, task, s.startTime)
  values.WAirSpeed = s.airSpeed
  values.WWindSpeed = s.windSpeed
  values.WWindDirection = s.windFrom
  const merged = { ...values, ...frame.widgetValues }
  if (!s.gpsAvailable) suppressGPS(merged)
  return {
    ...frame,
    speed: s.gpsAvailable ? frame.speed : null,
    widgetValues: merged,
    flight: {
      position: s.gpsAvailable ? p : null,
      heading: s.gpsAvailable && speed > 0 ? heading : null,
      wind: { speed: s.windSpeed, from: s.windFrom },
      history,
      track: s.gpsAvailable ? track : [],
      task: s.gpsAvailable ? task : null,
      status: 'simulation',
      gps: s.gpsAvailable!,
      elapsed: t,
      terrain: s.terrainProfile,
      batteryPercent: s.batteryPercent,
      sensors: s.sensors,
      live: s.live,
    },
  }
}

/** Strict, bounded B-record reader. Invalid GPS fixes never become valid preview positions. */
export function parseIGC(text: string): IGCReplay {
  if (text.length > 20 * 1024 * 1024) throw new Error('IGC превышает ограничение 20 МиБ')
  const fixes: IGCFix[] = []
  let date: string | null = null
  let day = 0
  let lastClock = -1
  let invalid = 0
  let nonmonotonic = 0
  let firstTime = 0
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/)
  if (lines.length > 300000) throw new Error('Слишком много записей IGC')
  for (const line of lines) {
    const header = /^H[FP]DTE(?:DATE:)?(\d{2})(\d{2})(\d{2})/.exec(line)
    if (header && date === null) {
      const year = Number(header[3]) >= 80 ? 1900 + Number(header[3]) : 2000 + Number(header[3])
      const candidate = new Date(Date.UTC(year, Number(header[2]) - 1, Number(header[1])))
      if (
        candidate.getUTCFullYear() === year &&
        candidate.getUTCMonth() === Number(header[2]) - 1 &&
        candidate.getUTCDate() === Number(header[1])
      )
        date = candidate.toISOString().slice(0, 10)
    }
    if (!line.startsWith('B')) continue
    const match =
      /^B(\d{2})(\d{2})(\d{2})(\d{2})(\d{5})([NS])(\d{3})(\d{5})([EW])([AV])(-\d{4}|\d{5})(-\d{4}|\d{5})/.exec(
        line,
      )
    if (!match) {
      invalid++
      continue
    }
    const [
      ,
      hour,
      minute,
      second,
      latitude,
      latMin,
      north,
      longitude,
      lonMin,
      east,
      valid,
      pressure,
      gps,
    ] = match
    const h = Number(hour),
      m = Number(minute),
      sec = Number(second)
    const lat = Number(latitude) + Number(latMin) / 60000
    const lon = Number(longitude) + Number(lonMin) / 60000
    if (
      h > 23 ||
      m > 59 ||
      sec > 59 ||
      Number(latMin) >= 60000 ||
      Number(lonMin) >= 60000 ||
      lat > 90 ||
      lon > 180 ||
      valid !== 'A'
    ) {
      invalid++
      continue
    }
    const currentClock = h * 3600 + m * 60 + sec
    if (lastClock >= 0 && currentClock < lastClock && lastClock - currentClock > 43200) day++
    const absolute = day * 86400 + currentClock
    if (fixes.length && absolute <= firstTime + fixes.at(-1)!.seconds) {
      nonmonotonic++
      continue
    }
    if (!fixes.length) firstTime = absolute
    if (absolute - firstTime > 7 * 86400) throw new Error('IGC длиннее 7 суток')
    fixes.push({
      seconds: absolute - firstTime,
      lat: north === 'S' ? -lat : lat,
      lon: east === 'W' ? -lon : lon,
      baroAltitude: Number(pressure),
      gpsAltitude: Number(gps),
    })
    lastClock = currentClock
    if (fixes.length > 200000) throw new Error('IGC содержит больше 200000 точек')
  }
  if (fixes.length < 2)
    throw new Error('IGC должен содержать минимум две разные действительные GPS-точки B')
  const warnings: string[] = []
  if (!date) warnings.push('Корректная дата HFDTE не найдена; показано время UTC записи')
  if (invalid) warnings.push(`Пропущено недействительных GPS-записей: ${invalid}`)
  if (nonmonotonic)
    warnings.push(`Пропущено повторов или нарушений порядка времени: ${nonmonotonic}`)
  if (fixes.some((f, i) => i > 0 && f.seconds - fixes[i - 1]!.seconds > 120))
    warnings.push('Разрывы больше 120 секунд не интерполируются')
  return { fixes, duration: fixes.at(-1)!.seconds, date, startTime: firstTime % 86400, warnings }
}
function fixSegment(replay: IGCReplay, t: number) {
  let low = 0,
    high = replay.fixes.length - 1
  while (low + 1 < high) {
    const middle = (low + high) >>> 1
    if (replay.fixes[middle]!.seconds <= t) low = middle
    else high = middle
  }
  return [replay.fixes[low]!, replay.fixes[high]!, t === replay.duration ? high : low] as const
}
function replaySample(
  replay: IGCReplay,
  t: number,
): (FlightSample & { baroAltitude: number }) | null {
  const [a, b] = fixSegment(replay, t)
  const duration = b.seconds - a.seconds
  const f = Math.max(0, Math.min(1, (t - a.seconds) / duration))
  if (duration > 120 && f > 0 && f < 1) return null
  return {
    seconds: t,
    lat: a.lat + (b.lat - a.lat) * f,
    lon: wrap(a.lon + wrap(b.lon - a.lon) * f),
    altitude: a.gpsAltitude + (b.gpsAltitude - a.gpsAltitude) * f,
    baroAltitude: a.baroAltitude + (b.baroAltitude - a.baroAltitude) * f,
    speed: duration <= 120 ? distanceBetween(a, b) / duration : null,
    vertical: duration <= 120 ? (b.gpsAltitude - a.gpsAltitude) / duration : null,
  }
}
export function igcFrame(
  replay: IGCReplay,
  seconds: number,
  settings = defaultFlightSettings,
): FlightFrame {
  const t = Math.max(0, Math.min(replay.duration, Number.isFinite(seconds) ? seconds : 0))
  if (replay.fixes.length < 2) return emptyFrame(t)
  const p = replaySample(replay, t)
  if (!p) return { ...emptyFrame(t), flight: { ...emptyFrame(t).flight, status: 'replay' } }
  const [a, b, lastIndex] = fixSegment(replay, t)
  const heading = p.speed !== null && p.speed > 0.1 ? bearingBetween(a, b) : null
  const history = historyAt(t, (i) => replaySample(replay, i))
  const stride = Math.max(1, Math.ceil((lastIndex + 1) / 6000))
  const track: Position[] = []
  let maximum = p.altitude!
  for (let i = 0; i <= lastIndex; i++) {
    const fix = replay.fixes[i]!
    maximum = Math.max(maximum, fix.gpsAltitude)
    if (i % stride === 0) track.push({ lat: fix.lat, lon: fix.lon })
  }
  track.push(p)
  const s = normalizeSettings(settings)
  const task = taskAt(p, p.altitude, p.speed, track, s, false)
  const first = replaySample(replay, 0)!
  const values: Record<string, number | string | null> = connectedValues(
    p,
    first,
    heading,
    history,
    task,
    replay.startTime,
  )
  values.WAltitudeMaximum = maximum
  values.WBaroAltitude = p.baroAltitude
  values.WAirSpeed = null
  values.WWindSpeed = null
  values.WWindDirection = null
  return {
    speed: p.speed === null ? null : p.speed * 3.6,
    vertical: p.vertical,
    altitude: p.altitude,
    time: t,
    widgetValues: values as WidgetValues,
    flight: {
      position: p,
      heading,
      wind: null,
      history,
      track,
      task,
      status: 'replay',
      gps: true,
      elapsed: t,
      terrain: s.terrainProfile,
    },
  }
}
