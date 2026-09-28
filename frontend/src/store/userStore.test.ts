import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useUserStore } from './userStore'
import { getTodayFood, getTodayWater, getTodayActivity, addActivity } from '../api/client'
import type { FoodEntry, User } from '../types'

vi.mock('../api/client')
beforeEach(() => {
  vi.clearAllMocks()
  useUserStore.setState({ user: { id: 1 } as User, currentDate: '2026-09-28', foods: [], activities: [], error: null })
  vi.mocked(getTodayWater).mockResolvedValue({ total_ml: 0, date: '2026-09-28' })
  vi.mocked(getTodayActivity).mockResolvedValue([])
})
describe('общая дата двух вкладок', () => {
  it('передаёт ошибку сохранения тренировки форме и не добавляет ложную запись', async () => {
    vi.mocked(addActivity).mockRejectedValue(new Error('offline'))
    await expect(useUserStore.getState().addActivity('walking', 30)).rejects.toThrow('offline')
    expect(useUserStore.getState().activities).toEqual([])
  })
  it('поздний ответ вчерашнего дня не подменяет сегодняшний', async () => {
    let yesterday!: (value: FoodEntry[]) => void
    vi.mocked(getTodayFood).mockImplementationOnce(() => new Promise((r) => { yesterday = r }))
      .mockResolvedValueOnce([{ id: 28 } as FoodEntry])
    const old = useUserStore.getState().loadDay('2026-09-27')
    await useUserStore.getState().loadDay('2026-09-28')
    yesterday([{ id: 27 } as FoodEntry])
    await old
    expect(useUserStore.getState().foods[0].id).toBe(28)
    expect(useUserStore.getState().currentDate).toBe('2026-09-28')
  })
  it('очищает прежний день и сообщает об ошибке нового', async () => {
    useUserStore.setState({ foods: [{ id: 28 } as FoodEntry] })
    vi.mocked(getTodayFood).mockRejectedValue(new Error('offline'))
    await useUserStore.getState().loadDay('2026-09-27')
    expect(useUserStore.getState().foods).toEqual([])
    expect(useUserStore.getState().error).toBeTruthy()
  })
})
