import { tr } from './i18n'
type Props = { label: string; value: number; onChange: (value: number) => void }

/** Android ARGB: editing RGB retains the exact alpha byte and vice versa. */
export function ColorPicker({ label, value, onChange }: Props) {
  const argb = value >>> 0
  const alpha = argb >>> 24
  const rgb = `#${(argb & 0xffffff).toString(16).padStart(6, '0')}`
  return (
    <div className="color-picker">
      <input
        type="color"
        aria-label={tr(label)}
        value={rgb}
        onChange={(event) =>
          onChange((argb & 0xff000000) | parseInt(event.target.value.slice(1), 16))
        }
      />
      <label>
        {tr('Прозрачность ·')} {Math.round(((255 - alpha) * 100) / 255)} %
        <input
          type="range"
          aria-label={tr('Прозрачность: {label}', { label })}
          min={0}
          max={255}
          step={1}
          value={255 - alpha}
          onChange={(event) =>
            onChange(((255 - event.target.valueAsNumber) << 24) | (argb & 0xffffff))
          }
        />
      </label>
    </div>
  )
}
