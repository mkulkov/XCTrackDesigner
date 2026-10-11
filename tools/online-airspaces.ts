import type { Connect, Plugin } from 'vite'

export function airspaceRoute(url: string) {
  if (url === '/__xcontest/files') return '/api/v6/files'
  const match = /^\/__xcontest\/data\/([1-9]\d{0,6})$/.exec(url)
  return match ? `/api/v6/data/${match[1]}` : null
}

// Fixed upstream, no credentials, arbitrary proxy targets, disk writes or background downloads.
export function airspaceMiddleware(): Connect.NextHandleFunction {
  const cache = new Map<string, { bytes: Uint8Array; etag: string | null; time: number }>()
  const middleware: Connect.NextHandleFunction = (request, response, next) => {
    if (!request.url?.startsWith('/__xcontest/')) return next()
    const path = airspaceRoute(request.url)
    const origin = request.headers.origin
    if (
      request.method !== 'GET' ||
      !path ||
      (origin && origin !== `http://${request.headers.host}`) ||
      request.headers['sec-fetch-site'] === 'cross-site'
    ) {
      response.statusCode = 403
      return response.end('Unsupported airspace request')
    }
    const send = (bytes: Uint8Array) => {
      response.setHeader('Content-Type', 'application/json')
      response.setHeader('Cache-Control', 'no-store')
      response.end(bytes)
    }
    const cached = cache.get(path)
    if (cached && Date.now() - cached.time < 300000) return send(cached.bytes)
    void (async () => {
      try {
        const upstream = await fetch(`https://airspace.xcontest.org${path}`, {
          redirect: 'error',
          signal: AbortSignal.timeout(15000),
          headers: {
            'User-Agent': 'XCTrackScreenDesigner/0.1 (local visual editor)',
            ...(cached?.etag ? { 'If-None-Match': cached.etag } : {}),
          },
        })
        if (upstream.status === 304 && cached) {
          cached.time = Date.now()
          return send(cached.bytes)
        }
        if (!upstream.ok || !upstream.body) throw new Error(`XContest HTTP ${upstream.status}`)
        const reader = upstream.body.getReader()
        const parts: Uint8Array[] = []
        let size = 0
        while (true) {
          const chunk = await reader.read()
          if (chunk.done) break
          size += chunk.value.byteLength
          if (size > 5 * 1024 * 1024) {
            await reader.cancel()
            throw new Error('XContest response exceeds 5 MiB')
          }
          parts.push(chunk.value)
        }
        const bytes = new Uint8Array(size)
        let offset = 0
        for (const part of parts) {
          bytes.set(part, offset)
          offset += part.byteLength
        }
        JSON.parse(new TextDecoder().decode(bytes))
        if (cache.size >= 20) cache.delete(cache.keys().next().value!)
        cache.set(path, { bytes, etag: upstream.headers.get('etag'), time: Date.now() })
        send(bytes)
      } catch (cause) {
        response.statusCode = 502
        response.setHeader('Content-Type', 'application/json')
        response.end(
          JSON.stringify({
            error: cause instanceof Error ? cause.message : 'XContest unavailable',
          }),
        )
      }
    })()
  }
  return middleware
}

export function onlineAirspaces(): Plugin {
  const middleware = airspaceMiddleware()
  return {
    name: 'online-xcontest-airspaces',
    configureServer(server) {
      server.middlewares.use(middleware)
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware)
    },
  }
}
