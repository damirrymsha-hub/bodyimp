// HTTP-клиент BodyImp на axios + типизированные методы API.
import axios from 'axios'
import type {
  User,
  FoodEntry,
  WaterToday,
  PhotoAnalysisResult,
  WeeklyStats,
  WeightLog,
  MealType,
  FoodSource,
  Gender,
  Goal,
  ActivityLevel,
  ActivityEntry,
  ActivityType,
  FavoriteFood,
  SearchFood,
  PortionType,
} from '../types'

import { getInitData } from '../lib/telegram'
import { clearSession, getSession } from '../lib/auth'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  // Без таймаута зависший запрос ждёт вечно, и приложение выглядит «мёртвым».
  // Бэкенд на бесплатном тарифе может просыпаться до ~30 секунд.
  timeout: 45000,
})

// Последняя ошибка запроса — показывается на экране диагностики.
export interface LastApiError {
  url?: string
  status: number | null
  reason?: string
  code?: string
  message: string
  at: string
}

let lastApiError: LastApiError | null = null

export function getLastApiError(): LastApiError | null {
  return lastApiError
}

// Аутентификация каждого запроса. Шлём ОБА заголовка, когда они есть:
// сервер сначала проверяет подпись Telegram, а если она потерялась или
// устарела — принимает JWT. Так сессия переживает перезагрузку WebView.
//
// Тело перехватчика обёрнуто в try: исключение здесь (например запрещённый
// доступ к хранилищу в WebView) отменило бы запрос ещё до отправки, и это
// выглядело бы как отсутствие интернета.
api.interceptors.request.use((config) => {
  try {
    const initData = getInitData()
    if (initData) config.headers['X-Telegram-Init-Data'] = initData
    const session = getSession()
    if (session) config.headers['Authorization'] = `Bearer ${session.token}`
  } catch {
    /* запрос уйдёт без авторизации — сервер ответит понятной 401 */
  }
  return config
})

api.interceptors.response.use(
  (r) => r,
  (error) => {
    try {
      lastApiError = {
        url: error?.config?.url,
        status: error?.response?.status ?? null,
        reason: error?.response?.data?.reason ?? error?.response?.data?.detail,
        code: error?.code,
        message: String(error?.message ?? 'unknown'),
        at: new Date().toISOString(),
      }
      // Протухший JWT в браузере (без подписи Telegram) → назад на экран входа.
      if (
        error?.response?.status === 401 &&
        !getInitData() &&
        getSession() !== null
      ) {
        clearSession()
        window.location.reload()
      }
    } catch {
      /* диагностика не должна ломать обработку ошибки */
    }
    return Promise.reject(error)
  },
)

// ---------- Аутентификация (PWA) ----------
// Данные, которые Telegram Login Widget передаёт в onauth-колбэк.
export interface LoginWidgetUser {
  id: number
  first_name?: string
  last_name?: string
  username?: string
  photo_url?: string
  auth_date: number
  hash: string
}

export interface LoginResponse {
  token: string
  telegram_id: number
  username: string | null
  needs_onboarding: boolean
}

export async function telegramLogin(
  widgetUser: LoginWidgetUser,
): Promise<LoginResponse> {
  const { data } = await api.post<LoginResponse>(
    '/api/auth/telegram-login',
    widgetUser,
  )
  return data
}

// Меняет подпись мини-приложения на JWT-сессию (живёт 30 дней).
// Нужно потому, что подпись Telegram отдаёт один раз в адресной строке,
// и клиент легко её теряет при перезагрузке WebView.
export async function exchangeInitData(initData: string): Promise<LoginResponse> {
  const { data } = await api.post<LoginResponse>('/api/auth/telegram-initdata', {
    init_data: initData,
  })
  return data
}

// Username бота — нужен виджету входа (data-telegram-login).
export async function getBotInfo(): Promise<{ username: string }> {
  const { data } = await api.get<{ username: string }>('/api/auth/bot-info')
  return data
}

// ---------- Пользователь ----------
export interface RegisterPayload {
  telegram_id: number
  username?: string | null
  gender?: Gender
  age?: number
  height_cm?: number
  weight_kg?: number
  goal?: Goal
  activity_level?: ActivityLevel
  notifications_enabled?: boolean
  adaptive_tdee?: boolean
}

export async function registerUser(payload: RegisterPayload): Promise<User> {
  const { data } = await api.post<User>('/api/users/register', payload)
  return data
}

