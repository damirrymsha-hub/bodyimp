// Тесты перехвата подписи Telegram из адресной строки.
// Это самое хрупкое место: подпись приходит один раз в hash-фрагменте,
// и любая навигация её стирает.
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Пример того, что реально присылает Telegram при открытии мини-приложения.
const RAW_INIT_DATA =
  'query_id=AAHdF6IQAAAAAN0XohDhrOrc&user=%7B%22id%22%3A279058397%7D&auth_date=1716000000&signature=&hash=abc123'

function hashFor(initData: string): string {
  return `#tgWebAppData=${encodeURIComponent(
    initData,
  )}&tgWebAppVersion=8.0&tgWebAppPlatform=ios`
}

async function loadModule() {
  vi.resetModules()
  return import('./initData')
}

describe('перехват подписи Telegram', () => {
  beforeEach(() => {
    window.localStorage.clear()
    window.location.hash = ''
  })

  it('достаёт подпись из hash-фрагмента', async () => {
    window.location.hash = hashFor(RAW_INIT_DATA)
    const m = await loadModule()
    expect(m.getCapturedInitData()).toBe(RAW_INIT_DATA)
    expect(m.getInitDataSource()).toBe('hash')
  })

  it('сохраняет подпись и отдаёт её после того, как hash затёрли', async () => {
    window.location.hash = hashFor(RAW_INIT_DATA)
    await loadModule() // первый заход — подпись сохраняется

    window.location.hash = '#/' // роутер/навигация затёрли фрагмент
    const m = await loadModule() // перезагрузка WebView
    expect(m.getCapturedInitData()).toBe(RAW_INIT_DATA)
    expect(m.getInitDataSource()).toBe('storage')
  })

  it('не считает подписью посторонний hash', async () => {
    window.location.hash = '#/onboarding'
    const m = await loadModule()
    expect(m.getCapturedInitData()).toBe('')
    expect(m.getInitDataSource()).toBe('none')
  })

  it('сохраняет пустое поле signature без изменений', async () => {
    window.location.hash = hashFor(RAW_INIT_DATA)
    const m = await loadModule()
    // именно эта часть строки участвует в проверке подписи на сервере
    expect(m.getCapturedInitData()).toContain('signature=')
  })

  it('переживает полностью заблокированное хранилище', async () => {
    const boom = () => {
      throw new DOMException('denied', 'SecurityError')
    }
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(boom)
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(boom)

    window.location.hash = hashFor(RAW_INIT_DATA)
    const m = await loadModule()
    expect(m.getCapturedInitData()).toBe(RAW_INIT_DATA) // из памяти, не из хранилища
    vi.restoreAllMocks()
  })
})
