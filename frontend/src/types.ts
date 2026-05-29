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
export type FoodSource = 'manual' | 'photo' | 'scan'

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
  created_at: string
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
}

export interface WeeklyStats {
  days: { date: string; calories: number }[]
  avg_calories: number
}

export interface WeightLog {
  id: number
  date: string
  weight_kg: number
}
