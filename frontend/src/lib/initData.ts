// Перехват подписанных данных Telegram из адресной строки.
//
// Telegram открывает мини-приложение по адресу вида
//   https://bodyimp.vercel.app/#tgWebAppData=<подпись>&tgWebAppVersion=8.0&...
// то есть подпись лежит в hash-фрагменте. Любая навигация внутри приложения
// (а раньше — HashRouter при первом же рендере) затирает hash, и после
// перезагрузки WebView подпись исчезает навсегда: сервер отвечает 401.
// На iOS Telegram перезагружает WebView особенно охотно, поэтому ловим подпись
// СИНХРОННО при загрузке модуля — до монтирования роутера — и сохраняем её.

import { readStored, removeStored, writeStored } from './storage'

const STORAGE_KEY = 'bodyimp_init_data'

export type InitDataSource = 'hash' | 'storage' | 'sdk' | 'none'

function readFromHash(): string {
  try {
    const hash = window.location.hash.replace(/^#/, '')
    if (!hash.includes('tgWebAppData')) return ''
    // Фрагмент — это обычная query-строка: tgWebAppData здесь уже раскодируется.
    return new URLSearchParams(hash).get('tgWebAppData') ?? ''
  } catch {
    return ''
  }
}

function readFromStorage(): string {
  return readStored(STORAGE_KEY) ?? ''
}

function save(value: string) {
  writeStored(STORAGE_KEY, value)
}

// Выполняется один раз при импорте модуля.
const captured = readFromHash()
if (captured) save(captured)

/**
 * Подпись Telegram: свежая из адресной строки, иначе сохранённая ранее.
 * Пустая строка означает, что приложение открыто вне Telegram.
 */
export function getCapturedInitData(): string {
  return captured || readFromStorage()
}

/** Откуда взялась подпись — для экрана диагностики. */
export function getInitDataSource(): InitDataSource {
  if (captured) return 'hash'
  if (readFromStorage()) return 'storage'
  return 'none'
}

/** Запоминает подпись, полученную из SDK (когда hash уже затёрт). */
export function rememberInitData(value: string) {
  if (value) save(value)
}

export function clearCapturedInitData() {
  removeStored(STORAGE_KEY)
}

/**
 * Пользователь из сохранённой подписи.
 * Нужен, когда SDK уже потерял данные (WebView перезагрузился и hash пуст),
 * а подпись у нас сохранена: приложение должно узнать человека, а не
 * показывать ему экран входа внутри Telegram.
 * Подпись здесь только читается — подлинность всё равно проверяет сервер.
 */
export function initDataUser(): { id: number; username: string | null } | null {
  const raw = getCapturedInitData()
  if (!raw) return null
  try {
    const userJson = new URLSearchParams(raw).get('user')
    if (!userJson) return null
    const user = JSON.parse(userJson)
    if (typeof user?.id !== 'number') return null
    return { id: user.id, username: user.username ?? null }
  } catch {
    return null
  }
}
