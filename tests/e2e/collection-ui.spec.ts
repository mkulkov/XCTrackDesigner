import { expect, test } from '@playwright/test'
import { readFile } from 'node:fs/promises'

const source = JSON.stringify({
  info: { versionName: '0.9.12.6', versionCode: 91260, exportType: 'pages' },
  layout: {
    portrait: [
      {
        CLASS: 'Page',
        widgets: [
          { CLASS: 'org.xcontest.XCTrack.widget.w.WSpeed', X1: 0, Y1: 0, X2: 2000, Y2: 2000 },
        ],
      },
    ],
    landscape: [],
  },
})

async function exported(page: import('@playwright/test').Page) {
  const pending = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Экспорт XCFG', exact: true }).click()
  return readFile((await (await pending).path())!)
}

test('collection description, drag placement and canvas inspector replace the layers list', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 1100 })
  await page.goto('/')
  await page.getByLabel('Открыть XCFG', { exact: true }).setInputFiles({
    name: 'empty.xcfg',
    mimeType: 'application/json',
    buffer: Buffer.from(source),
  })
  await expect(page.locator('[data-catalog-widget]')).toHaveCount(78)
  await expect(page.getByRole('heading', { name: /^Слои/ })).toHaveCount(0)
  await expect(page.getByTestId('widget-inspector').locator('.simulation-panel')).toHaveCount(0)
  await expect(page.locator('.standalone-simulation')).toBeHidden()
  await expect(page.locator('.preview .map-panel')).toHaveCount(0)
  await expect(page.getByText('Настройки карты', { exact: true })).toHaveCount(0)
  await expect(page.locator('.preview').getByLabel('Ориентация', { exact: true })).toBeVisible()
  await expect(page.locator('.preview .page-layout-panel')).toBeHidden()
  await expect(
    page.locator('.preview').getByRole('button', { name: 'Страницы', exact: true }),
  ).toBeVisible()
  await page.getByLabel('Привязка к сетке').uncheck()
  const catalog = page.getByRole('button', { name: 'Выбрать виджет WAMSL', exact: true })
  await catalog.click()
  await expect(page.getByTestId('widget-description')).toContainText('AMSL')
  await expect(
    page.getByTestId('widget-inspector').locator('.selected-widget-description'),
  ).toHaveText('Скорость движения относительно земли по GPS.')
  expect(await exported(page)).toEqual(Buffer.from(source))
  const canvas = page.getByRole('img', { name: 'Предпросмотр страницы XCTrack' })
  await canvas.scrollIntoViewIfNeeded()
  const box = (await canvas.boundingBox())!
  expect(box.height).toBeGreaterThan(700)
  expect(box.width / box.height).toBeCloseTo(1080 / 2400, 2)
  const transfer = await page.evaluateHandle(() => new DataTransfer())
  await catalog.dispatchEvent('dragstart', { dataTransfer: transfer })
  expect(await transfer.evaluate((value) => value.getData('application/x-xctrack-widget'))).toBe(
    'WAMSL',
  )
  await canvas.dispatchEvent('dragover', { dataTransfer: transfer })
  const dropBox = (await canvas.boundingBox())!
  await canvas.dispatchEvent('drop', {
    dataTransfer: transfer,
    clientX: dropBox.x + dropBox.width * 0.65,
    clientY: dropBox.y + dropBox.height * 0.55,
  })
  await expect(canvas.locator('[data-widget=WAMSL]')).toHaveCount(1)
  await expect(
    page.getByTestId('widget-inspector').locator('.selected-widget-description'),
  ).toHaveText('Высота над уровнем моря.')
  const result = JSON.parse((await exported(page)).toString())
  const widget = result.layout.portrait[0].widgets[1]
  expect(widget.CLASS).toBe('org.xcontest.XCTrack.widget.w.WAMSL')
  expect(Math.abs((widget.X1 + widget.X2) / 2 - 6500)).toBeLessThanOrEqual(100)
  expect(Math.abs((widget.Y1 + widget.Y2) / 2 - 5500)).toBeLessThanOrEqual(100)
  expect(result.layout.landscape).toEqual([])
  await expect(page.getByTestId('widget-inspector')).toContainText('AMSL')
  await page.screenshot({ path: testInfo.outputPath('collection-inspector.png'), fullPage: true })
  const placed = await exported(page)
  await page.getByRole('button', { name: 'Выбрать виджет WCompass', exact: true }).click()
  await expect(page.getByTestId('widget-description')).toContainText('Компас и ветер')
  await expect(page.getByTestId('widget-inspector')).toContainText('AMSL')
  expect(await exported(page)).toEqual(placed)
  await expect(page.getByLabel('X1', { exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Применить координаты' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Отменить', exact: true }).click()
  expect(await exported(page)).toEqual(Buffer.from(source))
  await expect(canvas.locator('[data-widget]')).toHaveCount(1)
  await expect(page.getByRole('button', { name: 'Отменить', exact: true })).toBeDisabled()
  // Keep both ends visible: native drag starts before a scroll could move the source card.
  await page.setViewportSize({ width: 1440, height: 2400 })
  const dragBox = (await canvas.boundingBox())!
  await catalog.dragTo(canvas, { targetPosition: { x: dragBox.width * 0.65, y: 120 } })
  await expect(canvas.locator('[data-widget=WAMSL]')).toHaveCount(1)
  await expect(page.getByTestId('widget-inspector')).toContainText('AMSL')
  await page.getByRole('button', { name: 'Отменить', exact: true }).click()
  expect(await exported(page)).toEqual(Buffer.from(source))
})

