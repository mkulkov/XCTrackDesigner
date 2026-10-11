import { expect, test } from '@playwright/test'
import { readFile } from 'node:fs/promises'

test('connected graphics, route and IGC replay share telemetry without altering export', async ({
  page,
}, testInfo) => {
  await page.goto('/')
  const names = [
    'WCompass',
    'WVerticalGraph',
    'WThermalAssistant',
    'WCompTaskSummary',
    'WStatusLine',
    'WAMSL',
  ]
  const source = JSON.stringify({
    info: { versionName: '0.9.12.6', versionCode: 91260, exportType: 'pages' },
    layout: {
      portrait: [
        {
          CLASS: 'org.xcontest.XCTrack.widget.wp.WPXCAssistant',
          widgets: names.map((name, i) => ({
            CLASS: `org.xcontest.XCTrack.widget.w.${name}`,
            X1: (i % 2) * 5000,
            X2: ((i % 2) + 1) * 5000,
            Y1: Math.floor(i / 2) * 3300,
            Y2: Math.floor(i / 2) * 3300 + 3300,
          })),
        },
      ],
      landscape: [],
    },
  })
  await page.getByLabel('Открыть XCFG', { exact: true }).setInputFiles({
    name: 'graphics.xcfg',
    mimeType: 'application/json',
    buffer: Buffer.from(source),
  })
  const before = await exportBytes(page)
  await page.getByText('Симуляция полёта', { exact: true }).click()
  await page.getByText('Полёт и маршрут', { exact: true }).click()
  await page.getByText('Маршрут · 0 точек', { exact: true }).click()
  await page.getByRole('button', { name: 'Пример маршрута', exact: true }).click()
  await page.getByLabel('Сценарий', { exact: true }).selectOption('thermal')
  await page.getByLabel('Время сценария, s', { exact: true }).fill('90')
  await expect(page.locator('[data-renderer="WCompass"]')).not.toContainText('Нет курса')
  await expect(
    page.locator('[data-renderer="WVerticalGraph"] [data-series="vertical-altitude"] circle'),
  ).not.toHaveCount(0)
  await expect(page.locator('[data-renderer="WCompTaskSummary"]')).toContainText('Финиш')
  expect(await exportBytes(page)).toEqual(before)
  await page
    .getByRole('img', { name: 'Предпросмотр страницы XCTrack' })
    .screenshot({ path: testInfo.outputPath('connected-graphics.png') })
  await page.getByLabel('Загрузить запись IGC').setInputFiles({
    name: 'synthetic.igc',
    mimeType: 'text/plain',
    buffer: Buffer.from(
      'AXXX\nHFDTE101026\nB1200004300000N07600000EA0100001200\nB1200104300060N07600060EA0102001240\n',
    ),
  })
  await expect(page.getByRole('button', { name: 'Закрыть запись IGC', exact: true })).toBeVisible()
  await page.getByLabel('Позиция записи IGC', { exact: true }).fill('5')
  await expect(page.locator('[data-widget="WAMSL"]')).toContainText('1220')
  expect(await exportBytes(page)).toEqual(before)
  await page
    .getByLabel('Загрузить запись IGC')
    .setInputFiles({ name: 'broken.igc', mimeType: 'text/plain', buffer: Buffer.from('Bbroken') })
  await expect(page.locator('.track-replay [role="alert"]')).toBeVisible()
  await expect(page.locator('[data-widget="WAMSL"]')).toContainText('1220')
  await page.getByRole('button', { name: 'Закрыть запись IGC', exact: true }).click()
  expect(await exportBytes(page)).toEqual(before)
})

async function exportBytes(page: import('@playwright/test').Page) {
  const pending = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Экспорт XCFG', exact: true }).click()
  return readFile((await (await pending).path())!)
}

