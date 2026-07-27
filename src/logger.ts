// src/logger.ts

let _devMode = false

export function setDevMode(enabled: boolean): void {
    _devMode = enabled
}

export function log(...args: unknown[]): void {
    if (_devMode) console.log('[genius-info]', ...args)
}