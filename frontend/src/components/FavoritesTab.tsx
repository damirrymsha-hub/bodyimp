// Вкладка «Избранное»: список сохранённых продуктов.
// Клик по карточке — выбор количества (AmountModal), корзина — удалить из избранного.
import { useEffect, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { Star, Trash2 } from 'lucide-react'
import { useUserStore } from '../store/userStore'
import { haptic } from '../lib/telegram'
import type { FavoriteFood, SearchFood, MealType } from '../types'
import AmountModal from './AmountModal'

interface Props {
  meal: MealType
  onAdded?: () => void
}

// Превращает избранный продукт в формат для AmountModal.
function favToSearch(fav: FavoriteFood): SearchFood {
  const isPiece = fav.portion_type === 'piece'
  return {
    id: fav.id,
    name: fav.name,
    category: '',
    calories_per_100g: fav.calories,
    protein_per_100g: fav.protein_g,
    fat_per_100g: fav.fat_g,
    carbs_per_100g: fav.carbs_g,
    portion_type: fav.portion_type,
    piece_weight_g: isPiece ? fav.base_weight_g : undefined,
    default_amount: isPiece ? 1 : fav.base_weight_g || 100,
  }
}

export default function FavoritesTab({ meal, onAdded }: Props) {
  const { favorites, loadFavorites, removeFavorite } = useUserStore()
  const [selected, setSelected] = useState<SearchFood | null>(null)

  // Обновляем список при открытии вкладки.
  useEffect(() => {
    loadFavorites()
  }, [loadFavorites])

  if (favorites.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-3xl bg-card py-12 px-6 text-center text-muted shadow-card">
        <Star size={28} />
        <span className="text-sm">
          Пока нет избранных продуктов.
          <br />
          Добавляй еду через поиск или вручную и нажимай ⭐ чтобы сохранить.
        </span>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {favorites.map((fav) => (
        <div
          key={fav.id}
          onClick={() => {
            haptic('light')
            setSelected(favToSearch(fav))
          }}
          className="flex cursor-pointer items-center gap-2 rounded-3xl bg-card p-3 shadow-card active:bg-ink/[0.03]"
        >
          <Star size={18} className="shrink-0 text-yellow-400" fill="currentColor" />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold">{fav.name}</div>
            <div className="text-xs text-muted">
              {Math.round(fav.calories)} ккал /{' '}
              {fav.portion_type === 'piece' ? 'шт' : '100 г'}
            </div>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation() // не открывать выбор количества
              haptic('light')
              if (window.confirm('Убрать из избранного?')) {
                removeFavorite(fav.id)
              }
            }}
            className="flex h-9 w-9 items-center justify-center rounded-full text-muted hover:bg-ink/5"
            aria-label="Удалить из избранного"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ))}

      <AnimatePresence>
        {selected && (
          <AmountModal
            food={selected}
            initialMeal={meal}
            onClose={() => setSelected(null)}
            onAdded={onAdded}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
