// scripts/sync-addon.mjs
// Копирует собранный аддон из dist/ в папку аддонов PulseSync

import { cpSync, mkdirSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import addonConfig from '../addon.config.mjs'
import { getPulsesyncAddonsDir } from './pulsesync-paths.mjs'

const __dir = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dir, '..')
const src = resolve(root, 'dist', addonConfig.directoryName)
const dest = resolve(getPulsesyncAddonsDir(), addonConfig.directoryName)

mkdirSync(dest, { recursive: true })
cpSync(src, dest, { recursive: true })

console.log(`✓ Synced → ${dest}`)
