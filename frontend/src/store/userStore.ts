// Глобальное состояние BodyImp (Zustand).
// Хранит профиль и данные ВЫБРАННОГО дня: питание, воду, активность.
import { create } from 'zustand'
import type {
  FoodEntry,
  ActivityEntry,
  User,
  ActivityType,
  FavoriteFood,
} from '../types'
import {
  getUser,
  registerUser,
  getTodayFood,
  getTodayWater,
  getTodayActivity,
  addFood as apiAddFood,
  updateFood as apiUpdateFood,
  deleteFood as apiDeleteFood,
  addWater as apiAddWater,
  addActivity as apiAddActivity,
  deleteActivity as apiDeleteActivity,
  getFavorites,
  addFavorite as apiAddFavorite,
  deleteFavorite as apiDeleteFavorite,
  type FoodAddPayload,
  type FoodUpdatePayload,
  type FavoriteAddPayload,
} from '../api/client'
import { enqueueFood, flushQueue } from '../lib/offlineQueue'
import { todayISO } from '../lib/date'

export interface Totals {
  calories: number
  protein_g: number
  fat_g: number
  carbs_g: number
}

interface UserState {
  telegramId: number | null
  user: User | null
  currentDate: string // YYYY-MM-DD — день, данные которого сейчас в стейте
  foods: FoodEntry[]
  waterMl: number
  activities: ActivityEntry[]
  favorites: FavoriteFood[]
  loading: boolean
  error: string | null

  init: (telegramId: number, username: string | null) => Promise<void>
  loadDay: (date: string) => Promise<void>
  addFood: (payload: Omit<FoodAddPayload, 'user_id' | 'date'>) => Promise<void>
  updateFood: (entryId: number, payload: FoodUpdatePayload) => Promise<void>
  removeFood: (entryId: number) => Promise<void>
  addWater: (amountMl: number) => Promise<void>
  addActivity: (type: ActivityType, durationMin: number) => Promise<void>
  removeActivity: (entryId: number) => Promise<void>
  setUser: (user: User) => void

  // Избранное
  loadFavorites: () => Promise<void>
  addFavorite: (payload: FavoriteAddPayload) => Promise<void>
  removeFavorite: (favId: number) => Promise<void>
  isFavorite: (name: string) => boolean
  favoriteByName: (name: string) => FavoriteFood | undefined

  totals: () => Totals
  burnedTotal: () => number
  netCalories: () => number
}

