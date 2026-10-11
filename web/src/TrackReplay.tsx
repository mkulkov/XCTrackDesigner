import { useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { parseIGC } from './flight-engine'
import type { IGCReplay } from './flight-engine'

const timeText = (seconds: number) => {
  const t = Math.floor(Math.max(0, seconds))
  return `${Math.floor(t / 3600)
    .toString()
    .padStart(2, '0')}:${Math.floor((t / 60) % 60)
    .toString()
    .padStart(2, '0')}:${(t % 60).toString().padStart(2, '0')}`
}

function ReplayPlacement({
  target,
  children,
}: {
  target?: HTMLElement | null
  children: ReactNode
}) {
  return target ? createPortal(<div className="replay-playback">{children}</div>, target) : children
}

export function TrackReplay({
  playbackTarget,
  replay,
  onReplay,
  seconds,
  onSeek,
  playing,
  onPlaying,
  rate,
  onRate,
}: {
  playbackTarget?: HTMLElement | null
  replay: IGCReplay | null
  onReplay: (replay: IGCReplay | null) => void
  seconds: number
  onSeek: (seconds: number) => void
  playing: boolean
  onPlaying: (playing: boolean) => void
  rate: number
  onRate: (rate: number) => void
}) {
  const [filename, setFilename] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const request = useRef(0)
  const profile = useMemo(() => {
    if (!replay) return null
    let min = Infinity,
      max = -Infinity
    for (const fix of replay.fixes) {
      min = Math.min(min, fix.gpsAltitude)
      max = Math.max(max, fix.gpsAltitude)
    }
    const step = Math.max(1, Math.ceil(replay.fixes.length / 1500))
    const points = replay.fixes.filter((_, i) => i % step === 0 || i === replay.fixes.length - 1)
    const y = (altitude: number) => 110 - ((altitude - min) / Math.max(1, max - min)) * 85
    const path = points
      .map(
        (fix, i) =>
          `${i ? 'L' : 'M'}${(fix.seconds / replay.duration) * 900},${y(fix.gpsAltitude)}`,
      )
      .join(' ')
    return { min, max, path }
  }, [replay])
  return (
    <section className="settings track-replay" aria-label="Полёт по треку">
      <h2>Полёт по треку</h2>
      <label className="replay-file">
        Загрузить трек полёта (IGC)
        <input
          aria-label="Загрузить запись IGC"
          type="file"
          accept=".igc"
          onChange={async (event) => {
            const file = event.currentTarget.files?.[0]
            event.currentTarget.value = ''
            if (!file) return
            const id = ++request.current
            setLoading(true)
            try {
              if (file.size > 20 * 1024 * 1024) throw new Error('Трек превышает ограничение 20 МиБ')
              const parsed = parseIGC(await file.text())
              if (request.current !== id) return
              onReplay(parsed)
              setFilename(file.name)
              setError('')
            } catch (cause) {
              if (request.current === id)
                setError(cause instanceof Error ? cause.message : 'Не удалось загрузить трек')
            } finally {
              if (request.current === id) setLoading(false)
            }
          }}
        />
      </label>
      {loading && <p role="status">Загрузка трека…</p>}
      {!replay && <p className="hint">Загрузите IGC для воспроизведения полёта на экране.</p>}
      <ReplayPlacement target={playbackTarget}>
        {replay && profile && (
          <>
            <p className="replay-info">
              {filename} · {replay.date ?? 'Дата неизвестна'} · {replay.fixes.length} GPS-точек ·{' '}
              {timeText(replay.duration)}
            </p>
            <div className="widget-actions">
              <button
                onClick={() => {
                  if (!playing && seconds >= replay.duration) onSeek(0)
                  onPlaying(!playing)
                }}
              >
                {playing ? 'Пауза симуляции' : 'Запустить симуляцию'}
              </button>
              <button
                onClick={() => {
                  onPlaying(false)
                  onSeek(0)
                }}
              >
                Сбросить симуляцию
              </button>
              <button
                onClick={() => {
                  onPlaying(false)
                  onSeek(replay.duration)
                }}
              >
                К концу трека
              </button>
              <button
                onClick={() => {
                  request.current++
                  setLoading(false)
                  onReplay(null)
                  setFilename('')
                  setError('')
                }}
              >
                Закрыть запись IGC
              </button>
            </div>
            <label className="replay-rate">
              Темп{' '}
              <select
                aria-label="Темп симуляции"
                value={rate}
                onChange={(e) => onRate(Number(e.target.value))}
              >
                {[0.5, 1, 2, 5, 10, 20, 50, 100].map((value) => (
                  <option key={value} value={value}>
                    {value}×
                  </option>
                ))}
              </select>
            </label>
            <label className="replay-timeline">
              Позиция записи{' '}
              <input
                aria-label="Позиция записи IGC"
                type="range"
                min={0}
                max={replay.duration}
                step={0.1}
                value={Math.min(seconds, replay.duration)}
                onChange={(e) => onSeek(Number(e.target.value))}
              />
            </label>
            <p className="replay-status">
              <output aria-label="Время трека">
                {timeText(seconds)} / {timeText(replay.duration)}
              </output>{' '}
              ·{' '}
              <output aria-label="Состояние воспроизведения">
                {seconds >= replay.duration
                  ? 'Трек завершён'
                  : playing
                    ? 'Воспроизведение'
                    : 'Пауза'}
              </output>
            </p>
            <svg
              viewBox="0 0 900 140"
              style={{ width: '100%', maxHeight: 80, background: '#18222b', cursor: 'crosshair' }}
              role="img"
              aria-label="Профиль высоты трека"
              onClick={(e) => {
                const matrix = e.currentTarget.getScreenCTM()
                if (!matrix) return
                const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(matrix.inverse())
                onSeek(Math.max(0, Math.min(replay.duration, (p.x / 900) * replay.duration)))
              }}
            >
              <path d={profile.path} fill="none" stroke="#6dffc0" strokeWidth={2} />
              <line
                x1={(seconds / replay.duration) * 900}
                x2={(seconds / replay.duration) * 900}
                y1={0}
                y2={140}
                stroke="#ffbb44"
                strokeWidth={2}
              />
              <text x={8} y={15} fill="white" fontSize={12}>
                {Math.round(profile.max)} м
              </text>
              <text x={8} y={135} fill="white" fontSize={12}>
                {Math.round(profile.min)} м
              </text>
            </svg>
            <details className="replay-details">
              <summary>О записи</summary>
              <p className="hint">
                Профиль GPS-высоты: нажмите для перемотки. Время записи — UTC. Ветер, воздушная
                скорость и рельеф в IGC отсутствуют. Симуляция не меняет XCFG.
              </p>
              {replay.warnings.map((warning) => (
                <p className="hint" key={warning}>
                  {warning}
                </p>
              ))}
            </details>
          </>
        )}
      </ReplayPlacement>
      {error && <p role="alert">{error}</p>}
    </section>
  )
}
