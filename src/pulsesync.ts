// src/pulsesync.ts
// Обёртки над window.pulsesyncApi.
// Типы описаны локально — без зависимости от приватного @pulsesync/yamusic-types.

// ─── Локальные типы (совместимы с реальным API PulseSync) ─────────────────

type AddonSettingValue<T> = { value?: T; default?: T }
type AddonSettings = Record<string, AddonSettingValue<unknown> | unknown>

export interface AddonSettingsStore {
    getCurrent: () => AddonSettings
    onChange: (cb: (settings: AddonSettings) => void) => () => void
}

// ─── Хелперы ──────────────────────────────────────────────────────────────

function unwrapSetting<T>(entry: AddonSettingValue<T> | unknown, fallback: T): T {
    if (entry && typeof entry === 'object' && !Array.isArray(entry)) {
        const rec = entry as AddonSettingValue<T>
        if (typeof rec.value !== 'undefined') return rec.value
        if (typeof rec.default !== 'undefined') return rec.default
    }
    return typeof entry !== 'undefined' ? (entry as T) : fallback
}

export function getAddonSettings(addonName: string): AddonSettingsStore {
    return (
        window.pulsesyncApi?.getSettings(addonName) ?? {
            getCurrent: () => ({}),
            onChange: () => () => {},
        }
    )
}

export function readBooleanSetting(s: AddonSettings, key: string, fallback: boolean): boolean {
    return Boolean(unwrapSetting(s[key], fallback))
}

export function readStringSetting(s: AddonSettings, key: string, fallback: string): string {
    return String(unwrapSetting(s[key], fallback))
}

export function readNumberSetting(s: AddonSettings, key: string, fallback: number): number {
    const v = unwrapSetting<number>(s[key], fallback)
    return typeof v === 'number' ? v : Number(v)
}
