// src/genius/api.ts
// Genius API клиент.
//
// CORS-решение: передаём токен через ?access_token= в URL, а не через заголовок Authorization.
// Заголовок Authorization триггерит preflight (OPTIONS), который Electron блокирует
// для кастомных origin. Query-параметр — простой GET без preflight, проходит нормально.
import { log } from '../logger'

// ─── Типы ошибок ──────────────────────────────────────────────────────────

export type FetchError = 'network' | 'unauthorized' | 'rate_limit' | 'server_error' | 'not_found' | 'blocked'
let lastError: FetchError | null = null

export function getLastError(): FetchError | null {
    return lastError
}

export function getErrorMessage(error: FetchError): string {
    switch (error) {
        case 'network':
            return 'Нет подключения к интернету'
        case 'unauthorized':
            return 'Неверный токен Genius API. Проверьте токен в настройках'
        case 'rate_limit':
            return 'Превышен лимит запросов к Genius API. Попробуйте через несколько минут'
        case 'server_error':
            return 'Ошибка сервера Genius. Попробуйте позже'
        case 'not_found':
            return 'Ничего не найдено'
        case 'blocked':
            return 'Genius временно блокирует запросы текста. Попробуйте позже'
    }
}

const CACHE_KEY = 'genius_info_v3'  // v3: единый ключ вместо одного ключа на запись
const CACHE_TTL_FOUND = 3 * 24 * 60 * 60 * 1000   // 3 дня — нашли с данными
const CACHE_TTL_EMPTY = 1 * 24 * 60 * 60 * 1000   // 1 день — нашли но пусто
const CACHE_TTL_MISS  = 12 * 60 * 60 * 1000        // 12 часов — не нашли вообще

type CacheStore = Record<string, CacheEntry<unknown>>

function readStore(): CacheStore {
    try {
        return JSON.parse(localStorage.getItem(CACHE_KEY) ?? '{}')
    } catch { return {} }
}

function writeStore(store: CacheStore): void {
    try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(store))
    } catch { /* переполнен */ }
}

export function clearCache(): void {
    localStorage.removeItem(CACHE_KEY)
}

async function geniusFetch<T>(token: string, path: string): Promise<T | null> {
    try {
        const sep = path.includes('?') ? '&' : '?'
        const url = `https://api.genius.com${path}${sep}access_token=${token}`
        const res = await fetch(url, {
            cache: 'no-store'
        })

        if (!res.ok) {
            if (res.status === 401 || res.status === 403) {
                lastError = 'unauthorized'
            } else if (res.status === 429) {
                lastError = 'rate_limit'
            } else if (res.status >= 500) {
                lastError = 'server_error'
            } else {
                lastError = 'not_found'
            }
            log('API error:', res.status)
            return null
        }

        const json = await res.json()
        lastError = null
        return json.response as T
    } catch (err) {
        log('API error:', err)
        lastError = 'network'
        return null
    }
}

async function geniusPublicFetch<T>(path: string): Promise<T | null> {
    try {
        const url = `https://genius.com/api${path}`
        const res = await fetch(url, { cache: 'no-store' })

        if (!res.ok) {
            log('Public API bad status:', res.status, path)
            if (res.status >= 500) {
                lastError = 'server_error'
            } else {
                lastError = 'not_found'
            }
            return null
        }

        const json = await res.json()
        lastError = null
        return json.response as T
    } catch (err) {
        log('Public API error:', err)
        lastError = 'network'
        return null
    }
}

// Теги, которые реально хотим сохранить (Genius оборачивает ими бэк-вокал,
// подсказки типа "(Chorus)" не трогаем — они уже вырезаны отдельным селектором).
// strong/em приводим к b/i, чтобы не плодить лишние варианты разметки.
const LYRICS_TAG_MAP: Record<string, 'b' | 'i'> = {
    B: 'b', STRONG: 'b',
    I: 'i', EM: 'i',
}

// Genius присылает описания в HTML (мы всегда запрашиваем text_format=html,
// поле plain при этом не приходит). "Пустое" описание Genius обычно кодирует
// как HTML вроде "<p>?</p>" — сравнивать сырую строку с '?' как раньше уже не работает,
// поэтому вытаскиваем текстовое содержимое и сравниваем его.
export function extractGeniusText(html?: string | null): string {
    if (!html) return ''
    const div = document.createElement('div')
    div.innerHTML = html
    return (div.textContent ?? '').replace(/\u00a0/g, ' ').trim()
}

