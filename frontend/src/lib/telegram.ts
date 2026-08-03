// Обёртка над Telegram WebApp SDK.
// Безопасно работает и вне Telegram (в обычном браузере при разработке).
import WebApp from '@twa-dev/sdk'

export function initTelegram() {
  try {
    WebApp.ready()
    WebApp.expand()
  } catch {
    // Вне Telegram SDK может бросать — игнорируем для локальной разработки.
  }
}

// Открыто ли приложение внутри Telegram (есть подписанный initData).
export function isInTelegram(): boolean {
  try {
    return Boolean(WebApp.initData)
  } catch {
    return false
  }
}

// Подписанная строка initData — уходит на бэкенд в каждом запросе Mini App.
export function getInitData(): string {
  try {
    return WebApp.initData ?? ''
  } catch {
    return ''
  }
}

// Возвращает telegram_id текущего пользователя (только внутри Telegram).
// Фиктивный dev-пользователь остаётся ТОЛЬКО в локальной разработке —
// в проде вне Telegram работает экран входа (PWA).
export function getTelegramUser(): { id: number; username: string | null } | null {
  const user = WebApp.initDataUnsafe?.user
  if (user) {
    return { id: user.id, username: user.username ?? null }
  }
  if (import.meta.env.DEV) {
    return { id: 99000001, username: 'dev_user' }
  }
  return null
}

// Платформа Telegram: "android" | "ios" | "tdesktop" | "weba" | "unknown" и т.п.
export function getTelegramPlatform(): string {
  try {
    return WebApp.platform ?? 'unknown'
  } catch {
    return 'unknown'
  }
}

export function getColorScheme(): 'light' | 'dark' {
  try {
    return WebApp.colorScheme ?? 'light'
  } catch {
    return 'light'
  }
}

// Тактильная отдача (haptics). Безопасно вызывается везде.
export function haptic(type: 'light' | 'medium' | 'heavy' = 'medium') {
  try {
    WebApp.HapticFeedback.impactOccurred(type)
  } catch {
    /* no-op вне Telegram */
  }
}

export function hapticSuccess() {
  try {
    WebApp.HapticFeedback.notificationOccurred('success')
  } catch {
    /* no-op */
  }
}

export { WebApp }
