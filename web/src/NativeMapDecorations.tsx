import { nativeGraphicMetric } from './NativeFlightGraphics'
import { nativeMapScale } from './native-navigation'
import type { Widget } from './xcfg'

export function NativeMapDecorations({
  widget,
  width,
  height,
  rotation,
  zoom,
  latitude,
  screenWidth = 1080,
  screenHeight = 2400,
}: {
  widget: Widget
  width: number
  height: number
  rotation: number
  zoom?: number
  latitude?: number
  screenWidth?: number
  screenHeight?: number
}) {
  const metric = nativeGraphicMetric(screenWidth, screenHeight)
  const color = String(widget._theme).includes('White') ? '#505050' : '#c0c0c0'
  const setting = widget.rotation
  const north =
    setting &&
    typeof setting === 'object' &&
    !Array.isArray(setting) &&
    setting.showCompass === true
  const radius = Math.trunc(2.4 * metric)
  const margin = Math.trunc(1.2 * metric)
  const scale =
    zoom !== undefined &&
    latitude !== undefined &&
    (widget.drawScale ?? widget.mapWidget_drawScale) !== false
      ? nativeMapScale(zoom, latitude, Math.min(screenWidth, screenHeight))
      : null
  const left = Math.trunc(2.2 * metric)
  const bottom = height - margin
  const fontSize = Math.trunc(4.2 * metric) * 0.85
  const text = scale
    ? scale.distance >= 1000
      ? `${scale.distance / 1000}км`
      : `${scale.distance}м`
    : ''
  return (
    <g data-overlay="native-map-decorations" pointerEvents="none">
      {north && (
        <g
          transform={`translate(${width - margin - radius} ${height - margin - radius}) rotate(${rotation})`}
        >
          <circle r={radius} fill="none" stroke={color} strokeWidth={2} />
          <path d={`M0 ${-0.8 * radius} L${0.35 * radius} 0 L${-0.35 * radius} 0 Z`} fill={color} />
          <path
            d={`M0 ${0.8 * radius} L${0.35 * radius} 0 L0 ${-0.8 * radius} L${-0.35 * radius} 0 Z`}
            fill={color}
            fillOpacity={64 / 255}
            stroke={color}
            strokeWidth={1}
          />
        </g>
      )}
      {scale && (
        <g data-overlay="native-scale">
          <path
            d={`M${left} ${bottom - Math.trunc(4.2 * metric) / 3} V${bottom} H${left + scale.pixels} V${bottom - Math.trunc(4.2 * metric) / 3}`}
            fill="none"
            stroke={color}
            strokeWidth={3}
            strokeLinecap="square"
          />
          <text
            x={left + scale.pixels / 2}
            y={bottom - 18}
            textAnchor="middle"
            fontFamily="Roboto"
            fontWeight="bold"
            fontSize={fontSize}
            fill={color}
          >
            {text}
          </text>
        </g>
      )}
    </g>
  )
}
