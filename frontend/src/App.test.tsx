import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import { expect, it, vi } from 'vitest'
import App from './App'
import { useUserStore } from './store/userStore'
import type { User } from './types'

vi.mock('./lib/telegram', () => ({ getInitData: () => '', getTelegramUser: () => ({ id: 123, username: 'test' }) }))
vi.mock('./api/client')
vi.mock('./pages/Home', () => ({ default: () => <div>Дневник пользователя</div> }))
vi.mock('./pages/Onboarding', () => ({ default: () => <div>Анкета новичка</div> }))

it('ждёт профиль перед решением об онбординге при холодном старте', async () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  let finish!: () => void
  useUserStore.setState({
    user: null, loading: false, error: null,
    init: () => new Promise<void>((resolve) => {
      finish = () => {
        useUserStore.setState({ user: { id: 1, daily_calories: 2200 } as User })
        resolve()
      }
    }),
  })
  const node = document.createElement('div')
  const root = createRoot(node)
  try {
    await act(async () => { root.render(<MemoryRouter><App /></MemoryRouter>) })
    expect(node.textContent).not.toContain('Анкета новичка')
    await act(async () => { finish() })
    expect(node.textContent).toContain('Дневник пользователя')
    expect(node.textContent).not.toContain('Анкета новичка')
  } finally { await act(async () => root.unmount()) }
})
