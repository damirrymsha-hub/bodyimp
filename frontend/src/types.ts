// Общие типы данных BodyImp.

export type Gender = 'male' | 'female'
export type Goal = 'lose' | 'maintain' | 'gain'
export type ActivityLevel =
  | 'sedentary'
  | 'light'
  | 'moderate'
  | 'active'
  | 'very_active'
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'
export type FoodSource = 'manual' | 'photo' | 'scan' | 'text'

export interface User {
  id: number
  telegram_id: number
  username: string | null
  gender: Gender | null
  age: number | null
  height_cm: number | null
  weight_kg: number | null
  goal: Goal | null
  activity_level: ActivityLevel | null
  daily_calories: number | null
  daily_protein_g: number | null
  daily_fat_g: number | null
  daily_carbs_g: number | null
  daily_water_ml: number | null
  created_at: string
  // Вычисляемые поля (приходят с бэкенда, в БД не хранятся).
  bmr?: number | null
  tdee?: number | null
  bmi?: number | null
  bmi_category?: string | null
  notes?: string[] | null
}

export interface FoodEntry {
  id: number
  user_id: number
  date: string
  meal_type: MealType
  name: string
  calories: number
  protein_g: number
  fat_g: number
  carbs_g: number
  source: FoodSource
  base_per_100g?: boolean
  portion_size_g?: number | null
  created_at: string
}

export type ActivityType =
  | 'walking'
  | 'running'
  | 'cycling'
  | 'swimming'
  | 'strength'

export interface ActivityEntry {
  id: number
  user_id: number
  date: string
  activity_type: ActivityType
  duration_min: number
  calories_burned: number
  created_at: string
}

// Тип порции продукта: вводить граммы или штуки.
export type PortionType = 'grams' | 'piece'

// Продукт из встроенной базы поиска (значения на 100 г).
export interface SearchFood {
  id: number
  name: string
  category: string
  calories_per_100g: number
  protein_per_100g: number
  fat_per_100g: number
  carbs_per_100g: number
  portion_type: PortionType
  piece_weight_g?: number // вес 1 шт (для portion_type='piece')
  default_amount: number  // граммов или штук по умолчанию
}

// Избранный продукт пользователя (хранится на бэкенде).
export interface FavoriteFood {
  id: number
  user_id: number
  name: string
  calories: number      // базовые значения (на 100 г или на 1 шт)
  protein_g: number
  fat_g: number
  carbs_g: number
  portion_type: PortionType
  base_weight_g: number // основа в граммах (100) либо вес 1 шт
  created_at: string
}

export interface WaterToday {
  total_ml: number
  date: string
}

export interface PhotoAnalysisResult {
  name?: string
  portion_g?: number
  calories?: number
  protein_g?: number
  fat_g?: number
  carbs_g?: number
  confidence?: string
  items?: string[]
  error?: string
  detail?: string
  method?: string // диагностика пайплайна (rag:3/3 и т.п.)
}

export interface WeeklyStats {
  days: { date: string; calories: number }[]
  avg_calories: number
  avg_protein_g?: number
  avg_fat_g?: number
  avg_carbs_g?: number
}

export interface WeightLog {
  id: number
  date: string
  weight_kg: number
}
