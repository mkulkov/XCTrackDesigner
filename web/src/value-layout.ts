import type { Json, Widget } from './xcfg'
import { contentReading } from './widget-content'
import type { WidgetValues } from './widget-content'
import type { FlightState } from './flight-engine'

export const titles: Record<string, string> = {
  WSpeed: 'Скорость',
  WVerticalSpeed: 'Вертикальная скорость',
  WAMSL: 'AMSL',
  WAirTime: 'Время полета',
}
export type Frame = {
  speed: number | null
  vertical: number | null
  altitude: number | null
  time: number | null
  widgetValues?: WidgetValues
  flight?: FlightState
}
export type Metric = { width: number; ascent: number; descent: number }
export type Measure = (text: string, size: number, role?: 'title' | 'value') => Metric
export type TextRun = {
  role?: 'title' | 'value'
  text: string
  x: number
  y: number
  size: number
  color: string
  stroke?: string
  strokeWidth?: number
  fontWeight?: 'normal' | 'bold'
  fontStyle?: 'normal' | 'italic'
}
const themes = new Set([
  'WhiteTheme',
  'WhiteHCTheme',
  'WhiteEInkTheme',
  'BlackTheme',
  'BlackHCTheme',
])
const argb = (n: Json | undefined, fallback: string) =>
  typeof n === 'number' && Number.isInteger(n)
    ? `#${(n >>> 0).toString(16).padStart(8, '0').slice(2)}${(n >>> 0).toString(16).padStart(8, '0').slice(0, 2)}`
    : fallback

