import { tr } from './i18n'
import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'

export function ScreenViewport({ portrait, children }: { portrait: boolean; children: ReactNode }) {
  const viewport = useRef<HTMLDivElement>(null)
  const [fitWidth, setFitWidth] = useState(320)
  const [zoom, setZoom] = useState(100)
  useEffect(() => {
    const element = viewport.current!
    const measure = () => {
      const style = getComputedStyle(element)
      const availableWidth = Math.max(
        1,
        element.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight),
      )
      setFitWidth(
        portrait
          ? Math.min(
              availableWidth,
              window.innerWidth <= 650
                ? 320
                : Math.max(244, (window.innerHeight - 320) * (1080 / 2400)),
              360,
            )
          : availableWidth,
      )
    }
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
      <div className="screen-zoom" role="group" aria-label={tr('Масштаб предпросмотра')}>
        <button
          aria-label={tr('Уменьшить масштаб')}
          disabled={zoom <= 25}
          onClick={() => setZoom(Math.max(25, zoom - 25))}
        >
          −
        </button>
        <label>
          {tr('Масштаб экрана')}{' '}
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
          aria-label={tr('Увеличить масштаб')}
          disabled={zoom >= 300}
          onClick={() => setZoom(Math.min(300, zoom + 25))}
        >
          +
        </button>
        <button onClick={() => setZoom(100)}>{tr('По размеру окна')}</button>
      </div>
    </>
  )
}
