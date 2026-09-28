// Строка еды в дневнике: светофор плотности, название, порция и макросы,
// ккал и ⭐ избранное. Приём пищи не дублируем — он в заголовке секции.
import { Star } from 'lucide-react'
import type { FoodEntry } from '../types'
import { haptic } from '../lib/telegram'
import { useUserStore } from '../store/userStore'

interface Props {
  entry: FoodEntry
  onEdit: (entry: FoodEntry) => void
}

// Светофор (как у Noom): цвет по калорийной плотности, ккал на грамм.
// зелёный < 1.0 · жёлтый 1.0–2.4 · красный ≥ 2.4. Без веса порции — не показываем.
function densityColor(entry: FoodEntry): string | null {
  const g = entry.portion_size_g
  if (!g || g <= 0 || !entry.calories) return null
  const d = entry.calories / g
  if (d < 1.0) return 'bg-emerald-500'
  if (d < 2.4) return 'bg-amber-400'
  return 'bg-red-500'
}

export default function FoodItem({ entry, onEdit }: Props) {
  const { isFavorite, favoriteByName, addFavorite, removeFavorite } = useUserStore()
  const fav = isFavorite(entry.name)
  const dot = densityColor(entry)

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
    <div className="flex items-center gap-2 rounded-2xl bg-card px-2 py-1">
      <button onClick={() => { haptic('light'); onEdit(entry) }} aria-label={`Редактировать: ${entry.name}`} className="flex min-w-0 flex-1 items-center gap-3 rounded-xl py-2 text-left">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          {dot && <span className={`h-2 w-2 shrink-0 rounded-full ${dot}`} aria-hidden />}
          <span className="break-words text-sm font-semibold text-ink">{entry.name}</span>
        </div>
        <div className="mt-0.5 text-xs font-medium text-muted">
          {entry.portion_size_g ? `${Math.round(entry.portion_size_g)} г · ` : ''}
          Б {Math.round(entry.protein_g)} · Ж {Math.round(entry.fat_g)} · У{' '}
          {Math.round(entry.carbs_g)}
        </div>
      </div>
      <div className="shrink-0 text-right text-sm font-bold">{Math.round(entry.calories)}<span className="block text-xs font-normal text-muted">ккал</span></div>
      </button>
      {/* Разделитель, чтобы промах по звезде не открывал редактирование */}
      <span className="h-6 w-px shrink-0 bg-ink/[0.07]" aria-hidden />
      <button
        onClick={toggleFav}
        className="-mr-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
        aria-label={(fav ? 'Убрать из избранного: ' : 'В избранное: ') + entry.name}
        aria-pressed={fav}
      >
        <Star
          size={18}
          className={fav ? 'text-yellow-400' : 'text-ink/35'}
          fill={fav ? 'currentColor' : 'none'}
        />
      </button>
    </div>
  )
}
