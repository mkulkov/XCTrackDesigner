import { _electron as electron, expect } from '@playwright/test'
import { mkdtemp, readFile, mkdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve, join } from 'node:path'

const profile = await mkdtemp(join(tmpdir(), 'xctrack-desktop-test-'))
const output = resolve('.local/desktop-qa')
await mkdir(output, { recursive: true })
const executable = process.argv[2]
const source = JSON.stringify({
  info: { versionName: '0.9.12.6', versionCode: 91260, exportType: 'pages' },
  layout: {
    portrait: [
      {
        CLASS: 'Page',
        widgets: [
          { CLASS: 'org.xcontest.XCTrack.widget.w.WSpeed', X1: 0, Y1: 0, X2: 10000, Y2: 10000 },
        ],
      },
    ],
    landscape: [],
  },
  unknown: { preserved: true },
})
let application
const errors = []
try {
  for (const restart of [false, true]) {
    application = await electron.launch({
      ...(executable ? { executablePath: resolve(executable) } : {}),
      args: [...(executable ? [] : ['.']), '--lang=ru-RU', `--user-data-dir=${profile}`],
      timeout: 60_000,
      env: Object.fromEntries(
        Object.entries(process.env).filter(([key]) => key !== 'ELECTRON_RUN_AS_NODE'),
      ),
    })
    const page = await application.firstWindow()
    page.on('pageerror', (error) => errors.push(error.message))
    await expect(
      page.getByRole('button', { name: 'Новая конфигурация', exact: true }),
    ).toBeVisible()
    const security = await application.evaluate(({ BrowserWindow }) => {
      const window = BrowserWindow.getAllWindows()[0]
      const preferences = window.webContents.getLastWebPreferences()
      return {
        sandbox: preferences.sandbox,
        nodeIntegration: preferences.nodeIntegration,
        contextIsolation: preferences.contextIsolation,
      }
    })
    expect(security).toEqual({ sandbox: true, nodeIntegration: false, contextIsolation: true })
    if (restart) {
      await page.getByText('Черновик и восстановление', { exact: true }).click()
      await expect(
        page.getByRole('button', { name: 'Восстановить черновик', exact: true }),
      ).toBeVisible()
      await page.getByRole('button', { name: 'Восстановить черновик', exact: true }).click()
    } else {
      await page.getByLabel('Открыть XCFG', { exact: true }).setInputFiles({
        name: 'desktop-synthetic.xcfg',
        mimeType: 'application/json',
        buffer: Buffer.from(source),
      })
      await page.getByText('Черновик и восстановление', { exact: true }).click()
      await expect(
        page.getByRole('button', { name: 'Восстановить черновик', exact: true }),
      ).toBeVisible()
    }
    const destination = join(output, restart ? 'restored.xcfg' : 'export.xcfg')
    await rm(destination, { force: true })
    await application.evaluate(({ BrowserWindow }, path) => {
      BrowserWindow.getAllWindows()[0].webContents.session.once('will-download', (_event, item) =>
        item.setSavePath(path),
      )
    }, destination)
    await page.getByRole('button', { name: 'Экспорт XCFG', exact: true }).click()
    await expect
      .poll(
        async () => {
          try {
            return await readFile(destination, 'utf8')
          } catch {
            return null
          }
        },
        { timeout: 30_000 },
      )
      .toBe(source)
    await page.screenshot({ path: join(output, restart ? 'restored.png' : 'window.png') })
    await application.close()
    application = undefined
    await expect
      .poll(async () => {
        try {
          await globalThis.fetch('http://127.0.0.1:4183/')
          return true
        } catch {
          return false
        }
      })
      .toBe(false)
  }
  expect(errors).toEqual([])
  console.log('Desktop smoke passed: sandbox, import/export, draft after restart, server shutdown.')
} finally {
  await application?.close()
  await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 })
}
