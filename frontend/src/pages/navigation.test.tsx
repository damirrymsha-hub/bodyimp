import React, { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Home from './Home'
import Activity from './Activity'
import AddFood from './AddFood'
import { useUserStore } from '../store/userStore'
import { useUIStore } from '../store/uiStore'
import type { User, PhotoAnalysisResult } from '../types'

vi.mock('../lib/telegram', () => ({ haptic: vi.fn(), hapticSuccess: vi.fn() }))
vi.mock('../api/client', () => ({
  getRecentFoods: vi.fn().mockResolvedValue([]),
  getStreak: vi.fn().mockResolvedValue(3),
  getWeeklyStats: vi.fn().mockResolvedValue({ avg_calories: 1800 }),
}))
vi.mock('./ScanFood', () => ({ default: ({ onConfirm }: { onConfirm: (r: PhotoAnalysisResult) => void }) => <button onClick={() => onConfirm({ name: 'Омлет', calories: 300 })}>Подтвердить фото</button> }))
vi.mock('../components/DescribeFood', () => ({ default: ({ onConfirm }: { onConfirm: (r: PhotoAnalysisResult) => void }) => <button onClick={() => onConfirm({ name: 'Каша', calories: 200 })}>Подтвердить текст</button> }))

let container: HTMLDivElement
let root: Root
const addFood = vi.fn().mockResolvedValue(undefined)
const loadDay = vi.fn().mockResolvedValue(undefined)
async function render(element: React.ReactNode) {
  await act(async () => { root.render(element) })
}
async function click(label: string) {
  const button = [...container.querySelectorAll('button')].find((b) => b.textContent?.trim() === label || b.getAttribute('aria-label') === label)
  expect(button, label).toBeTruthy()
  await act(async () => { button!.click() })
}
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  vi.clearAllMocks()
  container = document.createElement('div'); document.body.appendChild(container); root = createRoot(container)
  useUserStore.setState({ user: { id: 1, username: 'test', daily_calories: 2200, daily_protein_g: 120 } as User, foods: [], activities: [], loadDay, addFood })
  useUIStore.setState({ selectedDate: '2026-09-27', toasts: [] })
})
afterEach(async () => { await act(async () => root.unmount()); container.remove() })

describe('навигация и выбранный приём пищи', () => {
  it('открывает фото прямо с дневника и сохраняет выбранный завтрак', async () => {
    await render(<MemoryRouter><Home /></MemoryRouter>)
    await click('Фото')
    await click('Завтрак')
    await click('Подтвердить фото')
    expect(addFood).toHaveBeenCalledWith(expect.objectContaining({ meal_type: 'breakfast', source: 'photo' }))
  })
  it('открывает текст прямо с дневника', async () => {
    await render(<MemoryRouter><Home /></MemoryRouter>)
    await click('Текст'); await click('Ужин'); await click('Подтвердить текст')
    expect(addFood).toHaveBeenCalledWith(expect.objectContaining({ meal_type: 'dinner', source: 'text' }))
  })
  it('оставляет вторичные способы в Ещё', async () => {
    await render(<MemoryRouter><Home /></MemoryRouter>)
    expect(container.textContent).not.toContain('Штрихкод')
    await click('Ещё')
    for (const label of ['Штрихкод', 'Вручную', 'Избранное', 'Повторить вчера', 'Быстрый поиск']) expect(container.textContent).toContain(label)
  })
  it('сохраняет дату при переходе в Активность и обратно', async () => {
    await render(<MemoryRouter><Routes><Route path="/" element={<Home />} /><Route path="/activity" element={<Activity />} /></Routes></MemoryRouter>)
    await click('Активность')
    expect(container.textContent).toContain('За этот день активности пока нет')
    expect(loadDay).toHaveBeenLastCalledWith('2026-09-27')
    await click('Питание')
    expect(useUIStore.getState().selectedDate).toBe('2026-09-27')
    expect(container.querySelectorAll('nav button')).toHaveLength(2)
    expect(container.textContent).not.toContain('Вода')
  })
  it('при повторном открытии не наследует прежний приём пищи', async () => {
    await render(<AddFood key="breakfast" initialMeal="breakfast" initialMode="photo" onClose={vi.fn()} />)
    await click('Подтвердить фото')
    await render(<AddFood key="lunch" initialMeal="lunch" initialMode="text" onClose={vi.fn()} />)
    await click('Подтвердить текст')
    expect(addFood.mock.calls.map(([data]) => data.meal_type)).toEqual(['breakfast', 'lunch'])
  })
})