test('local draft persists exact export across reload, restores explicitly and can be deleted', async ({
  page,
}) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Новая конфигурация', exact: true }).click()
  await page.getByRole('button', { name: 'Дублировать виджет', exact: true }).click()
  const before = await exportBytes(page)
  await page.getByText('Черновик и восстановление', { exact: true }).click()
  await expect(page.getByText('Автосохранение всегда включено')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Сохранить черновик', exact: true })).toHaveCount(0)
  await expect(
    page.getByRole('button', { name: 'Восстановить черновик', exact: true }),
  ).toBeVisible()
  await page.reload()
  await page.getByText('Черновик и восстановление', { exact: true }).click()
  await expect(
    page.getByRole('button', { name: 'Восстановить черновик', exact: true }),
  ).toBeVisible()
  await expect(page.getByRole('button', { name: 'Экспорт XCFG', exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: 'Восстановить черновик', exact: true }).click()
  expect(await exportBytes(page)).toEqual(before)
  await page.getByRole('button', { name: 'Удалить черновик', exact: true }).click()
  await expect(
    page.getByRole('button', { name: 'Восстановить черновик', exact: true }),
  ).toHaveCount(0)
  await page.reload()
  await page.getByText('Черновик и восстановление', { exact: true }).click()
  await expect(
    page.getByRole('button', { name: 'Восстановить черновик', exact: true }),
  ).toHaveCount(0)
})

test('built local editor remains usable without external network and draft failures isolate export', async ({
  page,
}) => {
  await page.route('**/*', (route) => {
    const host = new URL(route.request().url()).hostname
    return host === '127.0.0.1' ? route.continue() : route.abort()
  })
  await page.addInitScript(() =>
    Object.defineProperty(window, 'indexedDB', {
      get() {
        throw Error('storage denied')
      },
    }),
  )
  await page.goto('/')
  await page.getByRole('button', { name: 'Новая конфигурация', exact: true }).click()
  await page.getByRole('button', { name: 'Выбрать виджет WCompass', exact: true }).click()
  await page.getByRole('button', { name: 'Добавить виджет', exact: true }).click()
  const bytes = await exportBytes(page)
  expect(JSON.parse(bytes.toString()).layout.portrait[0].widgets[1].CLASS).toContain('WCompass')
  await page.getByText('Черновик и восстановление', { exact: true }).click()
  await expect(page.getByText('Не удалось сохранить черновик; скачайте XCFG')).toBeVisible()
  expect(await exportBytes(page)).toEqual(bytes)
})

test('track playback exposes controls, seeks, pauses, stops at EOF and restarts without XCFG edits', async ({
  page,
}) => {
  await page.goto('/')
  const source = Buffer.from(
    JSON.stringify({
      info: { versionCode: 91260, versionName: '0.9.12.6', exportType: 'pages' },
      layout: {
        portrait: [
          {
            CLASS: 'Page',
            widgets: [
              { CLASS: 'org.xcontest.XCTrack.widget.w.WAMSL', X1: 0, Y1: 0, X2: 10000, Y2: 5000 },
              {
                CLASS: 'org.xcontest.XCTrack.widget.w.WThermalAssistant',
                X1: 0,
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
  await page
    .getByLabel('Открыть XCFG', { exact: true })
    .setInputFiles({ name: 'replay.xcfg', mimeType: 'application/json', buffer: source })
  await page.getByText('Симуляция полёта', { exact: true }).click()
  const panel = page.getByRole('region', { name: 'Полёт по треку' })
  await expect(panel).toBeVisible()
  await expect(page.getByLabel('Скорость, km/h')).toBeHidden()
  expect((await panel.boundingBox())!.height).toBeLessThan(320)
  await page.getByLabel('Загрузить запись IGC').setInputFiles({
    name: 'flight.igc',
    mimeType: 'text/plain',
    buffer: Buffer.from(
      'AXXX\nHFDTE101026\nB1200004300000N07600000EA0100001200\nB1200104300060N07600060EA0102001240\n',
    ),
  })
  await expect(page.getByLabel('Сценарий', { exact: true })).toHaveValue('track')
  await expect(page.getByRole('img', { name: 'Профиль высоты трека' })).toBeVisible()
  expect((await page.locator('.replay-playback').boundingBox())!.height).toBeLessThan(480)
  await page.locator('.standalone-simulation').screenshot({ path: '.local/compact-simulation.png' })
  const chart = page.getByRole('img', { name: 'Профиль высоты трека' })
  const chartBounds = await chart.boundingBox()
  await chart.click({ position: { x: chartBounds!.width / 2, y: chartBounds!.height / 2 } })
  await expect(page.locator('[data-widget=WAMSL]')).toContainText('1220')
  await page.getByLabel('Позиция записи IGC', { exact: true }).fill('5')
  await expect(page.locator('[data-widget=WAMSL]')).toContainText('1220')
  await page.getByLabel('Темп симуляции', { exact: true }).selectOption('100')
  await page.getByRole('button', { name: 'Запустить симуляцию', exact: true }).click()
  await expect(page.getByLabel('Состояние воспроизведения')).toHaveText('Трек завершён')
  await expect(page.getByLabel('Позиция записи IGC', { exact: true })).toHaveValue('10')
  await expect(page.locator('[data-widget=WAMSL]')).toContainText('1240')
  await page.getByLabel('Темп симуляции', { exact: true }).selectOption('0.5')
  await page.getByRole('button', { name: 'Запустить симуляцию', exact: true }).click()
  await expect(page.getByLabel('Состояние воспроизведения')).toHaveText('Воспроизведение')
  await page.getByRole('button', { name: 'Пауза симуляции', exact: true }).click()
  await expect(page.getByLabel('Состояние воспроизведения')).toHaveText('Пауза')
  await page.getByRole('button', { name: 'Запустить симуляцию', exact: true }).click()
  await page.getByRole('button', { name: 'Вернуться к редактированию', exact: true }).click()
  await expect(page.getByTestId('widget-inspector')).toBeVisible()
  const time = await page.getByLabel('Позиция записи IGC', { exact: true }).inputValue()
  await page.waitForTimeout(300)
  await expect(page.getByLabel('Позиция записи IGC', { exact: true })).toHaveValue(time)
  await page.getByRole('button', { name: 'Симуляция полёта', exact: true }).click()
  await expect(page.getByLabel('Состояние воспроизведения')).toHaveText('Пауза')
  await page.getByRole('button', { name: 'К концу трека', exact: true }).click()
  await page.getByRole('button', { name: 'Сбросить симуляцию', exact: true }).click()
  await expect(page.getByLabel('Позиция записи IGC', { exact: true })).toHaveValue('0')
  expect(await exportBytes(page)).toEqual(source)
  await page.getByRole('button', { name: 'Закрыть запись IGC', exact: true }).click()
  await expect(page.getByRole('img', { name: 'Профиль высоты трека' })).toHaveCount(0)
  await expect(page.getByLabel('Сценарий', { exact: true })).toHaveValue('manual')
})
