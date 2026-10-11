import { readFileSync, writeFileSync, existsSync, realpathSync, mkdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { pathToFileURL } from 'node:url'
import { parseArgs } from 'node:util'
import pixelmatch from 'pixelmatch'
import { PNG } from 'pngjs'

export function comparePngs(reference: Uint8Array, actual: Uint8Array, threshold = 0.1) {
  if (!Number.isFinite(threshold) || threshold < 0 || threshold > 1) {
    throw new Error('Pixel threshold must be between 0 and 1')
  }
  const first = PNG.sync.read(Buffer.from(reference))
  const second = PNG.sync.read(Buffer.from(actual))
  if (first.width !== second.width || first.height !== second.height) {
    throw new Error('Image dimensions must match; no automatic scaling is allowed')
  }
  const diff = new PNG({ width: first.width, height: first.height })
  const changed = pixelmatch(first.data, second.data, diff.data, first.width, first.height, {
    threshold,
    includeAA: true,
  })
  return {
    width: first.width,
    height: first.height,
    changedPixels: changed,
    changedRatio: changed / (first.width * first.height),
    png: PNG.sync.write(diff),
  }
}

function main() {
  const { positionals, values } = parseArgs({
    allowPositionals: true,
    options: {
      out: { type: 'string' },
      threshold: { type: 'string', default: '0.1' },
      'max-diff': { type: 'string', default: '0' },
    },
  })
  const [reference, actual] = positionals
  if (!reference || !actual || positionals.length !== 2) {
    throw new Error(
      'Usage: npm run visual:diff -- reference.png actual.png [--out diff.png] [--max-diff 0.01]',
    )
  }
  const maxDiff = Number(values['max-diff'])
  if (!Number.isFinite(maxDiff) || maxDiff < 0 || maxDiff > 1)
    throw new Error('max-diff must be between 0 and 1')
  if (values.out) {
    const output = existsSync(values.out) ? realpathSync(values.out) : resolve(values.out)
    if ([reference, actual].some((input) => realpathSync(input) === output)) {
      throw new Error('Diff output must not overwrite either input')
    }
  }
  const result = comparePngs(
    readFileSync(reference),
    readFileSync(actual),
    Number(values.threshold),
  )
  if (values.out) {
    mkdirSync(dirname(resolve(values.out)), { recursive: true })
    writeFileSync(values.out, result.png)
  }
  console.log(
    JSON.stringify(
      {
        width: result.width,
        height: result.height,
        changedPixels: result.changedPixels,
        changedRatio: result.changedRatio,
        threshold: Number(values.threshold),
        maxDiff,
      },
      null,
      2,
    ),
  )
  if (result.changedRatio > maxDiff) process.exitCode = 1
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main()
