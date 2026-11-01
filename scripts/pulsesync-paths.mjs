import { resolve } from 'path'
import { homedir } from 'os'
import { existsSync } from 'fs'

export function getPulseSyncAddonsDir() {
    if (process.env.PULSESYNC_ADDONS_DIR) {
        return process.env.PULSESYNC_ADDONS_DIR
    }
    const platform = process.platform
    if (platform === 'win32') {
        return resolve(process.env.APPDATA ?? '', 'PulseSync', 'addons')
    }
    if (platform === 'darwin') {
        return resolve(homedir(), 'Library', 'Application Support', 'PulseSync', 'addons')
    }
    const xdg = process.env.XDG_CONFIG_HOME
    return xdg
        ? resolve(xdg, 'PulseSync', 'addons')
        : resolve(homedir(), '.config', 'PulseSync', 'addons')
}
