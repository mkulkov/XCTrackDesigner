import { expect, test } from 'vitest'
import { readFileSync } from 'node:fs'
import { openXcfg } from '../web/src/xcfg'
import { pixelBounds } from '../web/src/xcfg'

test('calibration uses native grid boundaries confirmed at 420dpi', () => {
  const doc = openXcfg(readFileSync('tests/fixtures/calibration.xcfg'))
  const overlay = doc.pages.portrait[0]!.widgets[5]!
  expect(pixelBounds(overlay, 1080, 2400, 420)).toEqual({
    x: 295,
    y: 1300,
    width: 540,
    height: 400,
  })
})