test('screen zoom changes visual size without changing XCFG and restores fit', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1100 })
  await page.goto('/')
  await page
    .getByLabel('Открыть XCFG', { exact: true })
    .setInputFiles({ name: 'zoom.xcfg', mimeType: 'application/json', buffer: Buffer.from(source) })
  const canvas = page.getByRole('img', { name: 'Предпросмотр страницы XCTrack' })
  const control = page.getByRole('group', { name: 'Масштаб предпросмотра' })
  await expect.poll(async () => (await canvas.boundingBox())!.width).toBeGreaterThan(300)
  const initial = (await canvas.boundingBox())!
  const viewport = page.locator('.screen-viewport')
  const initialViewportHeight = (await viewport.boundingBox())!.height
  await page.getByLabel('Увеличить масштаб', { exact: true }).click()
  await expect(control.locator('output')).toHaveText('125%')
  await expect
    .poll(async () => (await canvas.boundingBox())!.width / initial.width)
    .toBeCloseTo(1.25, 1)
  await page.getByLabel('Масштаб экрана', { exact: true }).fill('200')
  await expect(control.locator('output')).toHaveText('200%')
  await expect
    .poll(async () => (await canvas.boundingBox())!.width / initial.width)
    .toBeCloseTo(2, 1)
  await expect
    .poll(async () => (await viewport.boundingBox())!.height / initialViewportHeight)
    .toBeCloseTo(2, 1)
  expect(await viewport.evaluate((element) => element.clientHeight)).toBeGreaterThanOrEqual(
    Math.floor((await canvas.boundingBox())!.height),
  )
  expect(await exported(page)).toEqual(Buffer.from(source))
  await page.getByLabel('Уменьшить масштаб', { exact: true }).click()
  await expect(control.locator('output')).toHaveText('175%')
  await page.getByRole('button', { name: 'По размеру окна', exact: true }).click()
  await expect(control.locator('output')).toHaveText('100%')
  await expect.poll(async () => (await canvas.boundingBox())!.width).toBeCloseTo(initial.width, 0)
  await expect
    .poll(async () => (await viewport.boundingBox())!.height)
    .toBeCloseTo(initialViewportHeight, 0)
  expect(await exported(page)).toEqual(Buffer.from(source))
})

