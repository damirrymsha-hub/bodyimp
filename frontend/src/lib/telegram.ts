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

// Возвращает telegram_id текущего пользователя.
// Вне Telegram (dev) — фиктивный id, чтобы приложение работало локально.
export function getTelegramUser() {
  const user = WebApp.initDataUnsafe?.user
  if (user) {
    return { id: user.id, username: user.username ?? null }
  }
  return { id: 99000001, username: 'dev_user' }
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
