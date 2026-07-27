// src/main.ts — точка входа аддона

import { mount } from './mount'
import { injectStyles, injectLyricsStyles } from './genius/styles'
import { setDevMode } from './logger'
import { readBooleanSetting } from './pulsesync'
import { evictExpired } from './genius/api'

injectStyles()
injectLyricsStyles()
mount()

// @ts-ignore
import addonConfig from '../addon.config.mjs'
const settingsStore = window.pulsesyncApi?.getSettings(addonConfig.name)
setDevMode(readBooleanSetting(settingsStore?.getCurrent() ?? {}, 'devMode', false))

settingsStore?.onChange(settings => {
    setDevMode(readBooleanSetting(settings, 'devMode', false))
})

evictExpired()
