import { test } from '@playwright/test'
import { readFile, writeFile } from 'node:fs/promises'
import { PNG } from 'pngjs'
import { comparePngs } from '../../tools/png-diff'

test('research: compare title rasterization pipelines with native reference', async ({ page }) => {
  test.skip(process.env.XCT_QA_TITLE_PIPELINE !== '1', 'Explicit research run only')
  await page.goto('/')
  await page.waitForFunction(
    () =>
      document.querySelector('[data-native-fonts]')?.getAttribute('data-native-fonts') === 'true',
  )
  const source = JSON.parse(await readFile('tests/fixtures/calibration.xcfg', 'utf8'))
  const titleSize = Number(process.env.XCT_QA_TITLE_SIZE ?? 100)
  source.preferences = { 'Display.WidgetTitleSize': String(titleSize) }
  await page.getByLabel('Открыть XCFG', { exact: true }).setInputFiles({
    name: 'calibration.xcfg',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(source)),
  })
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
  const native = PNG.sync.read(
    await readFile(
      process.env.XCT_QA_TITLE_NATIVE ??
        'docs/research/screenshots/calibration-values-portrait.png',
    ),
  )
  const regions = [
    { x: 0, y: 0, width: 540, height: 50 },
    { x: 540, y: 0, width: 540, height: 50 },
    { x: 0, y: 600, width: 540, height: 50 },
    { x: 540, y: 600, width: 540, height: 50 },
  ]
  const crop = (png: PNG, r: (typeof regions)[number]) => {
    const out = new PNG({ width: r.width, height: r.height })
    PNG.bitblt(png, out, r.x, r.y, r.width, r.height, 0, 0)
    return PNG.sync.write(out)
  }
  const reports = []
  for (const rendering of ['auto']) {
    for (const kerning of ['auto', 'native', 'nativeKern']) {
      await svg.evaluate(
        (element, variant) => {
          const cloned = element.cloneNode(true) as SVGSVGElement
          cloned.setAttribute('data-title-probe', '')
          cloned.style.cssText =
            'position:absolute;left:0;top:0;width:1080px;height:2400px;max-width:none;z-index:100;background:black;border:0;margin:0'
          cloned.setAttribute('width', '1080')
          cloned.setAttribute('height', '2400')
          for (const text of cloned.querySelectorAll<SVGTextElement>(
            'text[font-family="XCTitle"]',
          )) {
            text.style.textRendering = variant.rendering
            text.style.fontKerning = variant.kerning
            const ctx = document.createElement('canvas').getContext('2d')!
            ctx.font = `700 ${text.getAttribute('font-size')}px XCTitle`
            if (variant.kerning.startsWith('native'))
              ctx.font = `700 ${Math.floor(Number(text.getAttribute('font-size')))}px XCTitle`
            ctx.fontKerning = ['auto', 'nativeKern'].includes(variant.kerning) ? 'auto' : 'none'
            const widgetWidth = Number(
              text.parentElement?.querySelector('rect')?.getAttribute('width'),
            )
            text.setAttribute(
              'x',
              String((widgetWidth - ctx.measureText(text.textContent ?? '').width) / 2),
            )
            if (variant.kerning !== 'auto') {
              const chars = Array.from(text.textContent ?? '')
              const widths = chars.map((c) =>
                Math[
                  variant.kerning.startsWith('native')
                    ? 'round'
                    : (variant.kerning as 'floor' | 'round' | 'ceil')
                ](ctx.measureText(c).width),
              )
              if (variant.kerning === 'nativeKern')
                for (let i = 0; i < chars.length - 1; i++)
                  widths[i] = Math.round(
                    ctx.measureText(chars[i]! + chars[i + 1]!).width -
                      ctx.measureText(chars[i + 1]!).width,
                  )
              const origin = (widgetWidth - widths.reduce((a, b) => a + b, 0)) / 2
              text.setAttribute(
                'x',
                widths
                  .map((_, i) => origin + widths.slice(0, i).reduce((a, b) => a + b, 0))
                  .join(' '),
              )
              text.style.fontKerning = 'none'
            }
          }
          document.body.append(cloned)
        },
        { rendering, kerning },
      )
      const bytes = await page.locator('[data-title-probe]').screenshot()
      await page.locator('[data-title-probe]').evaluate((e) => e.remove())
      const web = PNG.sync.read(bytes)
      await writeFile(`.local/title-${titleSize}-${kerning}.png`, bytes)
      reports.push({
        rendering,
        kerning,
        regions: regions.map((r) => comparePngs(crop(native, r), crop(web, r), 0.1).changedPixels),
      })
    }
  }
  await writeFile(
    `.local/title-pipeline-${titleSize}.json`,
    JSON.stringify(reports, null, 2) + '\n',
  )
})
