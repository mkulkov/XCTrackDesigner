import { expect, test } from '@playwright/test'
import { readFile } from 'node:fs/promises'

test.use({ locale: 'en-US' })

test('browser language, manual override and simulation keep XCFG unchanged', async ({ page }) => {
  const source = Buffer.from(
    JSON.stringify({
      info: { versionName: '0.9.12.6', versionCode: 91260, exportType: 'pages' },
      layout: {
        portrait: [
          {
            CLASS: 'Page',
            widgets: [
              {
                CLASS: 'org.xcontest.XCTrack.widget.w.WSpeed',
                X1: 0,
                Y1: 0,
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
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await expect(page.getByLabel('Editor language')).toHaveValue('en')
  await expect(page.getByLabel('Editor language').locator('option')).toHaveCount(2)
  await expect(page.getByRole('button', { name: 'New configuration', exact: true })).toBeVisible()
  await page.getByLabel('Open XCFG', { exact: true }).setInputFiles({
    name: 'language.xcfg',
    mimeType: 'application/json',
    buffer: source,
  })
  await expect(page.getByLabel('Search widgets')).toBeVisible()
  await page.getByRole('button', { name: 'Screen', exact: true }).click()
  await expect(page.getByRole('dialog', { name: 'Screen settings', exact: true })).toBeVisible()
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: 'Flight simulation', exact: true }).click()
  const canvas = page.getByRole('img', { name: 'XCTrack page preview' })
  await canvas.click()
  const panel = page.locator('.telemetry-panel')
  await panel.getByLabel('Widget reading type').selectOption('number')
  await panel.getByLabel('Widget reading', { exact: true }).fill('20')
  await expect(canvas.locator('[data-widget="WSpeed"]')).toContainText('72')
  await page.getByLabel('Editor language').selectOption('ru')
  await expect(page.locator('html')).toHaveAttribute('lang', 'ru')
  await expect(
    page.getByRole('button', { name: 'Вернуться к редактированию', exact: true }),
  ).toBeVisible()
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Экспорт XCFG', exact: true }).click()
  const download = await downloadPromise
  expect(await readFile((await download.path())!)).toEqual(source)
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('lang', 'ru')
  await page.getByLabel('Язык редактора').selectOption('en')
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
})
