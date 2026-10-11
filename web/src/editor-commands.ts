import { openXcfg, createWidgetId, createPageId } from './xcfg'
import type { Document, Json, Orientation, Widget } from './xcfg'
import { libraryWidget, widgetLibrary } from './widget-library'
import { validateDisplayFields } from './display-settings'

export const catalog = widgetLibrary.map(
  (entry) => [entry.name, entry.name === 'WAirTime' ? 'Время полёта' : entry.title] as const,
)
const pageClass = 'org.xcontest.XCTrack.widget.wp.WPXCAssistant'
export function newWidget(name: string): Widget {
  if (!catalog.some(([key]) => key === name)) throw Error('Неизвестный класс каталога')
  return {
    CLASS: `org.xcontest.XCTrack.widget.w.${name}`,
    X1: 2500,
    Y1: 2500,
    X2: 7500,
    Y2: 5000,
    ...(['WSpeed', 'WVerticalSpeed', 'WAMSL', 'WAirTime'].includes(name)
      ? { _bg: 0, _border: true, _title: true, _unit: true, _hide_labels: false }
      : {}),
  }
}
export function newConfiguration(): Document {
  return openXcfg(
    new TextEncoder().encode(
      JSON.stringify(
        {
          info: { versionName: '0.9.12.6', versionCode: 91260, exportType: 'pages' },
          layout: {
            portrait: [{ CLASS: pageClass, navigations: 'all', widgets: [newWidget('WSpeed')] }],
            landscape: [],
          },
        },
        null,
        2,
      ),
    ),
  )
}
const token = (doc: Document, path: string) => {
  const span = doc.spans.get(path)
  if (!span) throw Error('Исходный элемент отсутствует')
  return doc.text.slice(...span)
}
function replace(doc: Document, path: string, raw: string): Document {
  if (!doc.editable) throw Error('Редактирование этой версии не поддерживается')
  const span = doc.spans.get(path)
  if (!span) throw Error('Исходный элемент отсутствует')
  const text = doc.text.slice(0, span[0]) + raw + doc.text.slice(span[1])
  if (text === doc.text) return doc
  return {
    ...openXcfg(new TextEncoder().encode(text)),
    widgetIds: doc.widgetIds,
    pageIds: doc.pageIds,
  }
}
function arrayTokens(doc: Document, path: string, count: number) {
  return Array.from({ length: count }, (_, i) => token(doc, `${path}/${i}`))
}
function setField(doc: Document, path: string, key: string, value: Json): Document {
  const child = `${path}/${key.replaceAll('~', '~0').replaceAll('/', '~1')}`
  if (doc.spans.has(child)) return replace(doc, child, JSON.stringify(value))
  const raw = token(doc, path)
  const parsed = JSON.parse(raw) as object
  return replace(
    doc,
    path,
    raw.slice(0, -1) +
      (Object.keys(parsed).length ? ',' : '') +
      JSON.stringify(key) +
      ':' +
      JSON.stringify(value) +
      '}',
  )
}
function removeField(doc: Document, path: string, key: string): Document {
  const span = doc.spans.get(`${path}/${key.replaceAll('~', '~0').replaceAll('/', '~1')}`)
  if (!span) return doc
  const keys = Object.keys(JSON.parse(token(doc, path)) as object).sort(
    (a, b) =>
      doc.spans.get(`${path}/${a.replaceAll('~', '~0').replaceAll('/', '~1')}`)![0] -
      doc.spans.get(`${path}/${b.replaceAll('~', '~0').replaceAll('/', '~1')}`)![0],
  )
  const index = keys.indexOf(key)
  const parent = doc.spans.get(path)!
  const previous = keys[index - 1]
  const start =
    previous === undefined
      ? parent[0] + 1
      : doc.spans.get(`${path}/${previous.replaceAll('~', '~0').replaceAll('/', '~1')}`)![1]
  const end = index === 0 && keys.length > 1 ? doc.text.indexOf('"', span[1]) : span[1]
  const raw = doc.text.slice(parent[0], start) + doc.text.slice(end, parent[1])
  return replace(doc, path, raw)
}

