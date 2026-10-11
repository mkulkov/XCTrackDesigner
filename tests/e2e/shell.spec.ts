import { expect, test } from '@playwright/test'
import { readFile } from 'node:fs/promises'
const data = JSON.stringify({
  info: { versionName: '0.9.12.6', versionCode: 91260, exportType: 'backup' },
  preferences: { 'Display.Theme': 'WhiteTheme', untouched: 'private synthetic' },
  layout: {
    portrait: [
      {
        CLASS: 'Page',
        widgets: [
          {
            CLASS: 'org.xcontest.XCTrack.widget.w.WSpeed',
            X1: 0,
            Y1: 0,
            X2: 5000,
            Y2: 10000,
            _bg: 0,
          },
          { CLASS: 'unknown.Widget', X1: 5000, Y1: 0, X2: 10000, Y2: 10000, unknown: [1, 'x'] },
        ],
      },
    ],
    landscape: [
      {
        CLASS: 'OtherPage',
        widgets: [
          { CLASS: 'org.xcontest.XCTrack.widget.w.WAMSL', X1: 0, Y1: 0, X2: 10000, Y2: 10000 },
        ],
      },
    ],
  },
})
async function upload(page: import('@playwright/test').Page, source = data) {
  await page.getByLabel('Открыть XCFG', { exact: true }).setInputFiles({
    name: 'synthetic.xcfg',
    mimeType: 'application/json',
    buffer: Buffer.from(source),
  })
}
async function exported(page: import('@playwright/test').Page) {
  const pending = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Экспорт XCFG' }).click()
  const download = await pending
  return readFile((await download.path())!)
}

test('editor theme changes panels, persists across reload and preserves XCFG', async ({ page }) => {
  await page.goto('/')
  await upload(page)
  const selector = page.getByLabel('Тема редактора', { exact: true })
  await expect(selector).toHaveValue('dark')
  await selector.selectOption('light')
  await expect(page.locator('html')).toHaveAttribute('data-editor-theme', 'light')
  await expect(page.locator('.preview')).toHaveCSS('background-color', 'rgb(255, 255, 255)')
  await expect(page.locator('.collection-panel')).toHaveCSS('color', 'rgb(38, 52, 64)')
  expect(await exported(page)).toEqual(Buffer.from(data))
  await page.reload()
  await expect(selector).toHaveValue('light')
  await expect(page.locator('html')).toHaveAttribute('data-editor-theme', 'light')
  await selector.selectOption('dark')
  await expect(page.locator('html')).toHaveAttribute('data-editor-theme', 'dark')
})

test('screen and page layout sections export independently and support undo', async ({ page }) => {
  await page.goto('/')
  await upload(page)
  await page.getByText('Экран', { exact: true }).click()
  await page.getByLabel('Тема экрана', { exact: true }).selectOption('BlackHCTheme')
  await page.getByLabel('Размер заголовков', { exact: true }).selectOption('140')
  const titleColor = page.getByLabel('Цвет заголовков', { exact: true })
  await expect(titleColor).toHaveAttribute('type', 'color')
  await titleColor.fill('#123456')
  const transparency = page.getByLabel('Прозрачность: Цвет заголовков', { exact: true })
  await transparency.focus()
  await transparency.press('Home')
  await transparency.press('ArrowRight')
  await page
    .locator('.display-panel summary')
    .filter({ hasText: /^Единицы измерения$/ })
    .click()
  await page.getByLabel('Единицы: Скорость', { exact: true }).selectOption('mph')
  await page.getByRole('button', { name: 'Применить настройки экрана' }).click()
  const screen = JSON.parse((await exported(page)).toString())
  expect(screen.preferences).toMatchObject({
    'Display.Theme': 'BlackHCTheme',
    'Display.WidgetTitleSize': '140',
    'Display.WidgetTitleColor': 0xfe123456 | 0,
    'Unit.Speed': 'mph',
    untouched: 'private synthetic',
  })
  expect(screen.layout).toEqual(JSON.parse(data).layout)
  await page.getByRole('button', { name: 'Страницы', exact: true }).click()
  await page
    .getByLabel('Тип страницы', { exact: true })
    .selectOption('org.xcontest.XCTrack.widget.wp.WPCompetition')
  await page.getByLabel('Доступность страницы', { exact: true }).selectOption('selected')
  await page.getByLabel('Полёт к точке', { exact: true }).check()
  await page.getByRole('button', { name: 'Применить параметры страницы' }).click()
  await page.getByRole('button', { name: 'Закрыть настройки' }).click()
  const layout = JSON.parse((await exported(page)).toString())
  expect(layout.layout.portrait[0].navigations).toEqual([
    'org.xcontest.XCTrack.navig.TaskCompetition',
    'org.xcontest.XCTrack.navig.TaskToWaypoint',
  ])
  expect(layout.layout.portrait[0].widgets).toEqual(screen.layout.portrait[0].widgets)
  expect(layout.layout.landscape).toEqual(screen.layout.landscape)
  await page.getByRole('button', { name: 'Отменить', exact: true }).click()
  expect(JSON.parse((await exported(page)).toString())).toEqual(screen)
  await page.getByRole('button', { name: 'Отменить', exact: true }).click()
  expect((await exported(page)).toString()).toBe(data)
})

