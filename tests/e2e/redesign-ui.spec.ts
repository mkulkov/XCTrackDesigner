import { expect, test } from '@playwright/test'
import { readFile } from 'node:fs/promises'

test('simulation selects widgets and applies per-widget manual values without editing geometry', async ({
  page,
}) => {
  await page.route('https://tile.openstreetmap.org/**', (route) => route.abort())
  const source = Buffer.from(
    JSON.stringify({
      info: { versionName: '0.9.12.6', versionCode: 91260, exportType: 'pages' },
      layout: {
        portrait: [
          {
            CLASS: 'Page',
            widgets: [
              { CLASS: 'org.xcontest.XCTrack.widget.w.WSpeed', X1: 0, Y1: 0, X2: 5000, Y2: 5000 },
              {
                CLASS: 'org.xcontest.XCTrack.widget.w.WSpeed',
                X1: 5000,
                Y1: 0,
                X2: 10000,
                Y2: 5000,
              },
              {
                CLASS: 'org.xcontest.XCTrack.widget.w.WAMSL',
                X1: 0,
                Y1: 5000,
                X2: 5000,
                Y2: 10000,
              },
              {
                CLASS: 'org.xcontest.XCTrack.widget.w.WXCAssistant',
                X1: 5000,
                Y1: 5000,
                X2: 10000,
                Y2: 10000,
              },
            ],
          },
        ],
        landscape: [],
      },
    }),
  )
  await page.goto('/')
  await page
    .getByLabel('Открыть XCFG', { exact: true })
    .setInputFiles({ name: 'manual-simulation.xcfg', mimeType: 'application/json', buffer: source })
  await page.getByRole('button', { name: 'Симуляция полёта', exact: true }).click()
  const canvas = page.getByRole('img', { name: 'Предпросмотр страницы XCTrack' })
  const panel = page.locator('.telemetry-panel')
  const choose = async (x: number, y: number) => {
    const box = (await canvas.boundingBox())!
    await canvas.click({ position: { x: box.width * x, y: box.height * y } })
  }
  await choose(0.25, 0.25)
  await expect(panel.locator('.selected-widget-name')).toHaveText('Скорость')
  await panel.getByLabel('Тип показания виджета').selectOption('number')
  const manualInput = panel.getByLabel('Показание виджета', { exact: true })
  await manualInput.fill('')
  await manualInput.pressSequentially('20')
  await expect(manualInput).toBeFocused()
  await expect(manualInput).toHaveValue('20')
  await expect(panel.getByRole('button', { name: 'Применить показание виджета' })).toHaveCount(0)
  await expect(canvas.locator('[data-widget="WSpeed"]').nth(0)).toContainText('72')
  await expect(canvas.locator('[data-widget="WSpeed"]').nth(1)).toContainText('36')
  await choose(0.75, 0.25)
  await expect(panel.getByLabel('Показание виджета', { exact: true })).toHaveValue('10')
  await choose(0.25, 0.75)
  await panel.getByLabel('Показание виджета', { exact: true }).fill('2000')
  await expect(canvas.locator('[data-widget="WAMSL"]')).toContainText('2000')
  await choose(0.75, 0.75)
  await expect(panel.getByLabel('Тип показания виджета')).toHaveCount(0)
  await expect(panel.getByText(/отдельное показание нельзя/)).toBeVisible()
  await expect(canvas.locator('[data-handle]')).toHaveCount(0)
  const box = (await canvas.boundingBox())!
  await page.mouse.move(box.x + box.width * 0.25, box.y + box.height * 0.25)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width * 0.25 + 30, box.y + box.height * 0.25 + 30)
  await page.mouse.up()
  await panel.getByRole('button', { name: 'Использовать данные симуляции' }).click()
  await expect(canvas.locator('[data-widget="WSpeed"]').nth(0)).toContainText('36')
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Экспорт XCFG', exact: true }).click()
  expect(await readFile((await (await download).path())!)).toEqual(source)
})

