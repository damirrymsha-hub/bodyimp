// Сообщения об ошибках: пользователь не должен видеть «проверьте интернет»,
// когда интернет работает, а виноват сервер или сам код.
import { describe, expect, it } from 'vitest'
import { apiErrorMessage } from './errors'

const FALLBACK = 'Не удалось выполнить действие.'

function httpError(status: number, reason?: string) {
  return { isAxiosError: true, code: 'ERR_BAD_REQUEST', response: { status, data: { reason } } }
}

describe('apiErrorMessage', () => {
  it('401 — проблема с подтверждением входа, а не с сетью', () => {
    const msg = apiErrorMessage(httpError(401, 'bad_signature'), FALLBACK)
    expect(msg).toContain('Telegram не подтвердил вход')
    expect(msg).toContain('bad_signature')
    expect(msg).not.toContain('интернет')
  })

  it('401 с устаревшей подписью объясняет, что делать', () => {
    expect(apiErrorMessage(httpError(401, 'stale'), FALLBACK)).toContain('устарела')
  })

  it('403 — доступ, 404 — нет данных', () => {
    expect(apiErrorMessage(httpError(403), FALLBACK)).toContain('закрыт')
    expect(apiErrorMessage(httpError(404), FALLBACK)).toContain('не найдены')
  })

  it('5xx — сервер, а не пользователь', () => {
    expect(apiErrorMessage(httpError(500), FALLBACK)).toContain('Сервер временно недоступен')
  })

  it('таймаут называется таймаутом', () => {
    const msg = apiErrorMessage({ isAxiosError: true, code: 'ECONNABORTED' }, FALLBACK)
    expect(msg).toContain('не ответил вовремя')
  })

  it('обрыв связи — единственный случай про интернет', () => {
    const msg = apiErrorMessage({ isAxiosError: true, code: 'ERR_NETWORK' }, FALLBACK)
    expect(msg).toContain('Нет связи с сервером')
  })

  it('исключение в коде не выдаётся за проблему с интернетом', () => {
    const msg = apiErrorMessage(new TypeError('x is not a function'), FALLBACK)
    expect(msg).toContain('Сбой в приложении')
    expect(msg).not.toContain('интернет')
  })
})
