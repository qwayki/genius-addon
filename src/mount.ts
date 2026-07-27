// src/mount.ts
// @ts-ignore
import addonConfig from '../addon.config.mjs'
import { readBooleanSetting, readStringSetting, readNumberSetting } from './pulsesync'
import { searchArtist, fetchTrackInfo, searchAlbum } from './genius/api'
import { renderArtistBio, renderTrackAbout, removeBlock, renderLoading, setEmpty, renderAlbumDesc, renderNoToken } from './genius/ui'
import { handleLyrics, removeLyricsBlock, type LyricsSource } from './genius/lyrics'
import { log } from './logger'

function getSettings() {
    return window.pulsesyncApi?.getSettings(addonConfig.name).getCurrent() ?? {}
}

function getToken(): string {
    return readStringSetting(getSettings(), 'geniusToken', '')
}

function getLyricsSource(): LyricsSource {
    const settings = getSettings()
    const val = readStringSetting(settings, 'lyricsSource', '2')
    const map: Record<string, LyricsSource> = {
        '1': 'yandex',
        '2': 'fallback',
        '3': 'genius',
    }
    return map[val] ?? 'fallback'
}

// ─── Observer: биография артиста ─────────────────────────────────────────

function mountArtistObserver(): MutationObserver {
    const observer = new MutationObserver(() => {
        const modal = document.querySelector('[data-test-id="ARTIST_ABOUT_MODAL"]') as HTMLElement | null
        if (!modal) return

        const titleEl = modal.querySelector('[data-test-id="ARTIST_ABOUT_HEADER_TITLE"]')
        const header  = modal.querySelector('[data-test-id="ARTIST_ABOUT_HEADER"]')
        if (!titleEl || !header) return

        if (modal.dataset.geniusInjected) return
        modal.dataset.geniusInjected = 'true'

        const settings = getSettings()
        if (!readBooleanSetting(settings, 'showArtistBio', true)) return

        const token = getToken()
        if (!token) {
            renderNoToken(header as HTMLElement, 'genius-info-bio', 'Биография')
            return
        }

        const artistName = titleEl.textContent?.trim() ?? ''
        const maxLen = readNumberSetting(settings, 'bioMaxLength', 600)

        const block = renderLoading(header as HTMLElement, 'genius-info-bio', 'Биография')
    
        log('Searching artist:', artistName)
        searchArtist(token, artistName).then(artist => {
            log('Artist result:', artist?.name ?? null)
            if (!artist) {
                setEmpty(block)
                return
            }
            renderArtistBio(artist, maxLen, header as HTMLElement, artistName)
        })
    })

    observer.observe(document.body, { childList: true, subtree: true })
    return observer
}

// ─── Observer: трек (описание + текст) ───────────────────────────────────