test('readable settings retain native keys, nested fields and colour alpha', async ({ page }) => {
  const fixture = JSON.parse(source)
  fixture.layout.portrait[0].widgets = [
    {
      CLASS: 'org.xcontest.XCTrack.widget.w.WThermalAssistant',
      X1: 0,
      Y1: 0,
      X2: 10000,
      Y2: 10000,
      nav_showWind: true,
      rotation: { value: 'NORTH_AT_TOP', showCompass: false, untouched: 42 },
      mapScale: { value: 34, auto: false, resetZoomPanExit: false, untouched: 7 },
      privateField: 'preserve',
    },
  ]
  await page.goto('/')
  await page.getByLabel('Открыть XCFG', { exact: true }).setInputFiles({
    name: 'settings.xcfg',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(fixture)),
  })
  await page.getByText(/^Параметры виджета ·/).click()
  await expect(page.getByLabel('Показывать стрелку ветра', { exact: true })).toBeChecked()
  const originalSettings = await exported(page)
  const windArrow = page.locator('[data-widget=WThermalAssistant] [data-overlay="native-wind"]')
  await expect(windArrow).toHaveCount(1)
  await page.getByLabel('Показывать стрелку ветра', { exact: true }).uncheck()
  await expect(windArrow).toHaveCount(0)
  expect(await exported(page)).toEqual(originalSettings)
  await page.getByLabel('Показывать стрелку ветра', { exact: true }).check()
  await expect(windArrow).toHaveCount(1)
  await page.getByLabel('Показывать стрелку ветра', { exact: true }).uncheck()
  await page
    .getByLabel('Ориентация карты или компаса', { exact: true })
    .selectOption('HEADING_AT_TOP')
  await page.getByLabel('Автоматический масштаб: Масштаб', { exact: true }).check()
  await page.getByRole('button', { name: 'Применить оформление', exact: true }).click()
  const updated = JSON.parse((await exported(page)).toString()).layout.portrait[0].widgets[0]
  expect(updated).toMatchObject({
    nav_showWind: false,
    rotation: { value: 'HEADING_AT_TOP', showCompass: false, untouched: 42 },
    mapScale: { value: 34, auto: true, resetZoomPanExit: false, untouched: 7 },
    privateField: 'preserve',
  })
  fixture.layout.portrait[0].widgets = [
    {
      CLASS: 'org.xcontest.XCTrack.widget.w.WFreeText',
      X1: 0,
      Y1: 0,
      X2: 10000,
      Y2: 10000,
      color_text: 0x7f112233,
    },
  ]
  await page.getByLabel('Открыть XCFG', { exact: true }).setInputFiles({
    name: 'color.xcfg',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(fixture)),
  })
  await page.getByText(/^Параметры виджета ·/).click()
  await page.getByLabel('Цвет текста', { exact: true }).fill('#00ff00')
  await page.getByRole('button', { name: 'Применить оформление', exact: true }).click()
  expect(
    JSON.parse((await exported(page)).toString()).layout.portrait[0].widgets[0].color_text,
  ).toBe(0x7f00ff00)
})

test('clicks and small pointer jitter preserve geometry even when selection shifts the preview', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1600 })
  await page.goto('/')
  const config = JSON.parse(source)
  config.layout.portrait[0].widgets[0] = {
    CLASS: 'org.xcontest.XCTrack.widget.w.WFreeText',
    X1: 1234,
    Y1: 1234,
    X2: 2345,
    Y2: 2345,
    text: 'Click',
  }
  const original = Buffer.from(JSON.stringify(config))
  await page.getByLabel('Открыть XCFG', { exact: true }).setInputFiles({
    name: 'click.xcfg',
    mimeType: 'application/json',
    buffer: original,
  })
  const canvas = page.getByRole('img', { name: 'Предпросмотр страницы XCTrack' })
  for (const snap of [true, false]) {
    await page.getByLabel('Привязка к сетке').setChecked(snap)
    await canvas.scrollIntoViewIfNeeded()
    const box = (await canvas.boundingBox())!
    await page.mouse.move(box.x + box.width * 0.18, box.y + box.height * 0.18)
    await page.mouse.down()
    await canvas.evaluate((element) => {
      ;(element as SVGSVGElement).style.transform = 'translateY(30px)'
    })
    await page.mouse.up()
    await canvas.evaluate((element) => {
      ;(element as SVGSVGElement).style.transform = ''
    })
    const corner = (await canvas.locator('[data-handle="se"]').boundingBox())!
    const x = corner.x + corner.width / 2
    const y = corner.y + corner.height / 2
    await page.mouse.move(x, y)
    await page.mouse.down()
    await page.mouse.move(x + 1, y + 1)
    await page.mouse.up()
    expect(await exported(page)).toEqual(original)
    await expect(page.getByRole('button', { name: 'Отменить', exact: true })).toBeDisabled()
  }
})
