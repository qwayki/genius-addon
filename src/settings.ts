import { defineAddonSettings, SettingType } from '@pulsesync/addon-sdk'

export const settings = defineAddonSettings([
    {
        title: 'Genius API',
        items: {
            geniusToken: {
                type: SettingType.STRING,
                name: 'Genius API Token',
                description: 'Токен клиента с genius.com/api-clients',
                default: '',
            },
        },
    },
    {
        title: 'Текст песни',
        items: {
            lyricsSource: {
                type: SettingType.SELECT,
                name: 'Источник текста',
                description: 'Откуда брать текст на странице трека.',
                default: 'fallback',
                options: [
                    { label: 'Яндекс Музыка', value: 'yandex' },
                    { label: 'ЯМ + Genius (рекомендуется)', value: 'fallback' },
                    { label: 'Всегда Genius', value: 'genius' },
                ],
            },
        },
    },
    {
        title: 'Страница артиста',
        items: {
            showArtistBio: {
                type: SettingType.BOOLEAN,
                name: 'Показывать биографию',
                description: 'Биография артиста из Genius в окне «Об артисте».',
                default: true,
            },
            bioMaxLength: {
                type: SettingType.NUMBER,
                name: 'Макс. длина биографии (символов)',
                description: '0 = показывать полностью',
                default: 600, min: 0, max: 2000, step: 100,
            },
        },
    },
    {
        title: 'Страница трека',
        items: {
            showTrackInfo: {
                type: SettingType.BOOLEAN,
                name: 'Показывать описание трека',
                description: 'Блок «О треке» из Genius на странице трека.',
                default: true,
            },
            trackMaxLength: {
                type: SettingType.NUMBER,
                name: 'Макс. длина описания трека (символов)',
                description: '0 = показывать полностью',
                default: 600, min: 0, max: 2000, step: 100,
            },
        },
    },
    {
        title: 'Страница альбома',
        items: {
            showAlbumDesc: {
                type: SettingType.BOOLEAN,
                name: 'Показывать описание альбома',
                description: 'Блок «Об альбоме» из Genius на странице альбома.',
                default: true,
            },
        },
    },
    {
        title: 'Разработка',
        items: {
            devMode: {
                type: SettingType.BOOLEAN,
                name: 'Режим разработчика',
                description: 'Включает логи в консоли.',
                default: false,
            },
        },
    },
])
