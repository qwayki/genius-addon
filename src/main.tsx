// src/main.tsx — точка входа аддона

import { defineAddon } from '@pulsesync/addon-sdk'
// @ts-ignore
import addonConfig from '../addon.config.mjs'

import { settings } from './settings'
import { mount, cleanupInjected } from './mount'
import { injectStyles, injectLyricsStyles } from './genius/styles'
import { evictExpired } from './genius/api'
import { setDevMode } from './logger'

export default defineAddon({
    id: addonConfig.id,
    settings,
    async start(api) {
        setDevMode(settings.store.devMode)
        api.onCleanup(api.settings.onChange(() => setDevMode(settings.store.devMode)))

        injectStyles()
        injectLyricsStyles()
        evictExpired()

        mount(api)

        // Всё, что мы добавили в DOM (стили, блоки, меню, служебные флаги), убираем при выключении
        api.onCleanup(cleanupInjected)
    },
})
