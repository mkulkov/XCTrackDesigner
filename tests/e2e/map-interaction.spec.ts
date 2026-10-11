import { expect, test } from '@playwright/test'
import { readFile } from 'node:fs/promises'

test('IGC automatically loads map tiles and follows playback without modifying XCFG', async ({
  page,
}) => {
  const requested = new Set<string>()
  let offline = false
  await page.route('https://tile.openstreetmap.org/**', (route) => {
    requested.add(route.request().url())
    return offline
      ? route.abort()
      : route.fulfill({
          contentType: 'image/png',
          body: Buffer.from(
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=',
            'base64',
          ),
        })
  })
  await page.goto('/')
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
                tracklog_color: 0x80123456,
                line_thickness: 20,
                mapWidget_drawBearing: false,
                rotation: { value: 'HEADING_AT_TOP', showCompass: true },
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
  await page.getByLabel('Открыть XCFG', { exact: true }).setInputFiles({
    name: 'map-replay.xcfg',
    mimeType: 'application/json',
    buffer: source,
  })
  await expect(page.locator('[data-online-map]')).toHaveCount(1)
  await page.getByText('Симуляция полёта', { exact: true }).click()
  await page.getByLabel('Загрузить запись IGC').setInputFiles({
    name: 'map-flight.igc',
    mimeType: 'text/plain',
    buffer: Buffer.from(
      'AXXX\nHFDTE101026\nB1200004300000N07600000EA0100001200\nB1200104300000N07700000EA0102001240\n',
    ),
  })
  const tiles = page.locator('[data-online-map] image[href^="https://tile.openstreetmap.org/"]')
  await expect(tiles.first()).toBeVisible()
  await expect.poll(() => requested.size).toBeGreaterThan(0)
  const firstTiles = await tiles.evaluateAll((images) =>
    images.map((image) => image.getAttribute('href')),
  )
  const firstRequests = new Set(requested)
  await page.getByLabel('Позиция записи IGC', { exact: true }).fill('5')
  await expect
    .poll(async () =>
      tiles.evaluateAll((images) => images.map((image) => image.getAttribute('href'))),
    )
    .not.toEqual(firstTiles)
  await expect.poll(() => [...requested].some((url) => !firstRequests.has(url))).toBe(true)
  await expect(page.locator('[data-map-trace]')).toHaveAttribute('d', /M.+L/)
  await expect(page.locator('[data-map-trace]')).toHaveAttribute('stroke', '#12345680')
  await expect(page.locator('[data-map-trace]')).toHaveAttribute('stroke-width', '19.2')
  await expect(page.locator('[data-map-bearing]')).toHaveCount(0)
  await expect(page.locator('[data-online-map]')).toHaveAttribute(
    'data-map-rotation',
    /-8[9-9]|-90/,
  )
  await page.getByRole('button', { name: 'Редактор', exact: true }).click()
  await page.getByText(/^Параметры виджета ·/).click()
  await page.getByLabel('Цвет трека', { exact: true }).fill('#abcdef')
  await page.getByLabel('Толщина линий', { exact: true }).fill('40')
  await expect(page.locator('[data-map-trace]')).toHaveAttribute('stroke', '#abcdef80')
  await expect(page.locator('[data-map-trace]')).toHaveAttribute('stroke-width', '38.4')
  await page.getByRole('button', { name: 'Симуляция полёта', exact: true }).click()
  await page.getByLabel('Темп симуляции', { exact: true }).selectOption('0.5')
  await page.getByRole('button', { name: 'Запустить симуляцию', exact: true }).click()
  const map = page.locator('[data-online-map]')
  await expect(map).toHaveAttribute('data-map-interactive', 'false')
  const canvas = page.getByRole('img', { name: 'Предпросмотр страницы XCTrack', exact: true })
  await canvas.scrollIntoViewIfNeeded()
  const mapBox = (await canvas.boundingBox())!
  await page.mouse.move(mapBox.x + mapBox.width / 2, mapBox.y + 60)
  await page.mouse.wheel(0, -100)
  await expect(map).toHaveAttribute('data-map-zoom', '11')
  await expect(
    page.locator('[data-online-map] image[href^="https://tile.openstreetmap.org/11/"]').first(),
  ).toBeAttached()
  await expect(map).toHaveAttribute('data-map-follow-gps', 'true')
  await page.getByRole('button', { name: 'Пауза симуляции', exact: true }).click()
  await page.getByLabel('Позиция записи IGC', { exact: true }).fill('5')
  offline = true
  await page.getByLabel('Темп симуляции', { exact: true }).selectOption('100')
  await page.getByRole('button', { name: 'Запустить симуляцию', exact: true }).click()
  await expect(page.getByLabel('Состояние воспроизведения')).toHaveText('Трек завершён')
  await expect(page.locator('[data-online-map]')).toContainText('Часть онлайн-тайлов недоступна')
  const pending = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Экспорт XCFG', exact: true }).click()
  expect(await readFile((await (await pending).path())!)).toEqual(source)
  await page.getByText('Симуляция полёта', { exact: true }).click()
  await expect(map).toHaveAttribute('data-map-follow-gps', 'false')
})

test('editor map uses browser location and wheel zoom without changing configuration', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['geolocation'])
  await context.setGeolocation({ latitude: 55.75, longitude: 37.61 })
  await page.route('https://tile.openstreetmap.org/**', (route) => route.abort())
  let ipRequests = 0
  await page.route('https://get.geojs.io/**', (route) => {
    ipRequests++
    return route.abort()
  })
  await page.goto('/')
  const source = JSON.stringify({
    info: { versionName: '0.9.12.6', versionCode: 91260, exportType: 'pages' },
    layout: {
      portrait: [
        {
          CLASS: 'Page',
          widgets: [
            {
              CLASS: 'org.xcontest.XCTrack.widget.w.WCompMap',
              routes: false,
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
  })
  await page
    .getByLabel('Открыть XCFG', { exact: true })
    .setInputFiles({ name: 'map.xcfg', mimeType: 'application/json', buffer: Buffer.from(source) })
  const map = page.locator('[data-online-map]')
  await expect(map).toHaveAttribute('data-map-latitude', '55.75')
  await expect(map).toHaveAttribute('data-map-longitude', '37.61')
  await expect(map).toHaveAttribute('data-map-follow-gps', 'false')
  expect(ipRequests).toBe(0)
  await expect(page.getByText('Настройки карты', { exact: true })).toHaveCount(0)
  const canvas = page.getByRole('img', { name: 'Предпросмотр страницы XCTrack', exact: true })
  await canvas.scrollIntoViewIfNeeded()
  const box = (await canvas.boundingBox())!
  await page.mouse.move(box.x + box.width / 2, box.y + 60)
  await page.mouse.wheel(0, -100)
  await expect(map).toHaveAttribute('data-map-zoom', '11')
  await page.getByText('Симуляция полёта', { exact: true }).click()
  await expect(map).toHaveAttribute('data-map-follow-gps', 'true')
  await expect(map).not.toHaveAttribute('data-map-latitude', '55.75')
  await page.getByText('Полёт и маршрут', { exact: true }).click()
  await page.getByText('Маршрут · 0 точек', { exact: true }).click()
  await page.getByRole('button', { name: 'Пример маршрута', exact: true }).click()
  await expect(page.locator('[data-map-task]')).toHaveCount(1)
  await page.getByText('Симуляция полёта', { exact: true }).click()
  await expect(map).toHaveAttribute('data-map-latitude', '55.75')
  const pending = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Экспорт XCFG', exact: true }).click()
  expect((await readFile((await (await pending).path())!)).toString()).toBe(source)
})
