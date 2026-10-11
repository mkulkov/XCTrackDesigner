import { useEffect, useMemo, useRef, useState } from 'react'
import {
  PanelsTopLeft,
  FolderOpen,
  Download,
  Undo2,
  Redo2,
  Settings2,
  Layers,
  Copy,
  Trash2,
  ArrowUp,
  ArrowDown,
  Plus,
} from 'lucide-react'
import { SettingsDialog } from './SettingsDialog'
import { loadNativeFonts } from './fonts'
import { WidgetPreview } from './WidgetPreview'
import { EditorCanvas } from './EditorCanvas'
import { WidgetSettings } from './WidgetSettings'
import { WidgetOptions } from './WidgetOptions'
import { WidgetCollection } from './WidgetCollection'
import {
  addWidget,
  addTemplate,
  changeSettings,
  changeWidgetOptions,
  editPage,
  newConfiguration,
  reorderWidget,
  reorderPage,
  changeDisplayPreferences,
  changePageProperties,
} from './editor-commands'
import type { Scenario } from './simulation'
import {
  buildFlightFrame,
  defaultFlightSettings,
  enrichManualFrame,
  igcFrame,
} from './flight-engine'
import type { IGCReplay } from './flight-engine'
import { TrackReplay } from './TrackReplay'
import { FlightPanel } from './FlightPanel'
import { DisplayPanel } from './DisplayPanel'
import { EditorThemeToggle } from './EditorThemeToggle'
import { PageLayoutPanel } from './PageLayoutPanel'
import { nearbyAirspaces } from './airspace-proximity'
import { locateEditorMap } from './map-location'
import { ScreenViewport } from './ScreenViewport'
import { initialMap } from './online-map'
import type { AirspacePolygon } from './online-map'
import { libraryWidget } from './widget-library'
import { widgetDescription } from './widget-descriptions'
import { WidgetSimulation } from './WidgetSimulation'
import { contentSpecs } from './widget-content'
import { cellStep, gestureBounds } from './editor-geometry'
import { changeBounds, editWidgetList, openXcfg, pixelBounds } from './xcfg'
import type { Bounds, Document, Orientation, Widget, Json } from './xcfg'
import { deleteDraft, loadDraft, saveDraft } from './drafts'
import type { Draft } from './drafts'

const shortName = (name: string) => name.split('.').at(-1) ?? name
const pageNames: Record<string, string> = {
  'org.xcontest.XCTrack.widget.wp.WPXCAssistant': 'XC-помощник',
  'org.xcontest.XCTrack.widget.wp.WPCompetition': 'Соревнование',
}

