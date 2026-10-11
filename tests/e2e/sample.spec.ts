import { expect, test } from '@playwright/test'
import { readFile } from 'node:fs/promises'

test('private sample: four pages, 56 widgets and byte-preserving export', async ({ page }) => {
  const samplePath = process.env.XCT_QA_SAMPLE
  test.skip(!samplePath, 'Set XCT_QA_SAMPLE to a private local XCFG for opt-in QA')
  const source = await readFile(samplePath!)
  await page.goto('/')
  await page
    .getByLabel('Открыть XCFG', { exact: true })
    .setInputFiles({ name: 'sample.xcfg', mimeType: 'application/json', buffer: source })
  await expect(page.locator('[data-widget]')).toHaveCount(16)
  for (const [orientation, counts] of [
    ['portrait', [16, 13]],
    ['landscape', [19, 8]],
  ] as const) {
    await page.getByLabel('Ориентация', { exact: true }).selectOption(orientation)
    await expect(page.getByLabel('Страница', { exact: true }).locator('option')).toHaveText([
      '1 · XC-помощник',
      '2 · Соревнование',
    ])
    for (const [index, count] of counts.entries()) {
      await page.getByLabel('Страница', { exact: true }).selectOption(String(index))
      await expect(page.locator('[data-widget]')).toHaveCount(count)
    }
  }
  let pending = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Экспорт XCFG' }).click()
  let download = await pending
  expect(await readFile((await download.path())!)).toEqual(source)
  await page.getByLabel('Ориентация', { exact: true }).selectOption('portrait')
  await page.screenshot({ path: '.local/designer-sample.png', fullPage: true })
  await page.getByLabel('Страница', { exact: true }).selectOption('0')
  await page.getByLabel('Привязка к сетке').uncheck()
  await page.locator('[data-widget]').first().dispatchEvent('click')
  const canvas = page.getByRole('img', { name: 'Предпросмотр страницы XCTrack' })
  await canvas.scrollIntoViewIfNeeded()
  const corner = (await canvas.locator('[data-handle="se"]').boundingBox())!
  await page.mouse.move(corner.x + corner.width / 2 - 2, corner.y + corner.height / 2 - 2)
  await page.mouse.down()
  await page.mouse.move(corner.x + corner.width / 2 - 30, corner.y + corner.height / 2 - 2)
  await page.mouse.up()
  await expect(page.getByRole('alert')).toHaveCount(0)
  pending = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Экспорт XCFG' }).click()
  download = await pending
  await download.saveAs('.local/android-qa/web-edited-sample.xcfg')
  const exported = JSON.parse((await readFile((await download.path())!)).toString())
  const original = JSON.parse(source.toString())
  expect(exported.layout.portrait[0].widgets[0]).not.toEqual(original.layout.portrait[0].widgets[0])
  original.layout.portrait[0].widgets[0] = exported.layout.portrait[0].widgets[0]
  expect(exported).toEqual(original)
})
