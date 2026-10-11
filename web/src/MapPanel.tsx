import { useEffect, useRef, useState } from 'react'
import { parseAirspaces, parseXContest, tileUrl } from './online-map'
import type { AirspacePolygon, MapSettings } from './online-map'

export function MapPanel({
  settings,
  change,
  airspaces,
  loaded,
}: {
  settings: MapSettings
  change: (settings: MapSettings) => void
  airspaces: AirspacePolygon[]
  loaded: (airspaces: AirspacePolygon[]) => void
}) {
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [thermal, setThermal] = useState(settings.thermalTiles)
  const [dataset, setDataset] = useState('982')
  const [source, setSource] = useState('')
  const [datasets, setDatasets] = useState<{ id: number; label: string }[]>([])
  const controller = useRef<AbortController | null>(null)
  useEffect(() => () => controller.current?.abort(), [])
  const cancel = () => {
    controller.current?.abort()
    controller.current = null
    setBusy(false)
    loaded([])
    setSource('')
  }
  const load = async (endpoint = settings.airspaceUrl, xcontest = false) => {
    cancel()
    setError('')
    const request = new AbortController()
    controller.current = request
    const timeout = setTimeout(() => request.abort(), 15000)
    try {
      const url = new URL(endpoint, window.location.origin)
      if (
        !(xcontest && /^\/__xcontest\/data\/[1-9]\d{0,6}$/.test(endpoint)) &&
        url.protocol !== 'https:'
      )
        throw new Error('Источник должен использовать HTTPS')
      setBusy(true)
      const response = await fetch(url, { signal: request.signal, credentials: 'omit' })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      if (!response.body) throw new Error('Пустой ответ')
      const reader = response.body.getReader()
      const parts: Uint8Array<ArrayBuffer>[] = []
      let size = 0
      while (true) {
        const chunk = await reader.read()
        if (chunk.done) break
        size += chunk.value.byteLength
        if (size > 5 * 1024 * 1024) {
          await reader.cancel()
          throw new Error('Геозоны превышают лимит 5 MiB')
        }
        parts.push(chunk.value.slice())
      }
      const value = JSON.parse(await new Blob(parts).text()) as unknown
      const polygons = xcontest ? parseXContest(value) : parseAirspaces(value)
      if (controller.current === request) {
        loaded(polygons)
        setSource(
          xcontest
            ? `XContest: ${(value as { name?: string; channame?: string }).channame ?? ''} / ${(value as { name?: string }).name ?? dataset}`
            : 'GeoJSON',
        )
      }
    } catch (cause) {
      if (controller.current === request)
        setError(
          `Геозоны не загружены: ${cause instanceof Error ? cause.message : String(cause)}. Проверьте URL и CORS источника.`,
        )
    } finally {
      clearTimeout(timeout)
      if (controller.current === request) {
        controller.current = null
        setBusy(false)
      }
    }
  }
  const loadCatalog = async () => {
    cancel()
    setError('')
    const request = new AbortController()
    controller.current = request
    const timeout = setTimeout(() => request.abort(), 20000)
    setBusy(true)
    try {
      const response = await fetch('/__xcontest/files', {
        signal: request.signal,
        credentials: 'omit',
      })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const value: unknown = await response.json()
      if (!Array.isArray(value) || value.length > 5000)
        throw new Error('Некорректный каталог XContest')
      const entries = value
        .map((raw: unknown) => {
          const item = raw as { oaid?: unknown; channame?: unknown; name?: unknown }
          if (!Number.isInteger(item?.oaid) || Number(item.oaid) < 1 || Number(item.oaid) > 9999999)
            throw new Error('Некорректный ID набора')
          return {
            id: Number(item.oaid),
            label: `${String(item.channame ?? '')} / ${String(item.name ?? '')}`.slice(0, 256),
          }
        })
        .sort((a, b) => a.label.localeCompare(b.label))
      if (controller.current === request) setDatasets(entries)
    } catch (cause) {
      if (controller.current === request) setError(`Каталог не загружен: ${String(cause)}`)
    } finally {
      clearTimeout(timeout)
      if (controller.current === request) {
        controller.current = null
        setBusy(false)
      }
    }
  }
  return (
    <details className="map-panel standalone-map">
      <summary>Настройки карты</summary>
      <label>
        <input
          type="checkbox"
          checked={settings.enabled}
          onChange={(event) => {
            if (!event.target.checked) cancel()
            change({ ...settings, enabled: event.target.checked })
          }}
        />{' '}
        Подключить онлайн-слои
      </label>
      <fieldset disabled={!settings.enabled}>
        <label>
          <input
            type="checkbox"
            checked={!!settings.interactive}
            onChange={(event) => change({ ...settings, interactive: event.target.checked })}
          />{' '}
          Управлять картой мышью
        </label>
        <p className="hint">
          Колесо над картой меняет масштаб. В этом режиме перетаскивание сдвигает карту. Отключите
          режим для перемещения виджета.
        </p>
        <label>
          <input
            type="checkbox"
            checked={!!settings.followGps}
            onChange={(event) => change({ ...settings, followGps: event.target.checked })}
          />{' '}
          Следовать GPS симуляции
        </label>
        <label>
          Поворот карты
          <select
            value={settings.rotation ?? 'widget'}
            aria-label="Поворот карты"
            onChange={(event) =>
              change({ ...settings, rotation: event.target.value as MapSettings['rotation'] })
            }
          >
            <option value="widget">Из настроек виджета</option>
            <option value="north">Север вверху</option>
            <option value="heading">Курс вверху</option>
            <option value="track">Направление трека вверху</option>
          </select>
        </label>
        <label>
          <input
            type="checkbox"
            checked={settings.showTrace !== false}
            onChange={(event) => change({ ...settings, showTrace: event.target.checked })}
          />{' '}
          Показывать трек полёта
        </label>
        <label>
          <input
            type="checkbox"
            checked={settings.showTask !== false}
            onChange={(event) => change({ ...settings, showTask: event.target.checked })}
          />{' '}
          Показывать маршрут и точки
        </label>
        <label>
          <input
            type="checkbox"
            checked={!!settings.altitudeFilter}
            onChange={(event) => change({ ...settings, altitudeFilter: event.target.checked })}
          />{' '}
          Фильтровать геозоны по высоте
        </label>
        <p className="hint">
          Неизвестные высотные границы остаются видимыми. FL требует данных давления; AGL требует
          высоты над рельефом. Статус активации зон не определён.
        </p>
        <div className="bounds">
          {(['latitude', 'longitude', 'zoom'] as const).map((key) => (
            <label key={key}>
              {key === 'latitude'
                ? 'Широта карты'
                : key === 'longitude'
                  ? 'Долгота карты'
                  : 'Масштаб карты'}
              <input
                type="number"
                min={key === 'zoom' ? 2 : key === 'latitude' ? -85 : -180}
                max={key === 'zoom' ? 16 : key === 'latitude' ? 85 : 180}
                step={key === 'zoom' ? 1 : 0.01}
                value={settings[key]}
                onChange={(event) => {
                  const value = event.target.valueAsNumber
                  if (event.target.validity.valid && Number.isFinite(value))
                    change({ ...settings, [key]: value })
                }}
              />
            </label>
          ))}
        </div>
        <label>
          <input
            type="checkbox"
            checked={settings.roads}
            onChange={(event) => change({ ...settings, roads: event.target.checked })}
          />{' '}
          Карта и дороги OSM
        </label>
        <label>
          <input
            type="checkbox"
            checked={settings.thermalTiles.includes('thermal.kk7.ch/tiles/')}
            onChange={(event) => {
              const url = event.target.checked
                ? 'https://thermal.kk7.ch/tiles/thermals_all_all/{z}/{x}/{-y}.png?src=127.0.0.1'
                : ''
              setThermal(url)
              change({ ...settings, thermalTiles: url })
            }}
          />{' '}
          Термики KK7 (CC BY-NC-SA 4.0)
        </label>
        <form
          onSubmit={(event) => {
            event.preventDefault()
            try {
              if (thermal) tileUrl(thermal, settings.zoom, 0, 0)
              change({ ...settings, thermalTiles: thermal })
              setError('')
            } catch (cause) {
              setError(String(cause))
            }
          }}
        >
          <label>
            URL тайлов термиков
            <input
              type="url"
              value={thermal}
              placeholder="https://…/{z}/{x}/{y}.png"
              onChange={(event) => setThermal(event.target.value)}
            />
          </label>
          <button>Применить слой термиков</button>
        </form>
        <button type="button" disabled={busy} onClick={() => void loadCatalog()}>
          Получить каталог зон XContest
        </button>
        {datasets.length > 0 && (
          <label>
            Набор воздушных зон
            <select
              value={dataset}
              onChange={(event) => {
                cancel()
                setDataset(event.target.value)
              }}
            >
              {!datasets.some((entry) => String(entry.id) === dataset) && (
                <option value={dataset}>ID {dataset}</option>
              )}
              {datasets.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.label}
                </option>
              ))}
            </select>
          </label>
        )}
        <label>
          ID набора XContest
          <input
            type="number"
            min="1"
            max="9999999"
            step="1"
            value={dataset}
            onChange={(event) => {
              cancel()
              setDataset(event.target.value)
            }}
          />
        </label>
        <button
          type="button"
          disabled={busy || !/^[1-9]\d{0,6}$/.test(dataset)}
          onClick={() => void load(`/__xcontest/data/${dataset}`, true)}
        >
          Загрузить геозоны XContest
        </button>
        <p className="hint">
          982 — Kazakhstan / Almaty; покрытие набора не гарантирует полноту региона. Показаны
          границы зон; статус активации не рассчитан.
        </p>
        <label>
          URL геозон GeoJSON
          <input
            type="url"
            value={settings.airspaceUrl}
            onChange={(event) => {
              cancel()
              setError('')
              change({ ...settings, airspaceUrl: event.target.value })
            }}
          />
        </label>
        <button type="button" disabled={busy || !settings.airspaceUrl} onClick={() => void load()}>
          Загрузить геозоны онлайн
        </button>
        <p className="hint">
          Геозон: {airspaces.length}. {source} Данные хранятся только в памяти текущего сеанса.
        </p>
      </fieldset>
      {error && <p role="alert">{error}</p>}
      <p className="hint">
        Онлайн-подложка для компоновки; стиль отличается от XCTrack. Поставщик получает запросы
        выбранного региона. XCFG не передаётся. Геозоны не учитывают NOTAM и расписания XCTrack.
      </p>
      <p>
        <a href="https://airspace.xcontest.org/" target="_blank" rel="noreferrer">
          Воздушные зоны XContest
        </a>{' '}
        ·{' '}
        <a href="https://thermal.kk7.ch/" target="_blank" rel="noreferrer">
          Термики KK7
        </a>
      </p>
    </details>
  )
}
