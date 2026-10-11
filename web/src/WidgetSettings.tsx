import { tr } from './i18n'
import { useEffect, useState } from 'react'
import type { Json, Widget } from './xcfg'
import { libraryWidget } from './widget-library'
import { ColorPicker } from './ColorPicker'
import {
  settingLabel,
  settingHints,
  settingChoices,
  optionLabels,
  mapRotations,
} from './setting-labels'

export function WidgetSettings({
  widget,
  disabled,
  apply,
  preview,
}: {
  widget: Widget
  disabled: boolean
  apply: (settings: Record<string, Json>) => void
  preview: (draft: { widget: Widget; fields: Record<string, Json> } | null) => void
}) {
  const [draft, setDraft] = useState<Record<string, Json>>({})
  const value = (key: string) => (Object.hasOwn(draft, key) ? draft[key] : widget[key])
  useEffect(() => () => preview(null), [preview])
  const set = (key: string, value: Json) => {
    const fields = { ...draft, [key]: value }
    setDraft(fields)
    preview({ widget, fields })
  }
  const entry = libraryWidget(widget.CLASS)
  const known = entry?.settings.some((setting) => setting.key === '_title') ?? false
  const objectValue = (key: string, fallback: Json | undefined): Record<string, Json> => {
    const current = value(key) ?? fallback
    return current && typeof current === 'object' && !Array.isArray(current) ? current : {}
  }
  const specific =
    entry?.settings.filter(
      (setting) =>
        !['_theme', '_title', '_unit', '_hide_labels', '_bg', '_border', 'titletext'].includes(
          setting.key,
        ),
    ) ?? []
  return (
    <form
      className="settings"
      onSubmit={(event) => {
        event.preventDefault()
        apply(draft)
        setDraft({})
        preview(null)
      }}
    >
      <fieldset disabled={disabled}>
        <legend>{tr('Оформление виджета')}</legend>
        <div className="widget-appearance">
          <h3>{tr('Внешний вид')}</h3>
          <label>
            {tr('Тема')}
            <select
              aria-label={tr('Тема')}
              value={String(value('_theme') ?? '')}
              onChange={(event) => set('_theme', event.target.value || null)}
            >
              <option value="">{tr('Из настроек XCTrack')}</option>
              {['WhiteTheme', 'WhiteHCTheme', 'BlackTheme', 'BlackHCTheme'].map((theme) => (
                <option key={theme} value={theme}>
                  {tr(optionLabels[theme] ?? theme)}
                </option>
              ))}
              {typeof value('_theme') === 'string' &&
                !['', 'WhiteTheme', 'WhiteHCTheme', 'BlackTheme', 'BlackHCTheme'].includes(
                  String(value('_theme')),
                ) && (
                  <option value={String(value('_theme'))}>
                    {tr('{value} (исходная)', { value: String(value('_theme')) })}
                  </option>
                )}
            </select>
          </label>
          <label>
            <span>
              {tr('Прозрачность фона')} <output>{Number(value('_bg') ?? 0)} %</output>
            </span>
            <input
              aria-label={tr('Прозрачность фона, %')}
              type="range"
              min={0}
              max={100}
              step={1}
              value={typeof value('_bg') === 'number' ? Number(value('_bg')) : 0}
              onChange={(event) => set('_bg', event.target.valueAsNumber)}
            />
          </label>
          <label>
            <input
              type="checkbox"
              checked={value('_border') === true}
              onChange={(event) => set('_border', event.target.checked)}
            />{' '}
            {tr('Рамка виджета')}
          </label>
        </div>
        {known && (
          <div className="widget-labels">
            <h3>{tr('Подписи')}</h3>
            {(
              [
                ['_title', 'Показывать заголовок'],
                ['_unit', 'Показывать единицы'],
                ['_hide_labels', 'Скрывать подписи без данных'],
              ] as const
            )
              .filter(([key]) => entry?.settings.some((setting) => setting.key === key))
              .map(([key, label]) => (
                <label key={key}>
                  <input
                    type="checkbox"
                    checked={
                      value(key) === undefined ? key !== '_hide_labels' : value(key) === true
                    }
                    onChange={(event) => set(key, event.target.checked)}
                  />{' '}
                  {tr(label)}
                </label>
              ))}
            <label>
              {tr('Свой заголовок')}
              <input
                maxLength={256}
                value={String(value('titletext') ?? '')}
                onChange={(event) => set('titletext', event.target.value)}
              />
            </label>
            {String(value('titletext') ?? '').length > 0 && (
              <p className="hint">
                {tr('Свой заголовок может требовать XCTrack PRO; здесь он сохраняется в файле.')}
              </p>
            )}
          </div>
        )}
        {specific.length > 0 && (
          <details>
            <summary>{tr('Параметры виджета · {count}', { count: specific.length })}</summary>
            {specific.map((setting) => (
              <div className="native-setting" key={setting.key}>
                <span>{settingLabel(setting.key)}</span>
                {settingHints[setting.key] && <small>{tr(settingHints[setting.key]!)}</small>}
                {setting.key === 'rotation' &&
                typeof setting.default === 'object' &&
                setting.default !== null ? (
                  <>
                    <select
                      aria-label={settingLabel(setting.key)}
                      value={String(
                        objectValue(setting.key, setting.default).value ?? 'NORTH_AT_TOP',
                      )}
                      onChange={(event) =>
                        set(setting.key, {
                          ...objectValue(setting.key, setting.default),
                          value: event.target.value,
                        })
                      }
                    >
                      {mapRotations.map((choice) => (
                        <option key={choice} value={choice}>
                          {tr(optionLabels[choice] ?? choice)}
                        </option>
                      ))}
                      {!mapRotations.includes(
                        String(objectValue(setting.key, setting.default).value),
                      ) && (
                        <option value={String(objectValue(setting.key, setting.default).value)}>
                          {tr('{value} (из файла)', {
                            value: String(objectValue(setting.key, setting.default).value),
                          })}
                        </option>
                      )}
                    </select>
                    <label>
                      <input
                        type="checkbox"
                        checked={objectValue(setting.key, setting.default).showCompass === true}
                        onChange={(event) =>
                          set(setting.key, {
                            ...objectValue(setting.key, setting.default),
                            showCompass: event.target.checked,
                          })
                        }
                      />{' '}
                      {tr('Показывать указатель севера')}
                    </label>
                  </>
                ) : setting.type === 'scale' ? (
                  <>
                    <label>
                      <input
                        type="checkbox"
                        checked={objectValue(setting.key, setting.default).auto === true}
                        onChange={(event) =>
                          set(setting.key, {
                            ...objectValue(setting.key, setting.default),
                            auto: event.target.checked,
                          })
                        }
                      />{' '}
                      {tr('Автоматический масштаб:')} {settingLabel(setting.key)}
                    </label>
                    <label>
                      {tr('Уровень:')} {settingLabel(setting.key)}
                      <input
                        type="number"
                        step="1"
                        value={Number(objectValue(setting.key, setting.default).value ?? 0)}
                        onChange={(event) => {
                          if (Number.isFinite(event.target.valueAsNumber))
                            set(setting.key, {
                              ...objectValue(setting.key, setting.default),
                              value: event.target.valueAsNumber,
                            })
                        }}
                      />
                    </label>
                    <label>
                      <input
                        type="checkbox"
                        checked={
                          objectValue(setting.key, setting.default).resetZoomPanExit === true
                        }
                        onChange={(event) =>
                          set(setting.key, {
                            ...objectValue(setting.key, setting.default),
                            resetZoomPanExit: event.target.checked,
                          })
                        }
                      />{' '}
                      {tr('Сбрасывать масштаб после сдвига карты')}
                    </label>
                  </>
                ) : setting.type === 'boolean' ? (
                  <input
                    type="checkbox"
                    aria-label={settingLabel(setting.key)}
                    checked={(value(setting.key) ?? setting.default) === true}
                    onChange={(event) => set(setting.key, event.target.checked)}
                  />
                ) : setting.type === 'color' ? (
                  <ColorPicker
                    label={settingLabel(setting.key)}
                    value={Number(value(setting.key) ?? setting.default ?? -1)}
                    onChange={(color) => set(setting.key, color)}
                  />
                ) : setting.type === 'enum' &&
                  settingChoices(setting.key, setting.default, widget.CLASS) ? (
                  <select
                    aria-label={settingLabel(setting.key)}
                    value={typeof value(setting.key) === 'string' ? String(value(setting.key)) : ''}
                    onChange={(event) => set(setting.key, event.target.value || null)}
                  >
                    <option value="">
                      {tr('По умолчанию:')}{' '}
                      {tr(optionLabels[String(setting.default)] ?? String(setting.default))}
                    </option>
                    {settingChoices(setting.key, setting.default, widget.CLASS)!.map((choice) => (
                      <option key={choice} value={choice}>
                        {tr(optionLabels[choice] ?? choice)}
                      </option>
                    ))}
                    {typeof value(setting.key) === 'string' &&
                      !settingChoices(setting.key, setting.default, widget.CLASS)!.includes(
                        String(value(setting.key)),
                      ) && (
                        <option value={String(value(setting.key))}>
                          {tr('{value} (из файла)', { value: String(value(setting.key)) })}
                        </option>
                      )}
                  </select>
                ) : ['integer', 'number', 'string', 'enum'].includes(setting.type) ? (
                  <input
                    aria-label={settingLabel(setting.key)}
                    type={
                      ['integer', 'number', 'color'].includes(setting.type) ||
                      (setting.type === 'enum' && typeof setting.default === 'number')
                        ? 'number'
                        : 'text'
                    }
                    step={setting.type === 'number' ? 'any' : '1'}
                    value={
                      typeof value(setting.key) === 'number' ||
                      typeof value(setting.key) === 'string'
                        ? String(value(setting.key))
                        : ''
                    }
                    placeholder={
                      setting.default === undefined
                        ? tr('Штатное значение')
                        : String(setting.default)
                    }
                    onChange={(event) =>
                      set(
                        setting.key,
                        event.target.value === ''
                          ? null
                          : ['integer', 'number', 'color'].includes(setting.type) ||
                              (setting.type === 'enum' && typeof setting.default === 'number')
                            ? event.target.valueAsNumber
                            : event.target.value,
                      )
                    }
                  />
                ) : (
                  <small>
                    {tr('Дополнительная настройка — откройте технические параметры (JSON)')}
                  </small>
                )}
                <button
                  type="button"
                  title={setting.key}
                  aria-label={tr('Вернуть по умолчанию: {label}', {
                    label: settingLabel(setting.key),
                  })}
                  onClick={() => set(setting.key, null)}
                >
                  {tr('По умолчанию')}
                </button>
              </div>
            ))}
          </details>
        )}
        <button disabled={!Object.keys(draft).length}>{tr('Применить оформление')}</button>
      </fieldset>
    </form>
  )
}
