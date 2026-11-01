// src/mount.ts
import type { AddonApi } from '@pulsesync/addon-sdk'
import { settings } from './settings'
import { searchArtist, fetchTrackInfo, searchAlbum } from './genius/api'
import { renderArtistBio, renderTrackAbout, removeBlock, renderLoading, setEmpty, renderAlbumDesc, renderNoToken } from './genius/ui'
import { handleLyrics, removeLyricsBlock, restoreYamLyrics, type LyricsSource } from './genius/lyrics'
import { log } from './logger'

// Запускает check при каждой мутации DOM (и один раз сразу — вдруг нужная страница уже открыта)
function watchDom(api: AddonApi, check: () => void): void {
    const observer = new MutationObserver(check)
    observer.observe(document.body, { childList: true, subtree: true })
    api.onCleanup(() => observer.disconnect())
    check()
}

// ─── Биография артиста ───────────────────────────────────────────────────

function mountArtistObserver(api: AddonApi): void {
    watchDom(api, () => {
        const modal = document.querySelector('[data-test-id="ARTIST_ABOUT_MODAL"]') as HTMLElement | null
        if (!modal) return

        const titleEl = modal.querySelector('[data-test-id="ARTIST_ABOUT_HEADER_TITLE"]')
        const header  = modal.querySelector('[data-test-id="ARTIST_ABOUT_HEADER"]')
        if (!titleEl || !header) return

        if (modal.dataset.geniusInjected) return
        modal.dataset.geniusInjected = 'true'

        if (!settings.store.showArtistBio) return

        const token = settings.store.geniusToken
        if (!token) {
            renderNoToken(header as HTMLElement, 'genius-info-bio', 'Биография')
            return
        }

        const artistName = titleEl.textContent?.trim() ?? ''
        const maxLen = settings.store.bioMaxLength

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
}

// ─── Трек (описание + текст) ─────────────────────────────────────────────

function mountTrackObserver(api: AddonApi): void {
    watchDom(api, () => {
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

        const titleClone = titleEl?.cloneNode(true) as HTMLElement
        titleClone?.querySelector('[data-test-id="ENTITY_VERSION"]')?.remove()
        const trackTitle = titleClone?.textContent?.trim() ?? ''
        const currentKey = `${trackTitle}__${artistName}`

        if (trackPage.dataset.geniusKey === currentKey) return
        trackPage.dataset.geniusKey = currentKey

        removeLyricsBlock()

        const anchor = entityHeader
        const token = settings.store.geniusToken
        const lyricsSource = settings.store.lyricsSource as LyricsSource

        // ─── Описание трека + текст ─────────────────────────────────────
        const showTrackInfo = settings.store.showTrackInfo
        const wantsLyrics = lyricsSource !== 'yandex'

        // fetchTrackInfo нужен для обоих блоков (у текста источник URL — найденный трек),
        // поэтому запрос один на оба
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
                const maxLen = settings.store.trackMaxLength

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
}

// ─── Альбом ──────────────────────────────────────────────────────────────

function mountAlbumObserver(api: AddonApi): void {
    watchDom(api, () => {
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

        if (!settings.store.showAlbumDesc) return
        const token = settings.store.geniusToken
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
}

// ─── Точка входа и уборка ────────────────────────────────────────────────

export function mount(api: AddonApi): void {
    mountArtistObserver(api)
    mountTrackObserver(api)
    mountAlbumObserver(api)
    log('Mounted')
}

// Убирает всё, что аддон добавил в страницу: блоки, стили, меню и служебные data-флаги
// (без флагов после повторного включения блоки не отрисовались бы заново)
export function cleanupInjected(): void {
    removeLyricsBlock()
    restoreYamLyrics()
    document.querySelectorAll('[id^="genius-info-"]').forEach(el => el.remove())
    document.querySelectorAll('.genius-menu__wrapper').forEach(el => el.remove())
    document.querySelectorAll<HTMLElement>('[data-genius-injected], [data-genius-key]').forEach(el => {
        delete el.dataset.geniusInjected
        delete el.dataset.geniusKey
    })
}
