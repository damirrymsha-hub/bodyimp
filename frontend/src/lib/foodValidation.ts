interface ManualFood {
  name: string
  calories: number
  protein_g: number
  fat_g: number
  carbs_g: number
}

// Проверяем итоговую порцию без загрузки библиотеки схем для пяти полей.
export function validateManualFood(food: ManualFood, quantity: number): string | null {
  if (!food.name.trim()) return 'Введите название'
  if (!Number.isFinite(quantity) || quantity <= 0) return 'Укажите количество больше нуля'
  for (const field of ['calories', 'protein_g', 'fat_g', 'carbs_g'] as const) {
    const value = food[field]
    if (!Number.isFinite(value) || value < 0 || value > (field === 'calories' ? 10000 : 1000)) {
      return 'Проверьте калории и БЖУ: значения должны быть неотрицательными и соответствовать порции'
    }
  }
  return null
}
