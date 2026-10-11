import { tr } from './i18n'
import { useState } from 'react'
import type { FlightSettings, IGCReplay, Turnpoint } from './flight-engine'

type Props = {
  settings: FlightSettings
  onChange: (settings: FlightSettings) => void
  replay: IGCReplay | null
}
const fields: {
  key:
    | 'latitude'
    | 'longitude'
    | 'initialAltitude'
    | 'airSpeed'
    | 'windSpeed'
    | 'windFrom'
    | 'glideRatio'
    | 'startTime'
  label: string
  min: number
  max: number
  step: number
}[] = [
  { key: 'latitude', label: 'Широта старта', min: -85, max: 85, step: 0.0001 },
  { key: 'longitude', label: 'Долгота старта', min: -180, max: 180, step: 0.0001 },
  { key: 'initialAltitude', label: 'Начальная высота, м', min: -500, max: 9000, step: 1 },
  { key: 'airSpeed', label: 'Воздушная скорость, м/с', min: 0, max: 100, step: 0.1 },
  { key: 'windSpeed', label: 'Ветер, м/с', min: 0, max: 100, step: 0.1 },
  { key: 'windFrom', label: 'Ветер от, °', min: 0, max: 359, step: 1 },
  { key: 'glideRatio', label: 'Качество модели', min: 1, max: 100, step: 0.1 },
  { key: 'startTime', label: 'Время старта UTC, с от полуночи', min: 0, max: 86399, step: 1 },
]

function readTask(text: string): Turnpoint[] {
  if (text.length > 64000) throw new Error(tr('Маршрут слишком большой'))
  const value: unknown = JSON.parse(text)
  if (!Array.isArray(value) || value.length > 100)
    throw new Error(tr('Ожидается массив до 100 точек'))
  return value.map((entry: unknown, index: number) => {
    if (!entry || typeof entry !== 'object')
      throw new Error(tr('Точка {n}: ожидается объект', { n: index + 1 }))
    const p = entry as Record<string, unknown>
    if (
      typeof p.name !== 'string' ||
      p.name.length > 100 ||
      typeof p.lat !== 'number' ||
      !Number.isFinite(p.lat) ||
      Math.abs(p.lat) > 90 ||
      typeof p.lon !== 'number' ||
      !Number.isFinite(p.lon) ||
      Math.abs(p.lon) > 180 ||
      typeof p.radius !== 'number' ||
      !Number.isFinite(p.radius) ||
      p.radius < 1 ||
      p.radius > 10000 ||
      (p.altitude !== null &&
        (typeof p.altitude !== 'number' ||
          !Number.isFinite(p.altitude) ||
          p.altitude < -500 ||
          p.altitude > 9000))
    )
      throw new Error(
        tr('Точка {n}: неверные имя, координаты, высота или радиус', { n: index + 1 }),
      )
    return {
      name: p.name,
      lat: p.lat,
      lon: p.lon,
      altitude: p.altitude as number | null,
      radius: p.radius,
    }
  })
}