test('complete native catalog, FreeText, extra simulation and advanced settings export independently', async ({
  page,
}) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Новая конфигурация' }).click()
  await expect(page.locator('[data-catalog-widget]')).toHaveCount(78)
  await page.getByLabel('Поиск виджетов').fill('FreeText')
  await page.getByRole('button', { name: 'Выбрать виджет WFreeText', exact: true }).click()
  await page.getByRole('button', { name: 'Добавить виджет', exact: true }).click()
  await page.getByText(/^Параметры виджета ·/).click()
  await page.getByLabel('Текст', { exact: true }).fill('Тестовый текст')
  await page.getByLabel('Размер текста', { exact: true }).fill('40')
  await page.getByLabel('Цвет текста', { exact: true }).fill('#ffffff')
  await page.getByRole('button', { name: 'Применить оформление' }).click()
  await expect(page.getByRole('img', { name: 'Предпросмотр страницы XCTrack' })).toContainText(
    'Тестовый текст',
  )
  await page.getByRole('button', { name: 'Дополнительно', exact: true }).click()
  await page.getByText('Технические параметры (JSON)', { exact: true }).click()
  await page
    .getByLabel('Параметры JSON')
    .fill('{"text":"После JSON","color_text":-1,"unknown":{"a/b":123},"nullable":null}')
  await page.getByRole('button', { name: 'Применить параметры виджета' }).click()
  const before = await exported(page)
  const result = JSON.parse(before.toString())
  expect(result.layout.portrait[0].widgets[1]).toMatchObject({
    CLASS: 'org.xcontest.XCTrack.widget.w.WFreeText',
    text: 'После JSON',
    unknown: { 'a/b': 123 },
    nullable: null,
  })
  await page.getByRole('button', { name: 'Отменить', exact: true }).click()
  await expect(page.getByRole('img', { name: 'Предпросмотр страницы XCTrack' })).toContainText(
    'Тестовый текст',
  )
  await page.getByLabel('Поиск виджетов').fill('WindSpeed')
  await page.getByRole('button', { name: 'Выбрать виджет WWindSpeed', exact: true }).click()
  await page.getByRole('button', { name: 'Добавить виджет', exact: true }).click()
  const windSource = await exported(page)
  await page.getByText('Симуляция полёта', { exact: true }).click()
  await page.getByText('Показание выбранного виджета', { exact: true }).click()
  await page.getByLabel('Тип показания виджета').selectOption('number')
  await page.getByLabel('Показание виджета', { exact: true }).fill('10')
  await page.getByRole('button', { name: 'Применить показание виджета' }).click()
  expect(await exported(page)).toEqual(windSource)
  await expect(page.getByRole('img', { name: 'Предпросмотр страницы XCTrack' })).toContainText('36')
})

