// Хранилище в WebView может БРОСАТЬ исключения. Раньше такой бросок
// происходил внутри перехватчика запросов и убивал запрос до отправки —
// пользователь видел «нет связи с сервером» при работающем интернете.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

async function fresh() {
  vi.resetModules()
  return import('./storage')
}

function breakStorage() {
  const boom = () => {
    throw new DOMException('The operation is insecure.', 'SecurityError')
  }
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(boom)
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(boom)
  vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(boom)
}

describe('безопасное хранилище', () => {
  beforeEach(() => window.localStorage.clear())
  afterEach(() => vi.restoreAllMocks())

  it('обычный случай: пишет и читает', async () => {
    const s = await fresh()
    s.writeStored('k', 'v')
    expect(s.readStored('k')).toBe('v')
    expect(s.storageAvailable()).toBe(true)
    s.removeStored('k')
    expect(s.readStored('k')).toBeNull()
  })

  it('не бросает, когда хранилище запрещено', async () => {
    const s = await fresh()
    breakStorage()
    expect(() => s.writeStored('k', 'v')).not.toThrow()
    expect(() => s.readStored('k')).not.toThrow()
    expect(() => s.removeStored('k')).not.toThrow()
    expect(s.storageAvailable()).toBe(false)
  })

  it('при запрещённом хранилище значение живёт в памяти', async () => {
    const s = await fresh()
    breakStorage()
    s.writeStored('token', 'abc')
    expect(s.readStored('token')).toBe('abc')
  })

  it('сессия не падает при запрещённом хранилище', async () => {
    vi.resetModules()
    const auth = await import('./auth')
    breakStorage()
    expect(() =>
      auth.saveSession({ token: 't', telegramId: 42, username: 'u' }),
    ).not.toThrow()
    expect(auth.getSession()).toEqual({ token: 't', telegramId: 42, username: 'u' })
    expect(() => auth.clearSession()).not.toThrow()
  })
})