export async function getUser(telegramId: number): Promise<User> {
  const { data } = await api.get<User>(`/api/users/${telegramId}`)
  return data
}

// Ручная установка дневной нормы воды (500–5000 мл).
export async function updateWaterGoal(
  telegramId: number,
  ml: number,
): Promise<User> {
  const { data } = await api.put<User>(`/api/users/${telegramId}/water-goal`, { ml })
  return data
}

export async function updateUser(
  telegramId: number,
  payload: Partial<RegisterPayload>,
): Promise<User> {
  const { data } = await api.put<User>(`/api/users/${telegramId}`, payload)
  return data
}

// ---------- Питание ----------
export interface FoodAddPayload {
  user_id: number
  meal_type: MealType
  name: string
  calories: number
  protein_g: number
  fat_g: number
  carbs_g: number
  source: FoodSource
  date?: string
  base_per_100g?: boolean
  portion_size_g?: number | null
}

// Поля для редактирования записи (все опциональны).
export type FoodUpdatePayload = Partial<
  Omit<FoodAddPayload, 'user_id' | 'date' | 'source'>
>

export async function addFood(payload: FoodAddPayload): Promise<FoodEntry> {
  const { data } = await api.post<FoodEntry>('/api/food/add', payload)
  return data
}

export async function updateFood(
  entryId: number,
  payload: FoodUpdatePayload,
): Promise<FoodEntry> {
  const { data } = await api.put<FoodEntry>(`/api/food/${entryId}`, payload)
  return data
}

// Загрузка питания за конкретную дату (по умолчанию — сегодня).
export async function getTodayFood(
  userId: number,
  date?: string,
): Promise<FoodEntry[]> {
  const { data } = await api.get<FoodEntry[]>(`/api/food/today/${userId}`, {
    params: date ? { date } : undefined,
  })
  return data
}

export async function getFoodHistory(
  userId: number,
  date: string,
): Promise<FoodEntry[]> {
  const { data } = await api.get<FoodEntry[]>(
    `/api/food/history/${userId}`,
    { params: { date } },
  )
  return data
}

export async function deleteFood(entryId: number): Promise<void> {
  await api.delete(`/api/food/${entryId}`)
}

// «Повторить вчера»: копирует записи одного дня в другой.
export async function copyDay(
  userId: number,
  fromDate: string,
  toDate: string,
): Promise<FoodEntry[]> {
  const { data } = await api.post<FoodEntry[]>('/api/food/copy-day', {
    user_id: userId,
    from_date: fromDate,
    to_date: toDate,
  })
  return data
}

// Недавние блюда без повторов (для быстрого добавления в поиске).
export async function getRecentFoods(
  userId: number,
  limit = 8,
): Promise<FoodEntry[]> {
  const { data } = await api.get<FoodEntry[]>(`/api/food/recent/${userId}`, {
    params: { limit },
  })
  return data
}

// Стрик дневника: сколько дней подряд есть записи еды.
export async function getStreak(userId: number): Promise<number> {
  const { data } = await api.get<{ streak: number }>(`/api/stats/streak/${userId}`)
  return data.streak
}

// ---------- Анализ фото ----------
// Бэкенд отвечает {success, data} | {success:false, error, message}.
// Нормализуем к PhotoAnalysisResult (с полем error при неудаче).
interface PhotoAnalyzeResponse {
  success: boolean
  data?: PhotoAnalysisResult
  error?: string
  message?: string
}

export async function analyzePhoto(
  imageBase64: string,
  mimeType = 'image/jpeg',
): Promise<PhotoAnalysisResult> {
  const { data } = await api.post<PhotoAnalyzeResponse>('/api/analyze/photo', {
    image_base64: imageBase64,
    mime_type: mimeType,
  })
  if (data.success && data.data) return data.data
  return { error: data.error ?? 'no_food', detail: data.message }
}

// Анализ текстового описания еды («2 яйца и тост») — тот же формат ответа.
export async function analyzeText(
  description: string,
): Promise<PhotoAnalysisResult> {
  const { data } = await api.post<PhotoAnalyzeResponse>('/api/analyze/text', {
    description,
  })
  if (data.success && data.data) return data.data
  return { error: data.error ?? 'no_food', detail: data.message }
}

// ---------- Вода ----------
export async function addWater(
  userId: number,
  amountMl: number,
  date?: string,
): Promise<WaterToday> {
  const { data } = await api.post<WaterToday>('/api/water/add', {
    user_id: userId,
    amount_ml: amountMl,
    date,
  })
  return data
}

