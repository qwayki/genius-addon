import { build } from 'vite'
import { cpSync, readdirSync } from 'fs'
import { resolve } from 'path'
import { getPulseSyncAddonsDir } from './pulsesync-paths.mjs'
import addonConfig from '../addon.config.mjs'

const dest = resolve(getPulseSyncAddonsDir(), addonConfig.directoryName)

await build({
    build: {
        watch: {},
        minify: false,
    },
    plugins: [
        {
            name: 'sync-on-build',
            buildStart() {
                for (const f of readdirSync(resolve('addon'))) {
                    this.addWatchFile(resolve('addon', f))
                }
            },
            closeBundle() {
                const src = resolve(`dist/${addonConfig.directoryName}`)
                cpSync(resolve('addon'), src, { recursive: true })
                cpSync(src, dest, { recursive: true })
                console.log(`[dev] synced → ${dest}`)
            },
        },
    ],
})