test('returning to the editor stops scenario playback and retains its position', async ({
  page,
}) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Новая конфигурация', exact: true }).click()
  await page.getByRole('button', { name: 'Симуляция полёта', exact: true }).click()
  await page.getByLabel('Сценарий', { exact: true }).selectOption('thermal')
  await page.getByLabel('Время сценария, s', { exact: true }).fill('200')
  await page.getByRole('button', { name: 'Запустить симуляцию', exact: true }).click()
  await expect
    .poll(() => page.getByLabel('Время сценария, s', { exact: true }).inputValue().then(Number))
    .toBeGreaterThan(200)
  await page.getByRole('button', { name: 'Вернуться к редактированию', exact: true }).click()
  const stopped = await page.getByLabel('Время сценария, s', { exact: true }).inputValue()
  await page.waitForTimeout(400)
  await expect(page.getByLabel('Время сценария, s', { exact: true })).toHaveValue(stopped)
  await page.getByRole('button', { name: 'Симуляция полёта', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Запустить симуляцию', exact: true })).toBeVisible()
  await expect(page.getByLabel('Время сценария, s', { exact: true })).toHaveValue(stopped)
})

test('settings dialogs group fields, cancel by keyboard and return focus to preview', async ({
  page,
}) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Новая конфигурация', exact: true }).click()
  const open = page.getByRole('button', { name: 'Экран', exact: true })
  await open.click()
  const dialog = page.getByRole('dialog', { name: 'Настройки экрана' })
  await expect(dialog.getByRole('heading', { name: 'Отображение в XCTrack' })).toBeVisible()
  await expect(dialog.getByRole('heading', { name: 'Заголовки виджетов' })).toBeVisible()
  await dialog.getByLabel('Обводка заголовков', { exact: true }).uncheck()
  await expect(dialog.getByLabel('Цвет обводки', { exact: true })).toHaveCount(0)
  await dialog.getByLabel('Обводка заголовков', { exact: true }).check()
  await expect(dialog.getByLabel('Цвет обводки', { exact: true })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(open).toBeFocused()
})

test('simulation and editing expose separate sidebars with the same preview', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Новая конфигурация', exact: true }).click()
  await expect(page.locator('.collection-panel')).toBeVisible()
  await expect(page.getByTestId('widget-inspector')).toBeVisible()
  await page.getByRole('button', { name: 'Симуляция полёта', exact: true }).click()
  await expect(page.locator('.collection-panel')).toBeHidden()
  await expect(page.getByTestId('widget-inspector')).toBeHidden()
  await expect(page.locator('.standalone-simulation')).toBeVisible()
  await expect(page.locator('.telemetry-panel')).toBeVisible()
  await expect(page.locator('.replay-upload-title')).toHaveText('Загрузить трек IGC')
  for (const theme of ['dark', 'light']) {
    await page.getByLabel('Тема редактора', { exact: true }).selectOption(theme)
    await page
      .locator('.standalone-simulation')
      .screenshot({ path: `.local/simulation-sidebar-${theme}.png` })
  }
  await expect(page.getByRole('img', { name: 'Предпросмотр страницы XCTrack' })).toBeVisible()
  await page.getByRole('button', { name: 'Редактор', exact: true }).click()
  await expect(page.locator('.standalone-simulation')).toBeHidden()
  await expect(page.locator('.collection-panel')).toBeVisible()
})

test('compact screen and page dialogs stay within a narrow viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await page.getByRole('button', { name: 'Новая конфигурация', exact: true }).click()
  for (const [button, title] of [
    ['Экран', 'Настройки экрана'],
    ['Страницы', 'Раскладка страниц'],
  ]) {
    await page.getByRole('button', { name: button, exact: true }).click()
    const dialog = page.getByRole('dialog', { name: title })
    await expect(dialog).toBeVisible()
    const box = (await dialog.boundingBox())!
    expect(box.x).toBeGreaterThanOrEqual(0)
    expect(box.x + box.width).toBeLessThanOrEqual(390)
    await dialog
      .getByRole('button', { name: button === 'Экран' ? 'Отмена' : 'Готово', exact: true })
      .click()
    await expect(dialog).toBeHidden()
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})