export async function getTodayWater(
  userId: number,
  date?: string,
): Promise<WaterToday> {
  const { data } = await api.get<WaterToday>(`/api/water/today/${userId}`, {
    params: date ? { date } : undefined,
  })
  return data
}

// ---------- Активность ----------
export async function addActivity(
  userId: number,
  activityType: ActivityType,
  durationMin: number,
  date?: string,
): Promise<ActivityEntry> {
  const { data } = await api.post<ActivityEntry>('/api/activity/add', {
    user_id: userId,
    activity_type: activityType,
    duration_min: durationMin,
    date,
  })
  return data
}

export async function getTodayActivity(
  userId: number,
  date?: string,
): Promise<ActivityEntry[]> {
  const { data } = await api.get<ActivityEntry[]>(
    `/api/activity/today/${userId}`,
    { params: date ? { date } : undefined },
  )
  return data
}

export async function deleteActivity(entryId: number): Promise<void> {
  await api.delete(`/api/activity/${entryId}`)
}

// ---------- Избранное ----------
export interface FavoriteAddPayload {
  name: string
  calories: number
  protein_g: number
  fat_g: number
  carbs_g: number
  portion_type?: PortionType
  base_weight_g?: number
}

export async function getFavorites(userId: number): Promise<FavoriteFood[]> {
  const { data } = await api.get<FavoriteFood[]>(`/api/favorites/${userId}`)
  return data
}

export async function addFavorite(
  userId: number,
  payload: FavoriteAddPayload,
): Promise<FavoriteFood> {
  const { data } = await api.post<FavoriteFood>(`/api/favorites/${userId}`, payload)
  return data
}

export async function deleteFavorite(
  userId: number,
  foodId: number,
): Promise<void> {
  await api.delete(`/api/favorites/${userId}/${foodId}`)
}

// ---------- Поиск по базе продуктов ----------
export async function searchFoods(q: string): Promise<SearchFood[]> {
  const { data } = await api.get<SearchFood[]>('/api/food-search/', {
    params: { q },
  })
  return data
}

export async function getFoodCategories(): Promise<string[]> {
  const { data } = await api.get<string[]>('/api/food-search/categories')
  return data
}

export async function getFoodsByCategory(category: string): Promise<SearchFood[]> {
  const { data } = await api.get<SearchFood[]>(
    `/api/food-search/category/${encodeURIComponent(category)}`,
  )
  return data
}

// ---------- Штрихкод (Open Food Facts) ----------
export interface BarcodeProduct {
  found: boolean
  code?: string
  name?: string
  brand?: string | null
  calories_per_100g?: number
  protein_per_100g?: number
  fat_per_100g?: number
  carbs_per_100g?: number
  serving_g?: number | null
}

export async function lookupBarcode(code: string): Promise<BarcodeProduct> {
  const { data } = await api.get<BarcodeProduct>(
    `/api/barcode/${encodeURIComponent(code)}`,
  )
  return data
}

// ---------- Обратная связь по распознаванию (датасет качества) ----------
export interface AnalysisFeedbackPayload {
  user_id?: number | null
  source: 'photo' | 'text' | 'barcode'
  input_text?: string | null
  method?: string | null
  ai_name?: string | null
  ai_calories: number
  ai_protein_g: number
  ai_fat_g: number
  ai_carbs_g: number
  final_name?: string | null
  final_calories: number
  final_protein_g: number
  final_fat_g: number
  final_carbs_g: number
  edited: boolean
}

export async function sendAnalysisFeedback(
  payload: AnalysisFeedbackPayload,
): Promise<void> {
  // fire-and-forget: сбой фидбека не должен мешать пользователю
  try {
    await api.post('/api/feedback/analysis', payload)
  } catch {
    /* ignore */
  }
}

// ---------- Прогресс ----------
export async function getWeeklyStats(userId: number): Promise<WeeklyStats> {
  const { data } = await api.get<WeeklyStats>(`/api/stats/weekly/${userId}`)
  return data
}

export async function logWeight(
  userId: number,
  weightKg: number,
): Promise<WeightLog> {
  const { data } = await api.post<WeightLog>('/api/weight/log', {
    user_id: userId,
    weight_kg: weightKg,
  })
  return data
}

export async function getWeightHistory(userId: number): Promise<WeightLog[]> {
  const { data } = await api.get<WeightLog[]>(`/api/weight/history/${userId}`)
  return data
}
