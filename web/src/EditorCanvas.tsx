import { useRef, useState } from 'react'
import type { PointerEvent, ReactNode } from 'react'
import { gestureBounds } from './editor-geometry'
import type { Handle } from './editor-geometry'
import { pixelBounds } from './xcfg'
import type { Bounds, Widget } from './xcfg'

type Gesture = {
  pointer: number
  index: number
  x: number
  y: number
  clientX: number
  clientY: number
  inverse: DOMMatrix
  dragging: boolean
  bounds: Bounds
  handle: Handle
}

export function EditorCanvas({
  widgets,
  selected,
  select,
  commit,
  width,
  height,
  editable,
  showBounds,
  snap,
  children,
  addFromCollection,
}: {
  widgets: Widget[]
  selected: number
  select: (index: number) => void
  commit: (bounds: Bounds, index: number) => void
  width: number
  height: number
  editable: boolean
  showBounds: boolean
  snap: boolean
  children: ReactNode
  addFromCollection?: (name: string, x: number, y: number) => void
}) {
  const gesture = useRef<Gesture | null>(null)
  const [draft, setDraft] = useState<Bounds | null>(null)
  const point = (event: PointerEvent<SVGSVGElement>) => {
    const matrix = event.currentTarget.getScreenCTM()
    return matrix
      ? new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse())
      : null
  }
  const update = (event: PointerEvent<SVGSVGElement>) => {
    const active = gesture.current
    if (!active || active.pointer !== event.pointerId) return null
    // Selection can change the layout. Measure motion in screen pixels and
    // retain the transform from pointer-down so a click cannot become a drag.
    if (!active.dragging) {
      if (Math.hypot(event.clientX - active.clientX, event.clientY - active.clientY) < 4)
        return null
      active.dragging = true
    }
    const p = new DOMPoint(event.clientX, event.clientY).matrixTransform(active.inverse)
    return gestureBounds(
      active.bounds,
      active.handle,
      ((p.x - active.x) * 10000) / width,
      ((p.y - active.y) * 10000) / height,
      width,
      height,
      snap,
    )
  }
  const cancel = () => {
    gesture.current = null
    setDraft(null)
  }
  const bounds = draft ?? widgets[selected]
  const box = bounds ? pixelBounds(bounds, width, height, 420) : null
  const size = Math.max(width, height) / 65
  return (
    <svg
      role="img"
      aria-label="Предпросмотр страницы XCTrack"
      tabIndex={0}
      viewBox={`0 0 ${width} ${height}`}
      className={`screen ${width < height ? 'portrait' : 'landscape'} editor-canvas`}
      onDragOver={(event) => {
        if (editable && event.dataTransfer.types.includes('application/x-xctrack-widget')) {
          event.preventDefault()
          event.dataTransfer.dropEffect = 'copy'
        }
      }}
      onDrop={(event) => {
        const name = event.dataTransfer.getData('application/x-xctrack-widget')
        if (!editable || !name || !addFromCollection) return
        event.preventDefault()
        const matrix = event.currentTarget.getScreenCTM()
        if (!matrix) return
        const p = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse())
        if (p.x < 0 || p.y < 0 || p.x > width || p.y > height) return
        addFromCollection(name, (p.x * 10000) / width, (p.y * 10000) / height)
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') cancel()
      }}
      onClickCapture={(event) => {
        if (!event.altKey) return
        event.preventDefault()
        event.stopPropagation()
        const matrix = event.currentTarget.getScreenCTM()
        if (!matrix) return
        const p = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse())
        const hits = widgets
          .map((w, index) => ({ index, bounds: pixelBounds(w, width, height, 420) }))
          .filter(
            ({ bounds: b }) =>
              p.x >= b.x && p.x <= b.x + b.width && p.y >= b.y && p.y <= b.y + b.height,
          )
          .map(({ index }) => index)
          .reverse()
        if (hits.length) select(hits[(hits.indexOf(selected) + 1) % hits.length]!)
      }}
      onPointerDown={(event) => {
        if (event.altKey) return
        if (event.button !== 0 || gesture.current) return
        const p = point(event)
        if (!p) return
        const matrix = event.currentTarget.getScreenCTM()
        if (!matrix) return
        const handle = (event.target as Element).getAttribute('data-handle') as Handle | null
        const index = handle
          ? selected
          : widgets.findLastIndex((w) => {
              const b = pixelBounds(w, width, height, 420)
              return p.x >= b.x && p.x <= b.x + b.width && p.y >= b.y && p.y <= b.y + b.height
            })
        if (index < 0) return
        select(index)
        if (!editable) return
        const w = widgets[index]
        if (!w) return
        gesture.current = {
          pointer: event.pointerId,
          index,
          x: p.x,
          y: p.y,
          clientX: event.clientX,
          clientY: event.clientY,
          inverse: matrix.inverse(),
          dragging: false,
          bounds: { X1: w.X1, Y1: w.Y1, X2: w.X2, Y2: w.Y2 },
          handle: handle ?? 'move',
        }
        event.currentTarget.focus()
        event.currentTarget.setPointerCapture(event.pointerId)
        event.preventDefault()
      }}
      onPointerMove={(event) => {
        const next = update(event)
        if (next) setDraft(next)
      }}
      onPointerUp={(event) => {
        const active = gesture.current
        if (!active || active.pointer !== event.pointerId) return
        const next = update(event)
        cancel()
        if (event.currentTarget.hasPointerCapture(event.pointerId))
          event.currentTarget.releasePointerCapture(event.pointerId)
        if (
          next &&
          (['X1', 'Y1', 'X2', 'Y2'] as const).some((key) => next[key] !== active.bounds[key])
        )
          commit(next, active.index)
      }}
      onPointerCancel={(event) => {
        if (gesture.current?.pointer === event.pointerId) cancel()
      }}
      onLostPointerCapture={(event) => {
        if (gesture.current?.pointer === event.pointerId) cancel()
      }}
    >
      {children}
      {showBounds && box && editable && (
        <g>
          <rect
            {...box}
            fill={draft ? '#6dffc022' : 'none'}
            stroke="#6dffc0"
            strokeWidth={5}
            pointerEvents="none"
          />
          {(['nw', 'ne', 'sw', 'se'] as const).map((handle) => (
            <rect
              key={handle}
              data-handle={handle}
              aria-label={`Изменить размер ${handle}`}
              x={(handle.endsWith('w') ? box.x : box.x + box.width) - size / 2}
              y={(handle.startsWith('n') ? box.y : box.y + box.height) - size / 2}
              width={size}
              height={size}
              fill="#6dffc0"
              stroke="#123"
              strokeWidth={3}
              style={{ cursor: handle === 'nw' || handle === 'se' ? 'nwse-resize' : 'nesw-resize' }}
            />
          ))}
        </g>
      )}
    </svg>
  )
}
