import { nativeGraphicMetric } from './NativeFlightGraphics'
import type { Widget } from './xcfg'

// theme/a.Q: 2.5 mm heading marker, rear vertices at +/-140 degrees.
export function NativeMapPilot({
  widget,
  x,
  y,
  heading,
  light,
  screenWidth,
  screenHeight,
}: {
  widget: Widget
  x: number
  y: number
  heading: number
  light: boolean
  screenWidth?: number
  screenHeight?: number
}) {
  const metric = nativeGraphicMetric(screenWidth, screenHeight)
  const coefficient =
    typeof widget.mapWidget_heading_arrow_sizecoef === 'number'
      ? widget.mapWidget_heading_arrow_sizecoef / 100
      : 1
  const radius = 2.5 * metric * coefficient
  const rearX = Math.sin((140 * Math.PI) / 180) * radius * 0.9
  const rearY = -Math.cos((140 * Math.PI) / 180) * radius * 0.9
  const color = light ? '#000' : '#fff'
  return (
    <g data-overlay="native-pilot" transform={`translate(${x} ${y}) rotate(${heading})`}>
      <path
        d={`M0 ${-radius} L${-rearX} ${rearY} L0 ${radius * 0.3} L${rearX} ${rearY} Z`}
        fill={light ? '#ffffff80' : '#00000080'}
        stroke={color}
        strokeWidth={metric * 0.2 * coefficient}
      />
      <circle r={metric * 0.35 * coefficient} fill={color} />
      <circle r={metric * 0.3 * coefficient} fill="#ff9900" />
    </g>
  )
}
