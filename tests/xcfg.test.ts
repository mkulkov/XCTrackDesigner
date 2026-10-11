import { describe, expect, test } from 'vitest'
import { changeBounds, editWidgetList, openXcfg, pixelBounds } from '../web/src/xcfg'
const source =
  '\uFEFF{\r\n"info":{"versionName":"0.9.12.6","versionCode":91260,"exportType":"backup"},"preferences":{"future":900719925474099312345,"precision":1.234567890123456789},"layout":{"portrait":[{"CLASS":"page","widgets":[{"CLASS":"future.Widget","X1":0,"Y1":0,"X2":5000,"Y2":10000,"future":{"x/y~z":1e+009}}]}],"landscape":[]}}\r\n'
const encode = (text: string) => new TextEncoder().encode(text)
describe('widget list token patches', () => {
  test('duplicate preserves raw unknown fields, IDs survive coordinate edits and delete reverses insertion', () => {
    const doc = openXcfg(encode(source))
    const duplicate = editWidgetList(doc, 'portrait', 0, 0, 'duplicate')
    const path = '/layout/portrait/0/widgets/0'
    const [start, end] = doc.spans.get(path)!
    expect(duplicate.text).toBe(
      source.slice(0, end) + ',' + source.slice(start, end) + source.slice(end),
    )
    expect(duplicate.widgetIds.portrait[0]![0]).toBe(doc.widgetIds.portrait[0]![0])
    expect(duplicate.widgetIds.portrait[0]![1]).not.toBe(doc.widgetIds.portrait[0]![0])
    expect(editWidgetList(duplicate, 'portrait', 0, 1, 'delete').bytes).toEqual(doc.bytes)
    const moved = changeBounds(duplicate, 'portrait', 0, 1, { X1: 100, Y1: 0, X2: 5000, Y2: 10000 })
    expect(moved.widgetIds).toBe(duplicate.widgetIds)
    expect(doc.bytes).toEqual(encode(source))
  })
  test.each([0, 1, 2])(
    'delete at index %i preserves surviving raw tokens and their IDs',
    (index) => {
      const doc = openXcfg(encode(source))
      const two = editWidgetList(doc, 'portrait', 0, 0, 'duplicate')
      const three = editWidgetList(two, 'portrait', 0, 1, 'duplicate')
      const removed = editWidgetList(three, 'portrait', 0, index, 'delete')
      expect(removed.text).toBe(two.text)
      expect(removed.widgetIds.portrait[0]).toEqual(
        three.widgetIds.portrait[0]!.filter((_, i) => i !== index),
      )
    },
  )
  test('rejects deletion of the last widget and edits of unsupported versions', () => {
    const doc = openXcfg(encode(source))
    expect(() => editWidgetList(doc, 'portrait', 0, 0, 'delete')).toThrow('последний')
    expect(() =>
      editWidgetList(
        openXcfg(encode(source.replace('91260', '91261'))),
        'portrait',
        0,
        0,
        'duplicate',
      ),
    ).toThrow('версии')
  })
})
describe('lossless XCFG documents', () => {
  test('no-op retains BOM, CRLF, unknown fields and exact number lexemes', () => {
    const doc = openXcfg(encode(source))
    expect(doc.bytes).toEqual(encode(source))
    expect(changeBounds(doc, 'portrait', 0, 0, { X1: 0, Y1: 0, X2: 5000, Y2: 10000 })).toBe(doc)
  })
  test('scoped edit changes only coordinate tokens, including repeated edits', () => {
    const doc = openXcfg(encode(source))
    const edited = changeBounds(doc, 'portrait', 0, 0, { X1: 100, Y1: 0, X2: 5000, Y2: 9000 })
    const expected = source.replace('"X1":0', '"X1":100').replace('"Y2":10000', '"Y2":9000')
    expect(edited.bytes).toEqual(encode(expected))
    expect(doc.bytes).toEqual(encode(source))
    expect(
      changeBounds(edited, 'portrait', 0, 0, { X1: 2000, Y1: 0, X2: 6000, Y2: 9000 }).text,
    ).toBe(expected.replace('"X1":100', '"X1":2000').replace('"X2":5000', '"X2":6000'))
  })
  test('unknown version stays read-only', () => {
    const doc = openXcfg(encode(source.replace('91260', '91261')))
    expect(doc.editable).toBe(false)
    expect(() =>
      changeBounds(doc, 'portrait', 0, 0, { X1: 0, Y1: 0, X2: 4000, Y2: 10000 }),
    ).toThrow('версии')
  })
  test.each([
    source.replace('"X1":0', '"X1":0,"X\\u0031":1'),
    source.replace('"X1":0', '"X1":NaN'),
    source.replace('"X2":5000', '"X2":0'),
    source.replace('"Y1":0', '"Y1":0.5'),
    source + '{}',
    source.replace(
      '"future":900719925474099312345',
      '"future":' + '['.repeat(70) + '0' + ']'.repeat(70),
    ),
  ])('rejects invalid or ambiguous input without producing a document', (text) => {
    expect(() => openXcfg(encode(text))).toThrow()
  })
  test('rejects invalid UTF-8 and oversized input', () => {
    expect(() => openXcfg(new Uint8Array([255]))).toThrow()
    expect(() => openXcfg(new Uint8Array(5 * 1024 * 1024 + 1))).toThrow('5 МБ')
  })
  test('invalid edits do not mutate original', () => {
    const doc = openXcfg(encode(source))
    expect(() =>
      changeBounds(doc, 'portrait', 0, 0, { X1: 6000, Y1: 0, X2: 5000, Y2: 10000 }),
    ).toThrow()
    expect(doc.text).toBe(source)
  })
})

test('APK grid rounding and collapsed cell correction', () => {
  expect(pixelBounds({ X1: 0, Y1: 0, X2: 5000, Y2: 10000 }, 1080, 2400, 420)).toEqual({
    x: 0,
    y: 0,
    width: 540,
    height: 2400,
  })
  expect(pixelBounds({ X1: 400, Y1: 0, X2: 401, Y2: 10000 }, 1080, 2400, 420)).toEqual({
    x: 0,
    y: 0,
    width: 1080,
    height: 2400,
  })
})
