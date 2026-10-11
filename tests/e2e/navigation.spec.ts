import { expect, test } from '@playwright/test'
import { readFile } from 'node:fs/promises'

const source = Buffer.from(
  JSON.stringify({
    info: { versionName: '0.9.12.6', versionCode: 91260, exportType: 'pages' },
    layout: {
      portrait: [
        {
          CLASS: 'Page',
          widgets: [
            {
              CLASS: 'org.xcontest.XCTrack.widget.w.WXCAssistant',
              X1: 0,
              Y1: 0,
              X2: 10000,
              Y2: 7000,
            },
            {
              CLASS: 'org.xcontest.XCTrack.widget.w.WNextTurnpoint',
              X1: 0,
              Y1: 7000,
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
const task = {
  taskType: 'CLASSIC',
  version: 1,
  name: 'Training',
  turnpoints: [
    {
      type: 'TAKEOFF',
      radius: 100,
      waypoint: { name: 'Launch', lat: 44, lon: 78, altSmoothed: 1000 },
    },
    {
      type: 'SSS',
      radius: 1000,
      waypoint: { name: 'Start', lat: 44.1, lon: 78.1, altSmoothed: 1000 },
    },
    {
      type: 'ESS',
      radius: 400,
      waypoint: { name: 'Finish', lat: 44.2, lon: 78.2, altSmoothed: 1000 },
    },
  ],
  sss: { type: 'RACE', timeGates: ['12:30:00Z'] },
  goal: { type: 'LINE', deadline: '18:00:00Z' },
}
test('navigation imports update map and target without changing XCFG', async ({ page }) => {
  await page.route('https://tile.openstreetmap.org/**', (route) => route.abort())
  await page.goto('/')
  await page
    .getByLabel('Открыть XCFG', { exact: true })
    .setInputFiles({ name: 'navigation.xcfg', mimeType: 'application/json', buffer: source })
  await page.getByRole('button', { name: 'Навигация', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Навигация', exact: true })
  await dialog.getByLabel('Файл навигационных точек').setInputFiles({
    name: 'training.wpt',
    mimeType: 'text/plain',
    buffer: Buffer.from('$FormatGEO\nPOINT N 44 00 00.00 E 078 00 00.00 1000 Training point\n'),
  })
  await expect(dialog.getByRole('tab', { name: 'Точки · 1' })).toBeVisible()
  await expect(page.locator('[data-map-navpoint]')).toHaveCount(1)
  await dialog.getByRole('button', { name: 'Выбрать цель' }).click()
  await expect(page.getByRole('img', { name: 'Предпросмотр страницы XCTrack' })).toContainText(
    'POINT',
  )
  await dialog.getByRole('tab', { name: /Задача/ }).click()
  await dialog.getByLabel('Файл соревновательной задачи').setInputFiles({
    name: 'training.xctsk',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(task)),
  })
  await expect(page.locator('[data-map-waypoint]')).toHaveCount(3)
  await expect(page.locator('[data-map-cylinder]')).toHaveCount(1)
  await expect(page.locator('[data-map-goal-line]')).toHaveCount(1)
  await page.screenshot({ path: '.local/navigation-task-ui.png', fullPage: true })
  await expect(page.getByRole('img', { name: 'Предпросмотр страницы XCTrack' })).toContainText(
    'Start',
  )
  await dialog
    .getByLabel('Файл соревновательной задачи')
    .setInputFiles({ name: 'bad.xctsk', mimeType: 'application/json', buffer: Buffer.from('{}') })
  await expect(dialog.getByRole('alert')).toBeVisible()
  await expect(page.locator('[data-map-waypoint]')).toHaveCount(3)
  await dialog.getByRole('button', { name: 'Готово' }).click()
  await page.getByRole('button', { name: 'Симуляция полёта', exact: true }).click()
  await expect(page.locator('[data-map-waypoint]')).toHaveCount(3)
  await page.getByRole('button', { name: 'Редактор', exact: true }).click()
  const pending = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Экспорт XCFG', exact: true }).click()
  expect(await readFile((await (await pending).path())!)).toEqual(source)
  await page.getByRole('button', { name: 'Навигация', exact: true }).click()
  await dialog.getByRole('tab', { name: /Задача/ }).click()
  await dialog.getByLabel('Очистить задачу').click()
  await expect(page.locator('[data-map-waypoint]')).toHaveCount(1)
  await dialog.getByRole('tab', { name: /Точки/ }).click()
  await dialog.getByLabel('Очистить точки').click()
  await expect(page.locator('[data-map-navpoint]')).toHaveCount(0)
  await expect(page.locator('[data-map-waypoint]')).toHaveCount(0)
})

test('browser GPX import validates XML and supports real local GEO collection', async ({
  page,
}) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Новая конфигурация', exact: true }).click()
  await page.getByRole('button', { name: 'Навигация', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Навигация', exact: true })
  const input = dialog.getByLabel('Файл навигационных точек')
  await input.setInputFiles({
    name: 'points.gpx',
    mimeType: 'application/gpx+xml',
    buffer: Buffer.from(
      '<gpx xmlns="http://www.topografix.com/GPX/1/1"><wpt lat="44" lon="78"><name>GPX point</name><ele>1000</ele></wpt><rte><rtept lat="44.1" lon="78.1"><name>Route point</name></rtept></rte></gpx>',
    ),
  })
  await expect(dialog.getByRole('tab', { name: 'Точки · 2' })).toBeVisible()
  await expect(dialog.getByText('Route point', { exact: true })).toBeVisible()
  await input.setInputFiles({
    name: 'bad.gpx',
    mimeType: 'application/gpx+xml',
    buffer: Buffer.from('<gpx><wpt lat="44" lon="78"></gpx>'),
  })
  await expect(dialog.getByRole('alert')).toBeVisible()
  await expect(dialog.getByRole('tab', { name: 'Точки · 2' })).toBeVisible()
  if (process.env.XCTRACK_WAYPOINT_SAMPLE) {
    await input.setInputFiles({
      name: 'private-sample.wpt',
      mimeType: 'text/plain',
      buffer: await readFile(process.env.XCTRACK_WAYPOINT_SAMPLE),
    })
    await expect(dialog.getByRole('alert')).toHaveCount(0)
    await expect(dialog.getByRole('tab', { name: /Точки · [1-9]\d+/ })).toBeVisible()
  }
})

test('navigation dialog fits narrow screens and supports keyboard dismissal', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await page.getByRole('button', { name: 'Новая конфигурация', exact: true }).click()
  const open = page.getByRole('button', { name: 'Навигация', exact: true })
  await open.click()
  const dialog = page.getByRole('dialog', { name: 'Навигация', exact: true })
  const box = await dialog.boundingBox()
  expect(box!.x).toBeGreaterThanOrEqual(0)
  expect(box!.width).toBeLessThanOrEqual(390)
  await expect(dialog.getByText('Точки ещё не загружены', { exact: true })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(open).toBeFocused()
})
