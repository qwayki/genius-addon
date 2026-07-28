// src/genius/ui.ts

import type { GeniusArtist, GeniusAlbum, TrackInfo } from './api'
import { normalize, getLastError, getErrorMessage } from './api'

export function removeBlock(id: string) {
    document.getElementById(id)?.remove()
}

const GENIUS_ICON_SVG = `<img class="genius-info-block__badge-icon" src="https://genius.com/favicon.ico" style="height:16px;width:16px;"/>`

const EASING = 'cubic-bezier(0.4, 0, 0.2, 1)'

function animateHeight(el: HTMLElement, fromH: number, toH: number, duration = 300, onfinish?: () => void): Animation {
    el.style.overflow = 'hidden'
    const anim = el.animate(
        [{ height: fromH + 'px' }, { height: toH + 'px' }],
        { duration, easing: EASING, fill: 'none' }
    )
    anim.onfinish = () => {
        el.style.overflow = ''
        onfinish?.()
    }
    return anim
}

function getHeight(el: HTMLElement): number {
    el.style.height = 'auto'
    const h = el.scrollHeight
    el.style.height = ''
    return h
}

// Общий каркас блока (шапка + h2), переиспользуется всеми модулями (в т.ч. lyrics.ts)
export function createInfoBlock(id: string, title: string): HTMLElement {
    removeBlock(id)

    const block = document.createElement('div')
    block.id = id
    block.className = 'genius-info-block'

    const header = document.createElement('div')
    header.className = 'genius-info-block__header'

    const h2 = document.createElement('h2')
    h2.className = 'genius-info-block__title'
    h2.textContent = title
    header.appendChild(h2)

    block.appendChild(header)
    return block
}

export function setBadge(block: HTMLElement, url: string): void {
    block.querySelector('.genius-skeleton-badge')?.remove()
    block.querySelector('.genius-info-block__badge')?.remove()
    const header = block.querySelector('.genius-info-block__header')!
    const badge = document.createElement('a')
    badge.className = 'genius-info-block__badge'
    badge.href = url
    badge.target = '_blank'
    badge.rel = 'noopener noreferrer'
    badge.innerHTML = `${GENIUS_ICON_SVG}Открыть на Genius ↗`
    header.appendChild(badge)
}

// ─── Скелетоны загрузки ───────────────────────────────────────────────────
// Раньше в двух местах (тут и в lyrics.ts) была своя копия этой разметки,
// и в бейдже был лишний вложенный div с инлайн-размером (120×16) внутри
// родителя 110×14 — он не рисовался (без фона), просто вылезал за границы
// родителя и ломал геометрию хедера. Теперь один div = один узел = один размер.
export function buildSkeletonBadge(): HTMLElement {
    const badge = document.createElement('div')
    badge.className = 'genius-skeleton-badge'
    return badge
}

export function buildSkeletonLines(count: number, lastLineWidth = '100%'): HTMLElement {
    const skeleton = document.createElement('div')
    skeleton.className = 'genius-skeleton'
    for (let i = 0; i < count; i++) {
        const line = document.createElement('div')
        if (i === count - 1) line.style.width = lastLineWidth
        skeleton.appendChild(line)
    }
    return skeleton
}

// ─── Построение body с текстом и кнопкой ─────────────────────────────────

function buildBody(text: string, maxLen: number, collapsible: boolean): HTMLElement {
    const body = document.createElement('div')
    body.className = 'genius-info-block__body'

    const truncated = maxLen > 0 && text.length > maxLen + 50
    const p = document.createElement('p')
    p.className = 'genius-info-block__text'
    p.appendChild(linkify(truncated ? text.slice(0, maxLen).trimEnd() + '…' : text))
    body.appendChild(p)

    if (truncated) {
        const btn = document.createElement('button')
        btn.className = 'genius-info-block__toggle'
        const label = document.createElement('span')
        label.textContent = 'Показать полностью'
        btn.appendChild(label)
        let expanded = false
        let collapsedH = 0

        btn.onclick = () => {
            if (!collapsedH) collapsedH = body.scrollHeight
            const fromH = body.scrollHeight
            expanded = !expanded

            if (expanded) {
                p.innerHTML = ''
                p.appendChild(linkify(text))
                label.textContent = 'Свернуть'
                const toH = body.scrollHeight
                animateHeight(body, fromH, toH)
            } else {
                const anim = animateHeight(body, fromH, collapsedH)
                anim.onfinish = () => {
                    p.innerHTML = ''
                    p.appendChild(linkify(text.slice(0, maxLen).trimEnd() + '…'))
                    label.textContent = 'Показать полностью'
                }
            }
        }
        body.appendChild(btn)
    }

    if (collapsible) {
        body.style.height = '0'
        body.style.overflow = 'hidden'
    }

    return body
}