export function reading(w: Widget, prefs: Record<string, Json>, frame: Frame) {
  const name = w.CLASS.replace('org.xcontest.XCTrack.widget.w.', '')
  const language = prefs['Display.Language'] || 'ru'
  if (language !== 'ru' && language !== 'en') return null
  if (!Object.hasOwn(titles, name)) {
    let values = frame.widgetValues
    if (name === 'WNextTurnpoint' && !Object.hasOwn(values ?? {}, name)) {
      const task = frame.flight?.task
      const waypoint = task?.waypoints[task.nextIndex]
      if (waypoint) values = { ...values, [name]: waypoint.name }
    }
    if (name === 'WCompassDigital') {
      const flight = frame.flight
      const heading =
        flight?.heading ?? (typeof values?.WBearing === 'number' ? values.WBearing : null)
      const target = w.target ?? 'N_NAVIGATION'
      let direction = values?.[name]
      if (!Object.hasOwn(values ?? {}, name)) {
        direction =
          target === 'N_WIND'
            ? flight?.wind && flight.wind.speed > 0
              ? flight.wind.from
              : null
            : target === 'N_BEARING'
              ? (values?.WBearing ?? heading)
              : target === 'N_HEADING'
                ? heading
                : (flight?.task?.bearing ?? null)
      }
      if (typeof direction === 'number' && Number.isFinite(direction) && w.relative !== false)
        direction =
          heading === null
            ? null
            : (direction - heading + 720) % 360 > 180
              ? ((direction - heading + 720) % 360) - 360
              : (direction - heading + 720) % 360
      values = { ...values, [name]: direction ?? null }
    }
    const value = contentReading(w, prefs, values, frame.flight?.position)
    if (
      value &&
      name === 'WGlide' &&
      w.showVario === true &&
      frame.vertical !== null &&
      frame.vertical >= 0
    ) {
      const vario = contentReading(
        { ...w, CLASS: 'org.xcontest.XCTrack.widget.w.WNettoVario' },
        prefs,
        { WNettoVario: frame.vertical },
      )
      if (vario)
        return {
          ...value,
          text: vario.text,
          unit: vario.unit,
          split: vario.split,
          tone: 'green',
          missing: false,
        }
    }
    return value
  }
  const ru = language === 'ru'
  let value: number | null
  let unit: string
  if (name === 'WAirTime') {
    value = frame.time
    return {
      name,
      text:
        value === null
          ? null
          : `${Math.floor(Math.max(0, value) / 3600)}:${Math.floor((Math.max(0, value) / 60) % 60)
              .toString()
              .padStart(2, '0')}`,
      unit: '',
      split: false,
      tone: 'normal',
    }
  }
  if (name === 'WSpeed') {
    const override: Record<string, string> = { KM_H: 'km/h', M_S: 'm/s', MP_H: 'mph', KT: 'kt' }
    const selected =
      typeof w._units === 'string' && w._units !== 'SYS_UNIT'
        ? override[w._units]
        : (prefs['Unit.Speed'] ?? 'km/h')
    const factors: Record<string, number> = {
      'km/h': 1,
      'm/s': 1 / 3.6,
      mph: 2.236936292054402 / 3.6,
      kt: 1.943844 / 3.6,
    }
    if (typeof selected !== 'string' || factors[selected] === undefined) return null
    value = frame.speed === null ? null : frame.speed * factors[selected]
    unit = selected === 'km/h' && ru ? 'км/ч' : selected === 'm/s' && ru ? 'м/с' : selected
  } else if (name === 'WVerticalSpeed') {
    const selected = prefs['Unit.VerticalSpeed'] ?? 'm/s'
    const factors: Record<string, number> = {
      'm/s': 1,
      'ft/min': 196.85039370078738,
      '100ft/min': 1.968503937007874,
    }
    if (typeof selected !== 'string' || factors[selected] === undefined) return null
    value = frame.vertical === null ? null : frame.vertical * factors[selected]
    unit = selected === 'm/s' && ru ? 'м/с' : selected
  } else {
    const selected = prefs['Unit.Altitude'] ?? 'm'
    if (selected !== 'm' && selected !== 'ft') return null
    value =
      frame.altitude === null ? null : frame.altitude * (selected === 'ft' ? 3.280839895013123 : 1)
    unit = selected === 'm' && ru ? 'м' : selected
  }
  const decimal =
    unit === 'm/s' || unit === 'м/с' || (name === 'WVerticalSpeed' && unit === '100ft/min')
  let text =
    value === null
      ? null
      : (Math.floor(value * (decimal ? 10 : 1) + 0.5) / (decimal ? 10 : 1)).toFixed(decimal ? 1 : 0)
  if (ru && text) text = text.replace('.', ',')
  if (name === 'WVerticalSpeed' && text !== null && !text.startsWith('-')) text = '+' + text
  // Colors follow the raw SI variometer input, not converted units.
  const tone =
    name === 'WVerticalSpeed' && frame.vertical !== null
      ? frame.vertical >= 0
        ? 'green'
        : frame.vertical <= -1
          ? 'red'
          : 'normal'
      : 'normal'
  return { name, text, unit, split: unit.includes('/'), tone }
}

export type FitCache = { maxWidth: number; maxHeight: number; textSize: number }
export const newFitCache = (): FitCache => ({ maxWidth: 1, maxHeight: 1, textSize: 30 })
export const newSceneCache = () => ({
  value: newFitCache(),
  unit: newFitCache(),
  lines: [] as FitCache[],
  textSize: 30,
})
export type SceneCache = ReturnType<typeof newSceneCache>
export type ValueScene = {
  hidden: boolean
  runs: TextRun[]
  divider: { x1: number; x2: number; y: number; color: string } | undefined
  background: string
  border: string
  contentBackground?: string
  symbol?: {
    path: string
    x: number
    y: number
    width: number
    height: number
    color: string
    background: string
  }
}

// theme.U uses historical normalized maxima; position uses the current metrics.
export function fit(
  text: string,
  left: number,
  top: number,
  right: number,
  bottom: number,
  measure: Measure,
  align: 'center' | 'right' | 'left' = 'center',
  cache: FitCache = newFitCache(),
): TextRun | null {
  return fitLines([text], left, top, right, bottom, measure, align, cache)[0] ?? null
}

