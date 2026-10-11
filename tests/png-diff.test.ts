import { describe, expect, it } from 'vitest'
import { PNG } from 'pngjs'
import { comparePngs } from '../tools/png-diff.ts'

function solid(width: number, height: number, channel: number) {
  const png = new PNG({ width, height })
  for (let i = 0; i < png.data.length; i += 4) {
    png.data[i] = channel
    png.data[i + 1] = channel
    png.data[i + 2] = channel
    png.data[i + 3] = 255
  }
  return PNG.sync.write(png)
}

describe('PNG comparison for native reference captures', () => {
  it('preserves exact size and reports identical inputs', () => {
    const input = solid(3, 2, 0)
    expect(comparePngs(input, input).changedPixels).toBe(0)
  })
  it('detects changed pixels including antialiasing pixels', () => {
    expect(comparePngs(solid(3, 2, 0), solid(3, 2, 255)).changedRatio).toBe(1)
  })
  it('refuses to silently rescale mismatched captures', () => {
    expect(() => comparePngs(solid(3, 2, 0), solid(2, 3, 0))).toThrow('dimensions')
  })
  it('rejects invalid comparison tolerances', () => {
    const input = solid(3, 2, 0)
    expect(() => comparePngs(input, input, Number.NaN)).toThrow('threshold')
  })
})
