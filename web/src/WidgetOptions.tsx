import { tr } from './i18n'
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
      <summary>{tr('Технические параметры (JSON)')}</summary>
      <p className="hint">
        {tr(
          'Штатные и неизвестные параметры сохраняются. Отсутствующие поля использует XCTrack по умолчанию. Удаление ключа сбрасывает override; null сохраняется как null. Адреса и команды здесь не выполняются.',
        )}
      </p>
      <form
        onSubmit={(event) => {
          event.preventDefault()
          apply(draft)
        }}
      >
        <label>
          {tr('Параметры JSON')}
          <textarea
            aria-label={tr('Параметры JSON')}
            spellCheck={false}
            disabled={disabled}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
          />
        </label>
        <button disabled={disabled}>{tr('Применить параметры виджета')}</button>
      </form>
      <p className="hint">
        {tr('Исходные ключи: {keys}', {
          keys: Object.keys(options).join(', ') || tr('нет overrides'),
        })}
      </p>
    </details>
  )
}
