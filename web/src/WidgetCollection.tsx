import { libraryWidget, widgetLibrary } from './widget-library'
import { widgetDescription, widgetTitle } from './widget-descriptions'
import { tr } from './i18n'
import { GripVertical, Gauge, Mountain, Map, Radar, Timer, Wind, CircleDot } from 'lucide-react'

const icons: Record<string, typeof Gauge> = {
  WSpeed: Gauge,
  WAMSL: Mountain,
  WXCAssistant: Map,
  WCompMap: Map,
  WThermalAssistant: Radar,
  WAirTime: Timer,
  WWindSpeed: Wind,
}

export function WidgetCollection({
  selected,
  select,
  query,
  search,
  canAdd,
  add,
}: {
  selected: string
  select: (name: string) => void
  query: string
  search: (query: string) => void
  canAdd: boolean
  add: () => void
}) {
  const current = libraryWidget(selected)
  const filtered = widgetLibrary.filter((entry) =>
    `${entry.name} ${widgetTitle(entry.name)} ${entry.titleEn} ${entry.groupTitle} ${tr(entry.groupTitle)}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  )
  const groups = [...new Set(filtered.map((entry) => entry.group))]
  const description = widgetDescription(selected)
  return (
    <aside className="collection-panel" aria-label={tr('Коллекция виджетов')}>
      <h2>{tr('Виджеты')}</h2>
      <input
        aria-label={tr('Поиск виджетов')}
        placeholder={tr('Найти виджет…')}
        value={query}
        onChange={(event) => search(event.target.value)}
      />
      <div className="catalog-list">
        {groups.map((group) => (
          <section key={group}>
            <h3>{tr(filtered.find((entry) => entry.group === group)!.groupTitle)}</h3>
            {filtered
              .filter((entry) => entry.group === group)
              .map((entry) => {
                const Icon = icons[entry.name] ?? CircleDot
                return (
                  <button
                    key={entry.name}
                    data-catalog-widget={entry.name}
                    aria-label={tr('Выбрать виджет {name}', { name: entry.name })}
                    aria-pressed={entry.name === selected}
                    draggable={canAdd}
                    onClick={() => select(entry.name)}
                    onDragStart={(event) => {
                      select(entry.name)
                      event.dataTransfer.setData('application/x-xctrack-widget', entry.name)
                      event.dataTransfer.effectAllowed = 'copy'
                    }}
                  >
                    <Icon size={16} aria-hidden="true" />
                    <span>{widgetTitle(entry.name)}</span>
                    {entry.pro && <small>PRO</small>}
                    {entry.debugOnly && <small>{tr('Диагностика')}</small>}
                    <GripVertical size={14} className="drag-grip" aria-hidden="true" />
                  </button>
                )
              })}
          </section>
        ))}
        {!filtered.length && <p className="hint">{tr('Виджеты не найдены')}</p>}
      </div>
      <div
        className="catalog-description"
        data-testid="widget-description"
        aria-label={tr('Описание виджета')}
        aria-live="polite"
      >
        <h3>{widgetTitle(selected)}</h3>
        <p>{description}</p>
        <small>
          {current ? tr(current.groupTitle) : ''}
          {current?.pro ? ' · XCTrack PRO' : ''}
        </small>
        <p className="hint">{tr('Перетащите на экран или нажмите «Добавить виджет».')}</p>
        <button disabled={!canAdd} onClick={add}>
          {tr('Добавить виджет')}
        </button>
      </div>
    </aside>
  )
}
