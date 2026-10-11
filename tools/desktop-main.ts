import { app, BrowserWindow, dialog, Menu } from 'electron'
import { join } from 'node:path'
import { startDesktopServer } from './desktop-server.ts'

app.setName('XCTrack Screen Designer')
app.setAppUserModelId('local.xctrack.screen-designer')
// Playwright uses an isolated profile; ordinary launches use the stable app profile.
const profile = app.commandLine.getSwitchValue('user-data-dir')
if (profile) app.setPath('userData', profile)

let window: BrowserWindow | null = null
let server: Awaited<ReturnType<typeof startDesktopServer>> | null = null
let stopping = false

if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (window?.isMinimized()) window.restore()
    window?.focus()
  })
  app.on('window-all-closed', () => app.quit())
  app.on('before-quit', (event) => {
    if (!server || stopping) return
    event.preventDefault()
    stopping = true
    void server.close().finally(() => app.quit())
  })
  void app.whenReady().then(async () => {
    try {
      server = await startDesktopServer(join(app.getAppPath(), 'dist'))
      Menu.setApplicationMenu(null)
      window = new BrowserWindow({
        title: 'XCTrack Screen Designer',
        width: 1440,
        height: 960,
        minWidth: 960,
        minHeight: 640,
        show: false,
        backgroundColor: '#f5f7fb',
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          sandbox: true,
          webSecurity: true,
        },
      })
      const origin = server.origin
      const contents = window.webContents
      contents.setWindowOpenHandler(() => ({ action: 'deny' }))
      contents.on('will-navigate', (event, url) => {
        if (new URL(url).origin !== origin) event.preventDefault()
      })
      contents.on('will-redirect', (event, url) => {
        if (new URL(url).origin !== origin) event.preventDefault()
      })
      contents.session.setPermissionRequestHandler((_contents, _permission, callback) =>
        callback(false),
      )
      contents.session.setPermissionCheckHandler(() => false)
      // Blob downloads use Electron's native Save As dialog.
      contents.session.on('will-download', (_event, item) => {
        item.setSaveDialogOptions({
          title: 'Экспорт XCFG',
          defaultPath: join(app.getPath('downloads'), item.getFilename()),
          filters: [{ name: 'XCTrack configuration', extensions: ['xcfg'] }],
        })
      })
      window.once('ready-to-show', () => window?.show())
      window.on('closed', () => {
        window = null
      })
      await window.loadURL(origin)
    } catch (cause) {
      dialog.showErrorBox(
        'Не удалось запустить XCTrack Screen Designer',
        cause instanceof Error ? cause.message : String(cause),
      )
      app.quit()
    }
  })
}
