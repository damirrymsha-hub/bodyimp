// До бэкенда есть два пути: через свой домен (проксирует Vercel) и напрямую.
// В некоторых сетях один из них не работает — клиент обязан сам перейти
// на второй, иначе приложение выглядит полностью сломанным.
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api, DIRECT_BASE, PROXY_BASE, getLastApiError } from './client'

function networkError(config: unknown) {
  const err = new Error('Network Error') as Error & {
    code: string
    config: unknown
    isAxiosError: boolean
  }
  err.code = 'ERR_NETWORK'
  err.config = config
  err.isAxiosError = true
  return err
}

beforeEach(() => {
  api.defaults.baseURL = PROXY_BASE
})

describe('выбор пути до бэкенда', () => {
  it('по умолчанию ходит через свой домен', () => {
    expect(api.defaults.baseURL).toBe(PROXY_BASE)
  })

  it('при сетевом сбое переключается на прямой адрес и запоминает его', async () => {
    const adapter = vi
      .fn()
      // первый путь не отвечает
      .mockImplementationOnce((config) => Promise.reject(networkError(config)))
      // второй — отвечает
      .mockImplementationOnce((config) =>
        Promise.resolve({ data: { ok: true }, status: 200, statusText: 'OK', headers: {}, config }),
      )
    api.defaults.adapter = adapter

    const res = await api.get('/api/ping')

    expect(res.data).toEqual({ ok: true })
    expect(adapter).toHaveBeenCalledTimes(2)
    expect(adapter.mock.calls[1][0].baseURL).toBe(DIRECT_BASE)
    expect(api.defaults.baseURL).toBe(DIRECT_BASE) // рабочий путь запомнен
  })

  it('не зацикливается, когда не работают оба пути', async () => {
    const adapter = vi
      .fn()
      .mockImplementation((config) => Promise.reject(networkError(config)))
    api.defaults.adapter = adapter

    await expect(api.get('/api/ping')).rejects.toThrow('Network Error')
    expect(adapter).toHaveBeenCalledTimes(2) // ровно одна повторная попытка
  })

  it('ошибку сервера не пытается лечить сменой пути', async () => {
    const adapter = vi.fn().mockImplementation((config) => {
      const err = new Error('Request failed with status code 500') as Error & {
        code: string
        config: unknown
        response: unknown
        isAxiosError: boolean
      }
      err.code = 'ERR_BAD_RESPONSE'
      err.config = config
      err.response = { status: 500, data: {} }
      err.isAxiosError = true
      return Promise.reject(err)
    })
    api.defaults.adapter = adapter

    await expect(api.get('/api/ping')).rejects.toThrow()
    expect(adapter).toHaveBeenCalledTimes(1)
    expect(getLastApiError()?.status).toBe(500)
  })
})
