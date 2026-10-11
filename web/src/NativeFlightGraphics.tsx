import type { ReactNode } from 'react'
import type { Widget, Json } from './xcfg'
import type { Frame } from './value-layout'
import type { FlightSample } from './flight-engine'

type Props = {
  widget: Widget
  frame: Frame
  width: number
  height: number
  light: boolean
  screenWidth?: number
  screenHeight?: number
  densityDpi?: number
}
const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
const number = (v: Json | undefined, fallback: number) => (finite(v) ? v : fallback)
const flag = (v: Json | undefined, fallback = false) => (typeof v === 'boolean' ? v : fallback)
const argb = (v: Json | undefined, fallback: string) =>
  finite(v)
    ? `#${(v >>> 0).toString(16).padStart(8, '0').slice(2)}${(v >>> 0).toString(16).padStart(8, '0').slice(0, 2)}`
    : fallback
const radians = Math.PI / 180
const point = (angle: number, radius: number) => [
  Math.sin(angle * radians) * radius,
  -Math.cos(angle * radians) * radius,
]
const roundNative = (n: number) => Math.floor(n + 0.5)

// theme/a.b0: physical millimetres with the native large-display adjustment.
// eslint-disable-next-line react-refresh/only-export-components -- pure geometry is shared with focused tests
export function nativeGraphicMetric(screenWidth = 1080, screenHeight = 2337, dpi = 420) {
  const mm = dpi / 25.4
  const diagonal = Math.hypot(screenWidth, screenHeight)
  return mm * (diagonal <= 127 * mm ? 1 : (diagonal / (127 * mm) + 1) / 2)
}

// eslint-disable-next-line react-refresh/only-export-components -- pure geometry is shared with focused tests
export function nativeVarioSegments(value: number) {
  let first: number,
    last: number,
    overflowFirst = 1,
    overflowLast = 0
  if (value >= 7.8) {
    first = 0
    last = 0
    overflowFirst = 1
    overflowLast = 19
  } else if (value >= 4) {
    overflowFirst = roundNative((8 - value) * 5)
    overflowLast = 19
    first = 0
    last = overflowFirst - 1
  } else if (value >= 0) {
    first = roundNative((4 - value) * 5)
    last = 19
  } else if (value >= -4) {
    first = 20
    last = roundNative(-value * 5) + 19
  } else if (value >= -7.8) {
    overflowFirst = 20
    overflowLast = 19 + roundNative((-value - 4) * 5)
    first = overflowLast + 1
    last = 39
  } else {
    overflowFirst = 20
    overflowLast = 38
    first = 39
    last = 39
  }
  return { first, last, overflowFirst, overflowLast }
}

// eslint-disable-next-line react-refresh/only-export-components -- pure geometry is shared with focused tests
export function nativeAltitudeBins(samples: readonly FlightSample[], type: string) {
  const bins = new Map<number, number[]>()
  for (const p of samples) {
    const value =
      type === 'GRAPH_SPEED' ? p.speed : type === 'GRAPH_WIND' ? p.windSpeed : p.vertical
    if (!finite(p.altitude) || !finite(value)) continue
    const bin = roundNative(p.altitude / 100)
    bins.set(bin, [...(bins.get(bin) ?? []), value])
  }
  return [...bins]
    .sort(([a], [b]) => a - b)
    .map(([altitude, values]) => ({
      altitude,
      value: values.reduce((a, b) => a + b, 0) / values.length,
    }))
}