export function isGeniusDescriptionEmpty(html?: string | null): boolean {
    const text = extractGeniusText(html)
    return !text || text === '?'
}

function escapeHtml(text: string): string {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// Рекурсивно собираем HTML из узла контейнера с лирикой:
// - <br> → перенос строки
// - h2 / [data-exclude-from-selection] (аннотации, счётчик контрибьюторов) → выкидываем целиком
// - b/i/strong/em → сохраняем как <b>/<i>
// - всё остальное (span-обёртки для подсветки аннотаций и т.п.) → разворачиваем,
//   оставляя только текст, чтобы не терять слова из-за незнакомой обёртки
function nodeToLyricsHtml(node: Node): string {
    let out = ''
    node.childNodes.forEach(child => {
        if (child.nodeType === Node.TEXT_NODE) {
            out += escapeHtml(child.textContent ?? '')
            return
        }
        if (child.nodeType !== Node.ELEMENT_NODE) return

        const el = child as HTMLElement
        if (el.tagName === 'BR') {
            out += '\n'
            return
        }
        if (el.tagName === 'H2' || el.hasAttribute('data-exclude-from-selection')) {
            return
        }
        const mapped = LYRICS_TAG_MAP[el.tagName]
        if (mapped) {
            out += `<${mapped}>${nodeToLyricsHtml(el)}</${mapped}>`
        } else {
            out += nodeToLyricsHtml(el)
        }
    })
    return out
}

// Схлопываем повторяющиеся пробелы/табы (часто остаются на стыке вырезанных
// узлов — например contributor-блока перед первой строчкой), не трогая переносы строк
function normalizeLyricsWhitespace(html: string): string {
    return html
        .replace(/\u00a0/g, ' ')
        .split('\n')
        .map(line => line.replace(/[^\S\n]+/g, ' ').trim())
        .join('\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim()
}

// Genius иногда отдаёт антибот-страницу («make sure you're a human») с 403 вместо текста.
// После первого такого ответа не долбим сайт несколько минут и не ретраим.
const BLOCK_COOLDOWN = 5 * 60 * 1000
let blockedUntil = 0
const lyricsCache = new Map<string, string>()

const LYRICS_HEADERS = {
    'accept': 'text/html,application/xhtml+xml',
    'accept-language': 'ru,en;q=0.8',
}

// Возвращает HTML-строку (только текст + <b>/<i>), готовую для innerHTML —
// весь текстовый контент экранирован в escapeHtml, теги добавляем только сами,
// так что инъекция извне невозможна.
export async function fetchLyrics(url: string): Promise<string | null> {
    const cached = lyricsCache.get(url)
    if (cached) return cached

    if (Date.now() < blockedUntil) {
        log('Lyrics: cooldown, пропускаем запрос')
        lastError = 'blocked'
        return null
    }

    try {
        const res = await fetch(url, { cache: 'no-store', headers: LYRICS_HEADERS })
        if (!res.ok) {
            log('Lyrics fetch status:', res.status, url)
            if (res.status === 403 || res.status === 429) {
                blockedUntil = Date.now() + BLOCK_COOLDOWN
                lastError = 'blocked'
            } else if (res.status >= 500) {
                lastError = 'server_error'
            } else {
                lastError = 'not_found'
            }
            return null
        }
        const html = await res.text()
        if (/make sure you.?re a human/i.test(html)) {
            log('Lyrics: антибот-страница Genius')
            blockedUntil = Date.now() + BLOCK_COOLDOWN
            lastError = 'blocked'
            return null
        }
        const doc = new DOMParser().parseFromString(html, 'text/html')
        const containers = doc.querySelectorAll('[data-lyrics-container="true"]')
        if (!containers.length) { lastError = 'not_found'; return null }

        const parts: string[] = []
        containers.forEach(el => {
            const chunk = normalizeLyricsWhitespace(nodeToLyricsHtml(el))
            if (chunk) parts.push(chunk)
        })

        const result = parts.join('\n\n').trim()
        if (!result) return null
        lastError = null
        lyricsCache.set(url, result)
        return result
    } catch (err) {
        log('Lyrics fetch error:', err)
        lastError = 'network'
        return null
    }
}

// ─── Cache ────────────────────────────────────────────────────────────────

type CacheEntry<T> = { found: true; data: T; timestamp: number; ttl: number } 
                   | { found: false; timestamp: number; ttl: number }

function cacheGet<T>(key: string): CacheEntry<T> | null {
    const store = readStore()
    const entry = store[key] as CacheEntry<T> | undefined
    if (!entry) return null
    if (Date.now() - entry.timestamp > entry.ttl) {
        delete store[key]
        writeStore(store)
        return null
    }
    return entry
}

function cacheSet<T>(key: string, entry: CacheEntry<T>): void {
    try {
        const store = readStore()
        store[key] = entry
        writeStore(store)
    } catch { /* переполнен */ }
}

function ck(...parts: string[]): string {
    return parts.join('_').toLowerCase().replace(/[^a-zа-я0-9_]/gi, '_').slice(0, 80)
}

// ─── Типы ─────────────────────────────────────────────────────────────────

export interface GeniusArtist {
    id: number
    name: string
    description: { plain?: string; html?: string; dom?: { tag: string; children: any[] } } | null
    image_url: string | null
    url: string
}

export interface GeniusAlbum {
    id: number
    name: string
    description: { plain?: string; html?: string } | null
    cover_art_url: string | null
    release_date_for_display: string | null
    url: string
    description_annotation?: {
        annotations?: Array<{
            body?: {
                plain?: string
                html?: string
            }
        }>
    }
}

export interface GeniusAnnotation {
    id: number
    body: { plain: string }
    fragment: string
}

export interface TrackInfo {
    description: string
    url: string
    foundTitle: string
    foundArtist: string
}

interface GeniusAlbumHit {
    type: string
    result: {
        id: number
        name: string
        primary_artist_names: string
        artist: { name: string }
        url: string
    }
}

export interface GeniusSong {
    id: number
    title: string
    url: string
    description?: { plain?: string; html?: string } | null
    song_art_image_url: string | null
    release_date_for_display: string | null
    primary_artist: GeniusArtist
    album?: GeniusAlbum
}

// ─── API ──────────────────────────────────────────────────────────────────

export async function searchArtist(token: string, artistName: string): Promise<GeniusArtist | null> {
    const key = ck('artist', artistName)
    const cached = cacheGet<GeniusArtist>(key)
    if (cached !== null) return cached.found ? cached.data : null

    const searchRes = await geniusFetch<{
        hits: Array<{ type: string; result: { primary_artist: GeniusArtist } }>
    }>(token, `/search?q=${encodeURIComponent(artistName)}`)

    const hits = searchRes?.hits ?? []
    const normalized = artistName.toLowerCase()

    // 1. точное совпадение имени артиста
    const exact = hits.find(h =>
        h.result.primary_artist.name.toLowerCase() === normalized
    )

    let artistId: number | undefined

    if (exact) {
        artistId = exact.result.primary_artist.id
    } else {
        const partial = hits.find(h =>
            h.result.primary_artist.name.toLowerCase().includes(normalized)
        )
        if (partial) {
            artistId = partial.result.primary_artist.id
        }
    }

    if (!artistId) {
        cacheSet(key, { found: false, timestamp: Date.now(), ttl: CACHE_TTL_MISS })
        return null
    }

    const artistRes = await geniusFetch<{ artist: GeniusArtist }>(token, `/artists/${artistId}?text_format=html`)
    if (!artistRes?.artist) {
        cacheSet(key, { found: false, timestamp: Date.now(), ttl: CACHE_TTL_MISS })
        return null
    }

    const hasDesc = !isGeniusDescriptionEmpty(artistRes.artist.description?.html)
    cacheSet(key, { found: true, data: artistRes.artist, timestamp: Date.now(), ttl: hasDesc ? CACHE_TTL_FOUND : CACHE_TTL_EMPTY })
    return artistRes.artist
}

export async function searchAlbum(
    token: string,
    albumTitle: string,
    artistName: string,
): Promise<GeniusAlbum | null> {
    const key = ck('album', artistName, albumTitle)
    const cached = cacheGet<GeniusAlbum>(key)
    if (cached !== null) {
        log(`searchAlbum [cache hit]: found=${cached.found}`)
        return cached.found ? cached.data : null
    }

    const primaryArtist = artistName.split(',')[0].trim()
    const albumTitleNorm = normalize(albumTitle)
    const artistNorm = normalize(primaryArtist)

    // попытка 1: title + первый артист
    let hits = await fetchAlbumHits(`${albumTitle} ${primaryArtist}`)
    log(`searchAlbum attempt 1 (${albumTitle} ${primaryArtist}): ${hits.length} hits`)

    // попытка 2: только title
    if (!hits.length) {
        hits = await fetchAlbumHits(albumTitle)
        log(`searchAlbum attempt 2 (title only): ${hits.length} hits`)
    }

    const filtered = hits.filter(h => {
        const name = h.result.name.toLowerCase()
        return !name.includes('translation') && !name.includes('romanized') && !name.includes('перевод')
    })

    // точное совпадение title + артист
    const best = filtered.find(h => {
        const t = normalize(h.result.name)
        const a = normalize(h.result.primary_artist_names)
        return t === albumTitleNorm && a.includes(artistNorm.split(' ')[0])
    }) ?? filtered.find(h => {
        // только title, без артиста
        return normalize(h.result.name) === albumTitleNorm
    }) ?? null  // без filtered[0]

    log('searchAlbum: best=', best ? `${best.result.name} / ${best.result.primary_artist_names}` : null)

    if (!best) {
        cacheSet(key, { found: false, timestamp: Date.now(), ttl: CACHE_TTL_MISS })
        return null
    }

    const albumRes = await geniusFetch<{ album: GeniusAlbum }>(token, `/albums/${best.result.id}?text_format=html`)
    if (!albumRes?.album) {
        cacheSet(key, { found: false, timestamp: Date.now(), ttl: CACHE_TTL_MISS })
        return null
    }

    const annotationHtml = albumRes.album.description_annotation?.annotations?.[0]?.body?.html
    const hasDesc = !isGeniusDescriptionEmpty(annotationHtml)
    cacheSet(key, { found: true, data: albumRes.album, timestamp: Date.now(), ttl: hasDesc ? CACHE_TTL_FOUND : CACHE_TTL_EMPTY })
    return albumRes.album
}

async function fetchAlbumHits(query: string): Promise<GeniusAlbumHit[]> {
    const searchRes = await geniusPublicFetch<{ sections: Array<{ type: string; hits: GeniusAlbumHit[] }> }>(
        `/search/albums?q=${encodeURIComponent(query)}`
    )
    return searchRes?.sections?.find(s => s.type === 'album')?.hits ?? []
}

export async function fetchTrackInfo(
    token: string,
    title: string,
    artist: string
): Promise<TrackInfo | null> {
    const key = ck('track', artist, title)
    const cached = cacheGet<TrackInfo>(key)
    if (cached !== null) return cached.found ? cached.data : null

    const song = await findSong(token, title, artist)
    if (!song) {
        cacheSet(key, { found: false, timestamp: Date.now(), ttl: CACHE_TTL_MISS })
        return null
    }

    const descHtml = song.description?.html
    const hasDesc = !isGeniusDescriptionEmpty(descHtml)
    log('Track description length:', descHtml?.length ?? 0)

    const result: TrackInfo = {
        description: hasDesc ? (descHtml as string) : '?',
        url: song.url,
        foundTitle: song.title,
        foundArtist: song.primary_artist.name
    }

    const ttl = hasDesc ? CACHE_TTL_FOUND : CACHE_TTL_EMPTY
    cacheSet(key, { found: true, data: result, timestamp: Date.now(), ttl })
    return result
}

export function normalize(str: string): string {
    return unifyAlphabet(str)
        .toLowerCase()
        .replace(/\s*[\(\[].*?[\)\]]/g, '')
        .replace(/[^\p{L}\p{N}]+/gu, '')
}

function cleanTitle(title: string): string {
    return title
        .replace(/prod\.\s*(by\s+)?[^)\]]*$/i, '')  // prod. by X или prod. X
        .replace(/\(.*?\)/g, '')                // (remix), (prod...)
        .replace(/\[.*?\]/g, '')                // [feat...]
        .replace(/\bfeat\..*$/i, '')            // feat...
        .replace(/\bft\..*$/i, '')              // ft...      
        .trim()
}

