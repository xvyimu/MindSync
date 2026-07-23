/**
 * Copy @mindsync/web Vite build output into this package's web-dist
 * (mirrors packages/desktop build:web → web-dist).
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const pkgRoot = path.resolve(__dirname, '..')
const src = path.resolve(pkgRoot, '../web/dist')
const dest = path.resolve(pkgRoot, 'web-dist')

if (!fs.existsSync(src)) {
  console.error(`[desktop-tauri] web dist missing at ${src}`)
  console.error('[desktop-tauri] Run: pnpm -F @mindsync/web build')
  process.exit(1)
}

if (fs.existsSync(dest)) {
  fs.rmSync(dest, { recursive: true, force: true })
}
fs.cpSync(src, dest, { recursive: true })
console.log(`[desktop-tauri] Web files copied to ${dest}`)
