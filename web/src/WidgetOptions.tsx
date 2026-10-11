import { useState } from 'react'
import type { Widget } from './xcfg'

export function WidgetOptions({
  widget,
  disabled,
  apply,
}: {
  widget: Widget
  disabled: boolean
  apply: (json: string) => void
}) {
  const options = Object.fromEntries(
    Object.entries(widget).filter(([key]) => !['CLASS', 'X1', 'Y1', 'X2', 'Y2'].includes(key)),
  )
  const [draft, setDraft] = useState(JSON.stringify(options, null, 2))
  return (
    <details className="widget-options">
      <summary>Технические параметры (JSON)</summary>
      <p className="hint">
        Штатные и неизвестные параметры сохраняются. Отсутствующие поля использует XCTrack по
        умолчанию. Удаление ключа сбрасывает override; null сохраняется как null. Адреса и команды
        здесь не выполняются.
      </p>
      <form
        onSubmit={(event) => {
          event.preventDefault()
          apply(draft)
        }}
      >
        <label>
          Параметры JSON
          <textarea
            aria-label="Параметры JSON"
            spellCheck={false}
            disabled={disabled}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
          />
        </label>
        <button disabled={disabled}>Применить параметры виджета</button>
      </form>
      <p className="hint">Исходные ключи: {Object.keys(options).join(', ') || 'нет overrides'}</p>
    </details>
  )
}
