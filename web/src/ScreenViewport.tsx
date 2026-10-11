import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'

export function ScreenViewport({ portrait, children }: { portrait: boolean; children: ReactNode }) {
  const viewport = useRef<HTMLDivElement>(null)
  const [fitWidth, setFitWidth] = useState(320)
  const [zoom, setZoom] = useState(100)
  useEffect(() => {
    const element = viewport.current!
    const measure = () =>
      setFitWidth(
        portrait
          ? Math.min(
              Math.max(1, element.clientWidth - 36),
              window.innerWidth <= 650
                ? 320
                : Math.max(244, (window.innerHeight - 320) * (1080 / 2400)),
              360,
            )
          : element.clientWidth,
      )
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    window.addEventListener('resize', measure)
    measure()
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [portrait])
  return (
    <>
      <div ref={viewport} className="screen-viewport">
        <div className="screen-stage" style={{ width: (fitWidth * zoom) / 100 }}>
          {children}
        </div>
      </div>
      <div className="screen-zoom" role="group" aria-label="Масштаб предпросмотра">
        <button
          aria-label="Уменьшить масштаб"
          disabled={zoom <= 25}
          onClick={() => setZoom(Math.max(25, zoom - 25))}
        >
          −
        </button>
        <label>
          Масштаб экрана{' '}
          <input
            type="range"
            min={25}
            max={300}
            step={5}
            value={zoom}
            onChange={(event) => setZoom(Number(event.target.value))}
          />
        </label>
        <output aria-live="polite">{zoom}%</output>
        <button
          aria-label="Увеличить масштаб"
          disabled={zoom >= 300}
          onClick={() => setZoom(Math.min(300, zoom + 25))}
        >
          +
        </button>
        <button onClick={() => setZoom(100)}>По размеру окна</button>
      </div>
    </>
  )
}
