import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const sdk = process.env.ANDROID_SDK_ROOT || process.env.ANDROID_HOME || 'C:\\opt\\AndroidSDK'
let failed = false
function check(label, good, detail) {
  console.log(`${good ? 'OK' : 'MISSING'} ${label}: ${detail}`)
  if (!good) failed = true
}
function run(command, args = []) {
  const result = spawnSync(command, args, { encoding: 'utf8', timeout: 15_000, windowsHide: true })
  return { ok: result.status === 0, text: `${result.stdout || ''}${result.stderr || ''}`.trim() }
}
const [major, minor] = process.versions.node.split('.').map(Number)
check('Node', major === 24 && minor >= 15, process.version)
const python = run('python', ['--version'])
check('Python', python.ok, python.text)
const git = run('git', ['--version'])
check('Git', git.ok, git.text)
const java = run('java', ['--version'])
check('Java', java.ok, java.text.split(/\r?\n/)[0])
for (const module of [
  'react',
  'react-dom',
  'vite',
  '@vitejs/plugin-react',
  'typescript',
  'eslint',
  'prettier',
  'vitest',
  '@playwright/test',
  'pixelmatch',
  'pngjs',
]) {
  const file = join(root, 'node_modules', module, 'package.json')
  check(
    module,
    existsSync(file),
    existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')).version : 'npm ci required',
  )
}
for (const [label, path] of [
  ['ADB', join(sdk, 'platform-tools', 'adb.exe')],
  ['Android Emulator', join(sdk, 'emulator', 'emulator.exe')],
  ['aapt', join(sdk, 'build-tools', '35.0.0', 'aapt.exe')],
  ['JADX', join(root, 'research', 'apk', 'tools', 'jadx', 'bin', 'jadx.bat')],
])
  check(label, existsSync(path), path)
const adb = join(sdk, 'platform-tools', 'adb.exe')
if (existsSync(adb)) {
  const state = run(adb, ['-s', 'emulator-5554', 'get-state'])
  console.log(`INFO emulator-5554: ${state.ok ? state.text : 'stopped (npm run android:start)'}`)
}
const browserPackage = join(root, 'node_modules', 'playwright', 'package.json')
if (existsSync(browserPackage)) {
  const { chromium } = await import('playwright')
  check('Playwright Chromium', existsSync(chromium.executablePath()), chromium.executablePath())
}
process.exitCode = failed ? 1 : 0