export function fitLines(
  texts: string[],
  left: number,
  top: number,
  right: number,
  bottom: number,
  measure: Measure,
  align: 'center' | 'right' | 'left' = 'center',
  cache: FitCache = newFitCache(),
): TextRun[] {
  const measuredSize = cache.textSize
  const metrics = texts.map((text) => measure(text, measuredSize))
  const m = metrics[0]
  const width = right - left - 6
  const height = bottom - top - 6
  const maxWidth = Math.max(...metrics.map((m) => m.width))
  if (!m || width <= 0 || height <= 0 || maxWidth <= 0 || m.ascent + m.descent <= 0) return []
  // sm.a starts with inverse width/height of 1, limiting expansion of narrow
  // glyphs even on the first native frame.
  cache.maxWidth = Math.max(cache.maxWidth, maxWidth / measuredSize)
  cache.maxHeight = Math.max(
    cache.maxHeight,
    (texts.length * (m.ascent + m.descent)) / measuredSize,
  )
  let size = Math.min(width / cache.maxWidth, height / cache.maxHeight)
  if (size > 30) size = Math.floor(size / 10) * 10
  cache.textSize = size
  const lineHeight = ((m.ascent + m.descent) * size) / measuredSize
  return texts.map((text, index) => {
    const actual = measure(text, size)
    return {
      text,
      size,
      x: left + 3 + (width - actual.width) * (align === 'right' ? 1 : align === 'left' ? 0 : 0.5),
      y: top + 3 + (height - lineHeight * texts.length) / 2 + actual.ascent + index * lineHeight,
      color: '#fff',
    }
  })
}

