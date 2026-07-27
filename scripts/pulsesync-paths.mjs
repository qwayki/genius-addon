// scripts/pulsesync-paths.mjs
// Резолв пути до папки аддонов PulseSync на разных ОС

import { resolve } from 'path'
import { homedir } from 'os'

export function getPulsesyncAddonsDir() {
    if (process.env.PULSESYNC_ADDONS_DIR) {
        return process.env.PULSESYNC_ADDONS_DIR
    }

    const platform = process.platform

    if (platform === 'win32') {
        const appdata = process.env.APPDATA ?? resolve(homedir(), 'AppData', 'Roaming')
        return resolve(appdata, 'PulseSync', 'addons')
    }

    if (platform === 'darwin') {
        return resolve(homedir(), 'Library', 'Application Support', 'PulseSync', 'addons')
    }

    // Linux
    const xdgConfig = process.env.XDG_CONFIG_HOME ?? resolve(homedir(), '.config')
    return resolve(xdgConfig, 'PulseSync', 'addons')
}
