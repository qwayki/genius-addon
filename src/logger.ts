// src/logger.ts
let _devMode = false

export function setDevMode(enabled: boolean): void {
    _devMode = enabled
}

const LOG_STYLE = 'background:#ffff64;color:#121212;padding:2px 4px;border-radius:4px;font-weight:700'

export function log(...args: unknown[]): void {
    if (!_devMode) return
    console.log('%cGenius Info', LOG_STYLE, ...args)
}