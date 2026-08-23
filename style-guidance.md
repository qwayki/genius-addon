# Genius Info — Style Guidance

Этот документ описывает CSS-классы аддона **Genius Info** для Яндекс Музыки.
Кинь этот файл своему ИИ-агенту вместе с описанием желаемого вида темы —
агент сгенерирует `style.css` и `metadata.json`.

Стандартные CSS-механики (`:hover`, `transition`, флексбокс и т.п.) не поясняются —
только то, что специфично для этого аддона и не следует из названия класса.

---

## 1. metadata.json

```json
{
    "id": "genius-info-theme",
    "name": "Genius Info Theme",
    "description": "Кастомная тема для аддона Genius Info",
    "version": "1.0.0",
    "author": "ТВОЙ_НИК",
    "type": "theme",
    "image": "",
    "banner": "",
    "libraryLogo": "",
    "tags": ["theme", "genius-info"],
    "dependencies": ["genius-info"],
    "allowedUrls": [],
    "supportedVersions": [],
    "script": "",
    "css": "style.css",
    "installSource": "local"
}
```

Поменяй `id`, `name`, `author` под себя. Остальное можно не трогать.

---

## 2. CSS-переменная темы

```css
--g-base: 255,255,255;   /* тёмная тема (.ym-dark-theme и :root) */
--g-base: 0,0,0;          /* светлая тема (.ym-light-theme) */
```

RGB-канал без alpha. Все цвета в аддоне заданы как `rgba(var(--g-base), N)`,
где N — прозрачность от 0 до 1. Просто переопредели alpha в своих правилах,
переменную трогать не нужно — она уже переключается между темами сама.

---

## 3. Общий блок карточки (используется в био, "О треке", альбоме)

Базовый класс `.genius-info-block` — на нём стоят все карточки, специфичные
блоки (`#genius-info-track`, `#genius-info-album`) добавляют поверх свои
правила через более узкие селекторы.

```css
.genius-info-block {
    padding: 12px 14px;
    border-radius: 10px;
    background: rgba(var(--g-base), 0.03);
    border: 1px solid rgba(var(--g-base), 0.06);
}
.genius-info-block:hover {
    border-color: rgba(var(--g-base), 0.09);
    /* примечание: у #genius-info-album этот hover перебит своим правилом ниже */
}
```

| Класс | Что это | Дефолт |
|---|---|---|
| `.genius-info-block__header` | Строка заголовка (флекс, заголовок + бейдж) | `margin-bottom: 8px`, `gap: 12px` |
| `.genius-info-block__title` | Текст заголовка ("О треке", "Об альбоме" и т.д.) | `font-size: 15px`, `font-weight: 600`, `color: rgba(var(--g-base), 0.9)` |
| `.genius-info-block__badge` | Ссылка "Открыть на Genius" в шапке | `font-size: 11.5px`, `color: rgba(var(--g-base), 0.4)`, на hover `0.75` |
| `.genius-info-block__body` | Обёртка текста + кнопки "показать полностью" | `display: flex; flex-direction: column` |
| `.genius-info-block__text` | Сам текст описания (поддерживает `<p>`, `<ul>/<ol>/<li>`, `<a>`, `<img>` из HTML Genius) | `font-size: 13.5px`, `line-height: 1.6`, `color: rgba(var(--g-base), 0.72)` |
| `.genius-info-block__toggle` | Кнопка "Показать полностью / Свернуть" | `font-size: 12.5px`, `color: rgba(var(--g-base), 0.38)`, на hover `0.65` |
| `.genius-info-block__found-note` | Мелкая подпись "Найдено: ..." если совпадение неточное | `font-size: 12px`, `color: rgba(var(--g-base), 0.28)`, курсив |
| `.genius-info-block__link` | Автоссылки внутри текста (найденные регексом URL) | `color: rgba(var(--g-base), 0.55)`, на hover `0.85` |
| `.genius-info-block__arrow` | Стрелочка `›` перед заголовком у сворачиваемых блоков | `opacity: 0.5`, крутится на 90° при раскрытии через JS (`transform: rotate(90deg)`) |

Скелетоны загрузки (`.genius-skeleton div`, `.genius-skeleton-badge`) — общий
шиммер-градиент, обычно не требуют кастомизации, но доступны как обычные классы.

---

