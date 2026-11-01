import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { resolve } from 'path'
import { addonPlugin, defineAddonManifest } from '@pulsesync/addon-sdk/vite'
import addonConfig from './addon.config.mjs'
import { settings } from './src/settings.ts'

export default defineConfig({
    resolve: {
        alias: {
            '@': resolve(import.meta.dirname, 'src'),
        },
    },
    plugins: [react(), addonPlugin({ manifest: defineAddonManifest(addonConfig), settings })],
})
