import { expect, test } from '@playwright/test'
import { readFile, writeFile, mkdir } from 'node:fs/promises'

test('visual library: all native widget classes on multi-widget pages', async ({ page }) => {
  const path = process.env.XCT_VISUAL_SUITE
  test.skip(!path, 'Generate tools/create-visual-library.mjs and set XCT_VISUAL_SUITE')
  const source = await readFile(path!)
  const config = JSON.parse(source.toString())
  await mkdir('.local/android-qa/visual-web', { recursive: true })
  await page.goto('/')
  await page
    .getByLabel('Открыть XCFG', { exact: true })
    .setInputFiles({ name: 'visual.xcfg', mimeType: 'application/json', buffer: source })
  await page.getByLabel('Рамки', { exact: true }).uncheck()
  const canvas = page.getByRole('img', { name: 'Предпросмотр страницы XCTrack' })
  for (let i = 0; i < config.layout.portrait.length; i++) {
    await page.getByLabel('Страница', { exact: true }).selectOption(String(i))
    await expect(canvas.locator('[data-widget]')).toHaveCount(
      config.layout.portrait[i].widgets.length,
    )
    await canvas.evaluate((element) => {
      const copy = element.cloneNode(true) as SVGSVGElement
      copy.setAttribute('data-visual-snapshot', 'true')
      copy.setAttribute('width', '1080')
      copy.setAttribute('height', '2400')
      copy.style.cssText =
        'position:absolute;left:0;top:0;width:1080px;height:2400px;max-width:none;z-index:100;border:0;margin:0;background:black'
      document.body.append(copy)
    })
    await writeFile(
      `.local/android-qa/visual-web/page-${String(i + 1).padStart(2, '0')}.png`,
      await page.locator('[data-visual-snapshot]').screenshot(),
    )
    await page.locator('[data-visual-snapshot]').evaluate((element) => element.remove())
  }
  const pending = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Экспорт XCFG', exact: true }).click()
  expect(await readFile((await (await pending).path())!)).toEqual(source)
})
