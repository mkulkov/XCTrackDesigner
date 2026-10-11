import { expect, test } from 'vitest'
import { widgetLibrary } from '../web/src/widget-library'
import {
  changeWidgetOptions,
  newConfiguration,
  newWidget,
  changeSettings,
  addWidget,
} from '../web/src/editor-commands'
import { openXcfg } from '../web/src/xcfg'
import defaults from '../docs/research/widget-native-defaults.json'

test('registered catalog is complete, executable widgets remain inert metadata', () => {
  expect(widgetLibrary).toHaveLength(78)
  expect(new Set(widgetLibrary.map((entry) => entry.name)).size).toBe(78)
  expect(widgetLibrary.filter((entry) => entry.debugOnly)).toHaveLength(7)
  for (const entry of widgetLibrary) {
    const w = newWidget(entry.name)
    expect(w.CLASS).toBe(`org.xcontest.XCTrack.widget.w.${entry.name}`)
    expect(w).not.toHaveProperty('url')
    expect(w).not.toHaveProperty('action')
    expect(entry.title.length).toBeGreaterThan(0)
  }
  expect(defaults.exportedCount).toBe(71)
  expect(defaults.preferencesUnchanged).toBe(true)
})

test('JSON option patches preserve untouched lexemes, handle escaped keys, null and deletion', () => {
  const source =
    '{"info":{"versionCode":91260,"versionName":"0.9.12.6","exportType":"pages"},"layout":{"portrait":[{"CLASS":"Page","widgets":[{"CLASS":"unknown.Widget","X1":0,"Y1":0,"X2":10000,"Y2":10000,"future":900719925474099312345,"a/b~c":1,"nested":{"value":1e+009}}]}]}}'
  const doc = openXcfg(new TextEncoder().encode(source))
  const options = {
    future: doc.pages.portrait[0]!.widgets[0]!.future,
    'a/b~c': 2,
    nested: { value: 1e9 },
    added: null,
  }
  const changed = changeWidgetOptions(doc, 'portrait', 0, 0, JSON.stringify(options))
  expect(changed.text).toContain('900719925474099312345')
  expect(changed.text).toContain('"nested":{"value":1e+009}')
  expect(changed.pages.portrait[0]!.widgets[0]!['a/b~c']).toBe(2)
  expect(changed.pages.portrait[0]!.widgets[0]!.added).toBeNull()
  const removed = changeWidgetOptions(
    changed,
    'portrait',
    0,
    0,
    JSON.stringify({ future: options.future, nested: options.nested }),
  )
  expect(removed.text).toContain('900719925474099312345')
  expect(removed.pages.portrait[0]!.widgets[0]).not.toHaveProperty('a/b~c')
  expect(removed.widgetIds).toBe(doc.widgetIds)
  expect(() => changeWidgetOptions(doc, 'portrait', 0, 0, '{"x":1,"x":2}')).toThrow()
  expect(() => changeWidgetOptions(doc, 'portrait', 0, 0, '{"CLASS":"bad"}')).toThrow('Класс')
  expect(() => changeWidgetOptions(doc, 'portrait', 0, 0, '[]')).toThrow('JSON-объектом')
})

test('native FreeText settings have typed edits and known runtime defaults', () => {
  const entry = widgetLibrary.find((entry) => entry.name === 'WFreeText')!
  expect(entry.settings.find((setting) => setting.key === 'text_size')?.default).toBe(25)
  const doc = addWidget(newConfiguration(), 'portrait', 0, 'WFreeText')
  const changed = changeSettings(doc, 'portrait', 0, 1, {
    text: 'Тест',
    text_size: 40,
    text_bold: true,
  })
  expect(changed.pages.portrait[0]!.widgets[1]!.text).toBe('Тест')
  expect(() => changeSettings(doc, 'portrait', 0, 1, { text_bold: 'true' })).toThrow('логическое')
  expect(() => changeSettings(doc, 'portrait', 0, 1, { unknown: 1 })).toThrow('Неизвестное')
})

test('structured native map settings validate shape and preserve extension fields', () => {
  const doc = addWidget(newConfiguration(), 'portrait', 0, 'WThermalAssistant')
  const changed = changeSettings(doc, 'portrait', 0, 1, {
    rotation: { value: 'HEADING_AT_TOP', showCompass: true, extension: 7 },
    mapScale: { value: 34, auto: true, resetZoomPanExit: false, extension: 9 },
  })
  expect(changed.pages.portrait[0]!.widgets[1]).toMatchObject({
    rotation: { value: 'HEADING_AT_TOP', extension: 7 },
    mapScale: { value: 34, auto: true, extension: 9 },
  })
  expect(() =>
    changeSettings(doc, 'portrait', 0, 1, { mapScale: { value: 34, auto: 'true' } }),
  ).toThrow('Масштаб')
  expect(() => changeSettings(doc, 'portrait', 0, 1, { rotation: { value: 34 } })).toThrow(
    'Ориентация',
  )
})
