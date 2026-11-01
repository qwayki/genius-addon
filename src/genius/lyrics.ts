// src/genius/lyrics.ts
import { log } from '../logger'
import { fetchLyrics, getLastError, getErrorMessage } from './api'
import { createInfoBlock, buildSkeletonBadge, buildSkeletonLines, removeBlock, attachLyricsContextMenu } from './ui'
import { injectContextMenuStyles } from './styles'

const BLOCK_ID = 'genius-info-lyrics'
const SHIMMER_SELECTOR = '[class*="TrackModalLyricsShimmer_root"]'
const LYRICS_SELECTOR = '[data-test-id="TRACK_PAGE_LYRICS"]'
const ALBUM_SELECTOR = '[data-test-id="TRACK_PAGE_ALBUM"]'

export type LyricsSource = 'yandex' | 'fallback' | 'genius'

let currentCancel: (() => void) | null = null

export function removeLyricsBlock() {
    currentCancel?.()
    currentCancel = null
    removeBlock(BLOCK_ID)
}

function createBlock(): HTMLElement {
    const block = createInfoBlock(BLOCK_ID, 'Текст')
    block.classList.add('genius-info-lyrics')
    return block
}

function setLoading(block: HTMLElement): void {
    const header = block.querySelector('.genius-info-block__header') as HTMLElement
    header.appendChild(buildSkeletonBadge())

    const body = document.createElement('div')
    body.className = 'genius-info-block__body'
    body.appendChild(buildSkeletonLines(4, '60%'))
    block.appendChild(body)
}

// html — уже безопасная строка из fetchLyrics (экранированный текст + <b>/<i>)
function setContent(block: HTMLElement, html: string, url: string): void {
    injectContextMenuStyles()
    block.querySelector('.genius-skeleton-badge')?.remove()
    block.querySelector('.genius-info-block__body')?.remove()

    const body = document.createElement('div')
    body.className = 'genius-info-block__body'

    const p = document.createElement('p')
    p.className = 'genius-info-lyrics__text'
    p.innerHTML = html
    body.appendChild(p)
    block.appendChild(body)

    attachLyricsContextMenu(block, url, html)
}

function setEmpty(block: HTMLElement): void {
    block.querySelector('.genius-skeleton-badge')?.remove()
    block.querySelector('.genius-info-block__body')?.remove()

    const body = document.createElement('div')
    body.className = 'genius-info-block__body'
    const p = document.createElement('p')
    p.className = 'genius-info-block__text'

    const error = getLastError()
    p.textContent = error ? getErrorMessage(error) : 'Текст не найден на Genius'

    body.appendChild(p)
    block.appendChild(body)
}

// вставляем после альбома — фиксированная позиция, не зависим от ЯМ блока
function insertAfterAlbum(block: HTMLElement, trackPage: HTMLElement): void {
    const album = trackPage.querySelector(ALBUM_SELECTOR)
    if (album) {
        album.insertAdjacentElement('afterend', block)
    } else {
        const content = trackPage.querySelector('[data-test-id="TRACK_PAGE_CONTENT"]')
        content?.insertAdjacentElement('afterbegin', block)
    }
}

// прячем ЯМ блок когда он появится (или сразу если уже есть)
function hideYamWhenAppears(trackPage: HTMLElement): () => void {
    const existing = trackPage.querySelector(LYRICS_SELECTOR) as HTMLElement | null
    if (existing) {
        existing.style.display = 'none'
        return () => {}
    }
    const obs = new MutationObserver(() => {
        const el = trackPage.querySelector(LYRICS_SELECTOR) as HTMLElement | null
        if (!el) return
        obs.disconnect()
        el.style.display = 'none'
    })
    obs.observe(trackPage, { childList: true, subtree: true })
    return () => obs.disconnect()
}

// показываем ЯМ блок обратно если он есть
function showYam(trackPage: HTMLElement): void {
    const el = trackPage.querySelector(LYRICS_SELECTOR) as HTMLElement | null
    if (el) el.style.display = ''
}

// ждём пока шимер пропадёт
function waitForShimmerGone(
    trackPage: HTMLElement,
    onGone: (hasLyrics: boolean) => void
): () => void {
    const shimmer = trackPage.querySelector(SHIMMER_SELECTOR)
    if (!shimmer) {
        const hasLyrics = !!trackPage.querySelector(LYRICS_SELECTOR)
        onGone(hasLyrics)
        return () => {}
    }

    const obs = new MutationObserver(() => {
        const s = trackPage.querySelector(SHIMMER_SELECTOR)
        if (s) return
        obs.disconnect()
        const hasLyrics = !!trackPage.querySelector(LYRICS_SELECTOR)
        onGone(hasLyrics)
    })
    obs.observe(trackPage, { childList: true, subtree: true })
    return () => obs.disconnect()
}

// geniusUrl принимает и готовое значение, и промис — так вызывающий код (mount.ts)
// может отрисовать лоадер/шиммер сразу, не дожидаясь резолва fetchTrackInfo
// (раньше блок текста создавался только внутри .then(), из-за чего шиммер
// появлялся заметно позже, чем шиммер блока "О треке")
export async function handleLyrics(
    trackPage: HTMLElement,
    source: LyricsSource,
    geniusUrl: string | null | Promise<string | null>,
): Promise<void> {
    removeLyricsBlock()

    if (source === 'yandex') return

    let cancelled = false
    currentCancel = () => { cancelled = true }

    if (source === 'fallback') {
        // ждём шимер ЯМ — если он сам нашёл текст, ничего не делаем
        const cancelWait = waitForShimmerGone(trackPage, async (hasLyrics) => {
            if (cancelled) return
            if (hasLyrics) {
                log('[lyrics] fallback: ЯМ текст есть, пропускаем')
                return
            }
            log('[lyrics] fallback: ЯМ текста нет, берём с Genius')
            const block = createBlock()
            setLoading(block)
            insertAfterAlbum(block, trackPage)

            const url = await geniusUrl
            if (cancelled) return
            if (!url) { setEmpty(block); return }

            const text = await fetchLyrics(url)
            if (cancelled) return
            if (text) setContent(block, text, url)
            else setEmpty(block)
        })
        currentCancel = () => { cancelled = true; cancelWait() }
        return
    }

    // source === 'genius'
    // вставляем лоадер сразу в фиксированное место, не дожидаясь URL с Genius
    const block = createBlock()
    setLoading(block)
    insertAfterAlbum(block, trackPage)

    // прячем ЯМ блок когда появится
    const cancelHide = hideYamWhenAppears(trackPage)
    currentCancel = () => { cancelled = true; cancelHide() }

    const url = await geniusUrl
    if (cancelled) return

    if (!url) {
        log('[lyrics] no genius url, skip')
        cancelHide()
        removeLyricsBlock()
        showYam(trackPage)
        return
    }

    const text = await fetchLyrics(url)
    if (cancelled) return

    if (text) {
        setContent(block, text, url)
    } else {
        // не нашли — убираем наш блок, показываем ЯМ
        log('[lyrics] genius: текст не найден, показываем ЯМ')
        cancelHide()
        removeLyricsBlock()
        showYam(trackPage)
    }
}

// возвращаем ЯМ-блок текста, если мы его прятали (режим «Всегда Genius»); нужен при выключении аддона
export function restoreYamLyrics(): void {
    document.querySelectorAll<HTMLElement>(LYRICS_SELECTOR).forEach(el => { el.style.display = '' })
}
