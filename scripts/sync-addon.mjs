import { cpSync } from 'fs'
import { resolve } from 'path'
import { getPulseSyncAddonsDir } from './pulsesync-paths.mjs'
import addonConfig from '../addon.config.mjs'

const src  = resolve(`dist/${addonConfig.directoryName}`)
const dest = resolve(getPulseSyncAddonsDir(), addonConfig.directoryName)

cpSync(src, dest, { recursive: true })
console.log(`[sync] ${src} → ${dest}`)