test('automatic map falls back to IP location and tolerates offline tiles without changing XCFG', async ({
  page,
}) => {
  await page.addInitScript(() =>
    Object.defineProperty(navigator, 'geolocation', {
      value: {
        getCurrentPosition: (_success: unknown, failure: (error: unknown) => void) =>
          failure({ code: 1 }),
      },
    }),
  )
  await page.route('https://get.geojs.io/v1/ip/geo.json', (route) =>
    route.fulfill({ json: { latitude: '48.8', longitude: '2.3' } }),
  )
  await page.route('https://tile.openstreetmap.org/**', (route) => route.abort())
  await page.goto('/')
  const source = data.replace('widget.w.WSpeed', 'widget.w.WXCAssistant')
  await upload(page, source)
  const map = page.locator('[data-online-map]')
  await expect(map).toHaveAttribute('data-map-latitude', '48.8')
  await expect(map).toHaveAttribute('data-map-longitude', '2.3')
  await expect(map).toContainText('Часть онлайн-тайлов недоступна')
  expect(await exported(page)).toEqual(Buffer.from(source))
})

test('import, simulation, edit, undo and export preserve unrelated data locally', async ({
  page,
}) => {
  const errors: string[] = []
  const remote: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('request', (request) => {
    const url = new URL(request.url())
    if (url.protocol.startsWith('http') && url.hostname !== '127.0.0.1') remote.push(url.origin)
  })
  await page.goto('/')
  await upload(page)
  await expect(page.getByRole('img', { name: 'Предпросмотр страницы XCTrack' })).toBeVisible()
  expect(await exported(page)).toEqual(Buffer.from(data))
  await page.getByText('Симуляция полёта', { exact: true }).click()
  await page.getByText('Показания и отсутствие данных', { exact: true }).click()
  await page.getByLabel('Скорость, km/h').fill('72')
  expect(await exported(page)).toEqual(Buffer.from(data))
  await page.getByRole('button', { name: 'Редактор', exact: true }).click()
  const canvas = page.getByRole('img', { name: 'Предпросмотр страницы XCTrack' })
  await canvas.focus()
  await page.keyboard.press('ArrowRight')
  const changed = await exported(page)
  expect(changed).not.toEqual(Buffer.from(data))
  await page.getByRole('button', { name: 'Отменить', exact: true }).click()
  expect(await exported(page)).toEqual(Buffer.from(data))
  await page.getByRole('button', { name: 'Повторить', exact: true }).click()
  expect(await exported(page)).toEqual(changed)
  await page.getByLabel('Ориентация', { exact: true }).selectOption('landscape')
  await expect(page.getByRole('img')).toHaveAttribute('viewBox', '0 0 2400 1080')
  await page.getByLabel('Ориентация', { exact: true }).selectOption('portrait')
  expect(await exported(page)).toEqual(changed)
  await page.locator('[data-widget=Widget]').first().dispatchEvent('click')
  await expect(page.getByTestId('widget-inspector')).toContainText('Widget')
  expect(errors).toEqual([])
  expect(remote).toEqual([])
})

test('invalid upload retains current document; unsupported version is read-only', async ({
  page,
}) => {
  await page.goto('/')
  await upload(page)
  await upload(page, '{"bad":NaN}')
  await expect(page.getByRole('alert')).toBeVisible()
  expect(await exported(page)).toEqual(Buffer.from(data))
  await upload(page, data.replace('91260', '91261'))
  await expect(page.getByRole('button', { name: 'Дублировать виджет', exact: true })).toBeDisabled()
  expect(await exported(page)).toEqual(Buffer.from(data.replace('91260', '91261')))
})

test('loaded preview remains usable at portrait width', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await upload(page)
  await expect(page.getByRole('img')).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  )
})

