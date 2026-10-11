export interface NavigationWaypoint {
  name: string
  description?: string
  lat: number
  lon: number
  altitude: number | null
  radius: number
  type?: 'TAKEOFF' | 'SSS' | 'ESS' | 'GOAL'
  goalType?: 'LINE' | 'CYLINDER'
}

export interface ImportedTask {
  name: string
  turnpoints: NavigationWaypoint[]
  /** UTC seconds since midnight. */
  startTime?: number
  deadline?: number
}

const MAX_POINTS = 10000
function fail(message: string): never {
  throw new Error(message)
}
function input(text: string): string {
  if (text.length > 4 * 1024 * 1024) fail('Файл превышает ограничение 4 МБ.')
  return text.replace(/^\uFEFF/, '').trim()
}
function label(value: unknown, required = false): string {
  if (typeof value !== 'string' || value.length > 1024 || (required && !value.trim()))
    fail('Некорректное название или описание точки.')
  return value.trim()
}
function number(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) fail('Некорректное число в точке.')
  return value
}
function validate(point: NavigationWaypoint): NavigationWaypoint {
  label(point.name, true)
  if (point.description !== undefined) label(point.description)
  if (Math.abs(number(point.lat)) > 90 || Math.abs(number(point.lon)) > 180)
    fail('Координаты точки вне допустимого диапазона.')
  if (point.altitude !== null && (number(point.altitude) < -1000 || point.altitude > 100000))
    fail('Высота точки вне допустимого диапазона.')
  if (number(point.radius) < 0 || point.radius > 1000000)
    fail('Радиус точки вне допустимого диапазона.')
  return point
}
function finish(points: NavigationWaypoint[]): NavigationWaypoint[] {
  if (!points.length) fail('Файл не содержит точек.')
  if (points.length > MAX_POINTS) fail('Слишком много точек в файле.')
  return points.map(validate)
}
function csv(line: string): string[] {
  const cells: string[] = []
  let cell = ''
  let quoted = false
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      if (quoted && line[i + 1] === '"') {
        cell += '"'
        i++
      } else quoted = !quoted
    } else if (char === ',' && !quoted) {
      cells.push(cell.trim())
      cell = ''
    } else cell += char
  }
  if (quoted) fail('Незакрытая кавычка в CUP.')
  cells.push(cell.trim())
  return cells
}
function cupCoord(value: string, latitude: boolean): number {
  const match = value.match(
    latitude ? /^(\d{2})(\d{2}(?:\.\d+)?)([NS])$/i : /^(\d{3})(\d{2}(?:\.\d+)?)([EW])$/i,
  )
  if (!match || Number(match[2]) >= 60) fail('Некорректные координаты CUP.')
  return (Number(match[1]) + Number(match[2]) / 60) * (/[SW]/i.test(match[3]!) ? -1 : 1)
}
function elevation(value: string): number | null {
  if (!value) return null
  const match = value.match(/^([+-]?\d+(?:\.\d+)?)\s*(m|ft)$/i)
  if (!match) fail('Некорректная высота CUP: ожидаются m или ft.')
  return Number(match[1]) * (match[2]!.toLowerCase() === 'ft' ? 0.3048 : 1)
}

