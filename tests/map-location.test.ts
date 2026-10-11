import { afterEach, expect, test, vi } from 'vitest'
import { locateEditorMap } from '../web/src/map-location'

afterEach(() => vi.unstubAllGlobals())
test('browser location takes precedence without an IP request', async () => {
  vi.stubGlobal('navigator', {
    geolocation: {
      getCurrentPosition: (success: (p: unknown) => void) =>
        success({ coords: { latitude: 55, longitude: 37 } }),
    },
  })
  const fetch = vi.fn()
  vi.stubGlobal('fetch', fetch)
  expect(await locateEditorMap(new AbortController().signal)).toEqual({
    latitude: 55,
    longitude: 37,
    source: 'browser',
  })
  expect(fetch).not.toHaveBeenCalled()
})
test('denied browser location falls back to validated IP coordinates', async () => {
  vi.stubGlobal('navigator', {})
  const fetch = vi
    .fn()
    .mockResolvedValue({ ok: true, json: async () => ({ latitude: '48.8', longitude: '2.3' }) })
  vi.stubGlobal('fetch', fetch)
  expect(await locateEditorMap(new AbortController().signal)).toEqual({
    latitude: 48.8,
    longitude: 2.3,
    source: 'ip',
  })
  fetch.mockResolvedValue({ ok: true, json: async () => ({ latitude: '91', longitude: '2.3' }) })
  await expect(locateEditorMap(new AbortController().signal)).rejects.toThrow(
    'Invalid IP coordinates',
  )
})
test('cancellation prevents fallback requests', async () => {
  vi.stubGlobal('navigator', {})
  const fetch = vi.fn()
  vi.stubGlobal('fetch', fetch)
  const controller = new AbortController()
  controller.abort()
  await expect(locateEditorMap(controller.signal)).rejects.toThrow('Aborted')
  expect(fetch).not.toHaveBeenCalled()
})