function downloadDocument(doc: Document, filename: string) {
  const url = URL.createObjectURL(
    new Blob([doc.bytes.slice().buffer], { type: 'application/json' }),
  )
  const link = document.createElement('a')
  link.href = url
  link.download = filename.replace(/\.xcfg$/i, '') + '-designer.xcfg'
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function App() {
  const [settingsPreview, setSettingsPreview] = useState<{
    widget: Widget
    fields: Record<string, Json>
  } | null>(null)
  const [fontsReady, setFontsReady] = useState(false)
  useEffect(() => {
    void loadNativeFonts().then(setFontsReady)
  }, [])
  const [history, setHistory] = useState<Document[]>([])
  const [cursor, setCursor] = useState(0)
  const [filename, setFilename] = useState('screen.xcfg')
  const [orientation, setOrientation] = useState<Orientation>('portrait')
  const [pageId, setPageId] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [sim, setSim] = useState({ speed: 36, vertical: 1.2, altitude: 1200, time: 600 })
  const [noData, setNoData] = useState(false)
  const [timeMissing, setTimeMissing] = useState(false)
  const [altitudeMissing, setAltitudeMissing] = useState(false)
  const [showBounds, setShowBounds] = useState(true)
  const [snap, setSnap] = useState(true)
  const [textEpoch, setTextEpoch] = useState(0)
  const [catalogClass, setCatalogClass] = useState('WSpeed')
  const [catalogQuery, setCatalogQuery] = useState('')
  const [extraValues, setExtraValues] = useState<Record<string, number | string | null>>({})
  const [template, setTemplate] = useState('')
  const [scenario, setScenario] = useState<Scenario>('manual')
  const [seconds, setSeconds] = useState(0)
  const playbackSeconds = useRef(seconds)
  const [playing, setPlaying] = useState(false)
  const [rate, setRate] = useState(1)
  const [mapSettings, setMapSettings] = useState(initialMap)
  const [airspaces] = useState<AirspacePolygon[]>([])
  const [flightSettings, setFlightSettings] = useState(defaultFlightSettings)
  const [replay, setReplay] = useState<IGCReplay | null>(null)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [savedDocument, setSavedDocument] = useState<Document | null>(null)
  const [simulationOpen, setSimulationOpen] = useState(false)
  const [settingsDialog, setSettingsDialog] = useState<'screen' | 'pages' | null>(null)
  const [inspectorTab, setInspectorTab] = useState<'appearance' | 'advanced'>('appearance')
  const [playbackTarget, setPlaybackTarget] = useState<HTMLDivElement | null>(null)
  const [locationStatus, setLocationStatus] = useState('')
  const [draftStatus, setDraftStatus] = useState('')
  const autosaveTimer = useRef<number | null>(null)
  useEffect(() => {
    void loadDraft()
      .then(setDraft)
      .catch(() => setDraftStatus('Черновики недоступны; экспорт XCFG работает отдельно'))
  }, [])
  useEffect(() => {
    playbackSeconds.current = seconds
  }, [seconds])
  useEffect(() => {
    if (!playing || (scenario === 'manual' && !replay)) return
    let previous = performance.now()
    const timer = window.setInterval(() => {
      const now = performance.now()
      const elapsed = (now - previous) / 1000
      previous = now
      const limit = replay?.duration ?? 3600
      const next = Math.min(limit, playbackSeconds.current + elapsed * rate)
      playbackSeconds.current = next
      setSeconds(next)
      if (next >= limit) setPlaying(false)
    }, 100)
    return () => window.clearInterval(timer)
  }, [playing, scenario, rate, replay])
  const doc = history[cursor]
  useEffect(() => {
    if (!doc) return
    const timer = window.setTimeout(() => {
      void saveDraft(doc.bytes, filename)
        .then((saved) => {
          setDraft(saved)
          setSavedDocument(doc)
          setDraftStatus('Черновик сохранён на этом компьютере')
        })
        .catch(() => setDraftStatus('Не удалось сохранить черновик; скачайте XCFG'))
    }, 500)
    autosaveTimer.current = timer
    return () => window.clearTimeout(timer)
  }, [doc, filename])
  const hasMap = useMemo(
    () =>
      !!doc &&
      (['portrait', 'landscape'] as const).some((o) =>
        doc.pages[o].some((p) =>
          p.widgets.some((w) => ['WXCAssistant', 'WCompMap'].includes(shortName(w.CLASS))),
        ),
      ),
    [doc],
  )
  useEffect(() => {
    if (!hasMap) return
    const controller = new AbortController()
    void locateEditorMap(controller.signal)
      .then((location) => {
        if (controller.signal.aborted) return
        setMapSettings((current) => ({
          ...current,
          latitude: location.latitude,
          longitude: location.longitude,
        }))
        setLocationStatus(
          location.source === 'browser'
            ? 'Центр карты определён браузером'
            : 'Примерный центр карты определён по IP',
        )
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setLocationStatus('Местоположение недоступно; используется резервный центр карты')
      })
    return () => controller.abort()
  }, [hasMap])
  const templates = useMemo(
    () =>
      (['portrait', 'landscape'] as const).flatMap((o) =>
        (doc?.pages[o] ?? []).flatMap((p, pi) =>
          p.widgets.map((w, wi) => ({
            orientation: o,
            page: pi,
            widget: wi,
            id: doc!.widgetIds[o][pi]![wi]!,
            name: shortName(w.CLASS),
          })),
        ),
      ),
    [doc],
  )
  const templateSource = templates.find((entry) => entry.id === template)
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (
        !doc ||
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLSelectElement ||
        event.target instanceof HTMLTextAreaElement
      )
        return
      if (!(event.ctrlKey || event.metaKey)) return
      const key = event.key.toLowerCase()
      if (key === 's') {
        event.preventDefault()
        downloadDocument(doc, filename)
      }
      if (key === 'z' || key === 'y') {
        event.preventDefault()
        const redo = key === 'y' || event.shiftKey
        setCursor(Math.max(0, Math.min(history.length - 1, cursor + (redo ? 1 : -1))))
        setError('')
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [doc, cursor, filename, history.length])

  const pageIndex = Math.max(0, (doc?.pageIds[orientation] ?? []).indexOf(pageId ?? ''))
  function setPageIndex(index: number) {
    setPageId(doc?.pageIds[orientation][index] ?? null)
  }
  const page = doc?.pages[orientation][pageIndex]
  const ids = doc?.widgetIds[orientation][pageIndex] ?? []
  const selected = Math.max(0, ids.indexOf(selectedId ?? ''))
  function setSelected(index: number) {
    setSelectedId(ids[index] ?? null)
    setInspectorTab('appearance')
  }
  const widget = page?.widgets[selected]
  function previewWidget(original: Widget): Widget {
    if (settingsPreview?.widget !== original || original !== widget) return original
    const result = { ...original }
    for (const [key, value] of Object.entries(settingsPreview.fields)) {
      if (value === null) delete result[key]
      else if (typeof value !== 'number' || Number.isFinite(value)) result[key] = value
    }
    return result
  }
  const width = orientation === 'portrait' ? 1080 : 2400
  const height = orientation === 'portrait' ? 2400 : 1080
  const simulated = useMemo(
    () =>
      replay
        ? igcFrame(replay, seconds, flightSettings)
        : scenario === 'manual'
          ? enrichManualFrame(sim, flightSettings, seconds)
          : buildFlightFrame(seconds, scenario, flightSettings),
    [replay, seconds, flightSettings, scenario, sim],
  )
  const proximity = useMemo(
    () =>
      simulated.flight.position && airspaces.length
        ? nearbyAirspaces(airspaces, simulated.flight.position)
        : undefined,
    [airspaces, simulated.flight.position],
  )
  const frame =
    noData || scenario === 'no-data'
      ? buildFlightFrame(seconds, 'no-data', flightSettings)
      : {
          ...simulated,
          flight: { ...simulated.flight, ...(proximity ? { airspaces: proximity } : {}) },
          widgetValues: { ...simulated.widgetValues, ...extraValues },
          altitude: altitudeMissing ? null : simulated.altitude,
          time: timeMissing ? null : simulated.time,
        }
  async function load(file: File | undefined) {
    if (!file) return
    try {
      if (file.size > 5 * 1024 * 1024) throw Error('XCFG больше 5 МБ')
      const opened = openXcfg(new Uint8Array(await file.arrayBuffer()))
      setHistory([opened])
      setTextEpoch((epoch) => epoch + 1)
      setCursor(0)
      setFilename(file.name)
      setOrientation(opened.pages.portrait.length ? 'portrait' : 'landscape')
      setPageIndex(0)
      setSelectedId(null)
      setError('')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Ошибка импорта')
    }
  }
  function download() {
    if (doc) downloadDocument(doc, filename)
  }
  function apply(bounds: Bounds, index = selected) {
    if (!doc) return
    command(() => changeBounds(doc, orientation, pageIndex, index, bounds))
  }
  function editList(operation: 'duplicate' | 'delete') {
    if (!doc) return
    command(
      () => editWidgetList(doc, orientation, pageIndex, selected, operation),
      (changed) => {
        const nextIds = changed.widgetIds[orientation][pageIndex] ?? []
        setSelectedId(
          nextIds[
            operation === 'duplicate' ? selected + 1 : Math.min(selected, nextIds.length - 1)
          ] ?? null,
        )
      },
    )
  }
  function command(run: () => Document, select?: (changed: Document) => void) {
    if (!doc) return
    try {
      const changed = run()
      if (changed !== doc) {
        setHistory([...history.slice(0, cursor + 1), changed])
        setCursor(cursor + 1)
        select?.(changed)
      }
      setError('')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Ошибка изменения')
    }
  }
  function insertWidget(name: string, x?: number, y?: number) {
    if (!doc || !page) return
    command(
      () => {
        const added = addWidget(doc, orientation, pageIndex, name)
        if (x === undefined || y === undefined) return added
        const index = added.pages[orientation][pageIndex]!.widgets.length - 1
        const created = added.pages[orientation][pageIndex]!.widgets[index]!
        const bounds = gestureBounds(
          created,
          'move',
          x - (created.X1 + created.X2) / 2,
          y - (created.Y1 + created.Y2) / 2,
          width,
          height,
          snap,
        )
        return changeBounds(added, orientation, pageIndex, index, bounds)
      },
      (changed) => setSelectedId(changed.widgetIds[orientation][pageIndex]?.at(-1) ?? null),
    )
  }
  function pageCommand(operation: 'add' | 'duplicate' | 'delete') {
    if (!doc) return
    command(
      () => editPage(doc, orientation, pageIndex, operation),
      (changed) => {
        const index =
          operation === 'add'
            ? changed.pages[orientation].length - 1
            : operation === 'duplicate'
              ? pageIndex + 1
              : Math.max(0, Math.min(pageIndex, changed.pages[orientation].length - 1))
        setPageId(changed.pageIds[orientation][index] ?? null)
        setSelectedId(null)
      },
    )
  }
  function returnToEditor() {
    setPlaying(false)
    setSimulationOpen(false)
  }
  return (
    <main
      className="designer-app"
      onKeyDown={(event) => {
        if (
          event.target instanceof HTMLInputElement ||
          event.target instanceof HTMLSelectElement ||
          event.target instanceof HTMLTextAreaElement
        )
          return
        if (
          doc?.editable &&
          !simulationOpen &&
          !mapSettings.interactive &&
          widget &&
          event.target instanceof SVGElement
        ) {
          if (event.key === 'Delete') {
            event.preventDefault()
            editList('delete')
          }
          if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
            event.preventDefault()
            const n = event.shiftKey ? 10 : 1
            apply(
              gestureBounds(
                widget,
                'move',
                event.key === 'ArrowLeft'
                  ? -cellStep(width) * n
                  : event.key === 'ArrowRight'
                    ? cellStep(width) * n
                    : 0,
                event.key === 'ArrowUp'
                  ? -cellStep(height) * n
                  : event.key === 'ArrowDown'
                    ? cellStep(height) * n
                    : 0,
                width,
                height,
                true,
              ),
            )
            requestAnimationFrame(() =>
              document.querySelector<SVGSVGElement>('.editor-canvas')?.focus(),
            )
          }
        }
      }}
    >
      <header className="appbar">
        <div className="brand">
          <PanelsTopLeft size={19} />
          <h1>XCTrack Designer</h1>
        </div>
        <div className="document-status">
          <span>{doc ? filename : 'Новая конфигурация'}</span>
          <small data-native-fonts={fontsReady}>
            {doc ? (savedDocument === doc ? 'Сохранено' : 'Сохранение…') : 'Конструктор экранов'}
          </small>
        </div>
        <div className="file-actions">
          <EditorThemeToggle />
          <details className="draft-tools">
            <summary>Черновик и восстановление</summary>
            <section className="draft-panel" aria-label="Локальный черновик">
              {draft && (
                <>
                  <button
                    onClick={() => {
                      try {
                        const restored = openXcfg(draft.bytes)
                        setHistory([restored])
                        setCursor(0)
                        setFilename(draft.filename)
                        setOrientation(restored.pages.portrait.length ? 'portrait' : 'landscape')
                        setPageId(null)
                        setSelectedId(null)
                        setError('')
                        setTextEpoch((epoch) => epoch + 1)
                        setDraftStatus(
                          'Черновик восстановлен; история начинается с сохранённого состояния',
                        )
                      } catch (cause) {
                        setDraftStatus(cause instanceof Error ? cause.message : 'Ошибка черновика')
                      }
                    }}
                  >
                    Восстановить черновик
                  </button>
                  <button
                    onClick={() => {
                      if (autosaveTimer.current !== null) window.clearTimeout(autosaveTimer.current)
                      void deleteDraft()
                        .then(() => {
                          setDraft(null)
                          setDraftStatus('Черновик удалён')
                        })
                        .catch(() => setDraftStatus('Не удалось удалить черновик'))
                    }}
                  >
                    Удалить черновик
                  </button>
                  <span> {new Date(draft.savedAt).toLocaleString('ru')}</span>
                </>
              )}
              <span role="status">{draftStatus}</span>
            </section>
          </details>

          <button
            onClick={() => {
              setHistory([newConfiguration()])
              setCursor(0)
              setFilename('new-screen.xcfg')
              setOrientation('portrait')
              setPageIndex(0)
              setSelectedId(null)
              setTextEpoch((epoch) => epoch + 1)
              setError('')
            }}
          >
            Новая конфигурация
          </button>
          <label className="file">
            <FolderOpen size={16} /> Открыть XCFG
            <input
              aria-label="Открыть XCFG"
              type="file"
              accept=".xcfg,application/json"
              onChange={(event) => {
                void load(event.target.files?.[0])
                event.target.value = ''
              }}
            />
          </label>
          {doc && (
            <button className="primary export-button" onClick={download}>
              <Download size={16} />
              Экспорт XCFG
            </button>
          )}
        </div>
      </header>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {!doc ? (
        <div className="workspace">
          <WidgetCollection
            selected={catalogClass}
            select={setCatalogClass}
            query={catalogQuery}
            search={setCatalogQuery}
            canAdd={false}
            add={() => undefined}
          />
          <article className="empty">
            <h2>Начните с конфигурации XCTrack</h2>
            <p>
              Создайте новую конфигурацию или откройте XCFG, затем перетаскивайте виджеты из
              коллекции на экран.
            </p>
          </article>
          <aside className="inspector-panel">
            <h2>Настройки виджета</h2>
            <p className="hint">Выберите виджет на экране.</p>
          </aside>
        </div>
      ) : (
        <>
          <div className="modebar">
            <nav aria-label="Режим работы">
              <button aria-pressed={!simulationOpen} onClick={returnToEditor}>
                Редактор
              </button>
              <button
                aria-pressed={simulationOpen}
                onClick={() => (simulationOpen ? returnToEditor() : setSimulationOpen(true))}
              >
                Симуляция полёта
              </button>
            </nav>
            <div className="history-actions">
              <button
                aria-label="Отменить"
                disabled={cursor === 0}
                onClick={() => {
                  setCursor(cursor - 1)
                  setError('')
                }}
              >
                <Undo2 size={16} />
              </button>
              <button
                aria-label="Повторить"
                disabled={cursor === history.length - 1}
                onClick={() => {
                  setCursor(cursor + 1)
                  setError('')
                }}
              >
                <Redo2 size={16} />
              </button>
            </div>
          </div>
          {!doc.editable && (
            <p className="warning">
              Версия или тип экспорта не исследованы. Доступны просмотр и экспорт исходных байтов;
              изменения заблокированы.
            </p>
          )}
          <div
            className={`workspace ${simulationOpen ? 'simulation-workspace' : 'editor-workspace'}`}
          >
            <aside
              className="simulation-panel standalone-simulation"
              hidden={!simulationOpen}
              aria-label="Параметры симуляции"
            >
              <h2>Запись полёта</h2>
              <TrackReplay
                playbackTarget={playbackTarget}
                replay={replay}
                onReplay={(loaded) => {
                  setReplay(loaded)
                  setScenario('manual')
                  setSeconds(0)
                  setPlaying(false)
                }}
                seconds={seconds}
                onSeek={setSeconds}
                playing={playing}
                onPlaying={setPlaying}
                rate={rate}
                onRate={setRate}
              />
              <FlightPanel settings={flightSettings} onChange={setFlightSettings} replay={replay} />
              {widget &&
                (contentSpecs[shortName(widget.CLASS)] ||
                  ['WLiveMessage', 'WLogPeek'].includes(shortName(widget.CLASS))) &&
                shortName(widget.CLASS) !== 'WFreeText' && (
                  <details className="manual-simulation">
                    <summary>Показание выбранного виджета</summary>
                    <WidgetSimulation
                      key={ids[selected]}
                      value={extraValues[shortName(widget.CLASS)]}
                      apply={(value) =>
                        setExtraValues({ ...extraValues, [shortName(widget.CLASS)]: value })
                      }
                    />
                  </details>
                )}
              <label className="sim-control simulation-scenario">
                Сценарий
                <select
                  aria-label="Сценарий"
                  value={replay ? 'track' : scenario}
                  onChange={(event) => {
                    setScenario(event.target.value as Scenario)
                    setReplay(null)
                    setSeconds(0)
                    setPlaying(false)
                    setRate(1)
                  }}
                >
                  {replay && <option value="track">Загруженный трек</option>}
                  <option value="manual">Ручные показания</option>
                  <option value="thermal">Набор в термике</option>
                  <option value="glide">Планирование</option>
                  <option value="no-data">Нет датчиков</option>
                </select>
              </label>
              {scenario !== 'manual' && !replay && (
                <>
                  <div className="widget-actions">
                    <button onClick={() => setPlaying(!playing)}>
                      {playing ? 'Пауза симуляции' : 'Запустить симуляцию'}
                    </button>
                    <button
                      onClick={() => {
                        setSeconds(0)
                        setPlaying(false)
                      }}
                    >
                      Сбросить симуляцию
                    </button>
                  </div>
                  <label className="sim-control">
                    Темп
                    <select
                      aria-label="Темп симуляции"
                      value={rate}
                      onChange={(event) => setRate(Number(event.target.value))}
                    >
                      {[0.5, 1, 2, 5].map((r) => (
                        <option key={r} value={r}>
                          {r}×
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="sim-control">
                    Время сценария, s
                    <input
                      aria-label="Время сценария, s"
                      type="range"
                      min={0}
                      max={3600}
                      step={1}
                      value={seconds}
                      onChange={(event) => setSeconds(Number(event.target.value))}
                    />
                    <output aria-label="Текущее время сценария">{seconds.toFixed(1)}</output>
                  </label>
                  <p className="hint">
                    Связанные показания, история и навигация по учебной модели; алгоритмы XCTrack не
                    воспроизведены полностью.
                  </p>
                </>
              )}
              <details className="manual-values">
                <summary>Показания и отсутствие данных</summary>
                <div className="simulation-values-grid">
                  <label className="sim-control">
                    <span>
                      <input
                        type="checkbox"
                        checked={noData}
                        onChange={(event) => setNoData(event.target.checked)}
                      />{' '}
                      Нет данных
                    </span>
                  </label>
                  <label className="sim-control">
                    <span>
                      <input
                        type="checkbox"
                        checked={altitudeMissing}
                        onChange={(event) => setAltitudeMissing(event.target.checked)}
                      />{' '}
                      Нет высоты AMSL
                    </span>
                  </label>
                  <label className="sim-control">
                    <span>
                      <input
                        type="checkbox"
                        checked={timeMissing}
                        onChange={(event) => setTimeMissing(event.target.checked)}
                      />{' '}
                      Не в полёте
                    </span>
                  </label>
                  <p className="hint">
                    Не записываются в XCFG. Дополнительные значения выбранного класса перекрывают
                    расчёт модели.
                  </p>
                  {(
                    [
                      ['speed', 'Скорость, km/h', 0, 300],
                      ['vertical', 'Вариометр, m/s', -30, 30],
                      ['altitude', 'Высота AMSL, m', -500, 15000],
                      ['time', 'Время полёта, s', 0, 86400],
                    ] as const
                  ).map(([key, label, min, max]) => (
                    <label className="sim-control" key={key}>
                      {label}
                      <input
                        type="range"
                        min={min}
                        max={max}
                        step={key === 'vertical' ? 0.1 : 1}
                        disabled={!!replay}
                        value={sim[key]}
                        onChange={(event) => setSim({ ...sim, [key]: Number(event.target.value) })}
                      />
                      <output>{sim[key]}</output>
                    </label>
                  ))}
                </div>
              </details>
            </aside>
            <div className="collection-slot" hidden={simulationOpen}>
              <WidgetCollection
                selected={catalogClass}
                select={setCatalogClass}
                query={catalogQuery}
                search={setCatalogQuery}
                canAdd={doc.editable && !!page}
                add={() => insertWidget(catalogClass)}
              />
            </div>
            <section className="preview" aria-label="Предпросмотр">
              <div className="toolbar preview-navigation">
                {' '}
                <label>
                  Страница
                  <select
                    aria-label="Страница"
                    value={pageIndex}
                    onChange={(event) => {
                      setPageIndex(Number(event.target.value))
                      setSelectedId(null)
                    }}
                  >
                    {doc.pages[orientation].map((p, index) => (
                      <option key={index} value={index}>
                        {pageNames[p.CLASS]
                          ? `${index + 1} · ${pageNames[p.CLASS]}`
                          : `Страница ${index + 1}`}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="canvas-actions">
                  <button onClick={() => setSettingsDialog('screen')}>
                    <Settings2 size={15} />
                    Экран
                  </button>
                  <button onClick={() => setSettingsDialog('pages')}>
                    <Layers size={15} />
                    Страницы
                  </button>
                </div>
              </div>
              <SettingsDialog
                open={settingsDialog === 'screen'}
                title="Настройки экрана"
                description="Общие параметры для всех страниц"
                close={() => setSettingsDialog(null)}
              >
                <DisplayPanel
                  onCancel={() => setSettingsDialog(null)}
                  onApplied={() => setSettingsDialog(null)}
                  key={JSON.stringify(doc.preferences)}
                  preferences={doc.preferences}
                  disabled={!doc.editable}
                  apply={(fields) => command(() => changeDisplayPreferences(doc, fields))}
                />
              </SettingsDialog>
              <SettingsDialog
                open={settingsDialog === 'pages'}
                title="Раскладка страниц"
                description="Страницы каждой ориентации настраиваются отдельно"
                close={() => setSettingsDialog(null)}
              >
                <div className="page-orientation segments">
                  <button
                    aria-pressed={orientation === 'portrait'}
                    onClick={() => {
                      setOrientation('portrait')
                      setPageId(null)
                      setSelectedId(null)
                    }}
                  >
                    Портрет
                  </button>
                  <button
                    aria-pressed={orientation === 'landscape'}
                    onClick={() => {
                      setOrientation('landscape')
                      setPageId(null)
                      setSelectedId(null)
                    }}
                  >
                    Альбом
                  </button>
                </div>
                <div className="page-manager">
                  <div className="page-list">
                    {doc.pages[orientation].map((entry, index) => (
                      <button
                        key={doc.pageIds[orientation][index]}
                        className="page-row"
                        aria-pressed={index === pageIndex}
                        onClick={() => {
                          setPageIndex(index)
                          setSelectedId(null)
                        }}
                      >
                        <span className="page-thumbnail">
                          <span />
                          <span />
                          <span />
                        </span>
                        <span>
                          {pageNames[entry.CLASS] ?? `Страница ${index + 1}`}
                          <small>
                            Страница {index + 1} · {entry.widgets.length} виджетов
                          </small>
                        </span>
                      </button>
                    ))}
                    <button
                      className="add-page"
                      disabled={!doc.editable}
                      onClick={() => pageCommand('add')}
                    >
                      <Plus size={15} />
                      Добавить страницу
                    </button>
                  </div>
                  <div className="page-properties">
                    <PageLayoutPanel
                      key={`${orientation}:${doc.pageIds[orientation][pageIndex]}:${JSON.stringify(page && { CLASS: page.CLASS, navigations: page.navigations })}`}
                      page={page}
                      index={pageIndex}
                      orientation={orientation}
                      disabled={!doc.editable}
                      apply={(fields) =>
                        command(() => changePageProperties(doc, orientation, pageIndex, fields))
                      }
                    >
                      <button
                        aria-label="Страница раньше"
                        disabled={!doc.editable || !page || pageIndex === 0}
                        onClick={() => command(() => reorderPage(doc, orientation, pageIndex, -1))}
                      >
                        <ArrowUp size={15} />
                      </button>
                      <button
                        aria-label="Страница позже"
                        disabled={
                          !doc.editable || !page || pageIndex >= doc.pages[orientation].length - 1
                        }
                        onClick={() => command(() => reorderPage(doc, orientation, pageIndex, 1))}
                      >
                        <ArrowDown size={15} />
                      </button>
                      <button
                        aria-label="Дублировать страницу"
                        disabled={!doc.editable || !page}
                        onClick={() => pageCommand('duplicate')}
                      >
                        <Copy size={15} />
                        Копировать
                      </button>
                      <button
                        aria-label="Удалить страницу"
                        disabled={!doc.editable || !page}
                        onClick={() => pageCommand('delete')}
                      >
                        <Trash2 size={15} />
                      </button>
                    </PageLayoutPanel>
                  </div>
                </div>
                <div className="pages-dialog-footer">
                  <button onClick={() => setSettingsDialog(null)}>Готово</button>
                </div>
              </SettingsDialog>

              <div className="preview-title">
                <label>
                  Ориентация
                  <select
                    aria-label="Ориентация"
                    value={orientation}
                    onChange={(event) => {
                      setOrientation(event.target.value as Orientation)
                      setPageIndex(0)
                      setSelectedId(null)
                    }}
                  >
                    <option value="portrait">Портрет</option>
                    <option value="landscape">Альбом</option>
                  </select>
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={snap}
                    onChange={(event) => setSnap(event.target.checked)}
                  />
                  Привязка к сетке
                </label>
                <details className="preview-options">
                  <summary>Вид</summary>
                  <label>
                    <input
                      type="checkbox"
                      checked={showBounds}
                      onChange={(event) => setShowBounds(event.target.checked)}
                    />
                    Рамки
                  </label>
                  <button onClick={() => setTextEpoch((epoch) => epoch + 1)}>
                    Сбросить размеры текста
                  </button>
                  <p>
                    {width} × {height} · 420 dpi
                  </p>
                  {locationStatus && <p>{locationStatus}</p>}
                  {mapSettings.enabled && (
                    <p className="map-attribution">
                      Онлайн-подложка · ©{' '}
                      <a
                        href="https://www.openstreetmap.org/copyright"
                        target="_blank"
                        rel="noreferrer"
                      >
                        OpenStreetMap contributors
                      </a>
                      {mapSettings.thermalTiles && (
                        <>
                          {' '}
                          ·{' '}
                          <a href="https://thermal.kk7.ch/" target="_blank" rel="noreferrer">
                            M. von Känel / thermal.kk7.ch (либо выбранный поставщик)
                          </a>{' '}
                          ·{' '}
                          <a
                            href="https://creativecommons.org/licenses/by-nc-sa/4.0/"
                            target="_blank"
                            rel="noreferrer"
                          >
                            CC BY-NC-SA 4.0 (KK7)
                          </a>
                        </>
                      )}
                    </p>
                  )}
                </details>
              </div>
              {!page ? (
                <p>В этой ориентации нет страниц.</p>
              ) : (
                <ScreenViewport portrait={orientation === 'portrait'}>
                  <EditorCanvas
                    key={`${filename}-${textEpoch}-${orientation}-${pageIndex}-${cursor}`}
                    widgets={page.widgets}
                    selected={selected}
                    select={setSelected}
                    commit={apply}
                    width={width}
                    height={height}
                    editable={doc.editable && !simulationOpen}
                    showBounds={showBounds && !simulationOpen}
                    snap={snap}
                    addFromCollection={insertWidget}
                  >
                    <rect width={width} height={height} fill="#000" />
                    {page.widgets.map((w, index) => (
                      <WidgetPreview
                        key={JSON.stringify([
                          textEpoch,
                          orientation,
                          pageIndex,
                          ids[index],
                          w,
                          previewWidget(w),
                          doc.preferences,
                          width,
                          height,
                          fontsReady,
                        ])}
                        index={index}
                        widget={previewWidget(w)}
                        preferences={doc.preferences}
                        frame={frame}
                        width={width}
                        height={height}
                        showBounds={showBounds && !simulationOpen}
                        select={() => setSelected(index)}
                        mapSettings={{
                          ...mapSettings,
                          enabled: true,
                          roads: true,
                          showTrace: true,
                          showTask: true,
                          followGps: simulationOpen || playing,
                          interactive: false,
                        }}
                        airspaces={airspaces}
                        changeMap={setMapSettings}
                      />
                    ))}
                    {showBounds &&
                      !simulationOpen &&
                      page.widgets.map((w, index) => {
                        const b = pixelBounds(w, width, height, 420)
                        return (
                          <rect
                            key={ids[index]}
                            {...b}
                            fill="none"
                            pointerEvents="none"
                            stroke={index === selected ? '#6dffc0' : '#35566c'}
                            strokeWidth={index === selected ? 5 : 1}
                          />
                        )
                      })}
                  </EditorCanvas>
                </ScreenViewport>
              )}
              <div ref={setPlaybackTarget} className="playback-slot" hidden={!simulationOpen} />
            </section>
            <aside className="telemetry-panel" hidden={!simulationOpen}>
              <h2>Показания</h2>
              <dl>
                <dt>Скорость</dt>
                <dd>{frame.speed?.toFixed(1) ?? '—'} км/ч</dd>
                <dt>Вариометр</dt>
                <dd>{frame.vertical?.toFixed(1) ?? '—'} м/с</dd>
                <dt>Высота</dt>
                <dd>{frame.altitude?.toFixed(0) ?? '—'} м</dd>
              </dl>
              <h3>Параметры виджетов</h3>
              <p className="hint">Используются настройки текущей страницы.</p>
              <button onClick={returnToEditor}>Вернуться к редактированию</button>
            </aside>
            <aside
              className="inspector-panel"
              hidden={simulationOpen}
              data-testid="widget-inspector"
            >
              <span className="eyebrow">Выбранный виджет</span>
              <h2 className="selected-widget-name">
                {widget
                  ? (libraryWidget(widget.CLASS)?.title ?? shortName(widget.CLASS))
                  : 'Выберите виджет на экране'}
              </h2>
              {widget && (
                <p className="selected-widget-description" aria-live="polite">
                  {widgetDescription(widget.CLASS)}
                </p>
              )}
              <div className="inspector-tabs">
                <button
                  aria-pressed={inspectorTab === 'appearance'}
                  onClick={() => setInspectorTab('appearance')}
                >
                  Оформление
                </button>
                <button
                  aria-pressed={inspectorTab === 'advanced'}
                  onClick={() => setInspectorTab('advanced')}
                >
                  Дополнительно
                </button>
              </div>
              <div hidden={inspectorTab !== 'advanced'} className="inspector-advanced">
                <details className="template-panel">
                  <summary>Копировать из конфигурации</summary>
                  <label className="sim-control">
                    Шаблон из конфигурации
                    <select
                      aria-label="Шаблон из конфигурации"
                      value={template}
                      onChange={(event) => setTemplate(event.target.value)}
                    >
                      <option value="">Выберите виджет</option>
                      {templates.map((entry) => (
                        <option key={entry.id} value={entry.id}>
                          {entry.orientation === 'portrait' ? 'П' : 'А'}
                          {entry.page + 1} · {entry.widget + 1}. {entry.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    disabled={!doc.editable || !page || !templateSource}
                    onClick={() => {
                      if (!templateSource) return
                      command(
                        () =>
                          addTemplate(
                            doc,
                            orientation,
                            pageIndex,
                            templateSource.orientation,
                            templateSource.page,
                            templateSource.widget,
                          ),
                        (changed) => {
                          setSelectedId(changed.widgetIds[orientation][pageIndex]?.at(-1) ?? null)
                          setTemplate('')
                        },
                      )
                    }}
                  >
                    Добавить из шаблона
                  </button>
                </details>
              </div>
              <div className="widget-actions">
                <button
                  disabled={!doc.editable || !widget || selected === 0}
                  onClick={() =>
                    command(() => reorderWidget(doc, orientation, pageIndex, selected, -1))
                  }
                >
                  Слой назад
                </button>
                <button
                  disabled={!doc.editable || !widget || selected >= (page?.widgets.length ?? 0) - 1}
                  onClick={() =>
                    command(() => reorderWidget(doc, orientation, pageIndex, selected, 1))
                  }
                >
                  Слой вперёд
                </button>
                <button disabled={!doc.editable || !widget} onClick={() => editList('duplicate')}>
                  <Copy size={14} />
                  Дублировать виджет
                </button>
                <button
                  disabled={
                    !doc.editable ||
                    !widget ||
                    [...doc.pages.portrait, ...doc.pages.landscape].reduce(
                      (sum, p) => sum + p.widgets.length,
                      0,
                    ) <= 1
                  }
                  onClick={() => editList('delete')}
                >
                  <Trash2 size={14} />
                  Удалить виджет
                </button>
              </div>
              {widget && (
                <>
                  <div hidden={inspectorTab !== 'appearance'}>
                    <WidgetSettings
                      key={`settings-${ids[selected]}-${cursor}`}
                      widget={widget}
                      disabled={!doc.editable}
                      preview={setSettingsPreview}
                      apply={(fields) =>
                        command(() => changeSettings(doc, orientation, pageIndex, selected, fields))
                      }
                    />
                  </div>
                  <div hidden={inspectorTab !== 'advanced'}>
                    <WidgetOptions
                      key={`options-${ids[selected]}-${cursor}`}
                      widget={widget}
                      disabled={!doc.editable}
                      apply={(json) =>
                        command(() =>
                          changeWidgetOptions(doc, orientation, pageIndex, selected, json),
                        )
                      }
                    />
                  </div>
                </>
              )}
            </aside>
          </div>
          <footer className="app-status">
            <span role="status">
              {error ||
                (simulationOpen
                  ? 'Показания из симуляции · настройки XCFG сохраняются'
                  : 'Перетащите виджет на экран или выберите его для настройки')}
            </span>
            <span>XCTrack 0.9.12.6</span>
          </footer>
        </>
      )}
    </main>
  )
}
