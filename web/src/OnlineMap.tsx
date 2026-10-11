import { useEffect, useRef, useState } from 'react'
import type { Dispatch, PointerEvent, SetStateAction } from 'react'
import {
  airspaceAltitudeState,
  mapPoint,
  mapRotation,
  panMap,
  polygonPath,
  tileUrl,
  trackDirection,
  visibleTiles,
} from './online-map'
import type { AirspacePolygon, MapSettings } from './online-map'
import { NativeMapDecorations } from './NativeMapDecorations'
import { NativeMapPilot } from './NativeMapPilot'
import { NativeMapWind } from './NativeMapWind'
import type { Widget, Json } from './xcfg'
import type { Frame } from './value-layout'
import { mapTrackPaint, widgetMapRotation } from './widget-paint'
import { bearingBetween } from './flight-engine'

function ThermalTile({
  url,
  tile,
  failed,
}: {
  url: string
  tile: { left: number; top: number; size: number }
  failed: Dispatch<SetStateAction<string[]>>
}) {
  const [image, setImage] = useState('')
  useEffect(() => {
    const controller = new AbortController()
    let blobUrl = ''
    let active = true
    const timeout = setTimeout(() => controller.abort(), 15000)
    void (async () => {
      try {
        const response = await fetch(url, { signal: controller.signal, credentials: 'omit' })
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const blob = await response.blob()
        if (blob.size > 1024 * 1024 || !blob.type.startsWith('image/'))
          throw new Error('Invalid thermal tile')
        if (controller.signal.aborted) return
        blobUrl = URL.createObjectURL(blob)
        setImage(blobUrl)
      } catch {
        if (active) failed((old) => (old.includes(url) ? old : [...old.slice(-127), url]))
      } finally {
        clearTimeout(timeout)
      }
    })()
    return () => {
      active = false
      controller.abort()
      clearTimeout(timeout)
      if (blobUrl) URL.revokeObjectURL(blobUrl)
    }
  }, [url, failed])
  return image ? (
    <image
      href={image}
      x={tile.left}
      y={tile.top}
      width={tile.size}
      height={tile.size}
      preserveAspectRatio="none"
    />
  ) : null
}

