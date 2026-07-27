import { defineConfig } from 'vite'
import { resolve } from 'path'
import addonConfig from './addon.config.mjs'

export default defineConfig({
    resolve: {
        alias: {
            '@': resolve(__dirname, 'src'),
        },
    },
    build: {
        outDir: `dist/${addonConfig.directoryName}`,
        lib: {
            entry: resolve(__dirname, 'src/main.ts'),
            name: addonConfig.id.replace(/-/g, '_'),
            fileName: 'script',
            formats: ['iife'],
        },
        rollupOptions: {
            output: {
                assetFileNames: (assetInfo) => {
                    if (assetInfo.name?.endsWith('.css')) return 'script.css'
                    return assetInfo.name ?? 'asset'
                },
            },
        },
        minify: false,
    },
})