// Омоглифы кириллица → латиница
const HOMOGLYPHS: Record<string, string> = {
    'а':'a','е':'e','о':'o','р':'p','с':'c','х':'x','у':'y',
    'А':'A','Е':'E','О':'O','Р':'P','С':'C','Х':'X','У':'Y',
    'В':'B','М':'M','Т':'T','К':'K',
}

function unifyAlphabet(str: string): string {
    return str.split('').map(c => HOMOGLYPHS[c] ?? c).join('')
}

function levenshtein(a: string, b: string): number {
    const dp = Array.from({length: a.length + 1}, (_, i) =>
        Array.from({length: b.length + 1}, (_, j) => i || j))
    for (let i = 1; i <= a.length; i++)
        for (let j = 1; j <= b.length; j++)
            dp[i][j] = a[i-1] === b[j-1] ? dp[i-1][j-1]
                : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1])
    return dp[a.length][b.length]
}

function pickBestSong(hits: any[], title: string, artist: string) {
    const titleNorm = normalize(title)
    const artistParts = artist
        .split(',')
        .map(a => normalize(a.trim()))
        .filter(Boolean)

    const songs = hits.filter(h => h.type === 'song')

    // 1. exact title + artist
    const exact = songs.find(h => {
        const rawTitle = h.result.title ?? ''
        const url = h.result.url ?? ''
        if (url.toLowerCase().includes('translation')) return false
        const cleanRaw = rawTitle.replace(/\(.*?\)/g, '').trim()
        const t = normalize(cleanRaw)
        const a = normalize(h.result.primary_artist?.name ?? '')
        return t === titleNorm && artistParts.some(part => a.includes(part))
    })
    if (exact) return exact

    // без артиста
    const exactCleanNoArtist = songs.find(h => {
        const rawTitle = h.result.title ?? ''
        const url = h.result.url ?? ''
        if (url.toLowerCase().includes('translation')) return false
        const cleanRaw = rawTitle.replace(/\(.*?\)/g, '').trim()
        if (normalize(cleanRaw) !== titleNorm) return false
        
        // мягкая проверка артиста — хотя бы одно слово совпадает
        const a = normalize(h.result.primary_artist?.name ?? '')
        const artistWords = artist.split(/[^a-zа-я0-9]+/i).filter(w => w.length > 1).map(w => normalize(w))
        return artistWords.some(w => a.includes(w) || levenshtein(w, a) <= 2)
    })
    if (exactCleanNoArtist) return exactCleanNoArtist

    // 2.5. fuzzy title + artist (один символ/слово отличается)
    const fuzzy = songs.find(h => {
        const rawTitle = h.result.title ?? ''
        const url = h.result.url ?? ''
        if (url.toLowerCase().includes('translation')) return false
        const t = normalize(rawTitle.replace(/\(.*?\)/g, '').trim())
        const a = normalize(h.result.primary_artist?.name ?? '')
        const titleMatch = levenshtein(t, titleNorm) <= Math.floor(titleNorm.length * 0.1) + 1
        const artistMatch = artistParts.some(part => a.includes(part))
        return titleMatch && artistMatch
    })
    if (fuzzy) return fuzzy

    // 3. partial title + artist
    const partial = songs.find(h => {
        const rawTitle = h.result.title ?? ''
        const rawUrl = h.result.url ?? ''
        if (rawTitle.toLowerCase().includes('translation') ||
            rawUrl.toLowerCase().includes('translation')) return false
        const t = normalize(rawTitle)
        const a = normalize(h.result.primary_artist?.name ?? '')
        const titleMatch = titleNorm.split(/[^a-zа-я0-9]+/i).filter(Boolean).every(w => t.includes(w))
        const artistMatch = artistParts.some(part => a.includes(part))
        return titleMatch && artistMatch
    })
    if (partial) return partial

    return null
}