export function changeDisplayPreferences(doc: Document, fields: Record<string, Json>): Document {
  validateDisplayFields(fields)
  let changed = doc
  if (!Object.keys(fields).length) return doc
  if (!doc.spans.has('/preferences')) changed = setField(changed, '', 'preferences', {})
  for (const [key, value] of Object.entries(fields))
    changed = setField(changed, '/preferences', key, value)
  return changed
}

export function changePageProperties(
  doc: Document,
  orientation: Orientation,
  page: number,
  fields: Record<string, Json>,
): Document {
  if (!doc.pages[orientation][page]) throw Error('Страница не найдена')
  for (const [key, value] of Object.entries(fields)) {
    if (key === 'CLASS') {
      if (
        ![
          'org.xcontest.XCTrack.widget.wp.WPXCAssistant',
          'org.xcontest.XCTrack.widget.wp.WPCompetition',
        ].includes(String(value))
      )
        throw Error('Неизвестный тип страницы')
    } else if (key === 'navigations') {
      if (
        value !== 'all' &&
        value !== 'none' &&
        (!Array.isArray(value) ||
          value.length > 100 ||
          value.some((v) => typeof v !== 'string' || !v.startsWith('org.xcontest.XCTrack.navig.')))
      )
        throw Error('Некорректные режимы навигации')
    } else throw Error('Неизвестный параметр страницы')
  }
  let changed = doc
  for (const [key, value] of Object.entries(fields))
    changed = setField(changed, `/layout/${orientation}/${page}`, key, value)
  return changed
}
export function addWidget(
  doc: Document,
  orientation: Orientation,
  page: number,
  name: string,
): Document {
  const widgets = doc.pages[orientation][page]?.widgets
  if (!widgets) throw Error('Страница не найдена')
  const path = `/layout/${orientation}/${page}/widgets`
  const changed = replace(
    doc,
    path,
    '[' +
      [...arrayTokens(doc, path, widgets.length), JSON.stringify(newWidget(name))].join(',') +
      ']',
  )
  const newId = createWidgetId()
  return {
    ...changed,
    widgetIds: {
      ...doc.widgetIds,
      [orientation]: doc.widgetIds[orientation].map((ids, i) =>
        i === page ? [...ids, newId] : ids,
      ),
    },
  }
}
export function reorderWidget(
  doc: Document,
  orientation: Orientation,
  page: number,
  index: number,
  delta: -1 | 1,
): Document {
  const widgets = doc.pages[orientation][page]?.widgets
  if (!widgets?.[index]) throw Error('Виджет не найден')
  const target = index + delta
  if (target < 0 || target >= widgets.length) return doc
  const path = `/layout/${orientation}/${page}/widgets`
  const tokens = arrayTokens(doc, path, widgets.length)
  ;[tokens[index], tokens[target]] = [tokens[target]!, tokens[index]!]
  const ids = [...doc.widgetIds[orientation][page]!]
  ;[ids[index], ids[target]] = [ids[target]!, ids[index]!]
  const changed = replace(doc, path, '[' + tokens.join(',') + ']')
  return {
    ...changed,
    widgetIds: {
      ...doc.widgetIds,
      [orientation]: doc.widgetIds[orientation].map((old, i) => (i === page ? ids : old)),
    },
  }
}
export function addTemplate(
  doc: Document,
  orientation: Orientation,
  page: number,
  sourceOrientation: Orientation,
  sourcePage: number,
  sourceWidget: number,
): Document {
  const widgets = doc.pages[orientation][page]?.widgets
  if (!widgets || !doc.pages[sourceOrientation][sourcePage]?.widgets[sourceWidget])
    throw Error('Шаблон или страница не найдены')
  const path = `/layout/${orientation}/${page}/widgets`
  const raw = token(doc, `/layout/${sourceOrientation}/${sourcePage}/widgets/${sourceWidget}`)
  const changed = replace(
    doc,
    path,
    '[' + [...arrayTokens(doc, path, widgets.length), raw].join(',') + ']',
  )
  return {
    ...changed,
    widgetIds: {
      ...doc.widgetIds,
      [orientation]: doc.widgetIds[orientation].map((ids, index) =>
        index === page ? [...ids, createWidgetId()] : ids,
      ),
    },
  }
}
export function editPage(
  doc: Document,
  orientation: Orientation,
  page: number,
  operation: 'add' | 'duplicate' | 'delete',
): Document {
  const pages = doc.pages[orientation]
  const path = `/layout/${orientation}`
  const tokens = arrayTokens(doc, path, pages.length)
  const ids = [...doc.pageIds[orientation]]
  const widgetIds = [...doc.widgetIds[orientation]]
  const fresh = newConfiguration()
  if (operation === 'add') {
    tokens.push(token(fresh, '/layout/portrait/0'))
    ids.push(fresh.pageIds.portrait[0]!)
    widgetIds.push(fresh.widgetIds.portrait[0]!)
  } else {
    if (!pages[page]) throw Error('Страница не найдена')
    if (operation === 'duplicate') {
      tokens.splice(page + 1, 0, tokens[page]!)
      ids.splice(page + 1, 0, createPageId())
      // A duplicate's identities must be independent from its source.
      widgetIds.splice(page + 1, 0, pages[page]!.widgets.map(createWidgetId))
    } else {
      const remaining =
        [...doc.pages.portrait, ...doc.pages.landscape].reduce((n, p) => n + p.widgets.length, 0) -
        pages[page]!.widgets.length
      if (!remaining) throw Error('Нельзя удалить страницу с последними виджетами конфигурации')
      tokens.splice(page, 1)
      ids.splice(page, 1)
      widgetIds.splice(page, 1)
    }
  }
  const raw = '[' + tokens.join(',') + ']'
  const changed = doc.spans.has(path)
    ? replace(doc, path, raw)
    : setField(doc, '/layout', orientation, JSON.parse(raw) as Json)
  return {
    ...changed,
    pageIds: { ...doc.pageIds, [orientation]: ids },
    widgetIds: { ...doc.widgetIds, [orientation]: widgetIds },
  }
}
export function reorderPage(
  doc: Document,
  orientation: Orientation,
  index: number,
  delta: -1 | 1,
): Document {
  const pages = doc.pages[orientation]
  const target = index + delta
  if (!pages[index]) throw Error('Страница не найдена')
  if (target < 0 || target >= pages.length) return doc
  const path = `/layout/${orientation}`
  const tokens = arrayTokens(doc, path, pages.length)
  const ids = [...doc.pageIds[orientation]]
  const widgetIds = [...doc.widgetIds[orientation]]
  ;[tokens[index], tokens[target]] = [tokens[target]!, tokens[index]!]
  ;[ids[index], ids[target]] = [ids[target]!, ids[index]!]
  ;[widgetIds[index], widgetIds[target]] = [widgetIds[target]!, widgetIds[index]!]
  return {
    ...replace(doc, path, '[' + tokens.join(',') + ']'),
    pageIds: { ...doc.pageIds, [orientation]: ids },
    widgetIds: { ...doc.widgetIds, [orientation]: widgetIds },
  }
}
export function changeSettings(
  doc: Document,
  orientation: Orientation,
  page: number,
  widget: number,
  fields: Record<string, Json>,
): Document {
  const target = doc.pages[orientation][page]?.widgets[widget]
  if (!target) throw Error('Виджет не найден')
  for (const [key, value] of Object.entries(fields)) {
    const specification = libraryWidget(target.CLASS)?.settings.find(
      (setting) => setting.key === key,
    )
    if (
      !['_title', '_unit', '_border', '_hide_labels', '_bg', '_theme', 'titletext'].includes(key) &&
      !specification
    )
      throw Error('Неизвестное редактируемое поле')
    if (value === null) continue
    if (['_title', '_unit', '_border', '_hide_labels'].includes(key)) {
      if (typeof value !== 'boolean') throw Error('Ожидалось логическое значение')
    } else if (key === '_bg') {
      if (typeof value !== 'number' || !Number.isInteger(value) || value < 0 || value > 100)
        throw Error('Прозрачность должна быть целой от 0 до 100')
    } else if (key === '_theme') {
      if (
        typeof value !== 'string' ||
        !['WhiteTheme', 'WhiteHCTheme', 'BlackTheme', 'BlackHCTheme'].includes(value)
      )
        throw Error('Неизвестная тема')
    } else if (key === 'titletext') {
      if (typeof value !== 'string' || value.length > 256) throw Error('Заголовок слишком длинный')
    } else if (specification?.type === 'boolean') {
      if (typeof value !== 'boolean') throw Error('Ожидалось логическое значение')
    } else if (['integer', 'color'].includes(specification?.type ?? '')) {
      if (typeof value !== 'number' || !Number.isSafeInteger(value))
        throw Error('Ожидалось целое число')
    } else if (specification?.type === 'string') {
      if (typeof value !== 'string' || value.length > 16384)
        throw Error('Ожидалась строка до 16384 символов')
    } else if (specification?.type === 'number') {
      if (typeof value !== 'number' || !Number.isFinite(value))
        throw Error('Ожидалось конечное число')
    } else if (
      specification?.type === 'scale' ||
      (key === 'rotation' &&
        specification?.type === 'enum' &&
        typeof specification.default === 'object' &&
        specification.default !== null)
    ) {
      const structured = value && typeof value === 'object' && !Array.isArray(value) ? value : null
      if (!structured) throw Error('Ожидался объект настройки')
      if (specification.type === 'scale') {
        if (
          typeof structured.value !== 'number' ||
          !Number.isSafeInteger(structured.value) ||
          typeof structured.auto !== 'boolean'
        )
          throw Error('Масштаб должен содержать целый уровень и признак автоматического выбора')
        if (
          structured.resetZoomPanExit !== undefined &&
          typeof structured.resetZoomPanExit !== 'boolean'
        )
          throw Error('Сброс масштаба должен быть логическим значением')
      } else if (
        typeof structured.value !== 'string' ||
        (structured.showCompass !== undefined && typeof structured.showCompass !== 'boolean')
      ) {
        throw Error('Ориентация должна содержать направление и признак показа компаса')
      }
    } else if (specification?.type === 'enum') {
      if (
        typeof specification.default === 'number' &&
        (typeof value !== 'number' || !Number.isSafeInteger(value))
      )
        throw Error('Ожидалось числовое перечисление')
      if (typeof value !== 'string' && !(typeof value === 'number' && Number.isSafeInteger(value)))
        throw Error('Ожидалось значение перечисления')
    } else throw Error('Это поле доступно в JSON-инспекторе')
  }
  let changed = doc
  for (const [key, value] of Object.entries(fields)) {
    if (value === null)
      changed = removeField(changed, `/layout/${orientation}/${page}/widgets/${widget}`, key)
    else if (target[key] !== value)
      changed = setField(changed, `/layout/${orientation}/${page}/widgets/${widget}`, key, value)
  }
  return changed
}