test('canvas move, resize and cancellation use one undo entry per gesture', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 1600 })
  const config = JSON.parse(data)
  config.layout.portrait[0].widgets[0] = {
    ...config.layout.portrait[0].widgets[0],
    X1: 1000,
    Y1: 1000,
    X2: 4000,
    Y2: 4000,
  }
  const source = JSON.stringify(config)
  await page.goto('/')
  await upload(page, source)
  await page.getByLabel('Привязка к сетке').uncheck()
  await page.locator('[data-widget=Widget]').first().dispatchEvent('click')
  const canvas = page.getByRole('img', { name: 'Предпросмотр страницы XCTrack' })
  await canvas.scrollIntoViewIfNeeded()
  const box = (await canvas.boundingBox())!
  const start = { x: box.x + box.width * 0.25, y: box.y + box.height * 0.25 }
  await page.mouse.move(start.x, start.y)
  await page.mouse.down()
  await page.mouse.move(start.x + box.width * 0.1, start.y + box.height * 0.1, { steps: 5 })
  await expect(page.getByLabel('X1', { exact: true })).toHaveCount(0)
  await page.mouse.up()
  const moved = JSON.parse((await exported(page)).toString())
  const widget = moved.layout.portrait[0].widgets[0]
  expect(widget.X1).toBeGreaterThan(1900)
  expect(widget.Y1).toBeGreaterThan(1900)
  expect(widget.X2 - widget.X1).toBe(3000)
  expect(moved.layout.landscape).toEqual(config.layout.landscape)
  expect(moved.preferences).toEqual(config.preferences)
  await page.getByRole('button', { name: 'Отменить', exact: true }).click()
  expect(await exported(page)).toEqual(Buffer.from(source))
  await expect(page.getByRole('button', { name: 'Отменить', exact: true })).toBeDisabled()
  await page.getByRole('button', { name: 'Повторить', exact: true }).click()
  const handle = canvas.locator('[data-handle="se"]')
  await handle.scrollIntoViewIfNeeded()
  const corner = (await handle.boundingBox())!
  await page.mouse.move(corner.x + corner.width / 2, corner.y + corner.height / 2)
  await page.mouse.down()
  await page.mouse.move(
    corner.x + corner.width / 2 + box.width * 0.1,
    corner.y + corner.height / 2 + box.height * 0.1,
  )
  await page.mouse.up()
  const resized = JSON.parse((await exported(page)).toString()).layout.portrait[0].widgets[0]
  expect(resized.X1).toBe(widget.X1)
  expect(resized.X2).toBeGreaterThan(widget.X2)
  await page.getByRole('button', { name: 'Отменить', exact: true }).click()
  expect(JSON.parse((await exported(page)).toString())).toEqual(moved)
  await canvas.scrollIntoViewIfNeeded()
  const cancelBox = (await canvas.boundingBox())!
  await page.mouse.move(cancelBox.x + cancelBox.width * 0.35, cancelBox.y + cancelBox.height * 0.35)
  await page.mouse.down()
  await page.mouse.move(cancelBox.x + cancelBox.width * 0.45, cancelBox.y + cancelBox.height * 0.45)
  await page.keyboard.press('Escape')
  await page.mouse.up()
  expect(JSON.parse((await exported(page)).toString())).toEqual(moved)
})

