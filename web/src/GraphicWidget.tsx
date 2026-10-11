import type { ReactNode } from 'react'
import type { Widget, Json } from './xcfg'
import type { Frame } from './value-layout'
import type { FlightState } from './flight-engine'
import { libraryWidget } from './widget-library'
import { thermalColor, thermalZoomScale, mercatorY } from './thermal-rendering'
import { NativeFlightGraphics } from './NativeFlightGraphics'
import { trackDirection } from './online-map'
import { NativeMapDecorations } from './NativeMapDecorations'
import { NativeMapPilot } from './NativeMapPilot'
import { NativeMapWind } from './NativeMapWind'
import { NativeStatusButtons } from './NativeStatusButtons'
import { mapTrackPaint } from './widget-paint'

const finite = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value)
const normalize = (degrees: number) => ((degrees % 360) + 360) % 360
const number = (value: Json | undefined, fallback: number) => (finite(value) ? value : fallback)
const flag = (value: Json | undefined, fallback = true) =>
  typeof value === 'boolean' ? value : fallback
const object = (value: Json | undefined): Record<string, Json> =>
  value && typeof value === 'object' && !Array.isArray(value) ? value : {}
const colorOf = (value: Json | undefined, fallback: string) =>
  finite(value)
    ? `#${(value >>> 0).toString(16).padStart(8, '0').slice(2)}${(value >>> 0).toString(16).padStart(8, '0').slice(0, 2)}`
    : fallback
const distanceText = (value: number) =>
  value >= 1000 ? `${(value / 1000).toFixed(1)} км` : `${Math.round(value)} м`
const duration = (value: number) =>
  `${Math.floor(Math.max(0, value) / 3600)}:${Math.floor((Math.max(0, value) / 60) % 60)
    .toString()
    .padStart(2, '0')}:${Math.floor(Math.max(0, value) % 60)
    .toString()
    .padStart(2, '0')}`
