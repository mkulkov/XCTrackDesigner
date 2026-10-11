import { pixelBounds } from './xcfg'
import type { Json, Widget } from './xcfg'
import { valueScene, newSceneCache } from './value-layout'
import { useState } from 'react'
import type { Frame, Measure } from './value-layout'
import { nativeFontsReady } from './fonts'
import { OnlineMap } from './OnlineMap'
import type { AirspacePolygon, MapSettings } from './online-map'
import { GraphicWidget } from './GraphicWidget'
import { libraryWidget } from './widget-library'

// Keep separate contexts: native advances disable kerning, while fallback
// measurement uses the browser default. Set the font on every measurement so
// loading native fonts never leaves stale metrics behind.
let advancesContext: CanvasRenderingContext2D | null = null
let measureContext: CanvasRenderingContext2D | null = null

function advances(text: string, size: number, role: 'title' | 'value' = 'value') {
  const context = (advancesContext ??= document.createElement('canvas').getContext('2d')!)
  // Invalid CSS font sizes retain the previous font; preserve a fresh canvas's fallback.
  context.font = '10px sans-serif'
  // Android 15 MinikinUtils::prepareMinikinPaint truncates font size when
  // linearMetrics is disabled. FontMetrics and drawing retain the float size.
  context.font = `700 ${Math.floor(size)}px ${role === 'title' ? 'XCTitle' : 'XCValue'}`
  context.fontKerning = 'none'
  return Array.from(text, (character) => Math.round(context.measureText(character).width))
}

const measure: Measure = (text, size, role = 'value') => {
  const context = (measureContext ??= document.createElement('canvas').getContext('2d')!)
  context.font = '10px sans-serif'
  context.font = `700 ${size}px ${nativeFontsReady ? (role === 'title' ? 'XCTitle' : 'XCValue') : 'Arial'}`
  const m = context.measureText(text)
  // Android/Skia uses fractional hhea metrics. Chromium's fontBoundingBox
  // rounds them and uses OS/2 for Roboto; those differences move title baselines.
  const metrics = role === 'title' ? [1900, 500] : [1901, 483]
  return {
    width: nativeFontsReady ? advances(text, size, role).reduce((a, b) => a + b, 0) : m.width,
    ascent: nativeFontsReady ? (metrics[0]! * size) / 2048 : m.fontBoundingBoxAscent,
    descent: nativeFontsReady ? (metrics[1]! * size) / 2048 : m.fontBoundingBoxDescent,
  }
}

