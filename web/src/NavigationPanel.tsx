import { tr } from './i18n'
import { useEffect, useRef, useState } from 'react'
import { Upload, MapPin, Flag, Trash2 } from 'lucide-react'
import { parseCompetitionTask, parseWaypoints } from './navigation-import'
import type { ImportedTask, NavigationWaypoint } from './navigation-import'

export function NavigationPanel({
  waypoints,
  task,
  target,
  onWaypoints,
  onTask,
  onTarget,
  fit,
  close,
}: {
  waypoints: NavigationWaypoint[]
  task: ImportedTask | null
  target: NavigationWaypoint | null
  onWaypoints: (points: NavigationWaypoint[], filename: string) => void
  onTask: (task: ImportedTask | null) => void
  onTarget: (point: NavigationWaypoint | null) => void
  fit: (points: NavigationWaypoint[]) => void
  close: () => void
}) {
  const [tab, setTab] = useState<'points' | 'task'>('points')
  const [query, setQuery] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const request = useRef(0)
  useEffect(
    () => () => {
      request.current++
    },
    [],
  )
  async function load(file: File | undefined) {
    if (!file) return
    const id = ++request.current
    setBusy(true)
    setError('')
    try {
      if (file.size > 2 * 1024 * 1024) throw Error(tr('Файл больше 2 МБ'))
      const text = await file.text()
      if (id !== request.current) return
      if (tab === 'points') {
        const points = parseWaypoints(text, file.name)
        onWaypoints(points, file.name)
        fit(points)
      } else {
        const imported = parseCompetitionTask(text, file.name)
        onTask(imported)
        fit(imported.turnpoints)
      }
    } catch (cause) {
      if (id === request.current)
        setError(cause instanceof Error ? tr(cause.message) : tr('Ошибка импорта'))
    } finally {
      if (id === request.current) setBusy(false)
    }
  }
  const points = tab === 'points' ? waypoints : (task?.turnpoints ?? [])
  const filtered = points.filter((p) =>
    `${p.name} ${p.description ?? ''}`.toLocaleLowerCase().includes(query.toLocaleLowerCase()),
  )
  return (
    <section className="navigation-panel">
      <div className="inspector-tabs" role="tablist" aria-label={tr('Навигационные данные')}>
        <button
          role="tab"
          disabled={busy}
          aria-selected={tab === 'points'}
          onClick={() => {
            setTab('points')
            setQuery('')
            setError('')
          }}
        >
          <MapPin size={16} />
          {tr('Точки · {n}', { n: waypoints.length })}
        </button>
        <button
          role="tab"
          disabled={busy}
          aria-selected={tab === 'task'}
          onClick={() => {
            setTab('task')
            setQuery('')
            setError('')
          }}
        >
          <Flag size={16} />
          {tr('Задача · {n}', { n: task?.turnpoints.length ?? 0 })}
        </button>
      </div>
      <div className="navigation-import">
        <div>
          <h3>
            {tab === 'points'
              ? tr('Коллекция навигационных точек')
              : (task?.name ?? tr('Соревновательная задача'))}
          </h3>
          <p>
            {tab === 'points'
              ? tr('GEO WPT, SeeYou CUP или GPX. Выберите точку как цель навигации.')
              : tr('XCTSK версии 1. Поворотные точки, старт и финиш отображаются на карте.')}
          </p>
        </div>
        <label className="navigation-upload">
          <Upload size={16} />
          {busy ? tr('Загрузка…') : tr('Загрузить файл')}
          <input
            aria-label={
              tab === 'points' ? tr('Файл навигационных точек') : tr('Файл соревновательной задачи')
            }
            type="file"
            accept={tab === 'points' ? '.wpt,.cup,.gpx' : '.xctsk,.json'}
            disabled={busy}
            onChange={(event) => {
              void load(event.target.files?.[0])
              event.target.value = ''
            }}
          />
        </label>
      </div>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {tab === 'task' && task && (
        <p className="navigation-summary">
          {task.startTime === undefined
            ? tr('Старт без заданного времени')
            : tr('Старт UTC · {time}', {
                time: new Date(task.startTime * 1000).toISOString().slice(11, 19),
              })}{' '}
          · {tr('{n} точек', { n: task.turnpoints.length })}
        </p>
      )}
      {points.length ? (
        <>
          <div className="navigation-tools">
            <input
              type="search"
              aria-label={tr('Поиск навигационной точки')}
              placeholder={tr('Найти точку…')}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button onClick={() => fit(points)}>{tr('Показать на карте')}</button>
            <button
              aria-label={tab === 'points' ? tr('Очистить точки') : tr('Очистить задачу')}
              onClick={() => {
                if (tab === 'points') onWaypoints([], '')
                else onTask(null)
              }}
            >
              <Trash2 size={16} />
            </button>
          </div>
          <div className="navigation-list">
            {filtered.slice(0, 200).map((p, i) => (
              <div className="navigation-row" key={`${p.name}-${p.lat}-${p.lon}-${i}`}>
                <span className="navigation-number">
                  {tab === 'points' ? <MapPin size={16} /> : points.indexOf(p) + 1}
                </span>
                <div>
                  <strong>{p.name}</strong>
                  <small>
                    {p.description ||
                      (p.type === 'TAKEOFF'
                        ? tr('Взлёт')
                        : p.type === 'SSS'
                          ? tr('Старт скоростного участка')
                          : p.type === 'ESS'
                            ? tr('Конец скоростного участка')
                            : p.type === 'GOAL'
                              ? tr('Финиш')
                              : tr('Навигационная точка'))}
                    {tab === 'task' ? ` · ${tr('радиус {n} м', { n: p.radius })}` : ''}
                  </small>
                </div>
                {tab === 'points' && (
                  <button
                    aria-pressed={target === p}
                    onClick={() => onTarget(target === p ? null : p)}
                  >
                    {target === p ? tr('Цель выбрана') : tr('Выбрать цель')}
                  </button>
                )}
              </div>
            ))}
            {filtered.length > 200 && <p>{tr('Показаны первые 200 точек. Уточните поиск.')}</p>}
          </div>
        </>
      ) : (
        <div className="navigation-empty">
          <MapPin size={32} />
          <h3>{tab === 'points' ? tr('Точки ещё не загружены') : tr('Задача ещё не загружена')}</h3>
          <p>{tr('Загрузите файл для предпросмотра навигационных виджетов.')}</p>
        </div>
      )}
      <p className="navigation-note">
        {tr(
          'Данные используются в редакторе и симуляции; в экспорт XCFG не входят. Задача имеет приоритет над отдельно выбранной целью.',
        )}
      </p>
      <div className="dialog-footer">
        <button onClick={close}>{tr('Готово')}</button>
      </div>
    </section>
  )
}