// Independent geometry driven by explicit simulation inputs. This is not an Android painter clone.
export function GraphicWidget({
  widget,
  frame,
  width,
  height,
  light,
  screenWidth,
  screenHeight,
  preferences,
}: {
  widget: Widget
  frame: Frame
  width: number
  height: number
  light: boolean
  screenWidth?: number
  screenHeight?: number
  preferences?: Record<string, Json>
}) {
  const entry = libraryWidget(widget.CLASS)
  if (!entry || entry.family === 'free-text') return null
  const native =
    NativeFlightGraphics({ widget, frame, width, height, light, screenWidth, screenHeight }) ??
    NativeStatusButtons({ widget, frame, width, height, light })
  if (native !== null) return native
  const name = entry.name
  const color = light ? '#222' : '#eee'
  const faint = light ? '#6a737c' : '#a6b4be'
  const size = Math.max(1, Math.min(width, height))
  const stroke = Math.max(1, size / 100)
  const flight = (frame as Frame & { flight?: FlightState }).flight
  const title =
    typeof widget.titletext === 'string' && widget.titletext ? widget.titletext : entry.title
  const label = (
    text: string,
    x = width / 2,
    y = height / 2,
    fontSize = size / 11,
    fill = color,
  ) => (
    <text
      x={x}
      y={y}
      textAnchor="middle"
      fill={fill}
      fontSize={Math.max(1, Math.min(fontSize, width / Math.max(1, text.length * 0.55)))}
    >
      {text}
    </text>
  )
  const lines = (
    texts: string[],
    top = height * 0.25,
    bottom = height * 0.85,
    fill = color,
    fontSize = size / 11,
  ) =>
    texts.map((text, i) => (
      <g key={`${i}-${text}`}>
        {label(
          text,
          width / 2,
          top + ((i + 0.5) * (bottom - top)) / Math.max(1, texts.length),
          Math.min(fontSize, ((bottom - top) / Math.max(1, texts.length)) * 0.7),
          fill,
        )}
      </g>
    ))
  const missing = (reason: string) => (
    <>
      {label(title, width / 2, height * 0.35)}
      {label(reason, width / 2, height * 0.6, size / 14, faint)}
    </>
  )
  const arrow = (
    angle: number,
    fill: string,
    radius = size * 0.27,
    cx = width / 2,
    cy = height / 2,
  ) => (
    <path
      transform={`translate(${cx} ${cy}) rotate(${normalize(angle)})`}
      d={`M0 ${-radius} L${radius * 0.16} ${radius * 0.2} L0 0 L${-radius * 0.16} ${radius * 0.2} Z`}
      fill={fill}
      stroke={fill}
      strokeWidth={stroke}
    />
  )
  let content: ReactNode

  if (entry.family === 'button') {
    const action = typeof widget.type === 'string' ? widget.type : ''
    const contact = object(widget.contact)
    const buttonTitle =
      name === 'WButtonIntentLauncher' && typeof widget.name === 'string'
        ? widget.name
        : name === 'WButtonPhone' &&
            flag(widget.showContactName) &&
            typeof contact.fullName === 'string' &&
            contact.fullName
          ? contact.fullName
          : title
    const icon =
      name === 'WButtonZoom'
        ? action.includes('OUT')
          ? '−'
          : '+'
        : name === 'WButtonBrightness'
          ? action.includes('MINUS')
            ? '☀ −'
            : '☀ +'
          : name === 'WButtonVario'
            ? '♪'
            : name === 'WButtonPhone'
              ? '☎'
              : name === 'WButtonCamera'
                ? '▣'
                : name === 'WButtonNavig'
                  ? action.includes('PREV')
                    ? '‹'
                    : '›'
                  : '▶'
    content = (
      <>
        <rect
          x={stroke * 2}
          y={stroke * 2}
          width={Math.max(0, width - stroke * 4)}
          height={Math.max(0, height - stroke * 4)}
          rx={size / 8}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
        />
        {label(icon, width / 2, height * 0.52, size * 0.4)}
        {(name !== 'WButtonVario' || flag(widget.showTitle)) &&
          label(buttonTitle, width / 2, height * 0.77, size / 10)}
        {label(
          flag(widget.longClick, false) ? 'Долгое нажатие · Android' : 'Действие Android',
          width / 2,
          height * 0.93,
          size / 18,
          faint,
        )}
      </>
    )
  } else if (name === 'WCompass') {
    const heading = flight?.heading
    const bearing = flight?.task?.bearing
    const rotation =
      widget.rotation === 'NORTH' || widget.rotation === 'NORTH_AT_TOP'
        ? 0
        : widget.rotation === 'BEARING' && finite(bearing)
          ? bearing
          : finite(heading)
            ? heading
            : 0
    content = (
      <>
        {flag(widget.showBackground) && (
          <circle
            cx={width / 2}
            cy={height / 2}
            r={size * 0.38}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
          />
        )}
        {['N', 'E', 'S', 'W'].map((text, i) => {
          const angle = ((i * 90 - rotation) * Math.PI) / 180
          return (
            <g key={text}>
              {label(
                text,
                width / 2 + Math.sin(angle) * size * 0.33,
                height / 2 - Math.cos(angle) * size * 0.33 + size / 30,
                size / 12,
              )}
            </g>
          )
        })}
        {finite(heading)
          ? arrow(heading - rotation, color)
          : label('--', width / 2, height / 2, size / 6)}
        {finite(bearing) && arrow(bearing - rotation, '#e29928', size * 0.23)}
        {flag(widget.showWind, false) &&
          flight?.wind &&
          arrow(flight.wind.from - rotation + 180, '#38a7d4', size * 0.17)}
        {flag(widget.showHeading, false) &&
          label(
            finite(heading) ? `${Math.round(normalize(heading))}°` : 'Курс --',
            width / 2,
            height * 0.95,
            size / 12,
          )}
        {flag(widget.showBearing, false) &&
          label(
            finite(bearing) ? `Цель ${Math.round(normalize(bearing))}°` : 'Цель --',
            width / 2,
            height * 0.08,
            size / 14,
          )}
      </>
    )
  } else if (name === 'WVarioColumn') {
    const avg = number(widget.avg, 2000) / 1000
    const history =
      flight?.history.filter((p) => finite(p.vertical) && p.seconds >= flight.elapsed - avg) ?? []
    const value = history.length
      ? history.reduce((sum, p) => sum + (p.vertical ?? 0), 0) / history.length
      : frame.vertical
    const half = height * 0.38
    const fillHeight = finite(value) ? (Math.min(5, Math.abs(value)) / 5) * half : 0
    content = (
      <>
        <rect
          x={width * 0.35}
          y={height * 0.1}
          width={width * 0.3}
          height={half * 2}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
        />
        <rect
          x={width * 0.35}
          y={finite(value) && value > 0 ? height * 0.48 - fillHeight : height * 0.48}
          width={width * 0.3}
          height={fillHeight}
          fill={finite(value) && value > 0 ? '#37ad53' : '#d35e5e'}
        />
        {[-5, 0, 5].map((tick) => (
          <g key={tick}>
            <line
              x1={width * 0.25}
              x2={width * 0.7}
              y1={height * 0.48 - (tick / 5) * half}
              y2={height * 0.48 - (tick / 5) * half}
              stroke={color}
            />
            {label(
              String(tick),
              width * 0.15,
              height * 0.48 - (tick / 5) * half + size / 40,
              size / 12,
            )}
          </g>
        ))}
        {label(
          finite(value) ? `${value.toFixed(1)} м/с` : '-- м/с',
          width / 2,
          height * 0.98,
          size / 10,
        )}
      </>
    )
  } else if (name === 'WVerticalGraph' || name === 'WAltitudeDataGraph') {
    const vertical = name === 'WVerticalGraph'
    const speed = !vertical && widget.type === 'GRAPH_SPEED'
    const wind = !vertical && widget.type === 'GRAPH_WIND'
    const interval = Math.max(1, number(widget.interval, 60000) / 1000)
    const sampleValue = (p: FlightState['history'][number]) =>
      vertical ? p.vertical : speed ? p.speed : wind ? p.windSpeed : p.altitude
    const samples =
      flight?.history.filter(
        (p) => p.seconds >= flight.elapsed - interval && finite(sampleValue(p)),
      ) ?? []
    if (samples.length < 2) content = missing(wind ? 'Нет истории ветра' : 'Нет ряда данных')
    else {
      const values = samples.map((p) => sampleValue(p) as number)
      let min = Math.min(...values),
        max = Math.max(...values)
      if (vertical) {
        min = Math.min(-1, min)
        max = Math.max(1, max)
      }
      if (max === min) {
        min -= 1
        max += 1
      }
      const first = samples[0]!.seconds,
        last = samples.at(-1)!.seconds
      const points = samples.map((p, i) => [
        width * (0.12 + (0.78 * (p.seconds - first)) / Math.max(1, last - first)),
        height * (0.82 - (0.65 * (values[i]! - min)) / (max - min)),
      ])
      const selectedColor = colorOf(
        vertical
          ? widget.dot_color
          : widget.type === 'GRAPH_WIND'
            ? widget.color_wind
            : widget.color_thermal,
        '#37ad53',
      )
      content = (
        <>
          <path
            d={`M${width * 0.12} ${height * 0.15} V${height * 0.82} H${width * 0.93}`}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
          />
          {vertical && (
            <line
              x1={width * 0.12}
              x2={width * 0.93}
              y1={height * (0.82 - (0.65 * (0 - min)) / (max - min))}
              y2={height * (0.82 - (0.65 * (0 - min)) / (max - min))}
              stroke={faint}
              strokeDasharray="4 4"
            />
          )}
          <polyline
            data-series={vertical ? 'vertical' : speed ? 'speed' : wind ? 'wind' : 'altitude'}
            points={points.map((p) => p.join(',')).join(' ')}
            fill="none"
            stroke={selectedColor}
            strokeWidth={Math.max(1, number(widget.line_thickness, 10) / 5)}
          />
          {vertical &&
            points.map(([x, y], i) => (
              <circle
                key={i}
                cx={x}
                cy={y}
                r={Math.max(1, Math.min(size / 15, number(widget.dot_size, 15) / 5))}
                fill={selectedColor}
              />
            ))}
          {label(
            `${max.toFixed(vertical || speed || wind ? 1 : 0)} ${vertical || speed || wind ? 'м/с' : 'м'}`,
            width / 2,
            height * 0.08,
            size / 13,
          )}
          {label(
            `${min.toFixed(vertical ? 1 : 0)} · ${Math.round(last - first)} с`,
            width / 2,
            height * 0.97,
            size / 13,
          )}
        </>
      )
    }
  } else if (name === 'WThermalAssistant' || name === 'WVTM' || entry.family === 'map') {
    const samples =
      flight?.history.filter(
        (p) =>
          finite(p.lat) &&
          finite(p.lon) &&
          (name !== 'WThermalAssistant' ||
            p.seconds >= flight.elapsed - number(widget.interval, 300)),
      ) ?? []
    if (!flight?.position) content = null
    else {
      const position = flight.position
      const rotationOption = object(widget.rotation).value ?? widget.rotation
      const rotation =
        rotationOption === 'HEADING_AT_TOP' || rotationOption === 'HEADING'
          ? (flight.heading ?? 0)
          : rotationOption === 'BEARING_AT_TOP'
            ? (flight.task?.bearing ?? 0)
            : rotationOption === 'WIND_AT_TOP'
              ? (flight.wind?.from ?? 0)
              : rotationOption === 'TRAVEL_DIRECTION_AT_TOP'
                ? (trackDirection(flight.track) ?? flight.heading ?? 0)
                : rotationOption === 'NAVIGATION_AT_TOP'
                  ? (flight.task?.bearing ?? 0)
                  : 0
      const theta = (rotation * Math.PI) / 180
      const offsets = samples.map((p) => ({
        x: (p.lon - position.lon) * 111320 * Math.cos((position.lat * Math.PI) / 180),
        y: -(p.lat - position.lat) * 111320,
        vertical: p.vertical,
      }))
      const observedRadius = Math.max(30, ...offsets.map((p) => Math.hypot(p.x, p.y)))
      const scale = object(widget.mapScale ?? widget.mapWidget_scale)
      // Native scale enums are not a metre conversion; manual values control relative viewport span only.
      const span = flag(scale.auto, true)
        ? observedRadius * 1.15
        : Math.max(30, 300 * 2 ** ((34 - number(scale.value, 34)) / 4))
      const project = (p: { x: number; y: number }) => [
        width / 2 + ((p.x * Math.cos(theta) + p.y * Math.sin(theta)) / span) * size * 0.38,
        height / 2 + ((-p.x * Math.sin(theta) + p.y * Math.cos(theta)) / span) * size * 0.38,
      ]
      const nativeScale = thermalZoomScale(number(scale.value, 34))
      const points =
        name === 'WThermalAssistant' && !flag(scale.auto, true)
          ? samples.map((p) => {
              const dx = (((((p.lon - position.lon) / 360 + 0.5) % 1) + 1) % 1) - 0.5
              const dy = mercatorY(p.lat) - mercatorY(position.lat)
              return [
                width / 2 + nativeScale * (dx * Math.cos(theta) + dy * Math.sin(theta)),
                height / 2 + nativeScale * (-dx * Math.sin(theta) + dy * Math.cos(theta)),
              ]
            })
          : offsets.map(project)
      content = (
        <>
          <svg x={0} y={0} width={width} height={height} overflow="hidden">
            {flag(widget.drawCircle, false) && (
              <circle
                cx={width / 2}
                cy={height / 2}
                r={size * 0.25}
                fill="none"
                stroke={faint}
                strokeWidth={stroke}
                strokeDasharray="5 5"
              />
            )}
            <g data-series="thermal-track">
              {points.slice(1).map(([x, y], i) => {
                const vario = offsets[i + 1]!.vertical ?? 0
                const age = Math.max(0, flight.elapsed - samples[i + 1]!.seconds)
                const paint = thermalColor(
                  vario,
                  1 - age / Math.max(1, number(widget.interval, 300)),
                )
                const factor = vario > 5 ? 3 : vario > 1 ? 1 + (vario - 1) / 2 : 1
                return (
                  <line
                    key={i}
                    x1={points[i]![0]}
                    y1={points[i]![1]}
                    x2={x}
                    y2={y}
                    stroke={
                      name === 'WThermalAssistant' || name === 'WVTM'
                        ? paint.color
                        : mapTrackPaint(widget, width, height).color
                    }
                    strokeOpacity={
                      name === 'WThermalAssistant' || name === 'WVTM' ? paint.alpha : 1
                    }
                    strokeWidth={
                      name === 'WThermalAssistant'
                        ? (5 * factor * number(widget.line_thickness, 10)) / 10
                        : name === 'WVTM'
                          ? Math.max(1, number(widget.line_thickness, 10) / 5)
                          : mapTrackPaint(widget, width, height).width
                    }
                  />
                )
              })}
            </g>
            {finite(flight.heading) && (
              <g
                transform={`translate(${width / 2} ${height / 2}) rotate(${flight.heading - rotation})`}
              >
                {flag(widget.mapWidget_drawBearing) && (
                  <line
                    x1={0}
                    y1={0}
                    x2={0}
                    y2={-Math.hypot(width, height)}
                    stroke={color}
                    strokeWidth={number(widget.line_thickness, 10) / 10}
                  />
                )}
                <NativeMapPilot
                  widget={widget}
                  x={0}
                  y={0}
                  heading={0}
                  light={light}
                  screenWidth={screenWidth}
                  screenHeight={screenHeight}
                />
              </g>
            )}
            <NativeMapWind
              widget={widget}
              wind={flight.wind}
              rotation={rotation}
              width={width}
              height={height}
              screenWidth={screenWidth}
              screenHeight={screenHeight}
              preferences={preferences}
            />
          </svg>
          <NativeMapDecorations
            widget={widget}
            width={width}
            height={height}
            rotation={-rotation}
            zoom={number(scale.value, 34)}
            latitude={position.lat}
            screenWidth={screenWidth}
            screenHeight={screenHeight}
          />
        </>
      )
    }
  } else if (name === 'WSideView') {
    const task = flight?.task
    const altitude = frame.altitude
    const terrain = flight?.terrain?.filter((p) => finite(p.distance) && finite(p.altitude)) ?? []
    const range = Math.max(1, number(widget.distance, 15000))
    if (!finite(altitude)) content = missing('Нет высоты')
    else {
      const goalAltitude = task?.goalAltitude
      const arrival = task?.arrivalHeight
      const values = [
        altitude,
        ...terrain.map((p) => p.altitude),
        ...(finite(goalAltitude) ? [goalAltitude] : []),
        ...(finite(arrival) && finite(goalAltitude) ? [goalAltitude + arrival] : []),
      ]
      const min = Math.min(...values) - 100,
        max = Math.max(...values) + 100
      const y = (value: number) => height * (0.85 - (0.65 * (value - min)) / (max - min))
      const x = (distance: number) =>
        width * (0.1 + (0.8 * Math.min(range, Math.max(0, distance))) / range)
      content = (
        <>
          <path
            d={`M${width * 0.1} ${height * 0.15} V${height * 0.85} H${width * 0.9}`}
            fill="none"
            stroke={color}
          />
          {terrain.length > 1 ? (
            <polygon
              data-series="terrain"
              points={`${x(terrain[0]!.distance)},${height * 0.85} ${terrain.map((p) => `${x(p.distance)},${y(p.altitude)}`).join(' ')} ${x(terrain.at(-1)!.distance)},${height * 0.85}`}
              fill={light ? '#aab895' : '#526c48'}
            />
          ) : (
            label('Нет рельефа', width / 2, height * 0.93, size / 15, faint)
          )}
          <circle cx={x(0)} cy={y(altitude)} r={size / 35} fill={color} />
          {task && finite(goalAltitude) && (
            <>
              <line
                x1={x(task.distance)}
                x2={x(task.distance)}
                y1={y(goalAltitude)}
                y2={height * 0.85}
                stroke="#e29928"
              />
              <circle cx={x(task.distance)} cy={y(goalAltitude)} r={size / 40} fill="#e29928" />
              {finite(arrival) && (
                <line
                  data-series="arrival"
                  x1={x(0)}
                  y1={y(altitude)}
                  x2={x(task.distance)}
                  y2={y(goalAltitude + arrival)}
                  stroke="#38a7d4"
                  strokeWidth={stroke * 2}
                />
              )}
            </>
          )}
          {label(
            `${Math.round(altitude)} м · ${distanceText(range)}`,
            width / 2,
            height * 0.08,
            size / 13,
          )}
          {!task && label('Нет задачи', width / 2, height * 0.3, size / 14, faint)}
        </>
      )
    }
  } else if (name === 'WStatusLine') {
    const parts: string[] = []
    if (flag(widget.showGps)) parts.push(flight ? (flight.gps ? 'GPS ✓' : 'GPS --') : 'GPS --')
    if (flag(widget.showSensors))
      parts.push(
        flight?.sensors === undefined || flight.sensors === null
          ? 'Датчики --'
          : flight.sensors
            ? 'Датчики ✓'
            : 'Датчики ×',
      )
    if (flag(widget.showLive))
      parts.push(`${flag(widget.showLiveLabel) ? 'Live ' : ''}${flight?.live ? '✓' : '--'}`)
    if (flag(widget.showBatteryIcon) || flag(widget.showBatteryPercent)) {
      const percent = finite(flight?.batteryPercent)
        ? `${Math.round(Math.max(0, Math.min(100, flight.batteryPercent)))}%`
        : '--'
      parts.push(
        `${flag(widget.showBatteryIcon) ? 'Батарея ' : ''}${flag(widget.showBatteryPercent) ? percent : finite(flight?.batteryPercent) ? '✓' : '--'}`,
      )
    }
    if (flag(widget.showTime, false))
      parts.push(
        typeof frame.widgetValues?.WTime === 'string'
          ? frame.widgetValues.WTime
          : flight
            ? duration(flight.elapsed)
            : '--:--:--',
      )
    content =
      width > height * 2
        ? parts.map((part, i) => (
            <g key={i}>
              {label(
                part,
                (width * (i + 0.5)) / Math.max(1, parts.length),
                height * 0.6,
                Math.min(
                  height * 0.45,
                  width / Math.max(1, parts.length) / Math.max(1, part.length * 0.6),
                ),
              )}
            </g>
          ))
        : lines(parts, height * 0.08, height * 0.92)
  } else if (name === 'WCompTaskSummary') {
    const task = flight?.task
    content = !task ? (
      missing('Нет задачи')
    ) : (
      <>
        {label(title, width / 2, height * 0.12, size / 11)}
        {lines(
          [
            `Пункт ${task.nextIndex + 1}: ${task.waypoints[task.nextIndex]?.name ?? '--'}`,
            `До цели ${distanceText(task.distance)}`,
            `Азимут ${finite(task.bearing) ? `${Math.round(task.bearing)}°` : '--'}`,
            `Прибытие ${finite(task.arrivalSeconds) ? duration(task.arrivalSeconds) : '--'}`,
            `Качество ${finite(task.requiredGlide) ? task.requiredGlide.toFixed(1) : '--'}`,
            `Запас высоты ${finite(task.arrivalHeight) ? `${Math.round(task.arrivalHeight)} м` : '--'}`,
          ],
          height * 0.2,
          height * 0.95,
        )}
      </>
    )
  } else if (name === 'WAirspaceProximity') {
    const zones =
      flight?.airspaces
        ?.filter(
          (z) =>
            finite(z.distance) &&
            z.distance <= number(widget.maxDistance, 5000) &&
            (flag(widget._shownearinside) || !z.inside),
        )
        .sort((a, b) => a.distance - b.distance) ?? []
    const visible = zones.slice(0, 2)
    const split = object(widget._splitdirection).value ?? widget._splitdirection
    const sideBySide = split === 'VERTICAL' || (split !== 'HORIZONTAL' && width > height)
    const panelWidth = sideBySide ? width / Math.max(1, visible.length) : width
    const panelHeight = sideBySide ? height : height / Math.max(1, visible.length)
    content = visible.map((zone, i) => {
      const texts = [
        zone.name,
        ...(flag(widget._showoriginalheightline)
          ? [
              `${finite(zone.floor) ? zone.floor : '—'} – ${finite(zone.ceiling) ? zone.ceiling : '—'} м`,
            ]
          : []),
        ...(flag(widget._showrecomputedheightline, false)
          ? [
              `${finite(zone.floor) && finite(frame.altitude) ? Math.round(zone.floor - frame.altitude) : '—'} – ${finite(zone.ceiling) && finite(frame.altitude) ? Math.round(zone.ceiling - frame.altitude) : '—'} м`,
            ]
          : []),
        zone.inside ? '↤ 0 м' : `⇥ ${distanceText(zone.distance)}`,
      ]
      return (
        <g
          key={i}
          data-airspace-panel={i}
          transform={`translate(${sideBySide ? i * panelWidth : 0} ${sideBySide ? 0 : i * panelHeight})`}
        >
          {texts.map((text, j) => (
            <text
              key={j}
              x={panelWidth / 2}
              y={((j + 0.75) * panelHeight) / texts.length}
              textAnchor="middle"
              fill={color}
              fontSize={Math.max(
                1,
                Math.min(
                  (panelHeight / texts.length) * 0.8,
                  panelWidth / Math.max(1, text.length * 0.6),
                ),
              )}
            >
              {text}
            </text>
          ))}
          {i > 0 && (
            <line
              x1={0}
              y1={0}
              x2={sideBySide ? 0 : panelWidth}
              y2={sideBySide ? panelHeight : 0}
              stroke="#ff3232"
              strokeWidth={4}
            />
          )}
        </g>
      )
    })
  } else if (name === 'WLiveMessage' || name === 'WLogPeek') {
    const value = frame.widgetValues?.[name]
    const text = typeof value === 'string' ? value : ''
    const limit = Math.max(
      1,
      Math.min(
        50,
        Math.floor(
          number(widget.line_count ?? widget.lines_count, name === 'WLiveMessage' ? 2 : 25),
        ),
      ),
    )
    const filter = typeof widget.filter === 'string' ? widget.filter : ''
    const messages = text.split('\n').filter((line) => line && (!filter || line.includes(filter)))
    if (flag(widget.reverse, false)) messages.reverse()
    content = messages.length ? (
      <>
        {name === 'WLogPeek' && (
          <rect width={width} height={height} fill={colorOf(widget.color_bg, 'transparent')} />
        )}
        {lines(
          messages.slice(0, limit),
          height * 0.05,
          height * 0.95,
          name === 'WLogPeek' ? colorOf(widget.color_text, color) : color,
          name === 'WLogPeek' ? Math.max(1, number(widget.text_size, 15)) : size / 11,
        )}
      </>
    ) : (
      missing(name === 'WLiveMessage' ? 'Нет сообщений' : 'Нет записей журнала')
    )
  } else if (entry.family === 'webview') {
    content = (
      <>
        {missing('Веб-содержимое отключено')}
        {typeof widget.url === 'string' &&
          label(widget.url, width / 2, height * 0.82, size / 18, faint)}
      </>
    )
  } else if (entry.debugOnly) {
    const details =
      name === 'WDebugFont'
        ? ['Aa Бб 0123456789', 'SVG · independent font']
        : name === 'WDebugDetectedActivity'
          ? [`Режим: ${flight?.status ?? 'нет данных'}`]
          : name === 'WDebugFPS'
            ? ['FPS --', 'Статический SVG']
            : name === 'WDebugSystemInfo'
              ? [`Viewport ${Math.round(width)} × ${Math.round(height)}`, 'Web · React · SVG']
              : name === 'WDebugActivelook'
                ? ['ActiveLook не подключён']
                : [
                    `GPS: ${flight?.gps ? 'да' : 'нет'}`,
                    `История: ${flight?.history.length ?? 0}`,
                    `Курс: ${finite(flight?.heading) ? flight.heading.toFixed(1) : '--'}`,
                  ]
    content = (
      <>
        {label(title, width / 2, height * 0.12)}
        {lines(details)}
      </>
    )
  } else content = missing('Нет показаний')
  return (
    <g
      pointerEvents="none"
      data-renderer={name}
      data-accuracy="independent"
      aria-label={`${title}: независимый предпросмотр`}
    >
      {content}
    </g>
  )
}