export function parseWaypoints(text: string, filename: string): NavigationWaypoint[] {
  const source = input(text)
  if (/\.gpx$/i.test(filename)) {
    if (typeof DOMParser === 'undefined') fail('Импорт GPX требует XML-парсер браузера.')
    if (/<!DOCTYPE|<!ENTITY/i.test(source)) fail('DTD и XML-сущности в GPX не поддерживаются.')
    const xml = new DOMParser().parseFromString(source, 'application/xml')
    if (xml.getElementsByTagName('parsererror').length || xml.documentElement.localName !== 'gpx')
      fail('Некорректный GPX.')
    const nodes = Array.from(xml.getElementsByTagName('*')).filter((node) =>
      ['wpt', 'rtept'].includes(node.localName),
    )
    return finish(
      nodes.map((node, index) => {
        const child = (name: string) =>
          Array.from(node.children)
            .find((item) => item.localName === name)
            ?.textContent?.trim()
        const lat = node.getAttribute('lat'),
          lon = node.getAttribute('lon')
        if (!lat?.trim() || !lon?.trim()) fail('В GPX отсутствуют координаты.')
        const alt = child('ele')
        return {
          name: label(child('name') || `Точка ${index + 1}`, true),
          description: child('desc'),
          lat: Number(lat),
          lon: Number(lon),
          altitude: alt ? Number(alt) : null,
          radius: 400,
        }
      }),
    )
  }
  const lines = source.split(/\r?\n/).filter((line) => line.trim() && !line.trim().startsWith('*'))
  if (lines.length > MAX_POINTS + 2) fail('Слишком много точек в файле.')
  if (lines[0] === '$FormatGEO') {
    return finish(
      lines.slice(1).map((line) => {
        const m = line.match(
          /^(\S+)\s+([NS])\s+(\d+)\s+(\d+)\s+(\d+(?:\.\d+)?)\s+([EW])\s+(\d+)\s+(\d+)\s+(\d+(?:\.\d+)?)\s+([+-]?\d+(?:\.\d+)?)(?:\s+(.*))?$/i,
        )
        if (!m || [m[4], m[5], m[8], m[9]].some((v) => Number(v) >= 60))
          fail('Некорректная строка GEO WPT.')
        return {
          name: label(m[1], true),
          description: m[11] ? label(m[11]) : undefined,
          lat:
            (Number(m[3]) + Number(m[4]) / 60 + Number(m[5]) / 3600) * (/S/i.test(m[2]!) ? -1 : 1),
          lon:
            (Number(m[7]) + Number(m[8]) / 60 + Number(m[9]) / 3600) * (/W/i.test(m[6]!) ? -1 : 1),
          altitude: Number(m[10]),
          radius: 400,
        }
      }),
    )
  }
  if (/\.cup$/i.test(filename)) {
    const header = csv(lines[0] || '').map((value) => value.toLowerCase())
    const latIndex = header.indexOf('lat'),
      lonIndex = header.indexOf('lon'),
      nameIndex = header.indexOf('name'),
      elevIndex = header.indexOf('elev')
    if ([latIndex, lonIndex, nameIndex, elevIndex].some((i) => i < 0))
      fail('Отсутствует заголовок CUP.')
    const taskIndex = lines.findIndex((line) => line.trim() === '-----Related Tasks-----')
    return finish(
      lines.slice(1, taskIndex < 0 ? undefined : taskIndex).map((line) => {
        const cells = csv(line)
        return {
          name: label(cells[nameIndex], true),
          description: cells[header.indexOf('desc')],
          lat: cupCoord(cells[latIndex] || '', true),
          lon: cupCoord(cells[lonIndex] || '', false),
          altitude: elevation(cells[elevIndex] || ''),
          radius: 400,
        }
      }),
    )
  }
  fail('Поддерживаются GEO WPT, CUP и GPX.')
}

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    fail('Некорректная структура XCTSK.')
  return value as Record<string, unknown>
}
function time(value: unknown): number | undefined {
  if (value === undefined) return undefined
  if (typeof value !== 'string') fail('Некорректное время XCTSK.')
  const match = value.match(/^(\d{2}):(\d{2}):(\d{2})Z$/)
  if (!match || Number(match[1]) > 23 || Number(match[2]) > 59 || Number(match[3]) > 59)
    fail('Время XCTSK должно иметь формат HH:MM:SSZ.')
  return Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3])
}

/** Official XCTSK CLASSIC v1: https://xctrack.org/Competition_Interfaces.html */
export function parseCompetitionTask(text: string, filename: string): ImportedTask {
  let raw: unknown
  try {
    raw = JSON.parse(input(text))
  } catch {
    fail('Некорректный JSON XCTSK.')
  }
  const task = record(raw)
  if (task.taskType !== 'CLASSIC' || task.version !== 1)
    fail('Поддерживается только XCTSK CLASSIC версии 1.')
  if (!Array.isArray(task.turnpoints) || task.turnpoints.length > 100)
    fail('Некорректный список точек XCTSK.')
  const goal = task.goal === undefined ? {} : record(task.goal)
  if (goal.type !== undefined && goal.type !== 'LINE' && goal.type !== 'CYLINDER')
    fail('Некорректный тип финиша XCTSK.')
  const turnpoints = finish(
    task.turnpoints.map((value, index) => {
      const point = record(value),
        waypoint = record(point.waypoint)
      if (number(point.radius) <= 0) fail('Радиус точки задачи должен быть положительным.')
      if (point.type !== undefined && !['TAKEOFF', 'SSS', 'ESS'].includes(String(point.type)))
        fail('Некорректный тип точки XCTSK.')
      if (point.type === 'TAKEOFF' && index !== 0) fail('TAKEOFF допустим только в первой точке.')
      return {
        name: label(waypoint.name, true),
        description: waypoint.description === undefined ? undefined : label(waypoint.description),
        lat: number(waypoint.lat),
        lon: number(waypoint.lon),
        altitude: number(waypoint.altSmoothed),
        radius: number(point.radius),
        type: point.type as NavigationWaypoint['type'],
      }
    }),
  )
  const start = turnpoints.findIndex((point) => point.type === 'SSS'),
    end = turnpoints.findIndex((point) => point.type === 'ESS')
  if (
    start < 0 ||
    end <= start ||
    turnpoints.filter((p) => p.type === 'SSS').length !== 1 ||
    turnpoints.filter((p) => p.type === 'ESS').length !== 1
  )
    fail('Задача должна содержать SSS перед ESS, по одной точке каждого типа.')
  const last = turnpoints[turnpoints.length - 1]!
  last.type = last.type === 'ESS' ? 'ESS' : 'GOAL'
  last.goalType = goal.type === 'LINE' ? 'LINE' : 'CYLINDER'
  const sss = task.sss === undefined ? {} : record(task.sss)
  if (sss.timeGates !== undefined && !Array.isArray(sss.timeGates))
    fail('Некорректные стартовые времена XCTSK.')
  const gates = (sss.timeGates as unknown[] | undefined)?.map(time)
  return {
    name:
      typeof task.name === 'string'
        ? label(task.name, true)
        : filename.replace(/\.[^.]+$/, '') || 'Задача',
    turnpoints,
    startTime: gates?.[0],
    deadline: time(goal.deadline),
  }
}
