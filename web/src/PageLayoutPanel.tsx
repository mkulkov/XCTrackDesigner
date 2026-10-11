import { useState } from 'react'
import type { ReactNode } from 'react'
import type { Json, Page, Orientation } from './xcfg'
const modes = [
  ['TaskBackToTakeoff', 'Возврат к старту'],
  ['TaskTriangleClosing', 'Замыкание треугольника'],
  ['TaskToWaypoint', 'Полёт к точке'],
  ['TaskCompetition', 'Соревнование'],
] as const

export function PageLayoutPanel({
  page,
  index,
  orientation,
  disabled,
  apply,
  children,
}: {
  page?: Page
  index: number
  orientation: Orientation
  disabled: boolean
  apply: (fields: Record<string, Json>) => void
  children: ReactNode
}) {
  const [draft, setDraft] = useState<Record<string, Json>>({})
  const value = (key: string) => (Object.hasOwn(draft, key) ? draft[key] : page?.[key])
  const navigations =
    value('navigations') ??
    (value('CLASS') === 'org.xcontest.XCTrack.widget.wp.WPCompetition'
      ? ['org.xcontest.XCTrack.navig.TaskCompetition']
      : 'all')
  const mode =
    navigations === 'all' || navigations === undefined
      ? 'all'
      : navigations === 'none'
        ? 'none'
        : Array.isArray(navigations)
          ? 'selected'
          : 'unknown'
  return (
    <section
      className="settings configuration-panel page-layout-panel"
      aria-label={`${orientation === 'portrait' ? 'Портретная' : 'Альбомная'} страница ${index + 1}`}
    >
      {page && (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            apply(
              Array.isArray(draft.navigations) && !draft.navigations.length
                ? { ...draft, navigations: 'none' }
                : draft,
            )
            setDraft({})
          }}
        >
          <fieldset disabled={disabled} className="configuration-grid">
            <label>
              Тип страницы
              <select
                aria-label="Тип страницы"
                value={String(value('CLASS'))}
                onChange={(e) => setDraft({ ...draft, CLASS: e.target.value })}
              >
                <option value="org.xcontest.XCTrack.widget.wp.WPXCAssistant">XC-помощник</option>
                <option value="org.xcontest.XCTrack.widget.wp.WPCompetition">Соревнование</option>
                {![
                  'org.xcontest.XCTrack.widget.wp.WPXCAssistant',
                  'org.xcontest.XCTrack.widget.wp.WPCompetition',
                ].includes(String(value('CLASS'))) && (
                  <option value={String(value('CLASS'))}>Другой тип из конфигурации</option>
                )}
              </select>
            </label>
            <label>
              Доступность страницы
              <select
                aria-label="Доступность страницы"
                value={mode}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    navigations:
                      e.target.value === 'all'
                        ? 'all'
                        : e.target.value === 'none'
                          ? 'none'
                          : ['org.xcontest.XCTrack.navig.TaskCompetition'],
                  })
                }
              >
                <option value="all">Во всех режимах навигации</option>
                <option value="none">Не показывать</option>
                <option value="selected">В выбранных режимах</option>
                {mode === 'unknown' && <option value="unknown">Значение из конфигурации</option>}
              </select>
            </label>
            {mode === 'selected' && (
              <fieldset className="page-navigation-modes">
                <legend>Режимы навигации</legend>
                {modes.map(([key, label]) => {
                  const name = `org.xcontest.XCTrack.navig.${key}`
                  const current = Array.isArray(navigations) ? navigations : []
                  return (
                    <label key={key}>
                      <input
                        type="checkbox"
                        checked={current.includes(name)}
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            navigations: e.target.checked
                              ? [...current, name]
                              : current.filter((v) => v !== name),
                          })
                        }
                      />
                      {label}
                    </label>
                  )
                })}
              </fieldset>
            )}
            <button type="submit">Применить параметры страницы</button>
          </fieldset>
        </form>
      )}
      <div className="widget-actions page-tools">{children}</div>
    </section>
  )
}
