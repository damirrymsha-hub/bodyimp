// Сессия PWA (вход через Telegram Login Widget): JWT + данные пользователя
// хранятся в localStorage и переживают перезапуск браузера.

const JWT_KEY = 'bodyimp_jwt'
const TID_KEY = 'bodyimp_tid'
const NAME_KEY = 'bodyimp_username'

export interface PwaSession {
  token: string
  telegramId: number
  username: string | null
}

export function saveSession(s: PwaSession) {
  localStorage.setItem(JWT_KEY, s.token)
  localStorage.setItem(TID_KEY, String(s.telegramId))
  if (s.username) localStorage.setItem(NAME_KEY, s.username)
}

export function getSession(): PwaSession | null {
  const token = localStorage.getItem(JWT_KEY)
  const tid = Number(localStorage.getItem(TID_KEY))
  if (!token || !tid) return null
  return { token, telegramId: tid, username: localStorage.getItem(NAME_KEY) }
}

export function clearSession() {
  localStorage.removeItem(JWT_KEY)
  localStorage.removeItem(TID_KEY)
  localStorage.removeItem(NAME_KEY)
}
