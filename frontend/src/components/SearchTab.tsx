// Вкладка быстрого поиска: поле поиска (дебаунс 300мс), фильтр категорий,
// карточки продуктов с кнопками ⭐ (избранное) и + (добавить через AmountModal).
import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { History, Search, Star, Plus } from 'lucide-react'
import {
  searchFoods,
  getFoodCategories,
  getFoodsByCategory,
  getRecentFoods,
} from '../api/client'
import { useUserStore } from '../store/userStore'
import { useUIStore } from '../store/uiStore'
import { haptic, hapticSuccess } from '../lib/telegram'
import type { FoodEntry, SearchFood, MealType } from '../types'
import AmountModal from './AmountModal'

interface Props {
  meal: MealType
  onAdded?: () => void
}

const ALL = 'Все'

export default function SearchTab({ meal, onAdded }: Props) {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<string>(ALL)
  const [categories, setCategories] = useState<string[]>([])
  const [results, setResults] = useState<SearchFood[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  const [selected, setSelected] = useState<SearchFood | null>(null)
  const [recents, setRecents] = useState<FoodEntry[]>([])
  const { user, addFood, isFavorite, addFavorite, removeFavorite, favoriteByName } =
    useUserStore()
  const { showToast } = useUIStore()

  // Недавние блюда — для повторного добавления в один тап.
  useEffect(() => {
    if (user) getRecentFoods(user.id).then(setRecents).catch(() => {})
  }, [user])

  async function quickAdd(entry: FoodEntry) {
    haptic('light')
    await addFood({
      meal_type: meal,
      name: entry.name,
      calories: entry.calories,
      protein_g: entry.protein_g,
      fat_g: entry.fat_g,
      carbs_g: entry.carbs_g,
      source: 'scan',
      base_per_100g: false,
      portion_size_g: entry.portion_size_g ?? null,
    })
    hapticSuccess()
    showToast('Добавлено', 'success')
    onAdded?.()
  }

  // Категории грузим один раз.
  useEffect(() => {
    getFoodCategories()
      .then(setCategories)
      .catch(() => setCategories([]))
  }, [])

  // Старый запрос не должен заменять результаты нового поиска.
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    const timer = setTimeout(async () => {
      try {
        const items = category !== ALL && !query.trim()
          ? await getFoodsByCategory(category)
          : await searchFoods(query.trim())
        if (!cancelled) setResults(category === ALL ? items : items.filter((f) => f.category === category))
      } catch {
        if (!cancelled) setError('Не удалось загрузить продукты.')
      } finally { if (!cancelled) setLoading(false) }
    }, 300)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [query, category, retry])

  const chips = useMemo(() => [ALL, ...categories], [categories])

  function toggleFav(food: SearchFood) {
    haptic('light')
    if (isFavorite(food.name)) {
      const fav = favoriteByName(food.name)
      if (fav) removeFavorite(fav.id)
    } else {
      addFavorite({
        name: food.name,
        calories: food.calories_per_100g,
        protein_g: food.protein_per_100g,
        fat_g: food.fat_per_100g,
        carbs_g: food.carbs_per_100g,
        portion_type: food.portion_type,
        base_weight_g:
          food.portion_type === 'piece' ? food.piece_weight_g ?? 100 : 100,
      })
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Поле поиска */}
      <div className="flex items-center gap-2 rounded-2xl bg-card px-4 py-3 shadow-card">
        <Search size={18} className="text-muted" />
        <input
          aria-label="Поиск продукта"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Поиск продукта"
          className="w-full bg-transparent text-base"
        />
      </div>

      {/* Фильтр категорий */}
      <div className="no-scrollbar flex gap-2 overflow-x-auto">
        {chips.map((c) => (
          <button
            key={c}
            aria-pressed={category === c}
            onClick={() => {
              haptic('light')
              setCategory(c)
            }}
            className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium ${
              category === c ? 'bg-ink text-white' : 'bg-card text-ink shadow-card'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Недавние — добавление в один тап */}
      {!query.trim() && category === ALL && recents.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-1.5 px-1 text-xs font-semibold uppercase tracking-wider text-muted">
            <History size={12} /> Недавние
          </div>
          {recents.map((r) => (
            <div
              key={r.id}
              className="flex items-center gap-2 rounded-3xl bg-card p-3 shadow-card"
            >
              <div className="min-w-0 flex-1">
                <div className="break-words text-sm font-semibold">{r.name}</div>
                <div className="text-xs font-medium text-muted">
                  {Math.round(r.calories)} ккал · Б {Math.round(r.protein_g)} · Ж{' '}
                  {Math.round(r.fat_g)} · У {Math.round(r.carbs_g)}
                </div>
              </div>
              <button
                onClick={() => quickAdd(r)}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-ink text-white"
                aria-label="Добавить снова"
              >
                <Plus size={18} />
              </button>
            </div>
          ))}
          <div className="px-1 text-xs font-semibold uppercase tracking-wider text-muted">
            База продуктов
          </div>
        </div>
      )}

      {/* Результаты */}
      {loading && <p role="status" className="py-6 text-center text-sm text-muted">Ищем продукты…</p>}
      {error && <div role="alert" className="py-4 text-center text-sm"><p>{error}</p><button onClick={() => setRetry((n) => n + 1)} className="mt-2 rounded-xl bg-ink px-4 text-white">Повторить</button></div>}
      <div className="flex flex-col gap-2">
        {!loading && !error && results.map((f) => {
          const fav = isFavorite(f.name)
          return (
            <div
              key={f.id}
              className="flex items-center gap-2 rounded-3xl bg-card p-3 shadow-card"
            >
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold">{f.name}</div>
                <div className="text-xs text-muted">
                  {f.calories_per_100g} ккал / 100 г ·{' '}
                  {f.portion_type === 'piece' ? 'шт' : 'г'}
                </div>
              </div>
              {/* Избранное */}
              <button
                onClick={() => toggleFav(f)}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full hover:bg-ink/5"
                aria-pressed={fav} aria-label={(fav ? "Убрать из избранного: " : "В избранное: ") + f.name}
              >
                <Star
                  size={18}
                  className={fav ? 'text-yellow-400' : 'text-muted'}
                  fill={fav ? 'currentColor' : 'none'}
                />
              </button>
              {/* Добавить */}
              <button
                onClick={() => {
                  haptic('light')
                  setSelected(f)
                }}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-ink text-white"
                aria-label={"Добавить: " + f.name}
              >
                <Plus size={18} />
              </button>
            </div>
          )
        })}
        {!loading && !error && results.length === 0 && (
          <div className="py-8 text-center text-sm text-muted">
            Ничего не найдено
          </div>
        )}
      </div>

      {/* Модал количества */}
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
