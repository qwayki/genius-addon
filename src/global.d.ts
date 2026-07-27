// src/global.d.ts
// Глобальные типы, которые Electron/PulseSync добавляют в window.

import type { AddonSettingsStore } from './pulsesync'

declare global {
    interface Window {
        /** PulseSync API, доступный в renderer-процессе */
        pulsesyncApi?: {
            getSettings: (addonName: string) => AddonSettingsStore
        }
        /** Electron nodeIntegration: require Node.js модулей из renderer */
        require?: (module: string) => unknown
    }
}