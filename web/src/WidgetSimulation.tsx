import { useState } from 'react'
export function WidgetSimulation({
  value,
  apply,
}: {
  value: number | string | null | undefined
  apply: (value: number | string | null) => void
}) {
  const [type, setType] = useState(value === undefined || value === null ? 'missing' : typeof value)
  const [draft, setDraft] = useState(String(value ?? ''))
  return (
    <form
      className="widget-options"
      onSubmit={(event) => {
        event.preventDefault()
        const result = type === 'missing' ? null : type === 'number' ? Number(draft) : draft
        if (typeof result === 'number' && (!draft.trim() || !Number.isFinite(result))) return
        apply(result)
      }}
    >
      <label>
        Тип показания
        <select
          aria-label="Тип показания виджета"
          value={type}
          onChange={(event) => setType(event.target.value)}
        >
          <option value="missing">Нет данных</option>
          <option value="number">Число в СИ</option>
          <option value="string">Текст</option>
        </select>
      </label>
      {type !== 'missing' && (
        <label>
          Показание виджета
          {type === 'string' ? (
            <textarea
              aria-label="Показание виджета"
              value={draft}
              required
              onChange={(event) => setDraft(event.target.value)}
            />
          ) : (
            <input
              aria-label="Показание виджета"
              value={draft}
              required
              type={type === 'number' ? 'number' : 'text'}
              step="any"
              onChange={(event) => setDraft(event.target.value)}
            />
          )}
        </label>
      )}
      <button>Применить показание виджета</button>
      <p className="hint">
        Независимые тестовые данные: метры, секунды, м/с, градусы, °C, %, hPa. Не вычисляют полётные
        алгоритмы и не входят в XCFG.
      </p>
    </form>
  )
}