export function WidgetPreview({
  widget: original,
  preferences,
  frame,
  width,
  height,
  index,
  showBounds,
  select,
  mapSettings,
  airspaces,
  changeMap,
}: {
  widget: Widget
  preferences: Record<string, Json>
  frame: Frame
  width: number
  height: number
  index: number
  showBounds: boolean
  select: () => void
  mapSettings?: MapSettings
  airspaces?: AirspacePolygon[]
  changeMap?: (settings: MapSettings) => void
}) {
  const entry = libraryWidget(original.CLASS)
  const w = {
    ...Object.fromEntries(
      (entry?.settings ?? [])
        .filter((setting) => setting.default !== undefined)
        .map((setting) => [setting.key, setting.default as Json]),
    ),
    ...original,
  }
  const b = pixelBounds(w, width, height, 420)
  const frameKey = JSON.stringify([
    frame.speed,
    frame.vertical,
    frame.altitude,
    frame.time,
    frame.widgetValues,
    frame.flight?.position,
    frame.flight?.heading,
    frame.flight?.task?.nextIndex,
    frame.flight?.task?.waypoints,
  ])
  const [previous, setPrevious] = useState(() => {
    const cache = newSceneCache()
    return {
      frameKey,
      cache,
      scene: valueScene(w, preferences, frame, b.width, b.height, width, height, measure, cache),
    }
  })
  let current = previous
  if (previous.frameKey !== frameKey) {
    const cache = {
      ...previous.cache,
      value: { ...previous.cache.value },
      unit: { ...previous.cache.unit },
      lines: previous.cache.lines.map((line) => ({ ...line })),
    }
    current = {
      frameKey,
      cache,
      scene: valueScene(w, preferences, frame, b.width, b.height, width, height, measure, cache),
    }
    setPrevious(current)
  }
  const scene = current.scene
  const name = w.CLASS.split('.').at(-1) ?? w.CLASS
  const light = String(w._theme || preferences['Display.Theme'] || 'BlackHCTheme').startsWith(
    'White',
  )
  const map =
    w.CLASS === `org.xcontest.XCTrack.widget.w.${name}` &&
    ['WXCAssistant', 'WCompMap'].includes(name)
  const alpha =
    typeof w._bg === 'number'
      ? Math.floor(((100 - Math.max(0, Math.min(100, w._bg))) * 255) / 100) / 255
      : 0
  return (
    <g data-widget={name} transform={`translate(${b.x} ${b.y})`} onClick={select}>
      <defs>
        <clipPath id={`clip-${index}`}>
          <rect width={b.width} height={b.height} />
        </clipPath>
      </defs>
      <g clipPath={`url(#clip-${index})`} fontFamily="Arial" fontWeight="bold">
        <rect width={b.width} height={b.height} fill="transparent" />
        {!scene?.hidden && (
          <>
            {map && <rect width={b.width} height={b.height} fill={light ? '#eee' : '#151515'} />}
            <rect
              width={Math.max(0, b.width - 1)}
              height={Math.max(0, b.height - 1)}
              fill={scene?.background ?? (light ? '#fff' : '#000')}
              fillOpacity={alpha}
            />
            {map && mapSettings?.enabled && (
              <OnlineMap
                settings={mapSettings}
                airspaces={airspaces ?? []}
                width={b.width}
                height={b.height}
                frame={frame}
                onChange={changeMap}
                widget={{
                  ...w,
                  _theme: w._theme || preferences['Display.Theme'] || 'BlackHCTheme',
                }}
                preferences={preferences}
                screenWidth={width}
                screenHeight={height}
              />
            )}
            {scene && 'contentBackground' in scene && (
              <rect width={b.width} height={b.height} fill={String(scene.contentBackground)} />
            )}
            {!scene && !(map && mapSettings?.enabled) && (
              <GraphicWidget
                widget={{
                  ...w,
                  _theme: w._theme || preferences['Display.Theme'] || 'BlackHCTheme',
                }}
                frame={frame}
                width={b.width}
                height={b.height}
                light={light}
                screenWidth={width}
                screenHeight={height}
                preferences={preferences}
              />
            )}
            {w._border === true && (
              <rect
                x={b.x === 0 ? -1 : 0.5}
                y={b.y === 0 ? -1 : 0.5}
                width={b.width - 1 - (b.x === 0 ? -1 : 0.5)}
                height={b.height - 1 - (b.y === 0 ? -1 : 0.5)}
                fill="none"
                stroke="#808080"
                strokeWidth="1"
              />
            )}
            {scene?.divider && (
              <line
                x1={scene.divider.x1}
                x2={scene.divider.x2}
                y1={scene.divider.y}
                y2={scene.divider.y}
                stroke={scene.divider.color}
                strokeWidth="1"
              />
            )}
            {scene?.symbol && (
              <g>
                <rect
                  x={scene.symbol.x}
                  y={scene.symbol.y}
                  width={scene.symbol.width}
                  height={scene.symbol.height}
                  rx={scene.symbol.width * 0.18}
                  fill={scene.symbol.background}
                />
                <path
                  data-symbol="optimized-track"
                  d={scene.symbol.path}
                  transform={`translate(${scene.symbol.x} ${scene.symbol.y}) scale(${scene.symbol.width / 100} ${scene.symbol.height / 100})`}
                  stroke={scene.symbol.color}
                  fill="none"
                  strokeWidth={3}
                />
              </g>
            )}
            {scene
              ? scene.runs.map((run, i) => (
                  <text
                    key={i}
                    x={
                      nativeFontsReady && name !== 'WFreeText'
                        ? advances(run.text, run.size, run.role)
                            .map((_, index, widths) =>
                              index === 0
                                ? run.x
                                : run.x + widths.slice(0, index).reduce((a, b) => a + b, 0),
                            )
                            .join(' ')
                        : run.x
                    }
                    y={run.y}
                    fontSize={run.size}
                    fontFamily={
                      nativeFontsReady && name !== 'WFreeText'
                        ? run.role === 'title'
                          ? 'XCTitle'
                          : 'XCValue'
                        : 'Arial'
                    }
                    fontWeight={run.fontWeight}
                    fontStyle={run.fontStyle}
                    fill={run.color}
                    stroke={run.stroke}
                    strokeWidth={run.strokeWidth}
                    paintOrder="stroke fill"
                  >
                    {run.text}
                  </text>
                ))
              : showBounds &&
                !entry &&
                !(map && mapSettings?.enabled) && (
                  <text x="8" y="24" fill="#6f9ba8" fontSize="20">
                    {name} · схема
                  </text>
                )}
          </>
        )}
      </g>
    </g>
  )
}