function mountTrackObserver(): MutationObserver {
    const observer = new MutationObserver(() => {
        const trackPage = document.querySelector('[data-test-id="TRACK_PAGE"]') as HTMLElement | null
        if (!trackPage) return

        const entityHeader = trackPage.querySelector('[data-test-id="ENTITY_HEADER"]') as HTMLElement | null
        if (!entityHeader) {
            log('ENTITY_HEADER not found yet, waiting...')
            return
        }

        const titleEl = entityHeader.querySelector('[data-test-id="ENTITY_TITLE"]')
        const artistEls = Array.from(entityHeader.querySelectorAll('[data-test-id="SEPARATED_ARTIST_TITLE"]'))
        const artistName = artistEls.map(el => el.textContent?.trim()).filter(Boolean).join(', ')

        if (!titleEl || !artistName) return

        const settings = getSettings()

        const titleClone = titleEl?.cloneNode(true) as HTMLElement
        titleClone?.querySelector('[data-test-id="ENTITY_VERSION"]')?.remove()
        const trackTitle = titleClone?.textContent?.trim() ?? ''
        const currentKey = `${trackTitle}__${artistName}`

        if (trackPage.dataset.geniusKey === currentKey) return
        trackPage.dataset.geniusKey = currentKey

        removeLyricsBlock()

        const anchor = entityHeader
        const token = getToken()
        const lyricsSource = getLyricsSource()

        // ─── Описание трека + текст ─────────────────────────────────────
        const showTrackInfo = readBooleanSetting(settings, 'showTrackInfo', true)
        const wantsLyrics = lyricsSource !== 'yandex'

        // fetchTrackInfo нужен для обоих блоков (у текста источник URL — найденный трек),
        // раньше при showTrackInfo+wantsLyrics он всё равно вызывался только один раз,
        // но структура была продублирована на два одинаковых блока — свели в один запрос
        const trackInfoPromise = token && (showTrackInfo || wantsLyrics)
            ? fetchTrackInfo(token, trackTitle, artistName)
            : null

        if (showTrackInfo) {
            if (!token) {
                renderNoToken(anchor, 'genius-info-track', 'О треке')
            } else {
                log('Fetching track-info:', trackTitle, '—', artistName)
                removeBlock('genius-info-track')
                removeBlock('genius-info-empty')
                const block = renderLoading(anchor, 'genius-info-track', 'О треке')
                const maxLen = readNumberSetting(settings, 'trackMaxLength', 600)

                trackInfoPromise!.then(data => {
                    if (!data) { setEmpty(block); return }
                    renderTrackAbout(data, anchor, maxLen, trackTitle, artistName)
                })
            }
        }

        // handleLyrics вызываем сразу — он сам покажет шиммер синхронно,
        // а URL с Genius (из trackInfoPromise) подтянется параллельно
        if (wantsLyrics && trackInfoPromise) {
            handleLyrics(trackPage, lyricsSource, trackInfoPromise.then(data => data?.url ?? null))
        }
    })

    observer.observe(document.body, { childList: true, subtree: true })
    return observer
}

// ─── Observer: альбом ─────────────────────────────────────────────────────

function mountAlbumObserver(): MutationObserver {
    const observer = new MutationObserver(() => {
        const albumPage = document.querySelector('[data-test-id="ALBUM_PAGE"]') as HTMLElement | null
        if (!albumPage) return
        const entityHeader = albumPage.querySelector('[data-test-id="ENTITY_HEADER"]') as HTMLElement | null
        if (!entityHeader) return
        const trackCount = albumPage.querySelectorAll('[data-test-id="TRACK_ALBUM"]').length
        if (trackCount <= 1) return

        const titleEl = entityHeader.querySelector('[data-test-id="ENTITY_TITLE"]')
        const artistEls = Array.from(entityHeader.querySelectorAll('[data-test-id="SEPARATED_ARTIST_TITLE"]'))
        const artistName = artistEls.map(el => el.textContent?.trim()).filter(Boolean).join(', ')
        if (!titleEl || !artistName) return

        const albumTitle = titleEl.textContent?.trim() ?? ''
        const currentKey = `${albumTitle}__${artistName}`
        if (albumPage.dataset.geniusKey === currentKey) return
        albumPage.dataset.geniusKey = currentKey

        const settings = getSettings()
        if (!readBooleanSetting(settings, 'showAlbumDesc', true)) return
        const token = getToken()
        if (!token) {
            renderNoToken(entityHeader, 'genius-info-album', 'Об альбоме', true)
            return
        }

        log('Fetching album:', albumTitle, '—', artistName)
        removeBlock('genius-info-album')
        const block = renderLoading(entityHeader, 'genius-info-album', 'Об альбоме', true)

        searchAlbum(token, albumTitle, artistName).then(album => {
            if (!album) { setEmpty(block); return }
            renderAlbumDesc(album, entityHeader, albumTitle, artistName)
        })
    })
    observer.observe(document.body, { childList: true, subtree: true })
    return observer
}

// ─── Точка входа ──────────────────────────────────────────────────────────

export function mount(): void {
    const observers = [
        mountArtistObserver(),
        mountTrackObserver(),
        mountAlbumObserver()
    ]
    window.addEventListener('pagehide', () => observers.forEach(o => o.disconnect()))
    log('Mounted')
}
