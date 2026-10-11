import { expect, test } from '@playwright/test'

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
