import { useState } from 'react'
import type { Json } from './xcfg'
import { ColorPicker } from './ColorPicker'
import {
  displayChoices,
  displayColorKeys,
  displayDefaults,
  validateDisplayFields,
  unitChoices,
  unitLabels,
} from './display-settings'

type Props = {
  onCancel?: () => void
  preferences: Record<string, Json>
  disabled: boolean
  apply: (fields: Record<string, Json>) => void
  onApplied?: () => void
}

const labels: Record<string, string> = {
  'Display.Language': 'Язык интерфейса',
  'Display.Theme': 'Тема экрана',
  'Display.Fullscreen': 'Полноэкранный режим',
  'Display.Orientation': 'Ориентация экрана',
  'Display.RepaintInterval': 'Частота обновления',
  'Display.WidgetTitleSize': 'Размер заголовков',
  'Display.WidgetTitleFont': 'Шрифт заголовков',
  'Display.WidgetTitleColor': 'Цвет заголовков',
  'Display.WidgetTitleOutline': 'Обводка заголовков',
  'Display.WidgetTitleOutlineColor': 'Цвет обводки',
}

export function DisplayPanel({ preferences, disabled, apply, onApplied, onCancel }: Props) {
  const [draft, setDraft] = useState<{
    source: Record<string, Json>
    fields: Record<string, Json>
  }>({ source: preferences, fields: {} })
  const [error, setError] = useState('')
  const fields = draft.source === preferences ? draft.fields : {}
  const current = (key: string): Json =>
    fields[key] ?? preferences[key] ?? displayDefaults[key] ?? null
  const change = (key: string, value: Json) => {
    setError('')
    setDraft({ source: preferences, fields: { ...fields, [key]: value } })
  }
  const submit = () => {
    try {
      const changed: Record<string, Json> = {}
      for (const [key, raw] of Object.entries(fields)) {
        const value = raw
        const original = preferences[key] ?? displayDefaults[key]
        const same =
          displayColorKeys.includes(key) &&
          typeof original === 'number' &&
          typeof value === 'number'
            ? original >>> 0 === value >>> 0
            : value === original
        if (!same) changed[key] = value
      }
      validateDisplayFields(changed)
      if (Object.keys(changed).length) apply(changed)
      setDraft({ source: preferences, fields: {} })
      onApplied?.()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Не удалось применить настройки')
    }
  }
  const renderSetting = (key: string) => {
    const value = current(key)
    const choices = displayChoices[key]
    if (choices) {
      const selected = String(value)
      return (
        <label key={key}>
          {labels[key]}
          <select
            aria-label={labels[key]}
            value={selected}
            onChange={(event) => change(key, event.target.value)}
          >
            {!choices.some(([option]) => option === selected) && (
              <option value={selected}>Исходное: {selected}</option>
            )}
            {choices.map(([option, label]) => (
              <option key={option} value={option}>
                {label}
              </option>
            ))}
          </select>
        </label>
      )
    }
    if (displayColorKeys.includes(key)) {
      return (
        <div className="native-setting display-color-row" key={key}>
          <span>{labels[key]}</span>
          <ColorPicker
            label={labels[key]!}
            value={Number(value)}
            onChange={(color) => change(key, color)}
          />
        </div>
      )
    }
    return (
      <label key={key} className="checkbox switch-row">
        <span>{labels[key]}</span>
        <input
          type="checkbox"
          checked={value === true}
          onChange={(event) => change(key, event.target.checked)}
        />
      </label>
    )
  }
  return (
    <section className="settings configuration-panel display-panel">
      <form
        onSubmit={(event) => {
          event.preventDefault()
          submit()
        }}
      >
        <fieldset disabled={disabled} className="display-form-content">
          <h3>Отображение в XCTrack</h3>
          <div className="configuration-grid form-columns">
            {[
              'Display.Language',
              'Display.Theme',
              'Display.Orientation',
              'Display.RepaintInterval',
            ].map(renderSetting)}
          </div>
          {renderSetting('Display.Fullscreen')}
          <h3>Заголовки виджетов</h3>
          <div className="configuration-grid form-columns">
            {['Display.WidgetTitleSize', 'Display.WidgetTitleFont'].map(renderSetting)}
          </div>
          {renderSetting('Display.WidgetTitleColor')}
          {renderSetting('Display.WidgetTitleOutline')}
          {current('Display.WidgetTitleOutline') === true &&
            renderSetting('Display.WidgetTitleOutlineColor')}
          <details className="screen-units">
            <summary>Единицы измерения</summary>
            <div className="unit-settings">
              {Object.entries(unitChoices).map(([key, choices]) => {
                const selected = String(fields[key] ?? preferences[key] ?? '')
                return (
                  <label key={key}>
                    {unitLabels[key]}
                    <select
                      aria-label={`Единицы: ${unitLabels[key]}`}
                      value={selected}
                      onChange={(event) => change(key, event.target.value)}
                    >
                      {!choices.some(([option]) => option === selected) && (
                        <option value={selected}>
                          {selected ? `Исходное: ${selected}` : 'По умолчанию XCTrack'}
                        </option>
                      )}
                      {choices.map(([option, label]) => (
                        <option key={option} value={option}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>
                )
              })}
            </div>
          </details>
          <details>
            <summary>Особенности предпросмотра</summary>
            <p className="hint display-compatibility-hint">
              Полноэкранный режим, ориентация и частота обновления сохраняются для XCTrack;
              браузерный предпросмотр их не выполняет, языки предпросмотра — русский и английский.
            </p>
          </details>
        </fieldset>
        <div className="dialog-footer display-form-footer">
          {onCancel && (
            <button type="button" className="cancel-button" onClick={onCancel}>
              Отмена
            </button>
          )}
          <button type="submit" disabled={disabled || !Object.keys(fields).length}>
            Применить настройки экрана
          </button>
        </div>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
      </form>
    </section>
  )
}