export function changeWidgetOptions(
  doc: Document,
  orientation: Orientation,
  page: number,
  widget: number,
  json: string,
): Document {
  if (new TextEncoder().encode(json).length > 256 * 1024) throw Error('Настройки превышают 256 KiB')
  // Reuse the lossless scanner to reject duplicate keys, excessive depth and non-finite numbers.
  const checked = openXcfg(
    new TextEncoder().encode(
      `{"info":{"versionCode":91260,"versionName":"0.9.12.6","exportType":"pages"},"layout":{"portrait":[{"CLASS":"Page","widgets":[{"CLASS":"Options","X1":0,"Y1":0,"X2":10000,"Y2":10000,"options":${json}}]}]}}`,
    ),
  )
  const options = checked.pages.portrait[0]!.widgets[0]!.options
  if (!options || typeof options !== 'object' || Array.isArray(options))
    throw Error('Настройки должны быть JSON-объектом')
  const protectedKeys = new Set(['CLASS', 'X1', 'Y1', 'X2', 'Y2'])
  if (Object.keys(options).some((key) => protectedKeys.has(key)))
    throw Error('Класс и координаты изменяются отдельными командами')
  const target = doc.pages[orientation][page]?.widgets[widget]
  if (!target) throw Error('Виджет не найден')
  const path = `/layout/${orientation}/${page}/widgets/${widget}`
  let changed = doc
  for (const key of Object.keys(target)) {
    if (!protectedKeys.has(key) && !Object.hasOwn(options, key))
      changed = removeField(changed, path, key)
  }
  for (const [key, value] of Object.entries(options)) {
    if (!Object.hasOwn(target, key) || JSON.stringify(target[key]) !== JSON.stringify(value))
      changed = setField(changed, path, key, value)
  }
  return changed
}
