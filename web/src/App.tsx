import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import {
  tr,
  editorLanguage,
  setEditorLanguagePreference,
  subscribeLanguage,
  languageSnapshot,
} from './i18n'
import type { EditorLanguage } from './i18n'
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
  Navigation,
} from 'lucide-react'
import { SettingsDialog } from './SettingsDialog'
import { NavigationPanel } from './NavigationPanel'
import type { ImportedTask, NavigationWaypoint } from './navigation-import'
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
import { initialMap, worldPoint } from './online-map'
import type { AirspacePolygon } from './online-map'

import { widgetDescription, widgetTitle } from './widget-descriptions'
import { WidgetSimulation } from './WidgetSimulation'
import { contentSpecs } from './widget-content'
import type { Frame } from './value-layout'
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
  const languageState = useSyncExternalStore(subscribeLanguage, languageSnapshot)
  useEffect(() => {
    document.documentElement.lang = editorLanguage()
  }, [languageState])
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
  const [navigationTask, setNavigationTask] = useState<ImportedTask | null>(null)
  const [navigationTarget, setNavigationTarget] = useState<NavigationWaypoint | null>(null)
  const locationOverridden = useRef(false)
  const [replay, setReplay] = useState<IGCReplay | null>(null)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [savedDocument, setSavedDocument] = useState<Document | null>(null)
  const [simulationOpen, setSimulationOpen] = useState(false)
  const [settingsDialog, setSettingsDialog] = useState<'screen' | 'pages' | 'navigation' | null>(
    null,
  )
  const [inspectorTab, setInspectorTab] = useState<'appearance' | 'advanced'>('appearance')
  const [playbackTarget, setPlaybackTarget] = useState<HTMLDivElement | null>(null)
  const [locationStatus, setLocationStatus] = useState('')
  const [draftStatus, setDraftStatus] = useState('')
  const autosaveTimer = useRef<number | null>(null)
  const initialDocumentChosen = useRef(false)
  useEffect(() => {
    let active = true
    void loadDraft()
      .then((saved) => {
        if (!active || initialDocumentChosen.current) return
        setDraft(saved)
        if (!saved) return
        try {
          const restored = openXcfg(saved.bytes)
          initialDocumentChosen.current = true
          setHistory([restored])
          setCursor(0)
          setFilename(saved.filename)
          setOrientation(restored.pages.portrait.length ? 'portrait' : 'landscape')
          setPageId(null)
          setSelectedId(null)
          setSavedDocument(restored)
          setDraftStatus(tr('Черновик восстановлен; история начинается с сохранённого состояния'))
        } catch (cause) {
          setDraftStatus(cause instanceof Error ? cause.message : tr('Ошибка черновика'))
        }
      })
      .catch(() => {
        if (active) setDraftStatus(tr('Черновики недоступны; экспорт XCFG работает отдельно'))
      })
    return () => {
      active = false
    }
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
          setDraftStatus(tr('Черновик сохранён на этом компьютере'))
        })
        .catch(() => setDraftStatus(tr('Не удалось сохранить черновик; скачайте XCFG')))
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
        if (controller.signal.aborted || locationOverridden.current) return
        setMapSettings((current) => ({
          ...current,
          latitude: location.latitude,
          longitude: location.longitude,
        }))
        setLocationStatus(
          location.source === 'browser'
            ? tr('Центр карты определён браузером')
            : tr('Примерный центр карты определён по IP'),
        )
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setLocationStatus(tr('Местоположение недоступно; используется резервный центр карты'))
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
  function fitNavigation(points: NavigationWaypoint[]) {
    if (!points.length) return
    locationOverridden.current = true
    const lat = (Math.min(...points.map((p) => p.lat)) + Math.max(...points.map((p) => p.lat))) / 2
    const origin = points[0]!.lon
    const longitudes = points.map((p) => origin + ((p.lon - origin + 540) % 360) - 180)
    const lon = (((Math.min(...longitudes) + Math.max(...longitudes)) / 2 + 540) % 360) - 180
    let zoom = 14
    for (; zoom > 2; zoom--) {
      const center = worldPoint(lon, lat, zoom)
      const size = 256 * 2 ** zoom
      const scale = 512 / Math.max(width, height)
      if (
        points.every((p) => {
          const q = worldPoint(p.lon, p.lat, zoom)
          const dx = ((q.x - center.x + size * 1.5) % size) - size / 2
          const radius = p.radius / ((40075016.686 * Math.cos((p.lat * Math.PI) / 180)) / size)
          return (
            Math.abs(dx) + radius < width * scale * 0.38 &&
            Math.abs(q.y - center.y) + radius < height * scale * 0.38
          )
        })
      )
        break
    }
    setMapSettings((current) => ({ ...current, latitude: lat, longitude: lon, zoom }))
    setLocationStatus(tr('На карте показаны загруженные навигационные данные'))
  }
  function useNavigationTask(task: ImportedTask | null) {
    setNavigationTask(task)
    setFlightSettings((current) => ({
      ...current,
      task: task?.turnpoints ?? (navigationTarget ? [navigationTarget] : []),
      taskStartTime: task?.startTime,
    }))
  }
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
          widgetValues: simulated.widgetValues,
          altitude: altitudeMissing ? null : simulated.altitude,
          time: timeMissing ? null : simulated.time,
        }
  const manualSupported =
    !!widget &&
    shortName(widget.CLASS) !== 'WFreeText' &&
    (!!contentSpecs[shortName(widget.CLASS)] ||
      ['WSpeed', 'WVerticalSpeed', 'WAMSL', 'WAirTime', 'WLiveMessage', 'WLogPeek'].includes(
        shortName(widget.CLASS),
      ))
  const manualValue =
    widget && Object.hasOwn(extraValues, ids[selected] ?? '')
      ? extraValues[ids[selected]!]
      : widget
        ? currentReading(shortName(widget.CLASS))
        : undefined
  function currentReading(name: string) {
    if (name === 'WSpeed') return frame.speed === null ? null : frame.speed / 3.6
    if (name === 'WVerticalSpeed') return frame.vertical
    if (name === 'WAMSL') return frame.altitude
    if (name === 'WAirTime') return frame.time
    return frame.widgetValues?.[name] ?? null
  }
  function widgetFrame(w: Widget, index: number): Frame {
    const id = ids[index]
    if (!id || !Object.hasOwn(extraValues, id)) return frame
    const name = shortName(w.CLASS)
    const value = extraValues[id] ?? null
    const numeric = typeof value === 'number' ? value : null
    return {
      ...frame,
      ...(name === 'WSpeed' ? { speed: numeric === null ? null : numeric * 3.6 } : {}),
      ...(name === 'WVerticalSpeed' ? { vertical: numeric } : {}),
      ...(name === 'WAMSL' ? { altitude: numeric } : {}),
      ...(name === 'WAirTime' ? { time: numeric } : {}),
      widgetValues: { ...frame.widgetValues, [name]: value },
    }
  }
  async function load(file: File | undefined) {
    if (!file) return
    try {
      if (file.size > 5 * 1024 * 1024) throw Error(tr('XCFG больше 5 МБ'))
      const opened = openXcfg(new Uint8Array(await file.arrayBuffer()))
      initialDocumentChosen.current = true
      setHistory([opened])
      setTextEpoch((epoch) => epoch + 1)
      setCursor(0)
      setFilename(file.name)
      setOrientation(opened.pages.portrait.length ? 'portrait' : 'landscape')
      setPageIndex(0)
      setSelectedId(null)
      setError('')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : tr('Ошибка импорта'))
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
      setError(cause instanceof Error ? cause.message : tr('Ошибка изменения'))
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
          <span>{doc ? filename : tr('Новая конфигурация')}</span>
          <small data-native-fonts={fontsReady}>
            {doc
              ? savedDocument === doc
                ? tr('Сохранено')
                : tr('Сохранение…')
              : tr('Конструктор экранов')}
          </small>
        </div>
        <div className="file-actions">
          <label className="editor-language-toggle">
            <select
              aria-label={tr('Язык редактора')}
              value={editorLanguage()}
              onChange={(event) =>
                setEditorLanguagePreference(event.target.value as EditorLanguage)
              }
            >
              <option value="ru">Русский</option>
              <option value="en">English</option>
            </select>
          </label>
          <EditorThemeToggle />
          <details className="draft-tools">
            <summary>{tr('Черновик и восстановление')}</summary>
            <section className="draft-panel" aria-label={tr('Локальный черновик')}>
              {draft && (
                <>
                  <button
                    onClick={() => {
                      try {
                        const restored = openXcfg(draft.bytes)
                        initialDocumentChosen.current = true
                        setHistory([restored])
                        setCursor(0)
                        setFilename(draft.filename)
                        setOrientation(restored.pages.portrait.length ? 'portrait' : 'landscape')
                        setPageId(null)
                        setSelectedId(null)
                        setError('')
                        setTextEpoch((epoch) => epoch + 1)
                        setDraftStatus(
                          tr('Черновик восстановлен; история начинается с сохранённого состояния'),
                        )
                      } catch (cause) {
                        setDraftStatus(
                          cause instanceof Error ? cause.message : tr('Ошибка черновика'),
                        )
                      }
                    }}
                  >
                    {tr('Восстановить черновик')}
                  </button>
                  <button
                    onClick={() => {
                      if (autosaveTimer.current !== null) window.clearTimeout(autosaveTimer.current)
                      void deleteDraft()
                        .then(() => {
                          setDraft(null)
                          setDraftStatus(tr('Черновик удалён'))
                        })
                        .catch(() => setDraftStatus(tr('Не удалось удалить черновик')))
                    }}
                  >
                    {tr('Удалить черновик')}
                  </button>
                  <span> {new Date(draft.savedAt).toLocaleString(editorLanguage())}</span>
                </>
              )}
              <span role="status">{tr(draftStatus)}</span>
            </section>
          </details>

          <button
            onClick={() => {
              initialDocumentChosen.current = true
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
            {tr('Новая конфигурация')}
          </button>
          <label className="file">
            <FolderOpen size={16} />
            {tr('Открыть XCFG')}
            <input
              aria-label={tr('Открыть XCFG')}
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
              {tr('Экспорт XCFG')}
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
            <h2>{tr('Начните с конфигурации XCTrack')}</h2>
            <p>
              {tr(
                'Создайте новую конфигурацию или откройте XCFG, затем перетаскивайте виджеты из коллекции на экран.',
              )}
            </p>
          </article>
          <aside className="inspector-panel">
            <h2>{tr('Настройки виджета')}</h2>
            <p className="hint">{tr('Выберите виджет на экране.')}</p>
          </aside>
        </div>
      ) : (
        <>
          <div className="modebar">
            <nav aria-label={tr('Режим работы')}>
              <button aria-pressed={!simulationOpen} onClick={returnToEditor}>
                {tr('Редактор')}
              </button>
              <button
                aria-pressed={simulationOpen}
                onClick={() => (simulationOpen ? returnToEditor() : setSimulationOpen(true))}
              >
                {tr('Симуляция полёта')}
              </button>
            </nav>
            <div className="history-actions">
              <button
                aria-label={tr('Отменить')}
                disabled={cursor === 0}
                onClick={() => {
                  setCursor(cursor - 1)
                  setError('')
                }}
              >
                <Undo2 size={16} />
              </button>
              <button
                aria-label={tr('Повторить')}
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
              {tr(
                'Версия или тип экспорта не исследованы. Доступны просмотр и экспорт исходных байтов; изменения заблокированы.',
              )}
            </p>
          )}
          <div
            className={`workspace ${simulationOpen ? 'simulation-workspace' : 'editor-workspace'}`}
          >
            <aside
              className="simulation-panel standalone-simulation"
              hidden={!simulationOpen}
              aria-label={tr('Параметры симуляции')}
            >
              <h2>{tr('Полёт')}</h2>
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
              <label className="sim-control simulation-scenario">
                {tr('Сценарий')}
                <select
                  aria-label={tr('Сценарий')}
                  value={replay ? 'track' : scenario}
                  onChange={(event) => {
                    setScenario(event.target.value as Scenario)
                    setReplay(null)
                    setSeconds(0)
                    setPlaying(false)
                    setRate(1)
                  }}
                >
                  {replay && <option value="track">{tr('Загруженный трек')}</option>}
                  <option value="manual">{tr('Ручные показания')}</option>
                  <option value="thermal">{tr('Набор в термике')}</option>
                  <option value="glide">{tr('Планирование')}</option>
                  <option value="no-data">{tr('Нет датчиков')}</option>
                </select>
              </label>
              <FlightPanel
                settings={flightSettings}
                onChange={(settings) => {
                  if (settings.task !== flightSettings.task) {
                    setNavigationTask(null)
                    setNavigationTarget(null)
                    settings = { ...settings, taskStartTime: undefined }
                  }
                  setFlightSettings(settings)
                }}
                replay={replay}
              />
              {scenario !== 'manual' && !replay && (
                <>
                  <div className="widget-actions">
                    <button onClick={() => setPlaying(!playing)}>
                      {playing ? tr('Пауза симуляции') : tr('Запустить симуляцию')}
                    </button>
                    <button
                      onClick={() => {
                        setSeconds(0)
                        setPlaying(false)
                      }}
                    >
                      {tr('Сбросить симуляцию')}
                    </button>
                  </div>
                  <label className="sim-control">
                    {tr('Темп')}
                    <select
                      aria-label={tr('Темп симуляции')}
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
                    {tr('Время сценария, s')}
                    <input
                      aria-label={tr('Время сценария, s')}
                      type="range"
                      min={0}
                      max={3600}
                      step={1}
                      value={seconds}
                      onChange={(event) => setSeconds(Number(event.target.value))}
                    />
                    <output aria-label={tr('Текущее время сценария')}>{seconds.toFixed(1)}</output>
                  </label>
                  <p className="hint">
                    {tr(
                      'Связанные показания, история и навигация по учебной модели; алгоритмы XCTrack не воспроизведены полностью.',
                    )}
                  </p>
                </>
              )}
              <details className="manual-values">
                <summary>{tr('Показания и отсутствие данных')}</summary>
                <div className="simulation-values-grid">
                  <label className="sim-control">
                    <span>
                      <input
                        type="checkbox"
                        checked={noData}
                        onChange={(event) => setNoData(event.target.checked)}
                      />{' '}
                      {tr('Нет данных')}
                    </span>
                  </label>
                  <label className="sim-control">
                    <span>
                      <input
                        type="checkbox"
                        checked={altitudeMissing}
                        onChange={(event) => setAltitudeMissing(event.target.checked)}
                      />{' '}
                      {tr('Нет высоты AMSL')}
                    </span>
                  </label>
                  <label className="sim-control">
                    <span>
                      <input
                        type="checkbox"
                        checked={timeMissing}
                        onChange={(event) => setTimeMissing(event.target.checked)}
                      />{' '}
                      {tr('Не в полёте')}
                    </span>
                  </label>
                  <p className="hint">
                    {tr(
                      'Не записываются в XCFG. Дополнительные значения выбранного класса перекрывают расчёт модели.',
                    )}
                  </p>
                  {(
                    [
                      ['speed', tr('Скорость, km/h'), 0, 300],
                      ['vertical', tr('Вариометр, m/s'), -30, 30],
                      ['altitude', tr('Высота AMSL, m'), -500, 15000],
                      ['time', tr('Время полёта, s'), 0, 86400],
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
            <section className="preview" aria-label={tr('Предпросмотр')}>
              <div className="toolbar preview-navigation">
                {' '}
                <label>
                  {tr('Страница')}
                  <select
                    aria-label={tr('Страница')}
                    value={pageIndex}
                    onChange={(event) => {
                      setPageIndex(Number(event.target.value))
                      setSelectedId(null)
                    }}
                  >
                    {doc.pages[orientation].map((p, index) => (
                      <option key={index} value={index}>
                        {pageNames[p.CLASS]
                          ? `${index + 1} · ${tr(pageNames[p.CLASS]!)}`
                          : tr('Страница {v0}', { v0: index + 1 })}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="canvas-actions">
                  <button onClick={() => setSettingsDialog('screen')}>
                    <Settings2 size={15} />
                    {tr('Экран')}
                  </button>
                  <button onClick={() => setSettingsDialog('pages')}>
                    <Layers size={15} />
                    {tr('Страницы')}
                  </button>
                  <button onClick={() => setSettingsDialog('navigation')}>
                    <Navigation size={15} />
                    {tr('Навигация')}
                  </button>
                </div>
              </div>
              <SettingsDialog
                open={settingsDialog === 'navigation'}
                title={tr('Навигация')}
                description={tr('Точки и задачи для предпросмотра и симуляции')}
                close={() => setSettingsDialog(null)}
              >
                <NavigationPanel
                  waypoints={flightSettings.waypoints ?? []}
                  task={navigationTask}
                  target={navigationTarget}
                  onWaypoints={(points) => {
                    setNavigationTarget(null)
                    setFlightSettings((current) => ({
                      ...current,
                      waypoints: points,
                      task: navigationTask?.turnpoints ?? [],
                    }))
                  }}
                  onTask={useNavigationTask}
                  onTarget={(point) => {
                    setNavigationTarget(point)
                    if (!navigationTask)
                      setFlightSettings((current) => ({
                        ...current,
                        task: point ? [{ ...point, radius: Math.max(1, point.radius) }] : [],
                      }))
                  }}
                  fit={fitNavigation}
                  close={() => setSettingsDialog(null)}
                />
              </SettingsDialog>
              <SettingsDialog
                open={settingsDialog === 'screen'}
                title={tr('Настройки экрана')}
                description={tr('Общие параметры для всех страниц')}
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
                title={tr('Раскладка страниц')}
                description={tr('Страницы каждой ориентации настраиваются отдельно')}
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
                    {tr('Портрет')}
                  </button>
                  <button
                    aria-pressed={orientation === 'landscape'}
                    onClick={() => {
                      setOrientation('landscape')
                      setPageId(null)
                      setSelectedId(null)
                    }}
                  >
                    {tr('Альбом')}
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
                          {tr(pageNames[entry.CLASS] ?? '') ||
                            tr('Страница {v0}', { v0: index + 1 })}
                          <small>
                            {tr('Страница {number} · {count} виджетов', {
                              number: index + 1,
                              count: entry.widgets.length,
                            })}
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
                      {tr('Добавить страницу')}
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
                        aria-label={tr('Страница раньше')}
                        disabled={!doc.editable || !page || pageIndex === 0}
                        onClick={() => command(() => reorderPage(doc, orientation, pageIndex, -1))}
                      >
                        <ArrowUp size={15} />
                      </button>
                      <button
                        aria-label={tr('Страница позже')}
                        disabled={
                          !doc.editable || !page || pageIndex >= doc.pages[orientation].length - 1
                        }
                        onClick={() => command(() => reorderPage(doc, orientation, pageIndex, 1))}
                      >
                        <ArrowDown size={15} />
                      </button>
                      <button
                        aria-label={tr('Дублировать страницу')}
                        disabled={!doc.editable || !page}
                        onClick={() => pageCommand('duplicate')}
                      >
                        <Copy size={15} />
                        {tr('Копировать')}
                      </button>
                      <button
                        aria-label={tr('Удалить страницу')}
                        disabled={!doc.editable || !page}
                        onClick={() => pageCommand('delete')}
                      >
                        <Trash2 size={15} />
                      </button>
                    </PageLayoutPanel>
                  </div>
                </div>
                <div className="pages-dialog-footer">
                  <button onClick={() => setSettingsDialog(null)}>{tr('Готово')}</button>
                </div>
              </SettingsDialog>

              <div className="preview-title">
                <label>
                  {tr('Ориентация')}
                  <select
                    aria-label={tr('Ориентация')}
                    value={orientation}
                    onChange={(event) => {
                      setOrientation(event.target.value as Orientation)
                      setPageIndex(0)
                      setSelectedId(null)
                    }}
                  >
                    <option value="portrait">{tr('Портрет')}</option>
                    <option value="landscape">{tr('Альбом')}</option>
                  </select>
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={snap}
                    onChange={(event) => setSnap(event.target.checked)}
                  />
                  {tr('Привязка к сетке')}
                </label>
                <details className="preview-options">
                  <summary>{tr('Вид')}</summary>
                  <label>
                    <input
                      type="checkbox"
                      checked={showBounds}
                      onChange={(event) => setShowBounds(event.target.checked)}
                    />
                    {tr('Рамки')}
                  </label>
                  <button onClick={() => setTextEpoch((epoch) => epoch + 1)}>
                    {tr('Сбросить размеры текста')}
                  </button>
                  <p>
                    {width} × {height} · 420 dpi
                  </p>
                  {locationStatus && <p>{tr(locationStatus)}</p>}
                  {mapSettings.enabled && (
                    <p className="map-attribution">
                      {tr('Онлайн-подложка · ©')}{' '}
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
                            {tr('M. von Känel / thermal.kk7.ch (либо выбранный поставщик)')}
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
                <p>{tr('В этой ориентации нет страниц.')}</p>
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
                    showBounds={showBounds}
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
                        frame={widgetFrame(w, index)}
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
              <h2>{tr('Показания')}</h2>
              <dl>
                <dt>{tr('Скорость')}</dt>
                <dd>
                  {frame.speed?.toFixed(1) ?? '—'} {tr('км/ч')}
                </dd>
                <dt>{tr('Вариометр')}</dt>
                <dd>
                  {frame.vertical?.toFixed(1) ?? '—'} {tr('м/с')}
                </dd>
                <dt>{tr('Высота')}</dt>
                <dd>
                  {frame.altitude?.toFixed(0) ?? '—'} {tr('м')}
                </dd>
              </dl>
              {widget && (
                <section className="simulation-widget-control">
                  <span className="eyebrow">{tr('Выбранный виджет')}</span>
                  <h2 className="selected-widget-name">{widgetTitle(widget.CLASS)}</h2>
                  <p className="selected-widget-description">{widgetDescription(widget.CLASS)}</p>
                  {manualSupported ? (
                    <details className="manual-simulation" open>
                      <summary>{tr('Показание выбранного виджета')}</summary>
                      <WidgetSimulation
                        key={ids[selected]}
                        value={manualValue}
                        resetValue={currentReading(shortName(widget.CLASS))}
                        allowsText={
                          contentSpecs[shortName(widget.CLASS)]?.textWidget === true ||
                          ['WLiveMessage', 'WLogPeek'].includes(shortName(widget.CLASS))
                        }
                        apply={(value) =>
                          setExtraValues((old) => ({ ...old, [ids[selected]!]: value }))
                        }
                        reset={() =>
                          setExtraValues((old) => {
                            const next = { ...old }
                            delete next[ids[selected]!]
                            return next
                          })
                        }
                      />
                    </details>
                  ) : (
                    <p className="hint">
                      {tr(
                        'Этот виджет использует связанные данные полёта. Его отдельное показание нельзя задать вручную.',
                      )}
                    </p>
                  )}
                </section>
              )}
              <button onClick={returnToEditor}>{tr('Вернуться к редактированию')}</button>
            </aside>
            <aside
              className="inspector-panel"
              hidden={simulationOpen}
              data-testid="widget-inspector"
            >
              <span className="eyebrow">{tr('Выбранный виджет')}</span>
              <h2 className="selected-widget-name">
                {widget ? widgetTitle(widget.CLASS) : tr('Выберите виджет на экране')}
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
                  {tr('Оформление')}
                </button>
                <button
                  aria-pressed={inspectorTab === 'advanced'}
                  onClick={() => setInspectorTab('advanced')}
                >
                  {tr('Дополнительно')}
                </button>
              </div>
              <div hidden={inspectorTab !== 'advanced'} className="inspector-advanced">
                <details className="template-panel">
                  <summary>{tr('Копировать из конфигурации')}</summary>
                  <label className="sim-control">
                    {tr('Шаблон из конфигурации')}
                    <select
                      aria-label={tr('Шаблон из конфигурации')}
                      value={template}
                      onChange={(event) => setTemplate(event.target.value)}
                    >
                      <option value="">{tr('Выберите виджет')}</option>
                      {templates.map((entry) => (
                        <option key={entry.id} value={entry.id}>
                          {entry.orientation === 'portrait' ? tr('П') : tr('А')}
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
                    {tr('Добавить из шаблона')}
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
                  {tr('Слой назад')}
                </button>
                <button
                  disabled={!doc.editable || !widget || selected >= (page?.widgets.length ?? 0) - 1}
                  onClick={() =>
                    command(() => reorderWidget(doc, orientation, pageIndex, selected, 1))
                  }
                >
                  {tr('Слой вперёд')}
                </button>
                <button disabled={!doc.editable || !widget} onClick={() => editList('duplicate')}>
                  <Copy size={14} />
                  {tr('Дублировать виджет')}
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
                  {tr('Удалить виджет')}
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
              {tr(error) ||
                (simulationOpen
                  ? tr('Показания из симуляции · настройки XCFG сохраняются')
                  : tr('Перетащите виджет на экран или выберите его для настройки'))}
            </span>
            <span>XCTrack 0.9.12.6</span>
          </footer>
        </>
      )}
    </main>
  )
}
