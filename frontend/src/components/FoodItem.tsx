// Строка еды (редизайн 1a): название + мета, ккал числом, ⭐ избранное.
// Тап по строке — редактирование (там же и удаление записи).
import { Star } from 'lucide-react'
import type { FoodEntry, MealType } from '../types'
import { haptic } from '../lib/telegram'
import { useUserStore } from '../store/userStore'

const MEAL_LABELS: Record<MealType, string> = {
  breakfast: 'Завтрак',
  lunch: 'Обед',
  dinner: 'Ужин',
  snack: 'Перекус',
}

interface Props {
  entry: FoodEntry
  onEdit: (entry: FoodEntry) => void
}

export default function FoodItem({ entry, onEdit }: Props) {
  const { isFavorite, favoriteByName, addFavorite, removeFavorite } = useUserStore()
  const fav = isFavorite(entry.name)

  // Переключить избранное по этой записи (значения берём из записи).
  function toggleFav(e: React.MouseEvent) {
    e.stopPropagation() // не открывать редактирование
    haptic('light')
    if (fav) {
      const f = favoriteByName(entry.name)
      if (f) removeFavorite(f.id)
    } else {
      addFavorite({
        name: entry.name,
        calories: entry.calories,
        protein_g: entry.protein_g,
        fat_g: entry.fat_g,
        carbs_g: entry.carbs_g,
        portion_type: 'grams',
        base_weight_g: 100,
      })
    }
  }

  return (
    <div
      onClick={() => {
        haptic('light')
        onEdit(entry)
      }}
      className="flex cursor-pointer items-center gap-3 rounded-3xl bg-card p-4 shadow-card active:bg-ink/[0.03]"
    >
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-ink">{entry.name}</div>
        <div className="mt-0.5 text-[11px] font-medium text-muted">
          {MEAL_LABELS[entry.meal_type]} · Б {Math.round(entry.protein_g)} · Ж{' '}
          {Math.round(entry.fat_g)} · У {Math.round(entry.carbs_g)}
        </div>
      </div>
      <div className="text-sm font-bold">{Math.round(entry.calories)}</div>
      <button
        onClick={toggleFav}
        className="flex h-8 w-8 items-center justify-center rounded-full"
        aria-label="В избранное"
      >
        <Star
          size={16}
          className={fav ? 'text-yellow-400' : 'text-ink/20'}
          fill={fav ? 'currentColor' : 'none'}
        />
      </button>
    </div>
  )
}