// ─── Общий рендер текстового блока ───────────────────────────────────────

interface TextBlockOptions {
    id: string
    title: string
    text: string
    url: string
    anchor: HTMLElement
    maxLen?: number
    collapsible?: boolean
}

function renderTextBlock({ id, title, text, url, anchor, maxLen = 0, collapsible = false }: TextBlockOptions): void {
    let block = document.getElementById(id)
    if (!block) {
        block = createInfoBlock(id, title)
        anchor.insertAdjacentElement('afterend', block)
    }

    setBadge(block, url)

    const newBody = buildBody(text, maxLen, collapsible)
    const oldBody = block.querySelector('.genius-info-block__body') as HTMLElement | null

    if (collapsible) {
        oldBody ? oldBody.replaceWith(newBody) : block.appendChild(newBody)
        return
    }

    if (oldBody) {
        const fromH = oldBody.scrollHeight
        oldBody.replaceWith(newBody)
        const toH = newBody.scrollHeight
        animateHeight(newBody, fromH, toH)
    } else {
        block.appendChild(newBody)
        const toH = newBody.scrollHeight
        animateHeight(newBody, 0, toH)
    }
}

// ─── Публичные функции ────────────────────────────────────────────────────

function appendFoundNote(blockId: string, foundName: string, foundSub?: string): void {
    const block = document.getElementById(blockId)
    if (!block) return
    const body = block.querySelector('.genius-info-block__body')
    if (!body) return
    const note = document.createElement('p')
    note.className = 'genius-info-block__found-note'
    note.textContent = foundSub ? `Найдено: "${foundName}" — ${foundSub}` : `Найдено: "${foundName}"`
    body.appendChild(note)
}

export function renderArtistBio(artist: GeniusArtist, maxLen: number, anchor: HTMLElement, originalArtist: string): void {
    const raw = artist.description?.plain?.trim()
    const text = (!raw || raw === '?') ? 'Описание ещё не добавлено' : raw
    renderTextBlock({ id: 'genius-info-bio', title: 'Биография', text, url: artist.url, anchor, maxLen })

    if (normalize(artist.name) !== normalize(originalArtist))
        appendFoundNote('genius-info-bio', artist.name)
}

export function renderTrackAbout(data: TrackInfo, anchor: HTMLElement, maxLen: number, originalTitle: string, originalArtist: string): void {
    const desc = data.description === '?' ? 'Описание ещё не добавлено' : data.description
    renderTextBlock({ id: 'genius-info-track', title: 'О треке', text: desc, url: data.url, anchor, maxLen })

    const titleMatch = normalize(data.foundTitle) === normalize(originalTitle)
    const artistMatch = originalArtist
        .split(',').map(a => normalize(a.trim()))
        .some(a => a.includes(normalize(data.foundArtist)) || normalize(data.foundArtist).includes(a))

    if (!titleMatch || !artistMatch)
        appendFoundNote('genius-info-track', data.foundTitle, data.foundArtist)
}

export function renderAlbumDesc(album: GeniusAlbum, anchor: HTMLElement, originalAlbum: string, originalArtist: string): void {
    const text = album.description_annotation?.annotations?.[0]?.body?.plain?.trim() || 'Описание ещё не добавлено'
    renderTextBlock({ id: 'genius-info-album', title: 'Об альбоме', text, url: album.url, anchor, collapsible: true })
    initCollapsible('genius-info-album')

    if (normalize(album.name) !== normalize(originalAlbum))
        appendFoundNote('genius-info-album', album.name)
}

// ─── Утилиты ─────────────────────────────────────────────────────────────

export function renderLoading(afterEl: HTMLElement, id: string, title: string, collapsed = false) {
    // createInfoBlock уже сам делает removeBlock(id), второй вызов был лишним
    const block = createInfoBlock(id, title)

    const header = block.querySelector('.genius-info-block__header') as HTMLElement
    header.appendChild(buildSkeletonBadge())

    if (!collapsed) {
        const body = document.createElement('div')
        body.className = 'genius-info-block__body'
        body.appendChild(buildSkeletonLines(3, '60%'))
        block.appendChild(body)
    }

    afterEl.insertAdjacentElement('afterend', block)
    return block
}

