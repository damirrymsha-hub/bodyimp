// Обёртка над Telegram WebApp SDK.
// Безопасно работает и вне Telegram (в обычном браузере при разработке).
type TelegramSdk = typeof import('@twa-dev/sdk').default
// SDK уже загружен скриптом в index.html. Не включаем вторую копию в стартовый JS.
let WebApp = (window as Window & { Telegram?: { WebApp?: TelegramSdk } }).Telegram?.WebApp
let sdkFallback: Promise<void> | undefined
import {
  getCapturedInitData,
  getInitDataSource,
  rememberInitData,
  type InitDataSource,
} from './initData'

export function initTelegram() {
  if (!WebApp) {
    // Если CDN Telegram недоступен, используем локальный чанк SDK.
    sdkFallback ??= import('@twa-dev/sdk').then((module) => {
      WebApp = module.default
      configureTelegram()
    }).catch(() => { /* Подпись уже сохранена initData.ts; PWA остаётся доступна. */ })
    return sdkFallback
  }
  configureTelegram()
}

function configureTelegram() {
  try {
    WebApp?.ready()
    WebApp?.expand()
  } catch {
    // Вне Telegram SDK может бросать — игнорируем для локальной разработки.
  }
  try {
    // На iOS вертикальный свайп внутри приложения закрывает окно Telegram —
    // при прокрутке дневника это происходит постоянно. Метод появился в
    // Bot API 7.7, поэтому вызываем через проверку.
    const api = WebApp as unknown as { disableVerticalSwipes?: () => void }
    api.disableVerticalSwipes?.()
  } catch {
    /* старый клиент — просто живём без этого */
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
    fromSdk = WebApp?.initData ?? ''
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
    if (WebApp?.initData) return 'sdk'
  } catch {
    /* вне Telegram */
  }
  return getInitDataSource()
}

// Возвращает telegram_id текущего пользователя (только внутри Telegram).
// Фиктивный dev-пользователь остаётся ТОЛЬКО в локальной разработке —
// в проде вне Telegram работает экран входа (PWA).
export function getTelegramUser(): { id: number; username: string | null } | null {
  const user = WebApp?.initDataUnsafe?.user
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
    return WebApp?.platform ?? 'unknown'
  } catch {
    return 'unknown'
  }
}

export function getColorScheme(): 'light' | 'dark' {
  try {
    return WebApp?.colorScheme ?? 'light'
  } catch {
    return 'light'
  }
}

// Тактильная отдача (haptics). Безопасно вызывается везде.
export function haptic(type: 'light' | 'medium' | 'heavy' = 'medium') {
  try {
    WebApp?.HapticFeedback.impactOccurred(type)
  } catch {
    /* no-op вне Telegram */
  }
}

export function hapticSuccess() {
  try {
    WebApp?.HapticFeedback.notificationOccurred('success')
  } catch {
    /* no-op */
  }
}

export { WebApp }