export function valueScene(
  w: Widget,
  prefs: Record<string, Json>,
  frame: Frame,
  width: number,
  height: number,
  screenWidth: number,
  screenHeight: number,
  measure: Measure,
  cache: SceneCache = newSceneCache(),
): ValueScene | null {
  const value = reading(w, prefs, frame)
  const theme = String(w._theme || prefs['Display.Theme'] || 'BlackHCTheme')
  if (!value || !themes.has(theme)) return null
  const white = theme.startsWith('White')
  const textWidget = value.name === 'WAirTime' || ('kind' in value && value.kind === 'text')
  const weighted = value.name === 'WNextTurnpoint' || value.name === 'WCompTimeToStart'
  const hidden =
    (!textWidget || weighted || value.name === 'WExternalData') &&
    w._hide_labels === true &&
    (value.text === null || ('missing' in value && value.missing))
  const runs: TextRun[] = []
  let divider: { x1: number; x2: number; y: number; color: string } | undefined
  if (hidden)
    return { hidden, runs, divider, background: white ? '#fff' : '#000', border: '#808080' }
  if (value.name === 'WFreeText') {
    // Native uses Android TextView with millimetre text size, fixed pixel
    // padding, left alignment and no auto-fit. SVG wrapping is approximate.
    const padding = typeof w.text_padding === 'number' ? Math.max(0, w.text_padding) : 10
    const size =
      ((typeof w.text_size === 'number' ? Math.max(1, w.text_size) : 25) / 10) * (420 / 25.4)
    const texts: string[] = []
    for (const paragraph of (value.text ?? '').split('\n')) {
      let line = ''
      for (const character of paragraph) {
        if (line && measure(line + character, size).width > width - 2 * padding) {
          texts.push(line)
          line = ''
        }
        line += character
      }
      texts.push(line)
    }
    const metric = measure('M', size)
    for (const [index, text] of texts.entries())
      runs.push({
        text,
        x: padding,
        y: padding + metric.ascent + index * (metric.ascent + metric.descent),
        size,
        color: argb(w.color_text, '#000'),
        fontWeight: w.text_bold === true ? 'bold' : 'normal',
        fontStyle: w.text_italic === true ? 'italic' : 'normal',
      })
    return {
      hidden,
      runs,
      divider,
      background: white ? '#fff' : '#000',
      border: '#808080',
      contentBackground: argb(w.color_bg, '#ffffff00'),
    }
  }
  let titleHeight = 0
  if (w._title !== false) {
    const outline = prefs['Display.WidgetTitleOutline'] === true
    const base = 420 / 25.4
    const diagonal = Math.ceil(Math.hypot(screenWidth, screenHeight))
    const scale = diagonal > 127 * base ? (base * (diagonal / (127 * base) + 1)) / 2 : base
    const configured = Number(prefs['Display.WidgetTitleSize'] ?? 100)
    const size =
      ((Number.isFinite(configured) ? Math.max(1, Math.min(1000, configured)) : 100) / 100) *
      (outline ? 1.7 : 1.5) *
      scale
    // wm.u.i gates custom titles behind PRO; this profile matches the non-PRO emulator.
    const avg =
      value.name === 'WNettoVario'
        ? typeof w.netto_avg === 'number'
          ? w.netto_avg
          : 0
        : typeof w.avg === 'number'
          ? w.avg
          : 2000
    const defaults =
      prefs['Display.Language'] === 'en'
        ? ({
            WSpeed: 'Speed',
            WVerticalSpeed: 'Vertical speed',
            WAMSL: 'AMSL',
            WAirTime: 'Air time',
          } as Record<string, string>)
        : titles
    const text =
      ('title' in value ? value.title : defaults[value.name]!) +
      (value.name === 'WVerticalSpeed' || value.name === 'WGlide' || value.name === 'WNettoVario'
        ? ` / ${avg >= 1000 && avg % 1000 === 0 ? (avg / 1000).toFixed(0) : (avg / 1000).toFixed(1)}s`
        : '')
    const metric = measure(text, size, 'title')
    titleHeight = Math.floor((metric.ascent + metric.descent) / 1.5)
    runs.push({
      role: 'title',
      text,
      x: (width - metric.width) / 2,
      y: metric.ascent,
      size,
      color: '#7f7f7f',
      stroke: outline ? argb(prefs['Display.WidgetTitleOutlineColor'], '#000') : undefined,
      strokeWidth: size / 10,
    })
  }
  let symbol: ValueScene['symbol']
  if ((value.name === 'WOptiResult' || value.name === 'WOptiUnfinishedTriangle') && value.text) {
    const type = frame.widgetValues?.[`${value.name}.type`]
    if (type === 'open' || type === 'flat' || type === 'fai') {
      const side = Math.max(0, Math.min(84, width / 3, height - titleHeight))
      const points =
        type === 'open'
          ? [
              [18, 30],
              [40, 72],
              [54, 20],
              [80, 48],
            ]
          : type === 'flat'
            ? [
                [22, 56],
                [72, 30],
                [80, 70],
              ]
            : [
                [22, 70],
                [46, 22],
                [80, 68],
              ]
      let path = points.map(([x, y], index) => `${index ? 'L' : 'M'}${x} ${y}`).join(' ')
      if (type !== 'open' && value.name === 'WOptiResult') path += ' Z'
      for (const [x, y] of points) path += ` M${x! - 4} ${y} a4 4 0 1 0 8 0 a4 4 0 1 0 -8 0`
      symbol = {
        path,
        x: 1,
        y: (height + titleHeight - side) / 2,
        width: side,
        height: side,
        color: '#fff',
        background: type === 'open' ? '#d06400' : type === 'flat' ? '#00a522' : '#0089a8',
      }
    }
  }
  if (value.text !== null) {
    const color =
      theme === 'WhiteEInkTheme'
        ? '#000'
        : value.tone === 'green'
          ? '#a0ffa0'
          : value.tone === 'red'
            ? '#ffa0a0'
            : value.tone === 'orange'
              ? '#ffb95f'
              : theme === 'WhiteHCTheme'
                ? '#000'
                : theme === 'BlackHCTheme'
                  ? '#fff'
                  : '#ffffc0'
    const hasUnit = !textWidget && Boolean(value.unit) && w._unit !== false
    const textStroke =
      white && theme !== 'WhiteEInkTheme' && (theme === 'WhiteTheme' || value.tone !== 'normal')
        ? '#000'
        : undefined
    const unitColor = theme === 'WhiteEInkTheme' ? '#000' : white ? '#505050' : '#f0f0f0'
    const right = hasUnit ? width - Math.floor(width / 4) : width
    cache.value.textSize = cache.textSize
    if (weighted && 'lineWeights' in value && value.text.length) {
      const texts = value.text.split('\n')
      const weights = value.lineWeights ?? [1]
      const total = weights.reduce((sum, weight) => sum + weight, 0)
      let accumulated = 0
      texts.slice(0, weights.length).forEach((text, index) => {
        const top = titleHeight + Math.floor(((height - titleHeight) * accumulated) / total)
        accumulated += weights[index]!
        const bottom = titleHeight + Math.floor(((height - titleHeight) * accumulated) / total)
        const lineCache = (cache.lines[index] ??= newFitCache())
        const run = fit(text, 0, top, width, bottom, measure, 'center', lineCache)
        if (run) runs.push({ ...run, color, stroke: textStroke, strokeWidth: 10 })
      })
      return { hidden, runs, divider, background: white ? '#fff' : '#000', border: '#808080' }
    }
    if (textWidget && value.name !== 'WAirTime') {
      const textRuns = fitLines(
        value.text.split('\n'),
        0,
        titleHeight,
        width,
        height,
        measure,
        'align' in value ? value.align : 'center',
        cache.value,
      )
      if (textRuns.length) cache.textSize = textRuns[0]!.size
      runs.push(...textRuns.map((run) => ({ ...run, color, stroke: textStroke, strokeWidth: 10 })))
      return { hidden, runs, divider, background: white ? '#fff' : '#000', border: '#808080' }
    }
    let run = fit(
      value.text,
      symbol ? symbol.width + 2 : 0,
      titleHeight,
      right,
      height,
      measure,
      hasUnit ? 'right' : 'center',
      cache.value,
    )
    if (!run && hasUnit && value.text === '' && 'formatterValue' in value && value.formatterValue)
      run = {
        text: '',
        x: 0,
        y: titleHeight + Math.floor(((height - titleHeight) * 2) / 3),
        size: cache.textSize,
        color,
      }
    if (run) {
      cache.textSize = run.size
      runs.push({
        ...run,
        color,
        stroke: textStroke,
        strokeWidth: 10,
      })
      if (hasUnit) {
        const parts = value.unit.split('/')
        if (parts.length === 2) {
          cache.unit.textSize = cache.textSize
          const unitRuns = fitLines(
            parts,
            right,
            titleHeight,
            width,
            height,
            measure,
            'center',
            cache.unit,
          )
          if (unitRuns.length) {
            cache.textSize = unitRuns[0]!.size
            runs.push(...unitRuns.map((run) => ({ ...run, color: unitColor })))
            const inset = Math.floor((width - right) / 8)
            divider = {
              x1: right + inset,
              x2: width - inset,
              y: Math.floor((height + titleHeight) / 2),
              color: unitColor,
            }
          }
        } else {
          cache.unit.textSize = cache.textSize
          const unitRun = fit(
            value.unit,
            right,
            titleHeight,
            width,
            height,
            measure,
            'center',
            cache.unit,
          )
          if (unitRun) cache.textSize = unitRun.size
          if (unitRun)
            runs.push({
              ...unitRun,
              y: run.y + (textStroke ? 2.5 : 0),
              color: unitColor,
            })
        }
      }
    }
  }
  return { hidden, runs, divider, symbol, background: white ? '#fff' : '#000', border: '#808080' }
}
