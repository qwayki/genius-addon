// src/genius/styles.ts

const STYLE_ID = 'genius-info-styles'

export function injectStyles(): void {
    if (document.getElementById(STYLE_ID)) return

    const style = document.createElement('style')
    style.id = STYLE_ID
    style.textContent = `
/*
 * Переключение по классам темы ЯМ (.ym-dark-theme / .ym-light-theme)
 * --g-base: rgb-канал (без alpha) базового цвета темы
 */
@layer genius-info-base {
:root, .ym-dark-theme {
    --g-base: 255,255,255;
}
.ym-light-theme {
    --g-base: 0,0,0;
}

.genius-info-block {
    padding: 12px 14px;
    border-radius: 10px;
    background: rgba(var(--g-base), 0.03);
    border: 1px solid rgba(var(--g-base), 0.06);
    transition: border-color 0.2s;
}

.genius-info-block:hover {
    border-color: rgba(var(--g-base), 0.09);
}

.genius-info-block__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
    gap: 12px;
}

.genius-info-block__title {
    margin: 0;
    font-size: 15px;
    font-weight: 600;
    line-height: 1.2;
    color: rgba(var(--g-base), 0.9);
    letter-spacing: -0.01em;
}

.genius-info-block__badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 0;
    border-radius: 0;
    font-size: 11.5px;
    font-weight: 400;
    letter-spacing: 0;
    text-transform: none;
    color: rgba(var(--g-base), 0.4);
    background: transparent;
    text-decoration: none;
    transition: color 0.15s;
    white-space: nowrap;
    flex-shrink: 0;
}

.genius-info-block__badge:hover {
    color: rgba(var(--g-base), 0.75);
}

.genius-info-block__badge img {
    background: #ffff64;
    border-radius: 50%;
    padding: 1px;
}

.genius-info-block__body {
    display: flex;
    flex-direction: column;
}

.genius-info-block__text {
    margin: 0;
    font-size: 13.5px;
    line-height: 1.6;
    color: rgba(var(--g-base), 0.72);
}

.genius-info-block__text p {
    margin: 0;
}

.genius-info-block__text p + p {
    margin-top: 0.6em;
}

.genius-info-block__text ul,
.genius-info-block__text ol {
    margin: 0.4em 0 !important;
    padding-left: 1.4em !important;
    list-style-position: outside !important;
}
    
.genius-info-block__text li {
    margin: 0;
    padding: 0;
}

.genius-info-block__text a {
    color: rgba(var(--g-base), 0.55);
    text-decoration: underline;
    text-underline-offset: 2px;
}
.genius-info-block__text a:hover {
    color: rgba(var(--g-base), 0.85);
}

.genius-info-block__text img {
    display: block;
    max-width: min(400px, 100%);
    height: auto;
    border-radius: 6px;
    margin: 6px 0;
}

.genius-info-block__toggle {
    display: inline-flex;
    align-items: center;
    margin-top: 7px !important;
    gap: 4px;
    align-self: flex-start;
    padding: 0;
    border: none;
    background: none;
    cursor: pointer;
    font-family: inherit;
    font-size: 12.5px;
    font-weight: 500;
    color: rgba(var(--g-base), 0.38);
    transition: color 0.15s;
}

.genius-info-block__toggle:hover {
    color: rgba(var(--g-base), 0.65);
}

.genius-skeleton div,
.genius-skeleton-badge {
    background: linear-gradient(90deg,
        rgba(var(--g-base), 0.04),
        rgba(var(--g-base), 0.09),
        rgba(var(--g-base), 0.04)
    );
    background-size: 200% 100%;
    animation: shimmer 1.4s infinite;
}

.genius-skeleton div {
    height: 11px;
    margin: 7px 0;
    border-radius: 6px;
}

.genius-skeleton-badge {
    height: 14px;
    width: 110px;
    border-radius: 6px;
}

@keyframes shimmer {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
}

#genius-info-track {
    margin-top: 14px;
    margin-bottom: 0;
}

#genius-info-track .genius-info-block__header {
    margin-bottom: 4px;
}

#genius-info-track .genius-info-block__text {
    line-height: 1.55;
}

#genius-info-album {
    margin: -12px 0px 6px 16px;
    padding: 8px 16px;
    background: transparent;
    border: 1px solid transparent;
    border-radius: 10px;
    transition: background 0.15s, border-color 0.15s;
}

#genius-info-album:hover,
#genius-info-album.is-expanded {
    background: rgba(var(--g-base), 0.03);
    border-color: rgba(var(--g-base), 0.06);
}

#genius-info-album .genius-info-block__header {
    cursor: pointer;
    user-select: none;
    margin-bottom: 0;
    opacity: 0.9;
}

#genius-info-album .genius-info-block__body > .genius-info-block__text {
    margin-top: 8px;
}

#genius-info-album .genius-info-block__body > .genius-info-block__text p {
    margin: 0;
}

#genius-info-album .genius-info-block__body > .genius-info-block__text p + p {
    margin-top: 0.6em;
}

#genius-info-album .genius-info-block__body > .genius-info-block__found-note {
    margin-top: 8px;
}

#genius-info-album .genius-info-block__header:hover {
    opacity: 1;
}

.genius-info-block__arrow {
    display: inline-block;
    margin-right: 5px;
    font-size: 16px;
    line-height: 1;
    transition: transform 0.18s ease;
    opacity: 0.5;
}

.genius-info-block__found-note {
    margin: 8px 0 0;
    padding: 6px 0 0;
    border-top: 1px solid rgba(var(--g-base), 0.05);
    font-size: 12px;
    line-height: 1.4;
    color: rgba(var(--g-base), 0.28);
    font-style: italic;
}

.genius-info-block__link {
    color: rgba(var(--g-base), 0.55);
    text-decoration: underline;
    text-underline-offset: 2px;
}
.genius-info-block__link:hover {
    color: rgba(var(--g-base), 0.85);
}
}
`
    document.head.appendChild(style)
}