export function FlightPanel({ settings, onChange, replay }: Props) {
  const [route, setRoute] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [terrain, setTerrain] = useState<string | null>(null)
  return (
    <details className="settings flight-panel">
      <summary>{tr('Полёт и маршрут')}</summary>
      <p className="hint">
        {tr(
          'Учебная модель: прямой планирующий полёт или спираль в термике. Расчёты навигации приближённые. Данные не меняют XCFG.',
        )}
      </p>
      {!replay &&
        fields.map(({ key, label, min, max, step }) => (
          <label key={key}>
            {tr(label)}
            <input
              aria-label={tr(label)}
              type="number"
              min={min}
              max={max}
              step={step}
              value={settings[key]}
              onChange={(e) => {
                const value = e.currentTarget.valueAsNumber
                if (Number.isFinite(value) && value >= min && value <= max)
                  onChange({ ...settings, [key]: value })
              }}
            />
          </label>
        ))}
      {!replay && (
        <details>
          <summary>{tr('GPS и внешние данные')}</summary>
          <label>
            <input
              aria-label={tr('GPS доступен')}
              type="checkbox"
              checked={settings.gpsAvailable !== false}
              onChange={(e) => onChange({ ...settings, gpsAvailable: e.target.checked })}
            />{' '}
            {tr('GPS доступен')}
          </label>
          <label>
            {tr('Заряд, %')}
            <input
              aria-label={tr('Заряд батареи модели')}
              type="number"
              min={0}
              max={100}
              value={settings.batteryPercent ?? ''}
              placeholder={tr('Неизвестно')}
              onChange={(e) => {
                const v = e.target.valueAsNumber
                if (e.target.value === '' || (Number.isFinite(v) && v >= 0 && v <= 100))
                  onChange({ ...settings, batteryPercent: e.target.value === '' ? null : v })
              }}
            />
          </label>
          {(['sensors', 'live'] as const).map((key) => (
            <label key={key}>
              {key === 'sensors' ? tr('Внешние датчики') : 'Live tracking'}
              <select
                aria-label={
                  key === 'sensors' ? tr('Внешние датчики модели') : tr('Live tracking модели')
                }
                value={settings[key] === true ? 'yes' : settings[key] === false ? 'no' : 'unknown'}
                onChange={(e) =>
                  onChange({
                    ...settings,
                    [key]: e.target.value === 'unknown' ? null : e.target.value === 'yes',
                  })
                }
              >
                <option value="unknown">{tr('Неизвестно')}</option>
                <option value="yes">{tr('Доступно')}</option>
                <option value="no">{tr('Недоступно')}</option>
              </select>
            </label>
          ))}
        </details>
      )}
      <details>
        <summary>{tr('Явный профиль рельефа')}</summary>
        <p className="hint">
          {tr(
            'Без данных рельеф отсутствует. JSON: массив distance (м впереди) и altitude (м AMSL). Максимум 200 точек; это заданный профиль для проверки бокового вида, а не географическая DEM.',
          )}
        </p>
        <textarea
          aria-label={tr('Профиль рельефа JSON')}
          rows={5}
          style={{ width: '100%', boxSizing: 'border-box' }}
          value={terrain ?? JSON.stringify(settings.terrainProfile ?? [], null, 2)}
          onChange={(e) => setTerrain(e.target.value)}
        />
        <button
          onClick={() => {
            try {
              const text = terrain ?? JSON.stringify(settings.terrainProfile ?? [])
              if (text.length > 32000) throw new Error(tr('Профиль слишком большой'))
              const parsed: unknown = JSON.parse(text)
              if (!Array.isArray(parsed) || parsed.length > 200)
                throw new Error(tr('Ожидается массив до 200 точек'))
              let previous = -1
              const profile = parsed.map((p: unknown) => {
                if (!p || typeof p !== 'object') throw new Error(tr('Неверная точка профиля'))
                const value = p as Record<string, unknown>
                if (
                  typeof value.distance !== 'number' ||
                  !Number.isFinite(value.distance) ||
                  value.distance < 0 ||
                  value.distance > 1000000 ||
                  value.distance <= previous ||
                  typeof value.altitude !== 'number' ||
                  !Number.isFinite(value.altitude) ||
                  value.altitude < -500 ||
                  value.altitude > 9000
                )
                  throw new Error(tr('Расстояния должны возрастать; высоты от −500 до 9000 м'))
                previous = value.distance
                return { distance: value.distance, altitude: value.altitude }
              })
              onChange({ ...settings, terrainProfile: profile })
              setTerrain(null)
              setError('')
            } catch (cause) {
              setError(cause instanceof Error ? tr(cause.message) : tr('Неверный профиль'))
            }
          }}
        >
          {tr('Применить профиль рельефа')}
        </button>
      </details>
      <details>
        <summary>{tr('Маршрут · {n} точек', { n: settings.task.length })}</summary>
        <p className="hint">
          {tr(
            'JSON: name, lat, lon, altitude (м или null), radius (м). Высоты задаются явно; рельеф не предполагается. ETA предполагает прямой полёт с текущей скоростью.',
          )}
        </p>
        <textarea
          aria-label={tr('Маршрут JSON')}
          rows={7}
          style={{ width: '100%', boxSizing: 'border-box' }}
          value={route ?? JSON.stringify(settings.task, null, 2)}
          onChange={(e) => setRoute(e.target.value)}
        />
        <button
          onClick={() => {
            try {
              onChange({ ...settings, task: readTask(route ?? JSON.stringify(settings.task)) })
              setRoute(null)
              setError('')
            } catch (cause) {
              setError(cause instanceof Error ? tr(cause.message) : tr('Неверный маршрут'))
            }
          }}
        >
          {tr('Применить маршрут')}
        </button>
        <button
          onClick={() => {
            onChange({
              ...settings,
              task: [
                {
                  name: 'Финиш',
                  lat: Math.min(85, settings.latitude + 0.03),
                  lon: Math.min(180, settings.longitude + 0.05),
                  altitude: 1000,
                  radius: 400,
                },
              ],
            })
            setRoute(null)
            setError('')
          }}
        >
          {tr('Пример маршрута')}
        </button>
      </details>
      {error && <p role="alert">{error}</p>}
    </details>
  )
}
