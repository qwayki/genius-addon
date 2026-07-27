// scripts/dev-build.mjs
import { build } from 'vite'
import { watch } from 'chokidar'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { cpSync, writeFileSync, mkdirSync } from 'fs'
import addonConfig from '../addon.config.mjs'
import { getPulsesyncAddonsDir } from './pulsesync-paths.mjs'

const __dir = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dir, '..')
const outDir = resolve(getPulsesyncAddonsDir(), addonConfig.directoryName)

async function rebuild() {
    console.log('[genius-info] Building...')
    try {
        await build({ root, build: { outDir, emptyOutDir: false, minify: false }, logLevel: 'warn' })

        mkdirSync(outDir, { recursive: true })
        cpSync(resolve(root, 'addon'), outDir, { recursive: true })

        const metadata = { ...addonConfig, script: 'script.iife.js', style: 'script.css' }
        writeFileSync(resolve(outDir, 'metadata.json'), JSON.stringify(metadata, null, 2), 'utf-8')

        console.log(`[genius-info] ✓ Ready → ${outDir}`)
    } catch (err) {
        console.error('[genius-info] Build failed:', err.message)
    }
}

await rebuild()

const watcher = watch([
    resolve(root, 'src'),
    resolve(root, 'addon'),
    resolve(root, 'addon.config.mjs'),
], { ignoreInitial: true })

watcher.on('all', async (_, filePath) => {
    console.log(`[genius-info] Changed: ${filePath}`)
    await rebuild()
})

console.log('[genius-info] Watching for changes... (Ctrl+C to stop)')
