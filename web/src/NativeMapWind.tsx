import { windEdge } from './native-navigation'
import { nativeGraphicMetric } from './NativeFlightGraphics'
import type { Json, Widget } from './xcfg'

export function NativeMapWind({
  widget,
  wind,
  rotation,
  width,
  height,
  pilotX = width / 2,
  pilotY = height / 2,
  screenWidth,
  screenHeight,
  preferences = {},
}: {
  widget: Widget
  wind: { from: number; speed: number } | null | undefined
  rotation: number
  width: number
  height: number
  pilotX?: number
  pilotY?: number
  screenWidth?: number
  screenHeight?: number
  preferences?: Record<string, Json>
}) {
  if (widget.nav_showWind === false || !wind || !Number.isFinite(wind.from) || !(wind.speed > 0))
    return null
  const metric = nativeGraphicMetric(screenWidth, screenHeight)
  const p = windEdge(width, height, pilotX, pilotY, wind.from - rotation, Math.trunc(2 * metric))
  if (!p) return null
  const light = String(widget._theme).includes('White')
  const foreground = light ? '#505050' : '#c0c0c0'
  const outline = light ? '#fff' : '#000'
  const d = `M${p.x + p.dx} ${p.y + p.dy} L${p.x - p.dx} ${p.y - p.dy} L${p.x - 0.2 * p.dx + 0.5 * p.dy} ${p.y - 0.2 * p.dy - 0.5 * p.dx} M${p.x - p.dx} ${p.y - p.dy} L${p.x - 0.2 * p.dx - 0.5 * p.dy} ${p.y - 0.2 * p.dy + 0.5 * p.dx}`
  const unit = String(preferences['Unit.WindSpeed'] ?? 'km/h')
  const factor =
    ({ 'km/h': 3.6, 'm/s': 1, mph: 2.2369362921, kt: 1.9438444924 } as Record<string, number>)[
      unit
    ] ?? 3.6
  const units =
    ({ 'km/h': 'км/ч', 'm/s': 'м/с', mph: 'mph', kt: 'kt' } as Record<string, string>)[unit] ?? unit
  const text = `${(wind.speed * factor).toFixed(unit === 'm/s' ? 1 : 0).replace('.', ',')} ${units}`
  const fontSize =
    metric * 2.5 * (widget.fontSize === 'LARGE' ? 2 : widget.fontSize === 'MEDIUM' ? 1.5 : 1)
  // Native label collision packing is approximated; keep the speed label inside the widget.
  const labelWidth = Math.min(width, text.length * fontSize * 0.56)
  const labelX = Math.max(labelWidth / 2, Math.min(width - labelWidth / 2, p.x))
  const labelY =
    p.y < height / 2
      ? Math.min(height - fontSize * 0.2, p.y + 2 * metric + fontSize)
      : Math.max(fontSize, p.y - 2 * metric)
  return (
    <g data-overlay="native-wind" pointerEvents="none">
      <path d={d} fill="none" stroke={outline} strokeWidth={metric * 0.7} />
      <path d={d} fill="none" stroke={foreground} strokeWidth={metric * 0.5} />
      <text
        x={labelX}
        y={labelY}
        fontFamily="Roboto"
        fontWeight="bold"
        fontSize={fontSize}
        textAnchor="middle"
        fill={foreground}
        stroke={outline}
        strokeWidth={2}
        paintOrder="stroke fill"
      >
        {text}
      </text>
    </g>
  )
}
