// scripts/post-build.mjs
import { cpSync } from 'fs'
import { resolve } from 'path'
import addonConfig from '../addon.config.mjs'

const outDir = resolve('dist', addonConfig.directoryName)
cpSync(resolve('addon'), outDir, { recursive: true })
console.log(`✓ addon/ → dist/${addonConfig.directoryName}`)