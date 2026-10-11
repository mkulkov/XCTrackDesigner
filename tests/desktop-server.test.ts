import { afterEach, expect, test } from 'vitest'
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { startDesktopServer } from '../tools/desktop-server.ts'

let close: (() => Promise<void>) | undefined
let directory: string | undefined
afterEach(async () => {
  await close?.()
  if (directory) await rm(directory, { recursive: true, force: true })
})

test('desktop serves generated assets only and rejects foreign requests', async () => {
  directory = await mkdtemp(join(tmpdir(), 'xctrack-server-test-'))
  await mkdir(join(directory, 'assets'))
  await writeFile(join(directory, 'index.html'), '<html>Editor</html>')
  await writeFile(join(directory, 'assets', 'app.js'), 'export const ready = true')
  await writeFile(join(directory, 'private.xcfg'), 'private')
  const server = await startDesktopServer(directory, 0)
  close = server.close
  expect(await (await fetch(server.origin)).text()).toContain('Editor')
  expect((await fetch(server.origin + '/assets/app.js')).headers.get('content-type')).toContain(
    'javascript',
  )
  expect((await fetch(server.origin + '/private.xcfg')).status).toBe(404)
  expect((await fetch(server.origin + '/assets/%2e%2e%2fprivate.xcfg')).status).toBe(404)
  expect((await fetch(server.origin + '/assets/%2e%2e%2findex.html')).status).toBe(404)
  expect((await fetch(server.origin + '/assets/%2e%2e%2f%2e%2e%2fsecret.js')).status).toBe(404)
  expect((await fetch(server.origin, { headers: { Host: 'foreign.example' } })).status).toBe(403)
  expect(
    (await fetch(server.origin, { headers: { Origin: 'https://foreign.example' } })).status,
  ).toBe(403)
  expect((await fetch(server.origin, { method: 'POST' })).status).toBe(403)
  expect((await fetch(server.origin + '/__xcontest/data/invalid')).status).toBe(403)
  expect(await (await fetch(server.origin + '/__local-fonts/manifest.json')).json()).toEqual({
    available: false,
    hashes: [],
  })
})
