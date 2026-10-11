import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { localFonts } from './tools/local-fonts.ts'
import { onlineAirspaces } from './tools/online-airspaces.ts'

const webRoot = fileURLToPath(new URL('./web', import.meta.url))
const modules = fileURLToPath(new URL('./node_modules', import.meta.url))

export default defineConfig({
  root: webRoot,
  publicDir: false,
  plugins: [react(), localFonts(), onlineAirspaces()],
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    fs: {
      allow: [webRoot, modules],
      deny: ['**/.local/**', '**/research/**', '**/*.xcfg', '**/.env*'],
    },
  },
  preview: { host: '127.0.0.1', port: 4173, strictPort: true },
  build: { outDir: '../dist', emptyOutDir: true, sourcemap: false },
})