export function setEmpty(block: HTMLElement) {
    block.querySelector('.genius-skeleton-badge')?.remove()

    let body = block.querySelector('.genius-info-block__body') as HTMLElement | null
    if (!body) {
        body = document.createElement('div')
        body.className = 'genius-info-block__body'
        block.appendChild(body)
    }

    body.innerHTML = ''
    const p = document.createElement('p')
    p.className = 'genius-info-block__text'

    const error = getLastError()
    p.textContent = error ? getErrorMessage(error) : 'Ничего не найдено ＞︿＜'

    body.appendChild(p)
}

export function renderNoToken(anchor: HTMLElement, id: string, title: string, collapsible = false): void {
    removeBlock(id)
    const block = createInfoBlock(id, title)
    anchor.insertAdjacentElement('afterend', block)

    const body = document.createElement('div')
    body.className = 'genius-info-block__body'
    if (collapsible) {
        body.style.height = '0'
        body.style.overflow = 'hidden'
    }
    body.innerHTML = `
        <div style="display:flex;align-items:center;gap:10px;padding:8px 0;">
            <span style="font-size:20px;">🔑</span>
            <div>
                <div style="font-size:14px;font-weight:500;color:#ccc;">Био недоступно</div>
                <div style="font-size:12px;color:#888;">Укажите токен Genius в настройках аддона</div>
            </div>
        </div>
    `
    block.appendChild(body)
    if (collapsible) initCollapsible(id)
}

// ─── Коллапс альбома ──────────────────────────────────────────────────────

export function initCollapsible(blockId: string): void {
    const block = document.getElementById(blockId)
    if (!block) return
    const header = block.querySelector('.genius-info-block__header') as HTMLElement
    const h2 = block.querySelector('.genius-info-block__title') as HTMLElement
    const badge = block.querySelector('.genius-info-block__badge') as HTMLElement | null
    const body = block.querySelector('.genius-info-block__body') as HTMLElement

    const arrow = document.createElement('span')
    arrow.className = 'genius-info-block__arrow'
    arrow.textContent = '›'
    arrow.style.transform = 'rotate(0deg)'
    h2.prepend(arrow)

    let collapsed = true
    let currentAnim: Animation | null = null

    header.onclick = () => {
        collapsed = !collapsed
        currentAnim?.cancel()

        const fromH = collapsed ? body.scrollHeight : 0
        const toH = collapsed ? 0 : getHeight(body)

        currentAnim = animateHeight(body, fromH, toH, 300, () => {
            if (collapsed) {
                body.style.height = '0'
                body.style.overflow = 'hidden'
            } else {
                body.style.height = ''
            }
            currentAnim = null
        })

        arrow.style.transform = collapsed ? 'rotate(0deg)' : 'rotate(90deg)'
    }
    badge?.addEventListener('click', e => e.stopPropagation())
}

// ─── Контекстное меню для блока «Текст» ──────────────────────────────────

function ymIcon(id: string): string {
    return `<svg class="genius-menu__item-icon" aria-hidden="true"><use href="/icons/sprite.svg#${id}"/></svg>`
}