// ─── Общий поиск песни ────────────────────────────────────────────────────

async function findSong(token: string, title: string, artist?: string): Promise<GeniusSong | null> {
    const cleaned = cleanTitle(title)
    log('cleanTitle:', title, '→', cleaned)
    const primaryArtist = artist?.split(',')[0].trim() ?? ''
    
    // Попытка 1: title + первый артист
    if (primaryArtist) {
        const song = await _findSongQuery(token, cleaned, primaryArtist, artist)
        if (song) return song
        log('findSong: no result with artist, trying title only')
    }

    // Попытка 2: только title
    return _findSongQuery(token, cleaned, '', artist)
}

async function _findSongQuery(
    token: string,
    title: string,
    queryArtist: string,
    matchArtist?: string
): Promise<GeniusSong | null> {
    const query = queryArtist ? `${title} ${queryArtist}` : title
    log('findSong query:', query)

    const searchRes = await geniusFetch<{
        hits: Array<{ type: string; result: { id: number; title?: string; primary_artist?: { name: string } } }>
    }>(token, `/search?q=${encodeURIComponent(query)}`)

    const hits = searchRes?.hits ?? []
    log('RAW hits:', hits.map(h => ({
        type: h.type,
        title: h.result.title,
        artist: h.result.primary_artist?.name
    })))

    const best = pickBestSong(hits, title, matchArtist ?? queryArtist)
    log('pickBestSong chose:', best?.result?.title ?? null, '/', best?.result?.primary_artist?.name ?? null)
    if (!best?.result?.id) return null

    const songRes = await geniusFetch<{ song: GeniusSong }>(token, `/songs/${best.result.id}?text_format=html`)
    log('song fetched:', songRes?.song?.title ?? null, '→ album:', songRes?.song?.album?.name ?? null)
    return songRes?.song ?? null
}

