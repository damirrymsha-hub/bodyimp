// Зеркало серверной логики расчёта КБЖУ (backend/services/nutrition_calc.py).
// Нужно для мгновенного превью норм в профиле без запроса к API.
// При расхождениях источник истины — бэкенд (значения, сохранённые в БД).

export interface NutritionResult {
  bmr: number
  tdee: number
  targetCalories: number
  proteinG: number
  fatG: number
  carbsG: number
  waterMl: number
  bmi: number
  bmiCategory: string
  adjustment: number
  notes: string[]
}

const PAL: Record<string, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
}

export function calculateNutrition(params: {
  gender: 'male' | 'female'
  age: number
  height_cm: number
  weight_kg: number
  activity_level: string
  goal: 'lose' | 'maintain' | 'gain'
}): NutritionResult {
  const { gender, age, height_cm, weight_kg, activity_level, goal } = params

  // BMR (Миффлин-Сан Жеор)
  const bmr =
    gender === 'male'
      ? Math.round(10 * weight_kg + 6.25 * height_cm - 5 * age + 5)
      : Math.round(10 * weight_kg + 6.25 * height_cm - 5 * age - 161)

  // TDEE
  const pal = PAL[activity_level] || 1.2
  const tdee = Math.round(bmr * pal)

  // BMI
  const heightM = height_cm / 100
  const bmi = Math.round((weight_kg / (heightM * heightM)) * 10) / 10
  const bmiCategory =
    bmi < 18.5
      ? 'Дефицит веса'
      : bmi < 25
        ? 'Норма'
        : bmi < 30
          ? 'Избыточный вес'
          : bmi < 35
            ? 'Ожирение I'
            : 'Ожирение II+'

  // Корректировка калорий
  const notes: string[] = []
  let adjustment = 0
  if (goal === 'lose') {
    adjustment = bmi < 18.5 ? -200 : bmi < 25 ? -300 : bmi < 30 ? -500 : -600
    const maxDeficit = Math.round(tdee * 0.25)
    if (Math.abs(adjustment) > maxDeficit) adjustment = -maxDeficit
    notes.push(`Дефицит ${Math.abs(adjustment)} ккал/день`)
  } else if (goal === 'gain') {
    adjustment = bmi >= 30 ? 0 : bmi >= 25 ? 200 : weight_kg < 60 ? 500 : 300
    if (adjustment > 0) notes.push(`Профицит ${adjustment} ккал/день`)
  } else {
    notes.push('Калории на уровне TDEE для поддержания веса')
  }

  const targetCalories = Math.max(
    gender === 'male' ? 1500 : 1200,
    tdee + adjustment,
  )

  // Белок
  const proteinPerKg = goal === 'lose' ? 2.0 : goal === 'gain' ? 1.8 : 1.6
  const proteinG = Math.round(weight_kg * proteinPerKg)

  // Жиры
  const fatG = Math.max(
    Math.round(weight_kg * 0.9),
    Math.round((targetCalories * 0.25) / 9),
  )

  // Углеводы (остаток, минимум 50 г)
  const carbsG = Math.max(
    50,
    Math.round((targetCalories - proteinG * 4 - fatG * 9) / 4),
  )

  // Вода
  const activityWater: Record<string, number> = {
    sedentary: 0,
    light: 200,
    moderate: 400,
    active: 600,
    very_active: 800,
  }
  const goalWater: Record<string, number> = { lose: 200, maintain: 0, gain: 100 }
  const waterMl = Math.min(
    4000,
    Math.max(
      1500,
      Math.round(
        (weight_kg * 35 + (activityWater[activity_level] || 0) + (goalWater[goal] || 0)) /
          50,
      ) * 50,
    ),
  )

  return {
    bmr,
    tdee,
    targetCalories,
    proteinG,
    fatG,
    carbsG,
    waterMl,
    bmi,
    bmiCategory,
    adjustment,
    notes,
  }
}
