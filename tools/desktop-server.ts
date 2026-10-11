import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { extname, resolve, sep } from 'node:path'
import { airspaceMiddleware } from './online-airspaces.ts'

// Fixed origin keeps IndexedDB drafts available across restarts and upgrades.
export const desktopPort = 4183

export async function startDesktopServer(directory: string, port = desktopPort) {
  const root = resolve(directory)
  const relay = airspaceMiddleware()
  const types: Record<string, string> = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.woff2': 'font/woff2',
  }
  const server = createServer((request, response) => {
    response.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; connect-src 'self' https:; font-src 'self' data:; object-src 'none'; base-uri 'none'; frame-src 'none'",
    )
    const host = `127.0.0.1:${(server.address() as { port: number }).port}`
    if (
      request.headers.host !== host ||
      (request.headers.origin && request.headers.origin !== `http://${host}`) ||
      request.headers['sec-fetch-site'] === 'cross-site' ||
      !['GET', 'HEAD'].includes(request.method ?? '')
    ) {
      response.writeHead(403).end('Unsupported request')
      return
    }
    relay(request, response, () => {
      void (async () => {
        try {
          const pathname = decodeURIComponent((request.url ?? '/').split('?')[0]!)
          if (pathname.includes('\\') || pathname.split('/').includes('..')) {
            response.writeHead(404).end('Not found')
            return
          }
          if (pathname === '/__local-fonts/manifest.json') {
            response.setHeader('Content-Type', 'application/json')
            response.end(JSON.stringify({ available: false, hashes: [] }))
            return
          }
          const file = resolve(root, pathname === '/' ? 'index.html' : `.${pathname}`)
          // Only generated web assets are served; no project/private directories.
          if (
            !file.startsWith(root + sep) ||
            !(pathname === '/' || pathname === '/index.html' || pathname.startsWith('/assets/')) ||
            !types[extname(file)]
          ) {
            response.writeHead(404).end('Not found')
            return
          }
          const bytes = await readFile(file)
          response.setHeader('Content-Type', types[extname(file)]!)
          response.setHeader('X-Content-Type-Options', 'nosniff')
          response.setHeader('Cache-Control', 'no-store')
          response.end(request.method === 'HEAD' ? undefined : bytes)
        } catch {
          response.writeHead(404).end('Not found')
        }
      })()
    })
  })
  await new Promise<void>((accept, reject) => {
    server.once('error', reject)
    server.listen(port, '127.0.0.1', () => {
      server.removeListener('error', reject)
      accept()
    })
  })
  return {
    origin: `http://127.0.0.1:${(server.address() as { port: number }).port}`,
    close: () => {
      server.closeAllConnections()
      return new Promise<void>((accept, reject) =>
        server.close((error) => (error ? reject(error) : accept())),
      )
    },
  }
}
