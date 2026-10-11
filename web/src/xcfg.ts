export type Json = null | boolean | number | string | Json[] | { [key: string]: Json }
export type Orientation = 'portrait' | 'landscape'
export type Widget = {
  [key: string]: Json
  CLASS: string
  X1: number
  Y1: number
  X2: number
  Y2: number
}
export type Page = { [key: string]: Json; CLASS: string; widgets: Widget[] }
export type Document = {
  pageIds: Record<Orientation, string[]>
  widgetIds: Record<Orientation, string[][]>
  bytes: Uint8Array
  text: string
  spans: Map<string, [number, number]>
  pages: Record<Orientation, Page[]>
  preferences: Record<string, Json>
  editable: boolean
  version: string
}
let nextWidgetId = 0
let nextPageId = 0
export const createWidgetId = () => `widget-${++nextWidgetId}`
export const createPageId = () => `page-${++nextPageId}`
const pointer = (key: string) => key.replaceAll('~', '~0').replaceAll('/', '~1')
const object = (value: Json | undefined): Record<string, Json> => {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw Error('Ожидался объект JSON')
  return value
}

// Scan before JSON.parse: duplicate keys must not disappear. Spans let us replace
// only known tokens without serializing unknown numbers or changing whitespace.
function scan(text: string) {
  let i = 0
  let nodes = 0
  const spans = new Map<string, [number, number]>()
  const whitespace = () => {
    while (/\s/.test(text[i] ?? '') && i < text.length) i++
  }
  const string = () => {
    const start = i++
    while (i < text.length) {
      if (text[i++] === '"') return JSON.parse(text.slice(start, i)) as string
      if (text[i - 1] === '\\') i++
    }
    throw Error('Незавершённая строка JSON')
  }
  const value = (path: string, depth: number): void => {
    if (depth > 64 || ++nodes > 100000) throw Error('Превышен предел сложности JSON')
    whitespace()
    const start = i
    if (text[i] === '{' || text[i] === '[') {
      const isObject = text[i++] === '{'
      const end = isObject ? '}' : ']'
      const keys = new Set<string>()
      let index = 0
      whitespace()
      if (text[i] !== end) {
        while (true) {
          whitespace()
          let key = String(index++)
          if (isObject) {
            if (text[i] !== '"') throw Error('Некорректный ключ JSON')
            key = string()
            if (keys.has(key)) throw Error('Повторяющийся ключ JSON')
            keys.add(key)
            whitespace()
            if (text[i++] !== ':') throw Error('Ожидалось двоеточие')
          }
          value(`${path}/${pointer(key)}`, depth + 1)
          whitespace()
          if (text[i] === end) break
          if (text[i++] !== ',') throw Error('Ожидалась запятая')
        }
      }
      i++
    } else if (text[i] === '"') string()
    else {
      const token = /^(?:true|false|null|-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?)/.exec(
        text.slice(i),
      )?.[0]
      if (!token) throw Error('Некорректное значение JSON')
      i += token.length
    }
    spans.set(path, [start, i])
  }
  value('', 0)
  whitespace()
  if (i !== text.length) throw Error('Лишние данные после JSON')
  return spans
}

export function openXcfg(input: Uint8Array): Document {
  if (input.length > 5 * 1024 * 1024) throw Error('XCFG больше 5 МБ')
  const bytes = input.slice()
  const text = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes)
  // BOM is retained in text, so all token offsets and byte-identical exports agree.
  const spans = scan(text)
  const root = object(JSON.parse(text.replace(/^\uFEFF/, '')) as Json)
  const info = object(root.info)
  const layout = object(root.layout)
  const pages = { portrait: [], landscape: [] } as Record<Orientation, Page[]>
  let count = 0
  for (const orientation of ['portrait', 'landscape'] as const) {
    const entries = layout[orientation] ?? []
    if (!Array.isArray(entries) || entries.length > 100) throw Error('Некорректный список страниц')
    pages[orientation] = entries.map((entry) => {
      const page = object(entry)
      if (typeof page.CLASS !== 'string' || !Array.isArray(page.widgets))
        throw Error('Некорректная страница')
      const widgets = page.widgets.map((entry) => {
        const widget = object(entry)
        if (++count > 5000 || typeof widget.CLASS !== 'string') throw Error('Некорректный виджет')
        for (const key of ['X1', 'Y1', 'X2', 'Y2']) {
          const n = widget[key]
          if (typeof n !== 'number' || !Number.isInteger(n) || n < 0 || n > 10000)
            throw Error('Координаты должны быть целыми числами 0…10000')
        }
        const w = widget as Widget
        if (w.X1 >= w.X2 || w.Y1 >= w.Y2) throw Error('Виджет должен иметь положительный размер')
        return w
      })
      return { ...page, CLASS: page.CLASS, widgets } as Page
    })
  }
  if (!count) throw Error('В конфигурации нет виджетов')
  return {
    pageIds: {
      portrait: pages.portrait.map(createPageId),
      landscape: pages.landscape.map(createPageId),
    },
    widgetIds: {
      portrait: pages.portrait.map((p) => p.widgets.map(createWidgetId)),
      landscape: pages.landscape.map((p) => p.widgets.map(createWidgetId)),
    },
    bytes,
    text,
    spans,
    pages,
    preferences: root.preferences === undefined ? {} : object(root.preferences),
    editable:
      info.versionCode === 91260 &&
      info.versionName === '0.9.12.6' &&
      (info.exportType === 'backup' || info.exportType === 'pages'),
    version: `${String(info.versionName ?? '?')} / ${String(info.versionCode ?? '?')}`,
  }
}