// Контекстное меню для блока "Текст" — структура как у ЯМ
// для совместимости со стилями других аддонов
export function injectContextMenuStyles(): void {
    const MENU_STYLE_ID = 'genius-info-context-menu-styles'
    if (document.getElementById(MENU_STYLE_ID)) return
    const style = document.createElement('style')
    style.id = MENU_STYLE_ID
    style.textContent = `
/* Wrapper внутри [role="menu"] */
@layer genius-info-base {
.genius-menu__wrapper {
    backdrop-filter: blur(0.875rem);
    background-color: var(--ym-background-color-primary-enabled-menu, rgba(0,0,0,0.7));
    border: none;
    border-radius: var(--ym-radius-size-xl, 1rem);
    box-shadow: 0 0.25rem 1.25rem 0 var(--ym-shadow-menu, transparent);
    display: flex;
    flex-direction: column;
    padding: var(--ym-spacer-size-xs, 0.5rem);
    width: 17.1875rem;
    overflow: auto;
}

.genius-menu__item {
    box-sizing: border-box;
    margin: 0;
    cursor: pointer;
    overflow: hidden;
    position: relative;
    border: none;
    background: none;
    background-color: transparent;
    border-radius: var(--ym-radius-size-m, 0.5rem);
    color: var(--ym-controls-color-primary-text-enabled, hsla(0,0%,100%,0.5));
    display: flex;
    align-items: center;
    outline: 0;
    padding: var(--ym-spacer-size-xs, 0.5rem) var(--ym-spacer-size-s, 0.625rem);
    width: 100%;
    font-family: var(--ym-font-text, inherit);
    font-size: var(--ym-font-size-label-m, 0.875rem);
    font-weight: var(--ym-font-weight-medium, 500);
    line-height: var(--ym-font-line-height-label-m, 1.25rem);
    transition: background-color 0.15s, color 0.15s;
}

.genius-menu__item-content {
    display: flex;
    align-items: center;
    width: 100%;
}

.genius-menu__item:hover,
.genius-menu__item.is-active {
    background-color: var(--ym-surface-color-primary-enabled-list, hsla(0,0%,100%,0.08));
    color: var(--ym-controls-color-primary-text-enabled_variant, #e6e6e6);
}

.genius-menu__item-icon {
    height: var(--ym-icon-size-xxs, 1.25rem);
    width: var(--ym-icon-size-xxs, 1.25rem);
    margin-inline-end: var(--ym-spacer-size-s, 0.625rem);
    flex-shrink: 0;
    fill: currentColor;
}

.genius-menu__divider {
    background-color: var(--ym-surface-color-primary-enabled-list, hsla(0,0%,100%,0.08));
    height: 0.0625rem;
    margin: var(--ym-spacer-size-xxs, 0.375rem) var(--ym-spacer-size-s, 0.625rem);
    border: none;
}

.genius-menu__toggle {
    margin-left: auto;
    flex-shrink: 0;
}

.genius-info-block__menu-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0 4px;
    border: none;
    background: none;
    cursor: pointer;
    font-family: inherit;
    font-size: 15px;
    font-weight: 700;
    letter-spacing: 1px;
    line-height: 1;
    color: rgba(var(--g-base), 0.3);
    transition: color 0.15s;
    flex-shrink: 0;
}

.genius-info-block__menu-btn:hover {
    color: rgba(var(--g-base), 0.65);
}
}
`
    document.head.appendChild(style)
}


// append after existing styles
export function injectLyricsStyles(): void {
    const LYRICS_STYLE_ID = 'genius-info-lyrics-styles'
    if (document.getElementById(LYRICS_STYLE_ID)) return
    const style = document.createElement('style')
    style.id = LYRICS_STYLE_ID
    style.textContent = `
@layer genius-info-base {
.genius-info-lyrics {
    margin: 12px 24px 12px 24px;
}

.genius-info-lyrics .genius-info-block__header {
    margin-bottom: 8px;
}

.genius-info-lyrics__text {
    margin: 0;
    font-family: inherit;
    font-size: 13.5px;
    line-height: 1.7;
    color: rgba(var(--g-base), 0.72);
    white-space: pre-wrap;
    word-break: break-word;
}
}
`
    document.head.appendChild(style)
}