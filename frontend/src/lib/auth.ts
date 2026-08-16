// Сессия PWA (вход через Telegram Login Widget) и мини-приложения:
// JWT + данные пользователя. Живёт 30 дней и не зависит от адресной строки.
// Доступ к хранилищу — только через storage.ts: прямой localStorage умеет
// бросать исключения в WebView и ронять запросы (см. lib/storage.ts).
import { readStored, removeStored, writeStored } from './storage'

const JWT_KEY = 'bodyimp_jwt'
const TID_KEY = 'bodyimp_tid'
const NAME_KEY = 'bodyimp_username'

export interface PwaSession {
  token: string
  telegramId: number
  username: string | null
}

export function saveSession(s: PwaSession) {
  writeStored(JWT_KEY, s.token)
  writeStored(TID_KEY, String(s.telegramId))
  if (s.username) writeStored(NAME_KEY, s.username)
}

export function getSession(): PwaSession | null {
  const token = readStored(JWT_KEY)
  const tid = Number(readStored(TID_KEY))
  if (!token || !tid) return null
  return { token, telegramId: tid, username: readStored(NAME_KEY) }
}

export function clearSession() {
  removeStored(JWT_KEY)
  removeStored(TID_KEY)
  removeStored(NAME_KEY)
}