test('widget duplication, removal and history preserve settings and orientations', async ({
  page,
}) => {
  await page.goto('/')
  await upload(page)
  await page.locator('[data-widget=Widget]').first().dispatchEvent('click')
  await page.getByRole('button', { name: 'Дублировать виджет', exact: true }).click()
  await expect(page.locator('[data-widget]')).toHaveCount(3)
  await expect(page.getByLabel('X1', { exact: true })).toHaveCount(0)
  const duplicated = JSON.parse((await exported(page)).toString())
  expect(duplicated.layout.portrait[0].widgets[2]).toEqual(
    JSON.parse(data).layout.portrait[0].widgets[1],
  )
  expect(duplicated.layout.landscape).toEqual(JSON.parse(data).layout.landscape)
  expect(duplicated.preferences).toEqual(JSON.parse(data).preferences)
  expect((await exported(page)).toString()).not.toContain('widgetIds')
  await page.getByRole('img').focus()
  await page.keyboard.press('ArrowLeft')
  const shifted = await exported(page)
  await page.getByRole('button', { name: 'Удалить виджет', exact: true }).click()
  expect(await exported(page)).toEqual(Buffer.from(data))
  await page.getByRole('button', { name: 'Отменить', exact: true }).click()
  await expect(page.locator('[data-widget]')).toHaveCount(3)
  await page.locator('[data-widget=Widget]').nth(1).dispatchEvent('click')
  expect(await exported(page)).toEqual(shifted)
  await page.getByRole('button', { name: 'Отменить', exact: true }).click()
  await expect(page.getByLabel('X1', { exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: 'Отменить', exact: true }).click()
  expect(await exported(page)).toEqual(Buffer.from(data))
  await page.getByRole('button', { name: 'Повторить', exact: true }).click()
  await page.locator('[data-widget=WSpeed]').dispatchEvent('click')
  await page.getByRole('button', { name: 'Удалить виджет', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Повторить', exact: true })).toBeDisabled()
  const output = (await exported(page)).toString()
  await upload(page, output)
  await expect(page.locator('[data-widget]')).toHaveCount(2)
  expect((await exported(page)).toString()).toBe(output)
})

test('empty page and last-widget guard remain usable', async ({ page }) => {
  const config = JSON.parse(data)
  config.layout.portrait[0].widgets.pop()
  await page.goto('/')
  await upload(page, JSON.stringify(config))
  await page.getByRole('button', { name: 'Удалить виджет', exact: true }).click()
  await expect(page.locator('[data-widget]')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Дублировать виджет', exact: true })).toBeDisabled()
  const empty = JSON.parse((await exported(page)).toString())
  expect(empty.layout.portrait[0].widgets).toEqual([])
  await page.getByLabel('Ориентация', { exact: true }).selectOption('landscape')
  await expect(page.getByRole('button', { name: 'Удалить виджет', exact: true })).toBeDisabled()
  await upload(page, data.replace('91260', '91261'))
  await expect(page.getByRole('button', { name: 'Дублировать виджет', exact: true })).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Удалить виджет', exact: true })).toBeDisabled()
})

test('complete editor workflow: create, catalog, settings, layers and pages', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 1600 })
  await page.goto('/')
  await page.getByRole('button', { name: 'Новая конфигурация', exact: true }).click()
  await page.getByRole('button', { name: 'Выбрать виджет WAMSL', exact: true }).click()
  await page.getByRole('button', { name: 'Добавить виджет', exact: true }).click()
  await page.getByLabel('Прозрачность фона, %', { exact: true }).fill('50')
  await page.getByLabel('Тема', { exact: true }).selectOption('WhiteTheme')
  await page.getByLabel('Показывать заголовок', { exact: true }).uncheck()
  await page.getByLabel('Свой заголовок', { exact: true }).fill('QA altitude')
  await page.getByRole('button', { name: 'Применить оформление', exact: true }).click()
  await page.getByRole('button', { name: 'Слой назад', exact: true }).click()
  await expect(page.getByLabel('Свой заголовок', { exact: true })).toHaveValue('QA altitude')
  await expect(page.getByLabel('Прозрачность фона, %', { exact: true })).toHaveValue('50')
  const first = JSON.parse((await exported(page)).toString())
  expect(first.layout.portrait[0].widgets[0]).toMatchObject({
    _bg: 50,
    _theme: 'WhiteTheme',
    _title: false,
    titletext: 'QA altitude',
  })
  await page.getByRole('button', { name: 'Страницы', exact: true }).click()
  await page.getByRole('button', { name: 'Дублировать страницу', exact: true }).click()
  await page.getByRole('button', { name: 'Закрыть настройки' }).click()
  await expect(page.getByLabel('Страница', { exact: true })).toHaveValue('1')
  await page.getByRole('button', { name: 'Отменить', exact: true }).click()
  await expect(page.getByRole('img')).toBeVisible()
  await expect(page.getByLabel('Страница', { exact: true })).toHaveValue('0')
  await page.getByRole('button', { name: 'Повторить', exact: true }).click()
  await expect(page.getByLabel('Страница', { exact: true })).toHaveValue('1')
  await page.getByLabel('Ориентация', { exact: true }).selectOption('landscape')
  await page.getByRole('button', { name: 'Страницы', exact: true }).click()
  await page.getByRole('button', { name: 'Добавить страницу', exact: true }).click()
  await page.getByRole('button', { name: 'Закрыть настройки' }).click()
  await page.getByRole('button', { name: 'Выбрать виджет WVerticalSpeed', exact: true }).click()
  await page.getByRole('button', { name: 'Добавить виджет', exact: true }).click()
  await page.getByLabel('Ориентация', { exact: true }).selectOption('portrait')
  await page.getByRole('button', { name: 'Страницы', exact: true }).click()
  await page.getByRole('button', { name: 'Удалить страницу', exact: true }).click()
  await page.getByRole('button', { name: 'Закрыть настройки' }).click()
  await expect(page.getByLabel('Страница', { exact: true })).toHaveValue('0')
  const result = await exported(page)
  const config = JSON.parse(result.toString())
  expect(config.layout.portrait).toHaveLength(1)
  expect(config.layout.landscape).toHaveLength(1)
  expect(config.layout.portrait[0].widgets).toHaveLength(2)
  expect(config.layout.landscape[0].widgets).toHaveLength(2)
  await upload(page, result.toString())
  expect(await exported(page)).toEqual(result)
  const { mkdir, writeFile } = await import('node:fs/promises')
  await mkdir('.local/android-qa', { recursive: true })
  await writeFile('.local/android-qa/editor-full.xcfg', result)
  await page.screenshot({ path: '.local/android-qa/editor-browser.png', fullPage: true })
})

test('keyboard commands, page order and scenario playback keep export independent', async ({
  page,
}) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Новая конфигурация', exact: true }).click()
  const original = await exported(page)
  const canvas = page.getByRole('img')
  await canvas.focus()
  await page.keyboard.press('ArrowRight')
  expect(await exported(page)).not.toEqual(original)
  await page.keyboard.press('Control+z')
  expect(await exported(page)).toEqual(original)
  await page.getByRole('button', { name: 'Страницы', exact: true }).click()
  await page.getByRole('button', { name: 'Добавить страницу', exact: true }).click()
  await page.getByRole('button', { name: 'Закрыть настройки' }).click()
  await page.getByRole('button', { name: 'Выбрать виджет WAMSL', exact: true }).click()
  await page.getByRole('button', { name: 'Добавить виджет', exact: true }).click()
  await page.getByRole('button', { name: 'Страницы', exact: true }).click()
  await page.getByRole('button', { name: 'Страница раньше', exact: true }).click()
  await page.getByRole('button', { name: 'Закрыть настройки' }).click()
  await expect(page.getByLabel('Страница', { exact: true })).toHaveValue('0')
  await expect(page.locator('[data-widget]')).toHaveCount(2)
  const beforeSimulation = await exported(page)
  await page.getByText('Симуляция полёта', { exact: true }).click()
  await page.getByLabel('Сценарий', { exact: true }).selectOption('thermal')
  await page.getByLabel('Время сценария, s', { exact: true }).fill('120')
  await page.getByRole('button', { name: 'Запустить симуляцию', exact: true }).click()
  await expect
    .poll(async () =>
      Number(await page.getByLabel('Текущее время сценария', { exact: true }).textContent()),
    )
    .toBeGreaterThan(120)
  await page.getByRole('button', { name: 'Пауза симуляции', exact: true }).click()
  expect(await exported(page)).toEqual(beforeSimulation)
  await page.getByLabel('Сценарий', { exact: true }).selectOption('no-data')
  expect(await exported(page)).toEqual(beforeSimulation)
})

test('imported widget templates copy unknown settings across orientations', async ({ page }) => {
  await page.goto('/')
  await upload(page)
  await page.getByRole('button', { name: 'Дополнительно', exact: true }).click()
  await page.getByText('Копировать из конфигурации', { exact: true }).click()
  await page
    .getByLabel('Шаблон из конфигурации', { exact: true })
    .selectOption({ label: 'П1 · 2. Widget' })
  await page.getByLabel('Ориентация', { exact: true }).selectOption('landscape')
  await page.getByRole('button', { name: 'Добавить из шаблона', exact: true }).click()
  const config = JSON.parse((await exported(page)).toString())
  expect(config.layout.landscape[0].widgets[1]).toEqual(
    JSON.parse(data).layout.portrait[0].widgets[1],
  )
  expect(config.layout.portrait).toEqual(JSON.parse(data).layout.portrait)
})
