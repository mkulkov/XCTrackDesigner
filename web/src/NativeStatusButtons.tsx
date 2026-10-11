import type { ReactNode } from 'react'
import type { Widget, Json } from './xcfg'
import type { Frame } from './value-layout'
import { nativeFontsReady } from './fonts'

const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
const num = (v: unknown, d: number) => (finite(v) ? v : d)
const flag = (v: unknown, d = true) => (typeof v === 'boolean' ? v : d)
const argb = (v: Json | undefined, d: string) =>
  finite(v)
    ? `#${(v >>> 0).toString(16).padStart(8, '0').slice(2)}${(v >>> 0).toString(16).padStart(8, '0').slice(0, 2)}`
    : d
const object = (v: Json | undefined): Record<string, Json> =>
  v && typeof v === 'object' && !Array.isArray(v) ? v : {}

// APK 91260 exposes buttons as fitted text, not bordered Android controls.
// Local XCValue supplies the existing private-use shortcut glyphs; fallback paths
// are independently drawn geometry, never copies of APK bitmap resources.
export function NativeStatusButtons({
  widget,
  frame,
  width,
  height,
  light,
}: {
  widget: Widget
  frame: Frame
  width: number
  height: number
  light: boolean
}) {
  const name = widget.CLASS.split('.').at(-1)!
  if (
    ![
      'WStatusLine',
      'WCompTaskSummary',
      'WLiveMessage',
      'WLogPeek',
      'WButtonZoom',
      'WButtonVario',
      'WButtonBrightness',
      'WButtonCamera',
      'WButtonNavig',
      'WButtonPhone',
      'WButtonIntentLauncher',
    ].includes(name)
  )
    return null
  const ink = light ? '#000' : '#fff'
  const button = name.startsWith('WButton')
  const theme =
    typeof widget._theme === 'string' && widget._theme
      ? widget._theme
      : light
        ? 'WhiteHCTheme'
        : 'BlackHCTheme'
  const buttonInk = theme === 'WhiteTheme' || theme === 'BlackTheme' ? '#ffffc0' : ink
  const flight = frame.flight
  const size = Math.min(width, height)
  const text = (
    value: string,
    x: number,
    y: number,
    fontSize: number,
    fill = ink,
    anchor: 'start' | 'middle' = 'middle',
    family = 'XCValue, Arial, sans-serif',
  ) => (
    <text
      x={x}
      y={y}
      fontSize={fontSize}
      fill={fill}
      textAnchor={anchor}
      fontFamily={family}
      fontWeight="bold"
      stroke={button && theme === 'WhiteTheme' && fill === buttonInk ? '#000' : undefined}
      strokeWidth={button && theme === 'WhiteTheme' && fill === buttonInk ? 10 : undefined}
      paintOrder="stroke fill"
    >
      {value}
    </text>
  )
  const fitted = (
    values: string[],
    left = 0,
    top = 0,
    right = width,
    bottom = height,
    align: 'start' | 'middle' = 'middle',
    family = 'XCValue, Arial, sans-serif',
  ) => {
    const availableW = Math.max(0, right - left - 6)
    const availableH = Math.max(0, bottom - top - 6)
    const fontSize = Math.max(
      0,
      Math.min(
        availableH / Math.max(1, values.length) / 1.164,
        availableW / Math.max(1, ...values.map((v) => Array.from(v).length * 0.65)),
      ),
    )
    const blockH = fontSize * values.length * 1.164
    return values.map((value, i) => (
      <g key={i}>
        {text(
          value,
          align === 'start' ? left + 3 : (left + right) / 2,
          top + 3 + (availableH - blockH) / 2 + fontSize * (0.93 + i * 1.164),
          fontSize,
          button ? buttonInk : ink,
          align,
          family,
        )}
      </g>
    ))
  }
  const camera = (
    <>
      <path
        d="M3 7 H8 L10 4 H18 L20 7 H25 V23 H3 Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      />
      <circle cx="14" cy="15" r="5" fill="none" stroke="currentColor" strokeWidth="2" />
    </>
  )
  const phone = (
    <path d="M6 3 L11 8 L8 12 Q12 19 18 21 L22 17 L27 22 L24 27 Q9 27 2 10 Z" fill="currentColor" />
  )
  const speaker = (
    <>
      <path d="M3 11 H8 L15 5 V25 L8 19 H3 Z" fill="currentColor" />
      <path d="M19 9 Q26 15 19 21" stroke="currentColor" strokeWidth="2" fill="none" />
    </>
  )
  const navigation = (previous: boolean, disabled: boolean) => (
    <>
      <path d="M3 26 V3 M3 4 H13 L10 10 H3" fill="none" stroke="currentColor" strokeWidth="2" />
      {disabled ? (
        <>
          <circle cx="22" cy="16" r="6" fill="none" stroke="currentColor" strokeWidth="2" />
          <path d="M17 21 L27 11" stroke="currentColor" strokeWidth="2" />
        </>
      ) : (
        <path
          d={previous ? 'M28 16 H15 M20 10 L14 16 L20 22' : 'M14 16 H27 M22 10 L28 16 L22 22'}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        />
      )}
    </>
  )
  const icon = (child: ReactNode, top = 0, bottom = height) => {
    const scale = Math.max(0, Math.min(width - 6, bottom - top - 6)) / 30
    return (
      <g
        color={buttonInk}
        transform={`translate(${(width - 30 * scale) / 2} ${top + (bottom - top - 30 * scale) / 2}) scale(${scale})`}
      >
        {child}
      </g>
    )
  }
  let content: ReactNode
  if (name === 'WStatusLine') {
    type Slot = { node: ReactNode; width: number; error?: boolean }
    const left: Slot[] = [],
      right: Slot[] = []
    const h = Math.max(0, height - 4)
    const iconH = Math.min(h, 72)
    const textual = (value: string, error = false): Slot => ({
      node: text(value, 0, height / 2 + h * 0.34, h, ink, 'start'),
      width: Array.from(value).length * h * 0.58 + (error ? 24 : 10),
      error,
    })
    if (flag(widget.showGps))
      left.push({
        width: iconH + (flight?.gps ? 10 : 24),
        error: !flight?.gps,
        node: (
          <g
            data-status-icon={
              flight?.status === 'replay' ? 'replay' : flight?.gps ? 'gps-ok' : 'gps-nosignal'
            }
            transform={`translate(0 ${(height - iconH) / 2}) scale(${iconH / 30})`}
          >
            {flight?.status === 'replay' ? (
              <path d="M8 3 L27 15 L8 27 Z" fill="#1566bb" />
            ) : (
              <>
                <path
                  d="M6 18 L18 6 M7 10 L12 5 L17 10 L12 15 Z M17 20 L22 15 L27 20 L22 25 Z"
                  fill="#1566bb"
                />
                <path
                  d="M3 17 Q13 17 13 27 M3 21 Q9 21 9 27"
                  fill="none"
                  stroke="#1566bb"
                  strokeWidth="2"
                />
                {!flight?.gps && <path d="M4 4 L26 26" stroke="#f00" strokeWidth="3" />}
              </>
            )}
          </g>
        ),
      })
    // Null means no configured external sensor, not an invented error device.
    if (flag(widget.showSensors) && typeof flight?.sensors === 'boolean')
      left.push({
        width: iconH + (flight.sensors ? 10 : 24),
        error: !flight.sensors,
        node: (
          <g
            data-status-icon="bluetooth"
            transform={`translate(0 ${(height - iconH) / 2}) scale(${iconH / 30})`}
          >
            <ellipse cx="12" cy="15" rx="11" ry="14" fill="#0656aa" />
            <path
              d="M12 3 V27 L21 18 L5 8 M5 22 L21 12 L12 3"
              fill="none"
              stroke="#fff"
              strokeWidth="2"
            />
            {!flight.sensors && text('!', 27, 25, 27, '#f00')}
          </g>
        ),
      })
    // Native LIVE disappears when the feature is disabled; null/false are disabled here.
    if (flag(widget.showLive) && flight?.live)
      left.push(textual(flag(widget.showLiveLabel) ? '✔LIVE' : '✔'))
    if (flag(widget.showTime, false))
      right.push(
        textual(
          typeof frame.widgetValues?.WTime === 'string' ? frame.widgetValues.WTime : '--:--:--',
        ),
      )
    const battery = flight?.batteryPercent
    const known = finite(battery)
    if (flag(widget.showBatteryPercent))
      right.push(
        textual(known ? `${Math.round(Math.max(0, Math.min(100, battery)))}%` : '? %', !known),
      )
    if (flag(widget.showBatteryIcon)) {
      const bars = known ? Math.min(4, Math.floor(Math.max(0, battery) / 20)) : 0
      const bh = Math.min(h, 72),
        bw = bh * 2.15
      right.push({
        width: bw + (known ? 10 : 24),
        error: !known,
        node: (
          <g
            data-status-icon="battery"
            data-battery-bars={bars}
            transform={`translate(0 ${(height - bh) / 2}) scale(${bh / 30})`}
          >
            <rect width="58" height="27" y="1.5" rx="2" fill="#242222" />
            <rect x="58" y="8" width="6" height="14" rx="1" fill="#242222" />
            {Array.from({ length: bars }, (_, i) => (
              <rect key={i} x={5 + i * 12} y="5" width="8" height="20" fill="#8fc83e" />
            ))}
          </g>
        ),
      })
    }
    const total = [...left, ...right].reduce((sum, slot) => sum + slot.width, 0)
    const scale = total > width ? width / total : 1
    let lx = 0,
      rx = width
    const slotNode = (slot: Slot, x: number, key: number) => (
      <g key={key} transform={`translate(${x} 0)`}>
        {slot.error && <rect width={slot.width * scale} height={height} fill="#ffaa33" />}
        <g
          transform={`translate(${(slot.error ? 12 : 5) * scale} ${(height * (1 - scale)) / 2}) scale(${scale})`}
        >
          {slot.node}
        </g>
      </g>
    )
    content = (
      <>
        <rect width={width} height={height} fill={light ? '#e8e8e8' : '#606060'} />
        {left.map((slot, i) => {
          const x = lx
          lx += slot.width * scale
          return slotNode(slot, x, i)
        })}
        {right.map((slot, i) => {
          rx -= slot.width * scale
          return slotNode(slot, rx, i + left.length)
        })}
        <path
          d={`M0 .5 H${width} M0 ${height - 0.5} H${width}`}
          stroke={light ? '#808080' : '#c0c0c0'}
          strokeWidth="1"
        />
      </>
    )
  } else if (name === 'WCompTaskSummary') {
    const task = flight?.task
    const left = widget.X1 === 0 ? -5 : 0
    const top = widget.Y1 === 0 ? -5 : 0
    const right = width + (widget.X2 === 10000 ? 5 : 0)
    const bottom = height + (widget.Y2 === 10000 ? 5 : 0)
    // Native holds an empty background card outside Competition navigation.
    const explicit = frame.widgetValues?.WCompTaskSummary
    const values =
      typeof explicit === 'string'
        ? explicit.split('\n')
        : task
          ? [
              'ГОНКА',
              'ССС открыта --:--',
              'Ограничение таска по времени --:--',
              '',
              ...task.waypoints.map(
                (p, i) =>
                  `${i === task.nextIndex ? '> ' : ''}${p.name} r=${p.radius >= 1000 ? `${(p.radius / 1000).toFixed(1)} км` : `${Math.round(p.radius)} м`}${i === task.nextIndex ? ' <' : ''}`,
              ),
            ]
          : []
    content = (
      <>
        <g opacity={1 - Math.max(0, Math.min(100, num(widget._bg, 0))) / 100}>
          {[0, 1, 2].map((inset) => (
            <rect
              key={inset}
              x={left + inset}
              y={top + inset}
              width={Math.max(0, right - left - inset * 2)}
              height={Math.max(0, bottom - top - inset * 2)}
              fill="none"
              stroke={['#00000013', '#00000026', '#00000050'][inset]}
              strokeWidth="1"
            />
          ))}
          <rect
            x={left + 3}
            y={top + 3}
            width={Math.max(0, right - left - 6)}
            height={Math.max(0, bottom - top - 6)}
            fill={light ? '#fff592' : '#3c3c3c'}
          />
        </g>
        {fitted(values, left + 8, top + 8, right - 8, bottom - 8, 'start')}
      </>
    )
  } else if (name === 'WLogPeek') {
    const value = frame.widgetValues?.WLogPeek
    const filter = typeof widget.filter === 'string' ? widget.filter : ''
    const values = (typeof value === 'string' ? value.split('\n') : [])
      .slice(-Math.max(1, Math.min(50, num(widget.lines_count, 25))))
      .filter((line) => !filter || line.includes(filter))
    if (flag(widget.reverse, false)) values.reverse()
    const fontSize = (Math.max(1, num(widget.text_size, 15)) / 10) * (420 / 25.4)
    const padding = Math.max(0, num(widget.text_padding, 2))
    content = (
      <>
        <rect width={width} height={height} fill={argb(widget.color_bg, '#ffffff00')} />
        {values.map((v, i) => (
          <text
            key={i}
            x={padding}
            y={padding + fontSize * (0.93 + i * 1.164)}
            fontSize={fontSize}
            fontFamily="monospace"
            fill={argb(widget.color_text, '#000')}
          >
            {v}
          </text>
        ))}
      </>
    )
  } else if (name === 'WLiveMessage') {
    const value = frame.widgetValues?.WLiveMessage
    const values = (typeof value === 'string' ? value.split('\n').filter(Boolean) : [])
      .slice(-Math.max(1, Math.min(50, num(widget.line_count, 2))))
      .reverse()
    content = fitted(values, 0, 0, width, height, 'start')
  } else if (name === 'WButtonZoom') {
    content = fitted([widget.type === 'ACTION_ZOOM_OUT' ? '–' : '+'])
  } else if (name === 'WButtonBrightness') {
    content = fitted([widget.type === 'ACTION_MINUS' ? '🔅' : '🔆'])
  } else if (name === 'WButtonCamera') {
    content = nativeFontsReady ? fitted(['\ue4c7']) : icon(camera)
  } else if (name === 'WButtonNavig') {
    const previous = widget.type === 'ACTION_PREV_WAYPOINT'
    const disabled = !flight?.task || (previous && flight.task.nextIndex === 0)
    content = nativeFontsReady
      ? fitted([`\ue4cd${disabled ? '⌀' : previous ? '←' : '→'}`])
      : icon(navigation(previous, disabled))
  } else if (name === 'WButtonVario') {
    const top = flag(widget.showTitle) ? Math.min(height * 0.2, 25) : 0
    const enabled = frame.widgetValues?.WButtonVario === 'on'
    content = (
      <>
        {top > 0 &&
          text('Вариометр', width / 2, top * 0.8, Math.min(top * 0.8, width / 9), '#7f7f7f')}
        {nativeFontsReady
          ? fitted([enabled ? '\ue8a4\ue4c9' : '\ue8a4\ue4c8'], 0, top)
          : icon(
              <>
                {speaker}
                {!enabled && <path d="M1 1 L29 29" stroke="currentColor" strokeWidth="3" />}
              </>,
              top,
            )}
      </>
    )
  } else if (name === 'WButtonPhone') {
    const contact = object(widget.contact)
    const label =
      flag(widget.showContactName) && typeof contact.fullName === 'string' ? contact.fullName : ''
    const glyph =
      widget.callType === 'C_CALL_LOUD'
        ? '\ue4cc'
        : widget.callType === 'C_CALL'
          ? '\ue4cb'
          : '\ue4ca'
    content = nativeFontsReady ? (
      fitted([`${glyph}${label ? ` ${label}` : ''}`])
    ) : (
      <>
        {icon(phone, 0, label ? height * 0.72 : height)}
        {label &&
          text(
            label,
            width / 2,
            height * 0.93,
            Math.min(size * 0.2, width / Math.max(1, label.length * 0.65)),
          )}
      </>
    )
  } else {
    const label = typeof widget.name === 'string' ? widget.name : 'test'
    content = fitted(['🚀', ...label.split('\n')])
  }
  return (
    <g pointerEvents="none" data-renderer={name} data-accuracy="apk-layout-independent-icons">
      {content}
    </g>
  )
}
