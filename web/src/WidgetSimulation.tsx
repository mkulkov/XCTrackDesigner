import { tr } from './i18n'
import { useState } from 'react'
export function WidgetSimulation({
  value,
  apply,
  reset,
  resetValue,
  allowsText = true,
}: {
  value: number | string | null | undefined
  apply: (value: number | string | null) => void
  reset?: () => void
  resetValue?: number | string | null
  allowsText?: boolean
}) {
  const [type, setType] = useState(value === undefined || value === null ? 'missing' : typeof value)
  const [draft, setDraft] = useState(String(value ?? ''))
  function update(nextType: string, nextDraft: string) {
    setType(nextType)
    setDraft(nextDraft)
    const number = Number(nextDraft)
    apply(
      nextType === 'missing'
        ? null
        : nextType === 'string'
          ? nextDraft
          : nextDraft.trim() && Number.isFinite(number)
            ? number
            : null,
    )
  }
  return (
    <div className="widget-options">
      <label>
        {tr('Тип показания')}
        <select
          aria-label={tr('Тип показания виджета')}
          value={type}
          onChange={(event) => update(event.target.value, draft)}
        >
          <option value="missing">{tr('Нет данных')}</option>
          <option value="number">{tr('Число в СИ')}</option>
          {allowsText && <option value="string">{tr('Текст')}</option>}
        </select>
      </label>
      {type !== 'missing' && (
        <label>
          {tr('Показание виджета')}
          {type === 'string' ? (
            <textarea
              aria-label={tr('Показание виджета')}
              value={draft}
              onChange={(event) => update(type, event.target.value)}
            />
          ) : (
            <input
              aria-label={tr('Показание виджета')}
              value={draft}
              type={type === 'number' ? 'number' : 'text'}
              step="any"
              onChange={(event) => update(type, event.target.value)}
            />
          )}
        </label>
      )}
      {reset && (
        <button
          type="button"
          onClick={() => {
            setType(resetValue === undefined || resetValue === null ? 'missing' : typeof resetValue)
            setDraft(String(resetValue ?? ''))
            reset()
          }}
        >
          {tr('Использовать данные симуляции')}
        </button>
      )}
      <p className="hint">
        {tr(
          'Независимые тестовые данные: метры, секунды, м/с, градусы, °C, %, hPa. Не вычисляют полётные алгоритмы и не входят в XCFG.',
        )}
      </p>
    </div>
  )
}
