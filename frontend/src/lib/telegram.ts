// Обёртка над Telegram WebApp SDK.
// Безопасно работает и вне Telegram (в обычном браузере при разработке).
import WebApp from '@twa-dev/sdk'
import {
  getCapturedInitData,
  getInitDataSource,
  rememberInitData,
  type InitDataSource,
} from './initData'

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
  return getInitData() !== ''
}

// Подписанная строка initData — уходит на бэкенд в каждом запросе Mini App.
// Источников два: SDK (пока жив hash) и наш перехват (переживает перезагрузку).
export function getInitData(): string {
  let fromSdk = ''
  try {
    fromSdk = WebApp.initData ?? ''
  } catch {
    fromSdk = ''
  }
  if (fromSdk) {
    rememberInitData(fromSdk)
    return fromSdk
  }
  return getCapturedInitData()
}

// Откуда получена подпись — показываем на экране диагностики.
export function initDataSource(): InitDataSource {
  try {
    if (WebApp.initData) return 'sdk'
  } catch {
    /* вне Telegram */
  }
  return getInitDataSource()
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
