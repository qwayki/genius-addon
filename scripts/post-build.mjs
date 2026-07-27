// scripts/post-build.mjs
import { cpSync, writeFileSync, mkdirSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import addonConfig from '../addon.config.mjs'

const __dir = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dir, '..')
const outDir = resolve(root, 'dist', addonConfig.directoryName)

mkdirSync(outDir, { recursive: true })
cpSync(resolve(root, 'addon'), outDir, { recursive: true })

const metadata = { ...addonConfig, script: 'script.iife.js', style: 'script.css' }
writeFileSync(resolve(outDir, 'metadata.json'), JSON.stringify(metadata, null, 2), 'utf-8')

console.log(`✓ metadata.json written to dist/${addonConfig.directoryName}`)