export type Bounds = Pick<Widget, 'X1' | 'Y1' | 'X2' | 'Y2'>
export function changeBounds(
  doc: Document,
  orientation: Orientation,
  page: number,
  widget: number,
  bounds: Bounds,
): Document {
  if (!doc.editable) throw Error('Редактирование этой версии не поддерживается')
  const target = doc.pages[orientation][page]?.widgets[widget]
  if (!target) throw Error('Виджет не найден')
  const patches = Object.entries(bounds)
    .map(([key, value]) => {
      if (!['X1', 'Y1', 'X2', 'Y2'].includes(key)) throw Error('Неизвестное редактируемое поле')
      const span = doc.spans.get(`/layout/${orientation}/${page}/widgets/${widget}/${key}`)
      if (!span) throw Error('Исходное поле отсутствует')
      if (!Number.isInteger(value) || value < 0 || value > 10000)
        throw Error('Координаты должны быть целыми числами 0…10000')
      return { span, value, changed: target[key] !== value }
    })
    .filter((patch) => patch.changed)
    .sort((a, b) => b.span[0] - a.span[0])
  if (bounds.X1 >= bounds.X2 || bounds.Y1 >= bounds.Y2)
    throw Error('Виджет должен иметь положительный размер')
  if (Object.entries(bounds).every(([key, value]) => target[key] === value)) return doc
  let text = doc.text
  for (const {
    span: [start, end],
    value,
  } of patches)
    text = text.slice(0, start) + value + text.slice(end)
  return {
    ...openXcfg(new TextEncoder().encode(text)),
    widgetIds: doc.widgetIds,
    pageIds: doc.pageIds,
  }
}

// Splice original tokens rather than serializing objects: unknown number lexemes,
// escaped strings, settings and all bytes outside this insertion/removal survive.
export function editWidgetList(
  doc: Document,
  orientation: Orientation,
  page: number,
  widget: number,
  operation: 'duplicate' | 'delete',
): Document {
  if (!doc.editable) throw Error('Редактирование этой версии не поддерживается')
  const list = doc.pages[orientation][page]?.widgets
  if (!list?.[widget]) throw Error('Виджет не найден')
  const spanAt = (index: number) => {
    const span = doc.spans.get(`/layout/${orientation}/${page}/widgets/${index}`)
    if (!span) throw Error('Исходный виджет отсутствует')
    return span
  }
  const [start, end] = spanAt(widget)
  let text: string
  const ids = [...doc.widgetIds[orientation][page]!]
  if (operation === 'duplicate') {
    const separator =
      widget + 1 < list.length
        ? doc.text.slice(end, spanAt(widget + 1)[0])
        : widget > 0
          ? doc.text.slice(spanAt(widget - 1)[1], start)
          : ','
    text = doc.text.slice(0, end) + separator + doc.text.slice(start, end) + doc.text.slice(end)
    ids.splice(widget + 1, 0, createWidgetId())
  } else {
    const total = [...doc.pages.portrait, ...doc.pages.landscape].reduce(
      (n, p) => n + p.widgets.length,
      0,
    )
    if (total === 1) throw Error('Нельзя удалить последний виджет конфигурации')
    const from = widget > 0 ? spanAt(widget - 1)[1] : start
    const to = widget === 0 && list.length > 1 ? spanAt(1)[0] : end
    text = doc.text.slice(0, from) + doc.text.slice(to)
    ids.splice(widget, 1)
  }
  const changed = openXcfg(new TextEncoder().encode(text))
  return {
    ...changed,
    pageIds: doc.pageIds,
    widgetIds: {
      ...doc.widgetIds,
      [orientation]: doc.widgetIds[orientation].map((oldIds, index) =>
        index === page ? ids : oldIds,
      ),
    },
  }
}

export function pixelBounds(widget: Bounds, width: number, height: number, dpi: number) {
  const axis = (start: number, end: number, pixels: number) => {
    const cells = Math.max(1, Math.round(pixels / Math.max(8, 0.11952191 * dpi)))
    let a = Math.floor((start * cells + 5000) / 10000)
    let b = Math.floor((end * cells + 5000) / 10000)
    // d0.E expands collapsed ranges to the full axis.
    if (b <= a) {
      a = 0
      b = cells
    }
    return [Math.round((a * pixels) / cells), Math.round((b * pixels) / cells)] as const
  }
  const [x1, x2] = axis(widget.X1, widget.X2, width)
  const [y1, y2] = axis(widget.Y1, widget.Y2, height)
  return { x: x1, y: y1, width: x2 - x1, height: y2 - y1 }
}