## 4. `#genius-info-track` — блок "О треке"

Модификатор поверх `.genius-info-block`, используется только в модалке трека.

```css
#genius-info-track {
    margin-top: 14px;
    margin-bottom: 0;
}
```

Ширина ограничена нативным контейнером ЯМ (`TrackModal_header`, фиксированные
380px) — расширить сам блок через margin/padding нельзя, это упирается в
чужую вёрстку.

---

## 5. `#genius-info-album` — блок "Об альбоме"

Живёт прямо в списке треков (не в модалке), поэтому ширина/позиция подогнаны
под трек-строку списка.

```css
#genius-info-album {
    margin: -12px 0px 6px 16px;
    padding: 8px 16px;
    background: transparent;
    border: 1px solid transparent;
    border-radius: 10px;
}
#genius-info-album:hover {
    background: rgba(var(--g-base), 0.03);
    border-color: rgba(var(--g-base), 0.06);
}
```

**`is-expanded`** — важно: этот класс НЕ вешается через `:hover`. Он
добавляется/убирается через JS ровно в момент клика по заголовку (раскрытие/
сворачивание аккордеона), и держится до следующего клика — независимо от
положения курсора:

```css
#genius-info-album.is-expanded {
    background: rgba(var(--g-base), 0.03);
    border-color: rgba(var(--g-base), 0.06);
}
```

`.genius-info-block__header` внутри альбома дополнительно имеет
`opacity: 0.9` (сигнал "кликабельно"), на hover — `1`. Это не индикатор
раскрытого состояния, просто hover-эффект самой шапки.

---

## 6. `.genius-info-lyrics` — блок "Текст" (лирика)

Вставляется не в модалку трека, а в основной контент страницы трека (после
блока альбома) — это даёт другую доступную ширину, чем у `#genius-info-track`.

```css
.genius-info-lyrics {
    margin: 12px 24px;
}
.genius-info-lyrics__text {
    font-size: 13.5px;
    line-height: 1.7;
    color: rgba(var(--g-base), 0.72);
    white-space: pre-wrap;
}
```

Строки в интерлюдиях/бэк-вокале приходят как `<b>`/`<i>` внутри текста —
курсив/жирность уже стандартные теги, отдельного класса под них нет.

`24px` по бокам — подогнано так, чтобы ширина текста совпадала с блоком
"О треке" в той же модалке (у них разная точка вставки в DOM, отсюда и
разный margin, а не единый паддинг).

---

## 7. Контекстное меню (кнопка `···` у блока "Текст")

Копирует нативную стилистику меню ЯМ (blur, скругления) — переопределять
стоит аккуратно, чтобы не выбиться из системного вида:

| Класс | Что это |
|---|---|
| `.genius-menu__wrapper` | Сам попап меню |
| `.genius-menu__item` | Пункт меню (кнопка) |
| `.genius-menu__item-icon` | Иконка слева от текста пункта |
| `.genius-menu__divider` | Разделитель между группами пунктов |
| `.genius-menu__toggle` | Тумблер справа у WIP-пунктов (сейчас всегда `disabled`) |
| `.genius-info-block__menu-btn` | Сама кнопка `···`, открывающая меню | `color: rgba(var(--g-base), 0.3)`, на hover `0.65` |

---

## 8. НЕ трогать

Эти свойства завязаны на JS-логику или анимацию — переопределение сломает
поведение, а не просто вид:

- `display`, `position` на любом `.genius-info-block*` — сломает флекс-раскладку заголовка
- `#genius-info-album .genius-info-block__body { transition: max-height }` — фактически мёртвый код (реальная анимация раскрытия идёт через `element.animate()` в JS, а не через CSS-transition), трогать бессмысленно в любую сторону
- `height`/`overflow` на `.genius-info-block__body` у альбома — управляется JS при раскрытии/сворачивании
- структура `display: flex` и `gap` на `.genius-info-block__header` — трогать можно только `margin-bottom`, остальное держит взаимное расположение заголовка/бейджа

---

## 9. Пример готовой темы

```css
#genius-info-album {
    margin: 8px;
    background: rgba(var(--g-base), 0.05);
    border-color: transparent;
}
#genius-info-album:hover,
#genius-info-album.is-expanded {
    background: rgba(var(--g-base), 0.08);
}
```