export function OnlineMap({
  settings,
  airspaces,
  width,
  height,
  frame,
  onChange,
  widget,
  preferences,
  screenWidth,
  screenHeight,
}: {
  widget?: Widget
  preferences?: Record<string, Json>
  screenWidth?: number
  screenHeight?: number
  settings: MapSettings
  airspaces: AirspacePolygon[]
  width: number
  height: number
  frame?: Frame
  onChange?: (settings: MapSettings) => void
}) {
  const [failed, setFailed] = useState<string[]>([])
  const flight = frame?.flight
  const view =
    settings.followGps && flight?.position
      ? { ...settings, latitude: flight.position.lat, longitude: flight.position.lon }
      : settings
  const rotation =
    !settings.rotation || settings.rotation === 'widget'
      ? widgetMapRotation(widget, flight)
      : mapRotation(settings, flight?.heading ?? null, trackDirection(flight?.track ?? []))
  const trackPaint = mapTrackPaint(widget, width, height)
  const interactive = !!settings.interactive && !!onChange
  const zoomable = !!onChange
  const root = useRef<SVGGElement>(null)
  useEffect(() => {
    const element = root.current
    if (!element || !zoomable) return
    const wheel = (event: WheelEvent) => {
      event.preventDefault()
      event.stopPropagation()
      const zoom = Math.max(
        2,
        Math.min(16, settings.zoom + (event.deltaY < 0 ? 1 : event.deltaY > 0 ? -1 : 0)),
      )
      if (zoom !== settings.zoom) onChange?.({ ...settings, zoom })
    }
    element.addEventListener('wheel', wheel, { passive: false })
    return () => element.removeEventListener('wheel', wheel)
  }, [zoomable, settings, onChange])
  const gesture = useRef<{
    pointer: number
    x: number
    y: number
    settings: MapSettings
    rotation: number
  } | null>(null)
  const point = (event: PointerEvent<SVGGElement>) => {
    const matrix = event.currentTarget.getScreenCTM()
    return matrix
      ? new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse())
      : null
  }
  const trace = (flight?.track ?? [])
    .map((p, i) => {
      const q = mapPoint(p.lon, p.lat, view, width, height)
      return `${i ? 'L' : 'M'}${q.x},${q.y}`
    })
    .join(' ')
  const waypoints = flight?.task?.waypoints ?? []
  const route = waypoints
    .map((p, i) => {
      const q = mapPoint(p.lon, p.lat, view, width, height)
      return `${i ? 'L' : 'M'}${q.x},${q.y}`
    })
    .join(' ')
  const position = flight?.position
    ? mapPoint(flight.position.lon, flight.position.lat, view, width, height)
    : null
  const agl = frame?.widgetValues?.WAltitudeAboveGround
  const filtered = settings.altitudeFilter
    ? airspaces.filter(
        (zone) =>
          airspaceAltitudeState(
            zone,
            frame?.altitude ?? null,
            typeof agl === 'number' ? agl : null,
          ) !== 'outside',
      )
    : airspaces
  const layers = [
    ...(settings.roads
      ? [
          {
            name: 'OSM',
            url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
            zoom: view.zoom,
          },
        ]
      : []),
    ...(settings.thermalTiles && widget?.mapWidget_showKK7 !== false
      ? [
          {
            name: 'Термики',
            url: settings.thermalTiles,
            zoom: settings.thermalTiles.includes('thermal.kk7.ch/tiles/thermals_')
              ? Math.min(view.zoom, 12)
              : view.zoom,
          },
        ]
      : []),
  ]
  return (
    <g
      ref={root}
      data-online-map="true"
      data-map-interactive={interactive ? 'true' : 'false'}
      data-map-zoom={view.zoom}
      data-map-latitude={view.latitude}
      data-map-longitude={view.longitude}
      data-map-follow-gps={settings.followGps ? 'true' : 'false'}
      data-map-rotation={rotation}
      pointerEvents={interactive || zoomable ? 'all' : 'none'}
      style={{
        cursor: interactive ? 'grab' : undefined,
        touchAction: interactive ? 'none' : undefined,
      }}
      onPointerDown={(event) => {
        if (!interactive) return
        event.stopPropagation()
        if (event.button !== 0) return
        const p = point(event)
        if (!p) return
        event.preventDefault()
        gesture.current = { pointer: event.pointerId, x: p.x, y: p.y, settings: view, rotation }
        event.currentTarget.setPointerCapture(event.pointerId)
      }}
      onPointerMove={(event) => {
        if (!interactive) return
        event.stopPropagation()
        const active = gesture.current,
          p = point(event)
        if (active?.pointer === event.pointerId && p)
          onChange?.(
            panMap(active.settings, p.x - active.x, p.y - active.y, width, height, active.rotation),
          )
      }}
      onPointerUp={(event) => {
        if (!interactive) return
        event.stopPropagation()
        gesture.current = null
        if (event.currentTarget.hasPointerCapture(event.pointerId))
          event.currentTarget.releasePointerCapture(event.pointerId)
      }}
      onPointerCancel={(event) => {
        if (interactive) event.stopPropagation()
        gesture.current = null
      }}
      onLostPointerCapture={() => {
        gesture.current = null
      }}
      onClick={(event) => {
        if (interactive) event.stopPropagation()
      }}
    >
      <rect width={width} height={height} fill="#e7e8e4" />
      <g transform={`rotate(${rotation} ${width / 2} ${height / 2})`} pointerEvents="none">
        {layers.map((layer) => (
          <g
            key={layer.name}
            opacity={
              layer.name === 'Термики'
                ? Math.max(0, Math.min(100, Number(widget?.mapWidget_KK7opacity ?? 40))) / 100
                : 1
            }
          >
            {visibleTiles(view, width, height, layer.zoom, rotation !== 0).map((tile) => {
              const url = tileUrl(layer.url, layer.zoom, tile.x, tile.y)
              if (layer.url.includes('thermal.kk7.ch/tiles/'))
                return failed.includes(url) ? null : (
                  <ThermalTile key={url} url={url} tile={tile} failed={setFailed} />
                )
              return failed.includes(url) ? null : (
                <image
                  key={url}
                  href={url}
                  x={tile.left}
                  y={tile.top}
                  width={tile.size}
                  height={tile.size}
                  preserveAspectRatio="none"
                  onError={() =>
                    setFailed((old) => (old.includes(url) ? old : [...old.slice(-127), url]))
                  }
                />
              )
            })}
          </g>
        ))}
        {widget?.mapWidget_showAirspaces !== false &&
          filtered.map((polygon, index) => (
            <path
              key={index}
              d={polygonPath(polygon, view, width, height)}
              fill="#ff4040"
              fillOpacity="0.16"
              fillRule="evenodd"
              stroke="#d52828"
              strokeWidth={Math.max(width, height) / 250}
            >
              <title>{polygon.name} · статус активации неизвестен</title>
            </path>
          ))}
        {settings.showTrace !== false && trace && (
          <path
            data-map-trace="true"
            d={trace}
            fill="none"
            stroke={trackPaint.color}
            strokeWidth={trackPaint.width}
          />
        )}
        {settings.showTask !== false && route && (
          <path
            data-map-task="true"
            d={route}
            fill="none"
            stroke="#b534a2"
            strokeWidth={Math.max(width, height) / 250}
            strokeDasharray="12 8"
          />
        )}
        {settings.showTask !== false &&
          (flight?.waypoints ?? []).map((waypoint, index) => {
            const p = mapPoint(waypoint.lon, waypoint.lat, view, width, height)
            const size = Math.max(width, height) / 85
            return (
              <g key={`collection-${index}`} data-map-navpoint="true">
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={size / 3}
                  fill="#2464ab"
                  stroke="white"
                  strokeWidth={2}
                />
                <text
                  x={p.x + size / 2}
                  y={p.y}
                  fontSize={size}
                  fill="#164475"
                  paintOrder="stroke"
                  stroke="#fff"
                  strokeWidth={size / 8}
                >
                  {waypoint.name}
                </text>
                <title>{waypoint.description || waypoint.name}</title>
              </g>
            )
          })}
        {settings.showTask !== false &&
          waypoints.map((waypoint, index) => {
            const p = mapPoint(waypoint.lon, waypoint.lat, view, width, height)
            const radius = Math.max(width, height) / 70
            const cylinder =
              (((waypoint.radius * 256 * 2 ** view.zoom) /
                (40075016.686 * Math.cos((waypoint.lat * Math.PI) / 180))) *
                Math.max(width, height)) /
              512
            const incoming = index > 0 ? (bearingBetween(waypoints[index - 1]!, waypoint) ?? 0) : 0
            const dx = Math.cos((incoming * Math.PI) / 180) * cylinder
            const dy = Math.sin((incoming * Math.PI) / 180) * cylinder
            return (
              <g key={index} data-map-waypoint="true">
                {waypoint.type !== 'TAKEOFF' &&
                  (waypoint.goalType === 'LINE' ? (
                    <path
                      data-map-goal-line="true"
                      d={`M${p.x - dx} ${p.y - dy} L${p.x + dx} ${p.y + dy}`}
                      stroke="#b534a2"
                      strokeWidth={Math.max(width, height) / 250}
                    />
                  ) : (
                    <circle
                      data-map-cylinder="true"
                      cx={p.x}
                      cy={p.y}
                      r={cylinder}
                      fill="#b534a2"
                      fillOpacity={0.07}
                      stroke="#b534a2"
                      strokeWidth={Math.max(width, height) / 350}
                    />
                  ))}
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={radius}
                  fill={index === flight?.task?.nextIndex ? '#ffe46b' : '#fff'}
                  stroke="#b534a2"
                  strokeWidth={2}
                />
                <text x={p.x} y={p.y + radius / 3} textAnchor="middle" fontSize={radius}>
                  {index + 1}
                </text>
                <title>{waypoint.name}</title>
              </g>
            )
          })}
        {position && widget && (
          <g>
            {widget.mapWidget_drawBearing !== false &&
              flight?.heading !== null &&
              flight?.heading !== undefined && (
                <path
                  data-map-bearing="true"
                  d={`M${position.x} ${position.y} l${Math.sin((flight.heading * Math.PI) / 180) * Math.hypot(width, height)} ${-Math.cos((flight.heading * Math.PI) / 180) * Math.hypot(width, height)}`}
                  stroke={String(widget._theme).includes('White') ? '#222' : '#eee'}
                  strokeWidth={Math.max(0.1, Number(widget.line_thickness ?? 10) / 10)}
                  fill="none"
                />
              )}
            {widget.nav_line === true &&
              widget.nav_target !== 'NONE' &&
              flight?.task?.bearing !== null &&
              flight?.task?.bearing !== undefined && (
                <path
                  data-map-navigation="true"
                  d={`M${position.x} ${position.y} l${Math.sin((flight.task.bearing * Math.PI) / 180) * Math.hypot(width, height)} ${-Math.cos((flight.task.bearing * Math.PI) / 180) * Math.hypot(width, height)}`}
                  stroke="#b534a2"
                  strokeWidth={trackPaint.width}
                  fill="none"
                />
              )}
            <NativeMapPilot
              widget={widget}
              x={position.x}
              y={position.y}
              heading={flight?.heading ?? 0}
              light={String(widget._theme).includes('White')}
              screenWidth={screenWidth}
              screenHeight={screenHeight}
            />
          </g>
        )}
      </g>
      {widget && (
        <NativeMapDecorations
          widget={widget}
          width={width}
          height={height}
          rotation={rotation}
          screenWidth={screenWidth}
          screenHeight={screenHeight}
        />
      )}
      {widget && position && (
        <NativeMapWind
          widget={widget}
          wind={flight?.wind}
          rotation={-rotation}
          width={width}
          height={height}
          pilotX={
            width / 2 +
            (position.x - width / 2) * Math.cos((rotation * Math.PI) / 180) -
            (position.y - height / 2) * Math.sin((rotation * Math.PI) / 180)
          }
          pilotY={
            height / 2 +
            (position.x - width / 2) * Math.sin((rotation * Math.PI) / 180) +
            (position.y - height / 2) * Math.cos((rotation * Math.PI) / 180)
          }
          screenWidth={screenWidth}
          screenHeight={screenHeight}
          preferences={preferences}
        />
      )}
      {settings.followGps && !position && (
        <text x="8" y="24" fontSize="18" fill="#333">
          Нет GPS-позиции
        </text>
      )}
      {failed.length > 0 && (
        <text x="8" y="28" fontSize="22" fill="#b00020">
          Часть онлайн-тайлов недоступна
        </text>
      )}
    </g>
  )
}