// Sanitize HTML from Genius API - allow safe tags and remove dangerous attributes
export function sanitizeGeniusHtml(html: string): string {
    const div = document.createElement('div')
    div.innerHTML = html

    // Allowed tags that Genius uses for formatting
    const allowedTags = ['P', 'BR', 'A', 'B', 'I', 'STRONG', 'EM', 'IMG', 'BLOCKQUOTE', 'UL', 'OL', 'LI']

    function sanitizeNode(node: Node): Node | null {
        if (node.nodeType === Node.TEXT_NODE) {
            return node.cloneNode(true)
        }

        if (node.nodeType !== Node.ELEMENT_NODE) {
            return null
        }

        const el = node as HTMLElement

        if (!allowedTags.includes(el.tagName)) {
            // For disallowed tags, keep their text content
            const frag = document.createDocumentFragment()
            Array.from(el.childNodes).forEach(child => {
                const sanitized = sanitizeNode(child)
                if (sanitized) frag.appendChild(sanitized)
            })
            return frag
        }

        const clone = document.createElement(el.tagName.toLowerCase())

        // Copy safe attributes
        if (el.tagName === 'A' && el.hasAttribute('href')) {
            const href = el.getAttribute('href')!
            if (href.startsWith('http://') || href.startsWith('https://')) {
                clone.setAttribute('href', href)
                clone.setAttribute('target', '_blank')
                clone.setAttribute('rel', 'noopener noreferrer')
            }
        }

        if (el.tagName === 'IMG' && el.hasAttribute('src')) {
            let src = el.getAttribute('src')!
            // protocol-relative URL → force https
            if (src.startsWith('//')) src = 'https:' + src
            if (src.startsWith('http://') || src.startsWith('https://')) {
                clone.setAttribute('src', src)
                if (el.hasAttribute('alt')) {
                    clone.setAttribute('alt', el.getAttribute('alt')!)
                }
            } else {
                return null
            }
        }

        // Recursively sanitize children
        Array.from(el.childNodes).forEach(child => {
            const sanitized = sanitizeNode(child)
            if (sanitized) clone.appendChild(sanitized)
        })

        return clone
    }

    const result = document.createElement('div')
    Array.from(div.childNodes).forEach(child => {
        const sanitized = sanitizeNode(child)
        if (sanitized) result.appendChild(sanitized)
    })

    return result.innerHTML
}

export function evictExpired(): void {
    const store = readStore()
    const now = Date.now()
    let count = 0
    for (const key in store) {
        if (now - store[key].timestamp > store[key].ttl) {
            delete store[key]
            count++
        }
    }
    if (count > 0) {
        writeStore(store)
        log(`evictExpired: очищено ${count} старых записей`)
    }
}