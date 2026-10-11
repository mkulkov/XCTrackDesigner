import { expect, test } from '@playwright/test'
import { readFile, writeFile } from 'node:fs/promises'
import { PNG } from 'pngjs'
import { comparePngs } from '../../tools/png-diff'

test('calibration: missing inputs, layers, alpha and native-size capture', async ({ page }) => {
  const source = await readFile('tests/fixtures/calibration.xcfg')
  await page.goto('/')
  const fonts = await page.request
    .get('/__local-fonts/manifest.json')
    .then((response) => response.json())
  if (fonts.available)
    await expect(page.locator('[data-native-fonts]')).toHaveAttribute('data-native-fonts', 'true')
  await page
    .getByLabel('Открыть XCFG', { exact: true })
    .setInputFiles({ name: 'calibration.xcfg', mimeType: 'application/json', buffer: source })
  await page.getByText('Симуляция полёта', { exact: true }).click()
  await page.getByText('Показания и отсутствие данных', { exact: true }).click()
  await page.getByLabel('Скорость, km/h').fill('0')
  await page.getByLabel('Вариометр, m/s').fill('0')
  await page.getByLabel('Нет высоты AMSL', { exact: true }).check()
  await page.getByLabel('Не в полёте', { exact: true }).check()
  await page.locator('.preview-options > summary').click()
  await page.getByLabel('Рамки', { exact: true }).uncheck()
  await page.getByRole('button', { name: 'Сбросить размеры текста' }).click()
  const svg = page.getByRole('img', { name: 'Предпросмотр страницы XCTrack' })
  // Native fonts position each glyph; the portable fallback uses one text origin.
  await expect(svg.locator('[data-widget=WSpeed] text').first()).toHaveAttribute(
    'x',
    fonts.available ? /^-?\d+(?:\.\d+)?(?: -?\d+(?:\.\d+)?)+$/ : /^-?\d+(?:\.\d+)?$/,
  )
  await expect(
    svg.locator('[data-widget=WVerticalSpeed] text').filter({ hasText: /^\+0,0$/ }),
  ).toHaveCount(1)
  await expect(svg.locator('[data-widget=WAMSL]').last().locator('text')).toHaveCount(0)
  await svg.evaluate((element) => {
    const cloned = element.cloneNode(true) as SVGSVGElement
    cloned.setAttribute('data-calibration-snapshot', '')
    cloned.setAttribute('width', '1080')
    cloned.setAttribute('height', '2400')
    cloned.style.cssText =
      'position:absolute;left:0;top:0;width:1080px;height:2400px;max-width:none;z-index:100;background:black;border:0;margin:0'
    document.body.append(cloned)
  })
  const web = await page.locator('[data-calibration-snapshot]').screenshot()
  await page.locator('[data-calibration-snapshot]').evaluate((element) => element.remove())
  await writeFile('.local/calibration-web.png', web)
  const decoded = PNG.sync.read(web)
  const points = [
    [100, 100, [255, 255, 255]],
    [100, 800, [0, 0, 0]],
    [300, 1400, [128, 128, 128]],
    [290, 1400, [255, 255, 255]],
    [100, 2200, [255, 255, 255]],
    [1000, 2200, [0, 0, 0]],
  ] as const
  const pixel = (png: PNG, x: number, y: number) => [
    ...png.data.subarray((y * png.width + x) * 4, (y * png.width + x) * 4 + 3),
  ]
  for (const [x, y, color] of points) expect(pixel(decoded, x, y)).toEqual(color)
  const nativePath =
    process.env.XCT_QA_NATIVE ?? 'docs/research/screenshots/calibration-values-portrait.png'
  const nativeBytes = await readFile(nativePath).catch((cause: NodeJS.ErrnoException) => {
    if (
      cause.code !== 'ENOENT' ||
      process.env.XCT_QA_NATIVE ||
      process.env.XCT_QA_REQUIRE_PIXEL_PARITY === '1'
    ) {
      throw cause
    }
    return null
  })
  if (!nativeBytes) {
    test.info().annotations.push({
      type: 'native-reference',
      description: 'No local native screenshot; browser geometry and export are still checked',
    })
  }
  if (nativeBytes) {
    const native = PNG.sync.read(nativeBytes)
    expect([native.width, native.height]).toEqual([1080, 2400])
    for (const [x, y, color] of points) expect(pixel(native, x, y)).toEqual(color)
    const gray = (png: PNG, x: number, y: number) => pixel(png, x, y).every((n) => n === 128)
    const edges = (png: PNG) => ({
      left: Array.from({ length: 60 }, (_, i) => 270 + i).find((x) => gray(png, x, 1400)),
      top: Array.from({ length: 100 }, (_, i) => 1250 + i).find((y) => gray(png, 300, y)),
      right: Array.from({ length: 60 }, (_, i) => 860 - i).find((x) => gray(png, x, 1650)),
      bottom: Array.from({ length: 150 }, (_, i) => 1750 - i).find((y) => gray(png, 300, y)),
    })
    expect(edges(decoded)).toEqual(edges(native))
    expect(edges(native)).toEqual({ left: 295, top: 1300, right: 833, bottom: 1698 })
    const comparison = comparePngs(nativeBytes, web, 0.1)
    const regions = [
      { name: 'speed', x: 0, y: 0, width: 540, height: 600 },
      { name: 'vario', x: 540, y: 0, width: 540, height: 600 },
      { name: 'missing', x: 0, y: 600, width: 1080, height: 600 },
      { name: 'overlap', x: 0, y: 1200, width: 1080, height: 600 },
      { name: 'hide', x: 0, y: 1800, width: 1080, height: 600 },
    ]
    const cropped = (png: PNG, r: (typeof regions)[number]) => {
      const target = new PNG({ width: r.width, height: r.height })
      PNG.bitblt(png, target, r.x, r.y, r.width, r.height, 0, 0)
      return PNG.sync.write(target)
    }
    const glyphBounds = (png: PNG, region: (typeof regions)[number], color: number[]) => {
      let left = Infinity,
        top = Infinity,
        right = -1,
        bottom = -1
      for (let y = region.y; y < region.y + region.height; y++)
        for (let x = region.x; x < region.x + region.width; x++)
          if (pixel(png, x, y).every((n, i) => n === color[i])) {
            left = Math.min(left, x)
            right = Math.max(right, x)
            top = Math.min(top, y)
            bottom = Math.max(bottom, y)
          }
      return { left, top, right, bottom }
    }
    const glyphs = [
      [regions[0]!, [255, 255, 192]],
      [regions[1]!, [160, 255, 160]],
    ] as const
    const geometry = glyphs.map(([region, color]) => ({
      name: region.name,
      native: glyphBounds(native, region, [...color]),
      web: glyphBounds(decoded, region, [...color]),
    }))
    const titleGeometry = [
      { name: 'speed-title', x: 0, y: 0, width: 540, height: 50 },
      { name: 'vario-title', x: 540, y: 0, width: 540, height: 50 },
      { name: 'altitude-title', x: 0, y: 600, width: 540, height: 50 },
      { name: 'time-title', x: 540, y: 600, width: 540, height: 50 },
    ].map((region) => ({
      name: region.name,
      native: glyphBounds(native, region, [127, 127, 127]),
      web: glyphBounds(decoded, region, [127, 127, 127]),
    }))
    await writeFile('.local/calibration-diff.png', comparison.png)
    await writeFile(
      '.local/calibration-comparison.json',
      JSON.stringify(
        {
          ...comparison,
          png: undefined,
          fonts,
          glyphGeometry: geometry,
          titleGeometry,
          regions: regions.map((r) => {
            const diff = comparePngs(cropped(native, r), cropped(decoded, r), 0.1)
            return {
              name: r.name,
              changedPixels: diff.changedPixels,
              changedRatio: diff.changedRatio,
            }
          }),
          points: points.map(([x, y, color]) => ({
            x,
            y,
            expected: color,
            native: pixel(native, x, y),
            web: pixel(decoded, x, y),
          })),
        },
        null,
        2,
      ),
    )
    if (fonts.available) expect(comparison.changedPixels).toBeLessThanOrEqual(10100)
    if (fonts.available)
      for (const glyph of titleGeometry)
        for (const edge of ['left', 'top', 'right', 'bottom'] as const)
          expect(Math.abs(glyph.native[edge] - glyph.web[edge])).toBeLessThanOrEqual(1)
    if (process.env.XCT_QA_REQUIRE_PIXEL_PARITY === '1')
      expect(comparison.changedPixels, 'Native pixel parity is required').toBe(0)
    if (fonts.available)
      for (const glyph of geometry)
        for (const edge of ['left', 'top', 'right', 'bottom'] as const)
          expect(Math.abs(glyph.native[edge] - glyph.web[edge])).toBeLessThanOrEqual(
            glyph.name === 'speed' ? 0 : 2,
          )
  }
  await page.getByLabel('Нет данных', { exact: true }).check()
  await expect(svg.locator('[data-widget=WSpeed]').first().locator('text')).toHaveCount(1)
  await page.getByLabel('Нет данных', { exact: true }).uncheck()
  const speedText = svg
    .locator('[data-widget=WSpeed]')
    .first()
    .locator('text')
    .filter({ hasText: /^0$/ })
  const initialSize = Number(await speedText.getAttribute('font-size'))
  await page.getByLabel('Скорость, km/h').fill('300')
  const wideText = svg
    .locator('[data-widget=WSpeed]')
    .first()
    .locator('text')
    .filter({ hasText: /^300$/ })
  const smallSize = Number(await wideText.getAttribute('font-size'))
  expect(smallSize).toBeLessThan(initialSize)
  await page.getByLabel('Скорость, km/h').fill('0')
  await expect(speedText).toHaveAttribute('font-size', String(smallSize))
  await page.getByLabel('Рамки', { exact: true }).check()
  await expect(speedText).toHaveAttribute('font-size', String(smallSize))
  await page.getByRole('button', { name: 'Сбросить размеры текста' }).click()
  await expect(speedText).toHaveAttribute('font-size', String(initialSize))
  await writeFile(
    '.local/text-history.json',
    JSON.stringify(
      {
        sequence: [0, 300, 0],
        initialSize,
        wideSize: smallSize,
        returnedSize: smallSize,
        resetSize: initialSize,
        exportExpected: 'byte-identical',
      },
      null,
      2,
    ),
  )
  const pending = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Экспорт XCFG' }).click()
  const download = await pending
  expect(await readFile((await download.path())!)).toEqual(source)
})