export const useUserStore = create<UserState>((set, get) => ({
  telegramId: null,
  user: null,
  currentDate: todayISO(),
  foods: [],
  waterMl: 0,
  activities: [],
  favorites: [],
  loading: false,
  error: null,

  // Инициализация: получаем профиль (или регистрируем) и грузим сегодняшний день.
  init: async (telegramId, username) => {
    set({ loading: true, error: null, telegramId })
    try {
      let user: User
      try {
        user = await getUser(telegramId)
      } catch {
        user = await registerUser({ telegram_id: telegramId, username })
      }
      set({ user })
      await flushQueue() // досылаем оффлайн-очередь
      await get().loadDay(todayISO())
      await get().loadFavorites()
    } catch {
      set({ error: 'Не удалось подключиться к серверу' })
    } finally {
      set({ loading: false })
    }
  },

  // Загружает данные конкретного дня и делает его текущим.
  loadDay: async (date) => {
    const { user } = get()
    set({ currentDate: date })
    if (!user) return
    try {
      const [foods, water, activities] = await Promise.all([
        getTodayFood(user.id, date),
        getTodayWater(user.id, date),
        getTodayActivity(user.id, date),
      ])
      set({ foods, waterMl: water.total_ml, activities })
    } catch {
      set({ error: 'Ошибка загрузки данных за день' })
    }
  },

  // Добавляет еду в ТЕКУЩИЙ выбранный день.
  addFood: async (payload) => {
    const { user, currentDate } = get()
    if (!user) return
    const full: FoodAddPayload = { ...payload, user_id: user.id, date: currentDate }
    try {
      const entry = await apiAddFood(full)
      set({ foods: [...get().foods, entry] })
    } catch {
      // Оффлайн: в очередь + оптимистичное отображение.
      enqueueFood(full)
      const optimistic: FoodEntry = {
        id: Date.now() * -1,
        user_id: user.id,
        date: currentDate,
        meal_type: payload.meal_type,
        name: payload.name,
        calories: payload.calories,
        protein_g: payload.protein_g,
        fat_g: payload.fat_g,
        carbs_g: payload.carbs_g,
        source: payload.source,
        base_per_100g: payload.base_per_100g,
        portion_size_g: payload.portion_size_g ?? null,
        created_at: new Date().toISOString(),
      }
      set({ foods: [...get().foods, optimistic] })
    }
  },

  // Редактирует существующую запись.
  updateFood: async (entryId, payload) => {
    try {
      const updated = await apiUpdateFood(entryId, payload)
      set({
        foods: get().foods.map((f) => (f.id === entryId ? updated : f)),
      })
    } catch {
      set({ error: 'Не удалось обновить запись' })
    }
  },

  removeFood: async (entryId) => {
    try {
      if (entryId > 0) await apiDeleteFood(entryId)
    } catch {
      /* всё равно удаляем локально */
    }
    set({ foods: get().foods.filter((f) => f.id !== entryId) })
  },

  // Вода добавляется в текущий день.
  addWater: async (amountMl) => {
    const { user, currentDate } = get()
    if (!user) return
    try {
      const res = await apiAddWater(user.id, amountMl, currentDate)
      set({ waterMl: res.total_ml })
    } catch {
      set({ waterMl: get().waterMl + amountMl })
    }
  },

  // Тренировка добавляется в текущий день.
  addActivity: async (type, durationMin) => {
    const { user, currentDate } = get()
    if (!user) return
    try {
      const entry = await apiAddActivity(user.id, type, durationMin, currentDate)
      set({ activities: [...get().activities, entry] })
    } catch {
      set({ error: 'Не удалось добавить активность' })
    }
  },

  removeActivity: async (entryId) => {
    try {
      await apiDeleteActivity(entryId)
    } catch {
      /* всё равно удаляем локально */
    }
    set({ activities: get().activities.filter((a) => a.id !== entryId) })
  },

  setUser: (user) => set({ user }),

  // ---------- Избранное ----------
  loadFavorites: async () => {
    const { user } = get()
    if (!user) return
    try {
      const favorites = await getFavorites(user.id)
      set({ favorites })
    } catch {
      /* молча — избранное не критично */
    }
  },

  addFavorite: async (payload) => {
    const { user } = get()
    if (!user) return
    try {
      const fav = await apiAddFavorite(user.id, payload)
      set({ favorites: [fav, ...get().favorites] })
    } catch {
      // Дубликат (400) или сеть — игнорируем, список не меняем.
    }
  },

  removeFavorite: async (favId) => {
    const { user } = get()
    if (!user) return
    try {
      await apiDeleteFavorite(user.id, favId)
    } catch {
      /* всё равно убираем локально */
    }
    set({ favorites: get().favorites.filter((f) => f.id !== favId) })
  },

  isFavorite: (name) =>
    get().favorites.some((f) => f.name.toLowerCase() === name.toLowerCase()),

  favoriteByName: (name) =>
    get().favorites.find((f) => f.name.toLowerCase() === name.toLowerCase()),

  // Суммарные КБЖУ за выбранный день.
  totals: () => {
    const { foods } = get()
    return foods.reduce<Totals>(
      (acc, f) => ({
        calories: acc.calories + f.calories,
        protein_g: acc.protein_g + f.protein_g,
        fat_g: acc.fat_g + f.fat_g,
        carbs_g: acc.carbs_g + f.carbs_g,
      }),
      { calories: 0, protein_g: 0, fat_g: 0, carbs_g: 0 },
    )
  },

  // Сожжённые калории за день (сумма тренировок).
  burnedTotal: () => get().activities.reduce((s, a) => s + a.calories_burned, 0),

  // Чистые калории: съедено − сожжено (вычитаем только если есть тренировки).
  netCalories: () => {
    const eaten = get().totals().calories
    const burned = get().burnedTotal()
    return burned > 0 ? eaten - burned : eaten
  },
}))
