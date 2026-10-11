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
  if (text.length > 64000) throw new Error('Маршрут слишком большой')
  const value: unknown = JSON.parse(text)
  if (!Array.isArray(value) || value.length > 100) throw new Error('Ожидается массив до 100 точек')
  return value.map((entry: unknown, index: number) => {
    if (!entry || typeof entry !== 'object') throw new Error(`Точка ${index + 1}: ожидается объект`)
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
      throw new Error(`Точка ${index + 1}: неверные имя, координаты, высота или радиус`)
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
      <summary>Полёт и маршрут</summary>
      <p className="hint">
        Учебная модель: прямой планирующий полёт или спираль в термике. Расчёты навигации
        приближённые. Данные не меняют XCFG.
      </p>
      {!replay &&
        fields.map(({ key, label, min, max, step }) => (
          <label key={key}>
            {label}
            <input
              aria-label={label}
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
          <summary>GPS и внешние данные</summary>
          <label>
            <input
              aria-label="GPS доступен"
              type="checkbox"
              checked={settings.gpsAvailable !== false}
              onChange={(e) => onChange({ ...settings, gpsAvailable: e.target.checked })}
            />{' '}
            GPS доступен
          </label>
          <label>
            Заряд, %
            <input
              aria-label="Заряд батареи модели"
              type="number"
              min={0}
              max={100}
              value={settings.batteryPercent ?? ''}
              placeholder="Неизвестно"
              onChange={(e) => {
                const v = e.target.valueAsNumber
                if (e.target.value === '' || (Number.isFinite(v) && v >= 0 && v <= 100))
                  onChange({ ...settings, batteryPercent: e.target.value === '' ? null : v })
              }}
            />
          </label>
          {(['sensors', 'live'] as const).map((key) => (
            <label key={key}>
              {key === 'sensors' ? 'Внешние датчики' : 'Live tracking'}
              <select
                aria-label={key === 'sensors' ? 'Внешние датчики модели' : 'Live tracking модели'}
                value={settings[key] === true ? 'yes' : settings[key] === false ? 'no' : 'unknown'}
                onChange={(e) =>
                  onChange({
                    ...settings,
                    [key]: e.target.value === 'unknown' ? null : e.target.value === 'yes',
                  })
                }
              >
                <option value="unknown">Неизвестно</option>
                <option value="yes">Доступно</option>
                <option value="no">Недоступно</option>
              </select>
            </label>
          ))}
        </details>
      )}
      <details>
        <summary>Явный профиль рельефа</summary>
        <p className="hint">
          Без данных рельеф отсутствует. JSON: массив distance (м впереди) и altitude (м AMSL).
          Максимум 200 точек; это заданный профиль для проверки бокового вида, а не географическая
          DEM.
        </p>
        <textarea
          aria-label="Профиль рельефа JSON"
          rows={5}
          style={{ width: '100%', boxSizing: 'border-box' }}
          value={terrain ?? JSON.stringify(settings.terrainProfile ?? [], null, 2)}
          onChange={(e) => setTerrain(e.target.value)}
        />
        <button
          onClick={() => {
            try {
              const text = terrain ?? JSON.stringify(settings.terrainProfile ?? [])
              if (text.length > 32000) throw new Error('Профиль слишком большой')
              const parsed: unknown = JSON.parse(text)
              if (!Array.isArray(parsed) || parsed.length > 200)
                throw new Error('Ожидается массив до 200 точек')
              let previous = -1
              const profile = parsed.map((p: unknown) => {
                if (!p || typeof p !== 'object') throw new Error('Неверная точка профиля')
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
                  throw new Error('Расстояния должны возрастать; высоты от −500 до 9000 м')
                previous = value.distance
                return { distance: value.distance, altitude: value.altitude }
              })
              onChange({ ...settings, terrainProfile: profile })
              setTerrain(null)
              setError('')
            } catch (cause) {
              setError(cause instanceof Error ? cause.message : 'Неверный профиль')
            }
          }}
        >
          Применить профиль рельефа
        </button>
      </details>
      <details>
        <summary>Маршрут · {settings.task.length} точек</summary>
        <p className="hint">
          JSON: name, lat, lon, altitude (м или null), radius (м). Высоты задаются явно; рельеф не
          предполагается. ETA предполагает прямой полёт с текущей скоростью.
        </p>
        <textarea
          aria-label="Маршрут JSON"
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
              setError(cause instanceof Error ? cause.message : 'Неверный маршрут')
            }
          }}
        >
          Применить маршрут
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
          Пример маршрута
        </button>
      </details>
      {error && <p role="alert">{error}</p>}
    </details>
  )
}
