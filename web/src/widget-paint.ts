import type { Json, Widget } from './xcfg'
import type { FlightState } from './flight-engine'
import { trackDirection } from './online-map'

export function widgetColor(value: Json | undefined, fallback: string) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback
  const hex = (value >>> 0).toString(16).padStart(8, '0')
  return `#${hex.slice(2)}${hex.slice(0, 2)}`
}

export function mapTrackPaint(widget: Widget | undefined, width: number, height: number) {
  const thickness = widget?.line_thickness
  return {
    color: widgetColor(widget?.tracklog_color, '#ff962dff'),
    width: Math.max(
      0.1,
      (Math.max(width, height) / 250) *
        (typeof thickness === 'number' && Number.isFinite(thickness)
          ? Math.max(0, thickness) / 10
          : 1),
    ),
  }
}

export function widgetMapRotation(widget: Widget | undefined, flight: FlightState | undefined) {
  const raw = widget?.rotation
  const mode = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw.value : raw
  return -(mode === 'HEADING_AT_TOP' || mode === 'HEADING'
    ? (flight?.heading ?? 0)
    : mode === 'WIND_AT_TOP'
      ? (flight?.wind?.from ?? 0)
      : mode === 'TRAVEL_DIRECTION_AT_TOP'
        ? (trackDirection(flight?.track ?? []) ?? flight?.heading ?? 0)
        : mode === 'BEARING_AT_TOP' || mode === 'NAVIGATION_AT_TOP'
          ? (flight?.task?.bearing ?? 0)
          : 0)
}
