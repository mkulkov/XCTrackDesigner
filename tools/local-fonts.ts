import { readFileSync, existsSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import type { Plugin, Connect } from 'vite'

// Local-only, fixed allowlist. Font bytes stay out of the production bundle.
const directory = fileURLToPath(new URL('../.local/fonts/', import.meta.url))
export function localFonts(): Plugin {
  const middleware: Connect.NextHandleFunction = (request, response, next) => {
    const names: Record<string, string> = {
      '/__local-fonts/value.ttf': 'xc-value.ttf',
      '/__local-fonts/title.ttf': 'xc-title.ttf',
    }
    const url = request.url?.split('?')[0] ?? ''
    if (url === '/__local-fonts/manifest.json') {
      const available = ['xc-value.ttf', 'xc-title.ttf'].every((name) =>
        existsSync(directory + name),
      )
      response.setHeader('Content-Type', 'application/json')
      response.setHeader('Cache-Control', 'no-store')
      response.end(
        JSON.stringify({
          available,
          hashes: available
            ? ['xc-value.ttf', 'xc-title.ttf'].map((name) =>
                createHash('sha256')
                  .update(readFileSync(directory + name))
                  .digest('hex'),
              )
            : [],
        }),
      )
    } else if (Object.hasOwn(names, url) && existsSync(directory + names[url])) {
      response.setHeader('Content-Type', 'font/ttf')
      response.setHeader('Cache-Control', 'no-store')
      response.end(readFileSync(directory + names[url]))
    } else next()
  }
  return {
    name: 'private-local-fonts',
    configureServer(server) {
      server.middlewares.use(middleware)
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware)
    },
  }
}
