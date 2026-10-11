import { describe, expect, test } from 'vitest'
import {
  addWidget,
  addTemplate,
  reorderPage,
  changeSettings,
  editPage,
  newConfiguration,
  reorderWidget,
  changeDisplayPreferences,
  changePageProperties,
} from '../web/src/editor-commands'
import { openXcfg } from '../web/src/xcfg'
const bytes = (text: string) => new TextEncoder().encode(text)
const source =
  '\uFEFF{\r\n"info":{"versionName":"0.9.12.6","versionCode":91260,"exportType":"backup"},"preferences":{"future":900719925474099312345},"layout":{"portrait":[{"CLASS":"page","extra":1.234567890123456789,"widgets":[{"CLASS":"future.Widget","X1":0,"Y1":0,"X2":5000,"Y2":10000,"future":{"a/b~x":1e+009}}]}]}}\r\n'
describe('editor commands', () => {
  test('screen settings preserve unknown tokens and create preferences when absent', () => {
    const doc = openXcfg(bytes(source))
    const changed = changeDisplayPreferences(doc, {
      'Display.Theme': 'WhiteTheme',
      'Display.WidgetTitleColor': -1,
    })
    expect(changed.preferences['Display.Theme']).toBe('WhiteTheme')
    expect(changed.text).toContain('900719925474099312345')
    expect(changed.text).toContain('1.234567890123456789')
    expect(changed.widgetIds).toBe(doc.widgetIds)
    expect(changeDisplayPreferences(changed, { 'Display.Theme': 'WhiteTheme' })).toBe(changed)
    const fresh = changeDisplayPreferences(newConfiguration(), { 'Display.Fullscreen': false })
    expect(fresh.preferences['Display.Fullscreen']).toBe(false)
    expect(() => changeDisplayPreferences(doc, { unsafe: true })).toThrow()
    const readonly = openXcfg(bytes(source.replace('91260', '91261')))
    expect(() => changeDisplayPreferences(readonly, { 'Display.Fullscreen': false })).toThrow(
      'версии',
    )
  })
  test('page availability preserves widgets and the other orientation', () => {
    const doc = editPage(openXcfg(bytes(source)), 'landscape', 0, 'add')
    const fields = {
      CLASS: 'org.xcontest.XCTrack.widget.wp.WPCompetition',
      navigations: ['org.xcontest.XCTrack.navig.TaskCompetition'],
    }
    const changed = changePageProperties(doc, 'portrait', 0, fields)
    expect(changed.pages.portrait[0]).toMatchObject(fields)
    expect(changed.pages.landscape).toEqual(doc.pages.landscape)
    expect(changed.text).toContain('1.234567890123456789')
    expect(changed.text).toContain('1e+009')
    expect(changed.widgetIds).toBe(doc.widgetIds)
    expect(changePageProperties(changed, 'portrait', 0, fields)).toBe(changed)
    expect(() => changePageProperties(doc, 'portrait', 0, { widgets: [] })).toThrow()
  })
  test('catalog additions preserve original tokens and settings; reordering keeps identity', () => {
    const doc = openXcfg(bytes(source))
    const added = addWidget(doc, 'portrait', 0, 'WSpeed')
    expect(added.text).toContain('900719925474099312345')
    expect(added.text).toContain('1.234567890123456789')
    expect(added.text).toContain('"future":{"a/b~x":1e+009}')
    expect(added.pageIds).toBe(doc.pageIds)
    const moved = reorderWidget(added, 'portrait', 0, 1, -1)
    expect(moved.pages.portrait[0]!.widgets[0]!.CLASS).toContain('WSpeed')
    expect(moved.widgetIds.portrait[0]).toEqual([...added.widgetIds.portrait[0]!].reverse())
    expect(reorderWidget(moved, 'portrait', 0, 0, -1)).toBe(moved)
    expect(() => addWidget(doc, 'portrait', 0, 'arbitrary')).toThrow('класс')
  })
  test('page copy retains unknown raw fields with independent identities; missing orientation can be added', () => {
    const doc = openXcfg(bytes(source))
    const copied = editPage(doc, 'portrait', 0, 'duplicate')
    expect(copied.text.match(/1\.234567890123456789/g)).toHaveLength(2)
    expect(copied.pageIds.portrait[1]).not.toBe(doc.pageIds.portrait[0])
    expect(copied.widgetIds.portrait[1]![0]).not.toBe(doc.widgetIds.portrait[0]![0])
    const landscape = editPage(copied, 'landscape', 0, 'add')
    expect(landscape.pages.landscape).toHaveLength(1)
    expect(landscape.text).toContain('900719925474099312345')
    const deleted = editPage(landscape, 'portrait', 1, 'delete')
    expect(deleted.pages.portrait).toHaveLength(1)
    expect(deleted.widgetIds.portrait[0]).toEqual(doc.widgetIds.portrait[0])
    expect(() => editPage(doc, 'portrait', 0, 'delete')).toThrow('последними')
  })
  test('settings insert only touched fields; removing a theme keeps unknown lexemes', () => {
    const doc = openXcfg(bytes(source))
    const changed = changeSettings(doc, 'portrait', 0, 0, {
      _bg: 50,
      _theme: 'WhiteTheme',
      _border: true,
    })
    expect(changed.text).toContain('"future":{"a/b~x":1e+009}')
    expect(changed.pageIds).toBe(doc.pageIds)
    expect(changed.widgetIds).toBe(doc.widgetIds)
    expect(changed.pages.portrait[0]!.widgets[0]!._title).toBeUndefined()
    const reset = changeSettings(changed, 'portrait', 0, 0, { _theme: null })
    expect(reset.pages.portrait[0]!.widgets[0]!._theme).toBeUndefined()
    expect(reset.text).toContain('1e+009')
    expect(changeSettings(reset, 'portrait', 0, 0, { _bg: 50 })).toBe(reset)
    expect(() => changeSettings(doc, 'portrait', 0, 0, { _bg: 101 })).toThrow('Прозрачность')
    expect(() => changeSettings(doc, 'portrait', 0, 0, { CLASS: 'unsafe' })).toThrow('Неизвестное')
    expect(() => changeSettings(doc, 'portrait', 0, 0, { _theme: '' })).toThrow('тема')
  })
  test('imported templates and page reorder preserve raw content and independent identity', () => {
    const doc = openXcfg(bytes(source))
    const two = editPage(doc, 'portrait', 0, 'duplicate')
    const copied = addTemplate(two, 'portrait', 1, 'portrait', 0, 0)
    expect(copied.text.match(/1e\+009/g)).toHaveLength(3)
    expect(copied.widgetIds.portrait[1]![1]).not.toBe(doc.widgetIds.portrait[0]![0])
    const moved = reorderPage(copied, 'portrait', 1, -1)
    expect(moved.pageIds.portrait).toEqual([...copied.pageIds.portrait].reverse())
    expect(moved.widgetIds.portrait[0]).toEqual(copied.widgetIds.portrait[1])
    expect(moved.pages.portrait[0]!.widgets).toHaveLength(2)
  })
  test('new document has a supported pages-only profile and explicit catalog template', () => {
    const doc = newConfiguration()
    expect(doc.editable).toBe(true)
    expect(doc.pages.portrait[0]!.widgets[0]!.CLASS).toContain('WSpeed')
    expect(JSON.parse(doc.text).info.exportType).toBe('pages')
    expect(doc.pages.landscape).toEqual([])
    const readonly = openXcfg(bytes(source.replace('91260', '91261')))
    expect(() => editPage(readonly, 'portrait', 0, 'add')).toThrow('версии')
    expect(() => addWidget(readonly, 'portrait', 0, 'WSpeed')).toThrow('версии')
  })
})
