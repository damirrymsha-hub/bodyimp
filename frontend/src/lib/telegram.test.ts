import { afterEach, describe, expect, it, vi } from 'vitest'

const fallback = vi.hoisted(() => ({ ready: vi.fn(), expand: vi.fn(), initData: '', initDataUnsafe: {}, HapticFeedback: { impactOccurred: vi.fn() } }))
vi.mock('@twa-dev/sdk', () => ({ default: fallback }))
afterEach(() => {
  Reflect.deleteProperty(window, 'Telegram')
  window.location.hash = ''
  localStorage.clear()
  vi.clearAllMocks()
})
describe('единственная копия Telegram SDK', () => {
  it('использует SDK из HTML и сохраняет подпись', async () => {
    vi.resetModules()
    const ready = vi.fn()
    Object.assign(window, { Telegram: { WebApp: { ready, expand: vi.fn(), initData: 'signed-data', initDataUnsafe: { user: { id: 7864171996 } } } } })
    const tg = await import('./telegram')
    await tg.initTelegram()
    expect(ready).toHaveBeenCalledOnce()
    expect(fallback.ready).not.toHaveBeenCalled()
    expect(tg.getInitData()).toBe('signed-data')
    expect(tg.getTelegramUser()?.id).toBe(7864171996)
  })
  it('при недоступном CDN загружает локальный SDK один раз, подпись не теряется', async () => {
    vi.resetModules()
    window.location.hash = '#tgWebAppData=' + encodeURIComponent('user=test&hash=signature')
    const tg = await import('./telegram')
    expect(tg.getInitData()).toBe('user=test&hash=signature')
    await Promise.all([tg.initTelegram(), tg.initTelegram()])
    expect(fallback.ready).toHaveBeenCalledOnce()
    expect(tg.getInitData()).toBe('user=test&hash=signature')
  })
})
