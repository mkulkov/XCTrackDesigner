import { build } from 'esbuild'

await build({
  entryPoints: ['tools/desktop-main.ts'],
  outfile: '.local/desktop/main.cjs',
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: 'node24',
  external: ['electron'],
})