export function NativeFlightGraphics({
  widget,
  frame,
  width,
  height,
  light,
  screenWidth,
  screenHeight,
  densityDpi,
}: Props) {
  const name = widget.CLASS.split('.').at(-1)
  if (
    !['WCompass', 'WVarioColumn', 'WVerticalGraph', 'WAltitudeDataGraph', 'WSideView'].includes(
      name ?? '',
    )
  )
    return null
  const metric = nativeGraphicMetric(screenWidth, screenHeight, densityDpi)
  const dpi = densityDpi ?? 420
  const ink = light ? '#000' : '#fff'
  const background = light ? '#fff' : '#000'
  const flight = frame.flight
  const themeInk = light ? '#404040' : '#c0c0c0'
  let content: ReactNode = null
  let accuracy = 'apk-derived-geometry'
  const text = (
    value: string,
    x: number,
    y: number,
    size: number,
    anchor: 'start' | 'middle' | 'end' = 'middle',
  ) => (
    <text
      x={x}
      y={y}
      fill={ink}
      textAnchor={anchor}
      fontFamily="Arial, sans-serif"
      fontWeight="bold"
      fontSize={size}
    >
      {value}
    </text>
  )

  if (name === 'WCompass') {
    const heading = flight?.heading
    const travel =
      flight && flight.track.length > 1
        ? Math.atan2(
            (flight.track.at(-1)!.lon - flight.track.at(-2)!.lon) *
              Math.cos(flight.track.at(-1)!.lat * radians),
            flight.track.at(-1)!.lat - flight.track.at(-2)!.lat,
          ) / radians
        : null
    // Frame currently has one explicit heading input; it is used as GPS bearing too.
    const bearing = heading
    const rotation =
      widget.rotation === 'NORTH'
        ? 0
        : widget.rotation === 'BEARING'
          ? (bearing ?? 0)
          : widget.rotation === 'TRAVEL_DIRECTION'
            ? (travel ?? 0)
            : (heading ?? 0)
    const showBackground = flag(widget.showBackground, true)
    const r = Math.max(0, Math.min(width, height) / 2 - metric / 2)
    const arrowR = Math.max(0, Math.min(width, height) / 2 - (showBackground ? 2 * metric : 0))
    const arrow = (angle: number, colors: [string, string], key: string) => {
      const side = arrowR * (showBackground ? 0.9 : 1)
      const tail = arrowR * (showBackground ? 0.3 : 0.4)
      const tip = point(angle - rotation, arrowR)
      const end = point(angle - rotation + 180, tail)
      return (
        <g key={key} data-compass-arrow={key}>
          {[-140, 140].map((a, i) => (
            <polygon
              key={a}
              points={[tip, point(angle - rotation + a, side), end]
                .map((p) => p.join(','))
                .join(' ')}
              fill={colors[i]}
            />
          ))}
        </g>
      )
    }
    const wind = flight?.wind
    const windFrom = wind && wind.speed > 0 ? wind.from : null
    const windAngle = finite(windFrom) ? windFrom - rotation : 0
    const sectorR = Math.max(0, Math.min(width, height) / 2 - (showBackground ? metric : 0) + 1)
    const sectorA = point(windAngle - 35, sectorR),
      sectorB = point(windAngle + 35, sectorR)
    content = (
      <g transform={`translate(${width / 2} ${height / 2})`}>
        {flag(widget.showWind) && flag(widget.newWindArrow) && finite(windFrom) && (
          <g data-compass-arrow="wind-sector">
            <path
              d={`M0 0 L${sectorA.join(' ')} A${sectorR} ${sectorR} 0 0 1 ${sectorB.join(' ')} Z`}
              fill={ink}
            />
            <line
              x1={0}
              y1={0}
              x2={point(windAngle, sectorR)[0]}
              y2={point(windAngle, sectorR)[1]}
              stroke={background}
              strokeWidth={metric * 0.2}
            />
          </g>
        )}
        {showBackground && (
          <g data-compass-background="true" stroke={themeInk} fill="none">
            {r > metric * 8 &&
              Array.from({ length: 11 }, (_, i) => i + 1).map((i) => (
                <line
                  key={i}
                  x1={point(i * 30 - rotation, r * (i % 3 === 0 ? 0.7 : 0.8))[0]}
                  y1={point(i * 30 - rotation, r * (i % 3 === 0 ? 0.7 : 0.8))[1]}
                  x2={point(i * 30 - rotation, r)[0]}
                  y2={point(i * 30 - rotation, r)[1]}
                  strokeWidth={metric * (i % 3 === 0 ? 1 : 0.7)}
                />
              ))}
            <g transform={`rotate(${-rotation})`}>
              <text
                x={0}
                y={-r * 0.7 + metric * 0.3}
                fill={themeInk}
                stroke={background}
                strokeWidth={4}
                paintOrder="stroke fill"
                textAnchor="middle"
                fontFamily="Arial, sans-serif"
                fontWeight="bold"
                fontSize={r / 3}
              >
                N
              </text>
            </g>
            <circle r={r} strokeWidth={metric} />
            <path
              d={`M0 ${-r + metric / 2} L${-metric / 4} ${-r - metric / 2} L${metric / 4} ${-r - metric / 2} Z`}
              fill={background}
              stroke="none"
            />
          </g>
        )}
        {flag(widget.showHeading) &&
          finite(heading) &&
          arrow(heading, light ? ['#808080', '#606060'] : ['#e0e0e0', '#a0a0a0'], 'heading')}
        {flag(widget.showBearing) &&
          finite(bearing) &&
          arrow(bearing, light ? ['#808080', '#606060'] : ['#e0e0e0', '#a0a0a0'], 'bearing')}
        {flag(widget.showWind) &&
          !flag(widget.newWindArrow) &&
          finite(windFrom) &&
          arrow(windFrom + 180, ['#c0c040', '#a0a020'], 'wind')}
        {widget.navigation_target !== 'NONE' &&
          finite(flight?.task?.bearing) &&
          arrow(flight.task.bearing, ['#e04040', '#c02020'], 'navigation')}
      </g>
    )
  } else if (name === 'WVarioColumn') {
    const history =
      flight?.history.filter(
        (p) =>
          p.seconds > flight.elapsed - Math.max(1, number(widget.avg, 2000)) / 1000 &&
          finite(p.vertical),
      ) ?? []
    const value = history.length
      ? history.reduce((sum, p) => sum + p.vertical!, 0) / history.length
      : frame.vertical
    if (finite(value)) {
      const ranges = nativeVarioSegments(value)
      const rgb =
        value >= 3
          ? [255, 160, 160]
          : value >= 2
            ? [255, 208, 160]
            : value >= 0
              ? [160, 255, 160]
              : [160, 176, 255]
      const dark = rgb.map((v) =>
        Math.min(255, v + 255 - Math.min(Math.max(...rgb), Math.min(...rgb) + 32)),
      )
      const gap = Math.max(1, roundNative(metric / 5))
      const step = (height - gap) / 40
      const bright = rgb.map((v) =>
        Math.max(0, v - Math.max(Math.min(...rgb), Math.max(...rgb) - 240)),
      )
      const rgbText = (v: number[]) => `rgb(${v.join(' ')})`
      content = (
        <g data-series="vario-segments">
          {Array.from({ length: 40 }, (_, i) => i).map((i) => {
            const active = i >= ranges.first && i <= ranges.last
            const overflow = i >= ranges.overflowFirst && i <= ranges.overflowLast
            if (!active && !overflow) return null
            const marker = value < 0 && (i % 5 === 0 || (i + 1) % 5 === 0)
            return (
              <g key={i}>
                <rect x={0} y={i * step} width={width} height={step + gap} fill={rgbText(bright)} />
                <rect
                  data-segment={i}
                  x={gap}
                  y={Math.trunc(i * step) + gap}
                  width={Math.max(0, width - gap * 2)}
                  height={Math.max(0, Math.trunc((i + 1) * step) - Math.trunc(i * step) - gap)}
                  fill={overflow ? background : rgbText(marker ? rgb : dark)}
                />
              </g>
            )
          })}
        </g>
      )
    }
  } else if (name === 'WVerticalGraph') {
    const interval = Math.max(1, number(widget.interval, 60000) / 1000)
    const samples =
      flight?.history.filter((p) => p.seconds >= flight.elapsed - interval && finite(p.altitude)) ??
      []
    if (samples.length) {
      const dotRadius = Math.max(0.1, ((number(widget.dot_size, 15) / 10) * (dpi / 25.4)) / 2)
      const inset = roundNative(dotRadius)
      const usableW = Math.max(0, width - 2 * inset),
        usableH = Math.max(0, height - 2 * inset)
      const min = Math.min(...samples.map((p) => p.altitude!)),
        max = Math.max(...samples.map((p) => p.altitude!))
      const step = Math.max(1, number(widget.vertical_step, 50))
      const range = Math.ceil((max - min) / step) * step || step
      const midpoint = (max + min) / 2
      const middleY = Math.trunc(height / 2)
      // WVerticalGraph.getArrowWidth uses integer division before building its path.
      const arrowW = Math.trunc(usableW / 40),
        arrowX = arrowW * 1.5
      const pts = samples.map((p) => ({
        x: Math.trunc(inset + (usableW * (p.seconds - (flight!.elapsed - interval))) / interval),
        y: Math.trunc(middleY - ((p.altitude! - midpoint) * usableH) / range),
      }))
      const deduplicated: typeof pts = []
      for (const p of pts) {
        const previous = deduplicated.at(-1)
        if (
          !previous ||
          Math.abs(p.x - previous.x) >= dotRadius / 2 ||
          Math.abs(p.y - previous.y) >= dotRadius / 2
        )
          deduplicated.push(p)
      }
      content = (
        <g data-series="vertical-altitude">
          {deduplicated.map((p, i) => (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={dotRadius}
              fill={argb(widget.dot_color, '#8080ff')}
            />
          ))}
          <path
            d={`M${arrowW} ${inset + arrowW} L${arrowX} ${inset} L${2 * arrowW} ${inset + arrowW} M${arrowX} ${inset} V${height - inset} M${arrowW} ${height - inset - arrowW} L${arrowX} ${height - inset} L${2 * arrowW} ${height - inset - arrowW}`}
            fill="none"
            stroke={ink}
            strokeWidth={usableW / 150}
          />
          <rect
            x={2 * arrowW}
            y={middleY - height / 6}
            width={(String(range).length * height) / 10}
            height={height / 5}
            fill={background}
          />
          {text(String(range), 2 * arrowW, middleY, height / 6, 'start')}
        </g>
      )
    }
  } else if (name === 'WAltitudeDataGraph') {
    accuracy = 'apk-derived-layout-independent-aggregation'
    const type = typeof widget.type === 'string' ? widget.type : 'GRAPH_THERMAL'
    const bins = nativeAltitudeBins(flight?.history ?? [], type)
    if (flight?.gps && bins.length) {
      let min = bins[0]!.altitude,
        max = bins.at(-1)!.altitude
      if (max - min + 1 < 10) {
        const extension = Math.ceil((10 - (max - min + 1)) / 2)
        min -= extension
        max += extension
      }
      const count = max - min + 1,
        row = height / count
      const extent = Math.max(1, Math.ceil(Math.max(...bins.map((p) => p.value))))
      const pen = Math.max(0.1, (number(widget.line_thickness, 10) / 10) * metric * 0.3)
      const font = Math.max(1, (number(widget.text_size, 20) * metric) / 10)
      const fill = argb(
        type === 'GRAPH_SPEED'
          ? widget.color_speed
          : type === 'GRAPH_WIND'
            ? widget.color_wind
            : widget.color_thermal,
        type === 'GRAPH_SPEED' ? '#bd355080' : type === 'GRAPH_WIND' ? '#a0a02080' : '#0000ff80',
      )
      const y = (altitude: number) => height - (altitude / 100 - min + 0.5) * row
      content = (
        <g data-series="altitude-bins">
          {bins.map((bin) =>
            bin.value > 0 ? (
              <rect
                key={bin.altitude}
                data-altitude-bin={bin.altitude * 100}
                x={0}
                y={height - (bin.altitude - min + 1) * row + 1}
                width={Math.max(0, (width * bin.value) / extent)}
                height={Math.max(0, row - 2)}
                fill={fill}
              />
            ) : null,
          )}
          {finite(frame.altitude) && (
            <line
              x1={0}
              x2={width}
              y1={y(frame.altitude)}
              y2={y(frame.altitude)}
              stroke={ink}
              strokeWidth={pen}
            />
          )}
          {text(String(max * 100), width - metric * 0.3, font + metric * 0.3, font, 'end')}
          {text(String(min * 100), width - metric * 0.3, height - metric * 0.3, font, 'end')}
          {text(
            type === 'GRAPH_THERMAL' ? `${extent} m/s` : `${extent * 3.6} km/h`,
            width - metric * 0.3,
            font * 2 + metric * 0.9,
            font,
            'end',
          )}
        </g>
      )
    }
  } else if (name === 'WSideView') {
    accuracy = 'independent-terrain-model'
    // Native requires a GPS fix plus an asynchronously built terrain bitmap.
    // Never invent a sea-level terrain profile when DEM inputs are absent.
    const terrain =
      flight?.terrain?.filter((p) => finite(p.distance) && finite(p.altitude) && p.distance >= 0) ??
      []
    if (flight?.gps && finite(frame.altitude) && terrain.length >= 2) {
      const range = Math.max(1, number(widget.distance, 15000))
      const inRange = terrain
        .filter((p) => p.distance <= range)
        .sort((a, b) => a.distance - b.distance)
      if (inRange.length >= 2) {
        const task = widget.type === 'SIDE_NAVIG' ? flight.task : null
        const floor = Math.min(frame.altitude, ...inRange.map((p) => p.altitude)) - 100
        const ceiling =
          Math.max(
            frame.altitude,
            ...inRange.map((p) => p.altitude),
            finite(task?.goalAltitude) ? task.goalAltitude : frame.altitude,
          ) + 100
        const x = (d: number) => (width * d) / range
        const y = (a: number) => height * (1 - (a - floor) / (ceiling - floor))
        content = (
          <g data-series="terrain-profile">
            <polygon
              data-series="terrain"
              points={`0,${height} ${inRange.map((p) => `${x(p.distance)},${y(p.altitude)}`).join(' ')} ${x(inRange.at(-1)!.distance)},${height}`}
              fill={light ? '#858585' : '#525252'}
            />
            <polyline
              points={inRange.map((p) => `${x(p.distance)},${y(p.altitude)}`).join(' ')}
              fill="none"
              stroke={ink}
              strokeWidth={metric * 0.15}
            />
            <path
              d={`M0 ${y(frame.altitude)} l${metric * 1.2} ${-metric * 0.5} l${-metric * 0.4} ${metric * 0.5} l${metric * 0.4} ${metric * 0.5} Z`}
              fill={ink}
            />
            {task && task.distance <= range && finite(task.goalAltitude) && (
              <line
                x1={x(task.distance)}
                x2={x(task.distance)}
                y1={y(task.goalAltitude)}
                y2={height}
                stroke={ink}
                strokeDasharray="15 10"
              />
            )}
            {task &&
              task.distance <= range &&
              finite(task.goalAltitude) &&
              finite(task.arrivalHeight) && (
                <line
                  data-series="arrival"
                  x1={0}
                  y1={y(frame.altitude)}
                  x2={x(task.distance)}
                  y2={y(task.goalAltitude + task.arrivalHeight)}
                  stroke={ink}
                  strokeDasharray="8 4"
                />
              )}
          </g>
        )
      }
    }
  }
  return (
    <g pointerEvents="none" data-renderer={name} data-accuracy={accuracy}>
      {content}
    </g>
  )
}