export function attachLyricsContextMenu(block: HTMLElement, url: string, html: string): void {
    block.querySelector('.genius-info-block__menu-btn')?.remove()
    block.querySelector('.genius-info-block__badge')?.remove()

    const header = block.querySelector('.genius-info-block__header') as HTMLElement

    const btn = document.createElement('button')
    btn.className = 'genius-info-block__menu-btn'
    btn.setAttribute('aria-label', 'Меню')
    btn.innerHTML = `<svg style="width:1.25rem;height:1.25rem;fill:currentColor"><use href="/icons/sprite.svg#more_xxs"/></svg>`
    header.appendChild(btn)

    let menu: HTMLElement | null = null

    const closeMenu = () => {
        if (!menu) return
        menu.style.opacity = '0'
        const dying = menu
        menu = null
        document.removeEventListener('click', onOutsideClick, true)
        window.removeEventListener('scroll', closeMenu, true)
        setTimeout(() => dying.remove(), 150)
    }

    const onOutsideClick = (e: MouseEvent) => {
        if (menu && !menu.contains(e.target as Node) && !btn.contains(e.target as Node)) {
            closeMenu()
        }
    }

    btn.addEventListener('click', (e) => {
        e.stopPropagation()

        if (menu) {
            closeMenu()
            return
        }

        // Wrapper как у ЯМ (верхний уровень)
        menu = document.createElement('div')
        menu.className = 'genius-menu__wrapper'
        menu.setAttribute('role', 'menu')
        menu.setAttribute('tabindex', '0')
        menu.style.opacity = '0'
        menu.style.transition = 'opacity 0.15s ease'

        // ─── Открыть в Genius ───
        const itemGenius = document.createElement('button')
        itemGenius.className = 'genius-menu__item'
        itemGenius.setAttribute('type', 'button')
        itemGenius.setAttribute('role', 'menuitem')
        itemGenius.setAttribute('tabindex', '-1')

        const geniusContent = document.createElement('span')
        geniusContent.className = 'genius-menu__item-content'
        geniusContent.innerHTML = `${ymIcon('link_xxs')}Открыть в Genius`
        itemGenius.appendChild(geniusContent)
        itemGenius.addEventListener('click', () => {
            window.open(url, '_blank', 'noopener,noreferrer')
            closeMenu()
        })

        // ─── Скопировать текст ───
        const itemCopy = document.createElement('button')
        itemCopy.className = 'genius-menu__item'
        itemCopy.setAttribute('type', 'button')
        itemCopy.setAttribute('role', 'menuitem')
        itemCopy.setAttribute('tabindex', '-1')

        const copyContent = document.createElement('span')
        copyContent.className = 'genius-menu__item-content'
        copyContent.innerHTML = `${ymIcon('lyrics_xxs')}Скопировать текст`
        itemCopy.appendChild(copyContent)
        itemCopy.addEventListener('click', () => {
            const tmp = document.createElement('div')
            tmp.innerHTML = html
            navigator.clipboard.writeText(tmp.innerText).catch(() => {})
            closeMenu()
        })

        // ─── Toggle-пункты (WIP, disabled) ───
        const toggleLabels = ['Отображать аннотации', 'Отображать артистов', 'Отображать теги']
        const toggleEls = toggleLabels.map(label => {
            const item = document.createElement('button')
            item.className = 'genius-menu__item'
            item.setAttribute('type', 'button')
            item.setAttribute('role', 'menuitemcheckbox')
            item.setAttribute('aria-checked', 'false')
            item.setAttribute('tabindex', '-1')
            item.disabled = true

            const content = document.createElement('span')
            content.className = 'genius-menu__item-content'
            content.innerHTML = `
                <span style="flex:1;text-align:left;">${label}</span>
                <span class="genius-menu__toggle" aria-hidden="true">
                    <svg width="32" height="18" viewBox="0 0 32 18" style="display:block;opacity:0.25">
                        <rect x="1" y="1" width="30" height="16" rx="8" fill="none" stroke="currentColor" stroke-width="1.5"/>
                        <circle cx="9" cy="9" r="5" fill="currentColor"/>
                    </svg>
                </span>`
            item.appendChild(content)
            return item
        })

        menu.appendChild(itemGenius)
        menu.appendChild(itemCopy)
        toggleEls.forEach(el => menu.appendChild(el))

        document.body.appendChild(menu)

        const btnRect = btn.getBoundingClientRect()
        const menuW = menu.offsetWidth
        let left = btnRect.right - menuW
        if (left < 8) left = 8
        if (left + menuW > window.innerWidth - 8) left = window.innerWidth - menuW - 8
        menu.style.position = 'fixed'
        menu.style.top = `${btnRect.bottom + 6}px`
        menu.style.left = `${left}px`
        menu.style.zIndex = '9999'

        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                if (!menu) return
                menu.style.opacity = '1'
            })
        })

        document.addEventListener('click', onOutsideClick, true)
        window.addEventListener('scroll', closeMenu, { capture: true, passive: true })
    })
}

function linkify(text: string): DocumentFragment {
    const fragment = document.createDocumentFragment()
    const regex = /https?:\/\/[^\s)]+/g
    let last = 0
    let match
    while ((match = regex.exec(text)) !== null) {
        if (match.index > last) {
            fragment.appendChild(document.createTextNode(text.slice(last, match.index)))
        }
        const a = document.createElement('a')
        a.href = match[0]
        a.textContent = match[0]
        a.target = '_blank'
        a.rel = 'noopener noreferrer'
        a.className = 'genius-info-block__link'
        fragment.appendChild(a)
        last = match.index + match[0].length
    }
    if (last < text.length) {
        fragment.appendChild(document.createTextNode(text.slice(last)))
    }
    return fragment
}