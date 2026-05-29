// Элемент списка еды за день: название, тип приёма, ккал + кнопка удаления.
import { Trash2 } from 'lucide-react'
import type { FoodEntry, MealType } from '../types'
import { haptic } from '../lib/telegram'

const MEAL_LABELS: Record<MealType, string> = {
  breakfast: 'Завтрак',
  lunch: 'Обед',
  dinner: 'Ужин',
  snack: 'Перекус',
}

interface Props {
  entry: FoodEntry
  onDelete: (id: number) => void
  onEdit: (entry: FoodEntry) => void
}

export default function FoodItem({ entry, onDelete, onEdit }: Props) {
  return (
    // Клик по строке открывает форму редактирования.
    <div
      onClick={() => {
        haptic('light')
        onEdit(entry)
      }}
      className="flex cursor-pointer items-center gap-3 rounded-3xl bg-card p-4 shadow-card active:bg-ink/[0.03]"
    >
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-ink">{entry.name}</div>
        <div className="mt-0.5 text-xs text-muted">
          {MEAL_LABELS[entry.meal_type]} · Б {Math.round(entry.protein_g)} · Ж{' '}
          {Math.round(entry.fat_g)} · У {Math.round(entry.carbs_g)}
        </div>
      </div>
      <div className="text-right">
        <div className="text-sm font-bold">{Math.round(entry.calories)}</div>
        <div className="text-[10px] text-muted">ккал</div>
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation() // не открывать редактирование при быстром удалении
          haptic('light')
          onDelete(entry.id)
        }}
        className="flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-ink/5"
        aria-label="Удалить"
      >
        <Trash2 size={16} />
      </button>
    </div>
  )
}
