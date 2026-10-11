import { describe, expect, test } from 'vitest'
import type { Json } from '../web/src/xcfg'
import {
  displayArgbHex,
  parseDisplayArgb,
  validateDisplayFields,
} from '../web/src/display-settings'

describe('display settings boundary', () => {
  test('accepts native string enums, booleans and signed ARGB', () => {
    expect(() =>
      validateDisplayFields({
        'Display.Theme': 'WhiteEInkTheme',
        'Display.WidgetTitleFont': 'default',
        'Display.RepaintInterval': '1',
        'Display.Fullscreen': false,
        'Display.WidgetTitleColor': -2147483648,
      }),
    ).not.toThrow()
  })
  test('rejects unrelated keys, non-native enums and invalid native types', () => {
    const invalid: Record<string, Json>[] = [
      { 'Flight.AutoStart': true },
      { 'Display.Theme': 'future' },
      { 'Display.RepaintInterval': 500 },
      { 'Display.Fullscreen': 'true' },
      { 'Display.WidgetTitleColor': 0.5 },
      { 'Display.WidgetTitleColor': 4294967296 },
    ]
    for (const fields of invalid) expect(() => validateDisplayFields(fields)).toThrow()
  })
  test('ARGB edits retain alpha and represent signed Android color integers', () => {
    expect(parseDisplayArgb('#80a1b2c3')).toBe(-2136886589)
    expect(displayArgbHex(parseDisplayArgb('#80a1b2c3'))).toBe('#80A1B2C3')
    expect(displayArgbHex(4294967295)).toBe('#FFFFFFFF')
    expect(parseDisplayArgb('#00000000')).toBe(0)
    expect(() => parseDisplayArgb('#123456')).toThrow()
  })
})
