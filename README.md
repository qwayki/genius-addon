# Genius Info

Добавляет данные с [Genius](https://genius.com) в Яндекс Музыку через PulseSync:

- **Биография артиста** — в модалке «Об артисте»
- **Аннотации к тексту** — в модалке трека

---

## Быстрый старт

**Дважды кликни нужный батник:**

| Файл | Что делает |
|---|---|
| `build.bat` | Устанавливает зависимости, собирает, копирует в PulseSync |
| `dev.bat` | То же, но следит за изменениями и пересобирает при сохранении |

Или вручную через терминал:
```bash
yarn          # установить зависимости (один раз)
yarn dev      # dev-режим с watch
yarn build:sync  # финальная сборка
```

---

## Настройка токена

1. Зайди на [genius.com/api-clients](https://genius.com/api-clients)
2. Создай приложение (название и callback — любые)
3. Скопируй **Client Access Token**
4. В PulseSync → аддоны → **Genius Info** → вставь токен в настройках

---

## Структура проекта

```
src/
  main.ts          точка входа
  mount.ts         observer-ы для страниц ЯМ
  pulsesync.ts     хелперы PulseSync API
  styles.css       стили блоков
  genius/
    api.ts         Genius API + кеш (Node.js https, без CORS)
    ui.ts          рендер блоков в DOM
    router.ts      парсинг URL
addon/
  handleEvents.json  схема настроек
  Assets/            статические файлы
scripts/
  dev-build.mjs    watch-сборка → папка аддонов PulseSync
  post-build.mjs   финальная сборка → dist/
  sync-addon.mjs   копирование dist → папка аддонов
```

---

## Папка аддонов PulseSync

| ОС | Путь |
|---|---|
| Windows | `%APPDATA%\PulseSync\addons` |
| macOS | `~/Library/Application Support/PulseSync/addons` |
| Linux | `~/.config/PulseSync/addons` |
