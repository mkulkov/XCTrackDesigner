import { tr } from './i18n'
import { useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { FileUp, FileCheck2 } from 'lucide-react'
import { parseIGC } from './flight-engine'
import type { IGCReplay } from './flight-engine'

const replayWarning = (warning: string) => {
  const invalid = /^Пропущено недействительных GPS-записей: (\d+)$/.exec(warning)
  if (invalid) return tr('Пропущено недействительных GPS-записей: {n}', { n: invalid[1]! })
  const repeated = /^Пропущено повторов или нарушений порядка времени: (\d+)$/.exec(warning)
  if (repeated)
    return tr('Пропущено повторов или нарушений порядка времени: {n}', { n: repeated[1]! })
  return tr(warning)
}

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
    <section className="settings track-replay" aria-label={tr('Полёт по треку')}>
      <h2>{tr('Полёт по треку')}</h2>
      <label className="replay-file">
        <span className="replay-upload-icon">
          <FileUp size={22} />
        </span>
        <span className="replay-upload-title">
          {loading ? tr('Загрузка…') : replay ? tr('Заменить трек IGC') : tr('Загрузить трек IGC')}
        </span>
        <span className="replay-upload-caption">{tr('Выберите файл записи полёта')}</span>
        <input
          aria-label={tr('Загрузить запись IGC')}
          type="file"
          accept=".igc"
          disabled={loading}
          onChange={async (event) => {
            const file = event.currentTarget.files?.[0]
            event.currentTarget.value = ''
            if (!file) return
            const id = ++request.current
            setLoading(true)
            try {
              if (file.size > 20 * 1024 * 1024)
                throw new Error(tr('Трек превышает ограничение 20 МиБ'))
              const parsed = parseIGC(await file.text())
              if (request.current !== id) return
              onReplay(parsed)
              setFilename(file.name)
              setError('')
            } catch (cause) {
              if (request.current === id)
                setError(
                  cause instanceof Error ? tr(cause.message) : tr('Не удалось загрузить трек'),
                )
            } finally {
              if (request.current === id) setLoading(false)
            }
          }}
        />
      </label>
      {replay && (
        <div className="replay-loaded">
          <FileCheck2 size={16} />
          <div>
            <strong>{filename}</strong>
            <span>
              {timeText(replay.duration)} · {tr('{n} GPS-точек', { n: replay.fixes.length })}
            </span>
          </div>
        </div>
      )}
      {loading && <p role="status">{tr('Загрузка трека…')}</p>}
      {!replay && (
        <p className="hint">
          {tr('Воспроизведите запись полёта или выберите учебный сценарий ниже.')}
        </p>
      )}
      <ReplayPlacement target={playbackTarget}>
        {replay && profile && (
          <>
            <p className="replay-info">
              {filename} · {replay.date ?? tr('Дата неизвестна')} ·{' '}
              {tr('{n} GPS-точек', { n: replay.fixes.length })} · {timeText(replay.duration)}
            </p>
            <div className="widget-actions">
              <button
                onClick={() => {
                  if (!playing && seconds >= replay.duration) onSeek(0)
                  onPlaying(!playing)
                }}
              >
                {playing ? tr('Пауза симуляции') : tr('Запустить симуляцию')}
              </button>
              <button
                onClick={() => {
                  onPlaying(false)
                  onSeek(0)
                }}
              >
                {tr('Сбросить симуляцию')}
              </button>
              <button
                onClick={() => {
                  onPlaying(false)
                  onSeek(replay.duration)
                }}
              >
                {tr('К концу трека')}
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
                {tr('Закрыть запись IGC')}
              </button>
            </div>
            <label className="replay-rate">
              {tr('Темп')}{' '}
              <select
                aria-label={tr('Темп симуляции')}
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
              {tr('Позиция записи')}{' '}
              <input
                aria-label={tr('Позиция записи IGC')}
                type="range"
                min={0}
                max={replay.duration}
                step={0.1}
                value={Math.min(seconds, replay.duration)}
                onChange={(e) => onSeek(Number(e.target.value))}
              />
            </label>
            <p className="replay-status">
              <output aria-label={tr('Время трека')}>
                {timeText(seconds)} / {timeText(replay.duration)}
              </output>{' '}
              ·{' '}
              <output aria-label={tr('Состояние воспроизведения')}>
                {seconds >= replay.duration
                  ? tr('Трек завершён')
                  : playing
                    ? tr('Воспроизведение')
                    : tr('Пауза')}
              </output>
            </p>
            <svg
              viewBox="0 0 900 140"
              style={{ width: '100%', maxHeight: 80, background: '#18222b', cursor: 'crosshair' }}
              role="img"
              aria-label={tr('Профиль высоты трека')}
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
                {tr('{n} м', { n: Math.round(profile.max) })}
              </text>
              <text x={8} y={135} fill="white" fontSize={12}>
                {tr('{n} м', { n: Math.round(profile.min) })}
              </text>
            </svg>
            <details className="replay-details">
              <summary>{tr('О записи')}</summary>
              <p className="hint">
                {tr(
                  'Профиль GPS-высоты: нажмите для перемотки. Время записи — UTC. Ветер, воздушная скорость и рельеф в IGC отсутствуют. Симуляция не меняет XCFG.',
                )}
              </p>
              {replay.warnings.map((warning) => (
                <p className="hint" key={warning}>
                  {replayWarning(warning)}
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
