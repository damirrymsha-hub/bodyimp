// Мини-форма выбора количества с живым пересчётом КБЖУ.
// Используется и в поиске, и в избранном. Граммы или штуки — по portion_type.
import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { X, Minus, Plus } from 'lucide-react'
import { useUserStore } from '../store/userStore'
import { useUIStore } from '../store/uiStore'
import { haptic, hapticSuccess } from '../lib/telegram'
import type { SearchFood, MealType } from '../types'

const MEALS: { value: MealType; label: string }[] = [
  { value: 'breakfast', label: 'Завтрак' },
  { value: 'lunch', label: 'Обед' },
  { value: 'dinner', label: 'Ужин' },
  { value: 'snack', label: 'Перекус' },
]

interface Props {
  food: SearchFood
  initialMeal?: MealType
  onClose: () => void
  // Вызывается после успешного добавления (чтобы родитель мог закрыться).
  onAdded?: () => void
}

export default function AmountModal({ food, initialMeal = 'snack', onClose, onAdded }: Props) {
  const isPiece = food.portion_type === 'piece'
  const step = isPiece ? 1 : 10
  const minVal = isPiece ? 1 : 10
  const [amount, setAmount] = useState<number>(food.default_amount || (isPiece ? 1 : 100))
  const [meal, setMeal] = useState<MealType>(initialMeal)
  const { addFood } = useUserStore()
  const { showToast } = useUIStore()

  // Пересчёт КБЖУ в реальном времени.
  const calc = useMemo(() => {
    const factor = isPiece
      ? (amount * (food.piece_weight_g || 100)) / 100 // штуки → граммы → доли 100 г
      : amount / 100
    return {
      calories: Math.round(food.calories_per_100g * factor),
      protein: Math.round(food.protein_per_100g * factor * 10) / 10,
      fat: Math.round(food.fat_per_100g * factor * 10) / 10,
      carbs: Math.round(food.carbs_per_100g * factor * 10) / 10,
      total_g: Math.round(isPiece ? amount * (food.piece_weight_g || 100) : amount),
    }
  }, [amount, food, isPiece])

  async function confirm() {
    if (amount <= 0) return
    haptic('light')
    await addFood({
      meal_type: meal,
      name: food.name,
      calories: calc.calories,
      protein_g: calc.protein,
      fat_g: calc.fat,
      carbs_g: calc.carbs,
      source: 'scan',
      base_per_100g: false,
      portion_size_g: calc.total_g,
    })
    hapticSuccess()
    showToast('Добавлено', 'success')
    onAdded?.()
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-t-[2rem] bg-bg p-5 pb-8"
      >
        <div className="mb-3 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold">{food.name}</h2>
            <div className="text-xs text-muted">
              {food.calories_per_100g} ккал / 100 г
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-ink/5"
          >
            <X size={18} />
          </button>
        </div>

        {/* Количество */}
        <span className="mb-1 block text-xs font-medium text-muted">
          {isPiece ? 'Количество (штук)' : 'Количество (граммов)'}
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              haptic('light')
              setAmount((a) => Math.max(minVal, a - step))
            }}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-card shadow-card"
          >
            <Minus size={18} />
          </button>
          <div className="relative flex-1">
            <input
              type="number"
              value={amount}
              min={minVal}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="input text-center"
            />
            <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted">
              {isPiece ? 'шт' : 'г'}
            </span>
          </div>
          <button
            onClick={() => {
              haptic('light')
              setAmount((a) => a + step)
            }}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-card shadow-card"
          >
            <Plus size={18} />
          </button>
        </div>

        {/* Превью КБЖУ — обновляется в реальном времени */}
        <div className="mt-4 grid grid-cols-4 gap-2 rounded-2xl bg-ink/5 p-3 text-center">
          <Stat label="ккал" value={calc.calories} accent />
          <Stat label="Б, г" value={calc.protein} />
          <Stat label="Ж, г" value={calc.fat} />
          <Stat label="У, г" value={calc.carbs} />
        </div>
        {isPiece && (
          <div className="mt-1 text-center text-xs text-muted">≈ {calc.total_g} г</div>
        )}

        {/* Выбор приёма пищи */}
        <div className="no-scrollbar mt-4 flex gap-2 overflow-x-auto">
          {MEALS.map((m) => (
            <button
              key={m.value}
              onClick={() => setMeal(m.value)}
              className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium ${
                meal === m.value ? 'bg-ink text-white' : 'bg-card text-ink'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        <button
          onClick={confirm}
          className="mt-5 w-full rounded-2xl bg-ink py-4 text-sm font-semibold text-white"
        >
          Добавить · {calc.calories} ккал
        </button>
      </motion.div>
    </div>
  )
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string
  value: number
  accent?: boolean
}) {
  return (
    <div>
      <div className={`text-base font-bold ${accent ? 'text-steps' : ''}`}>{value}</div>
      <div className="text-[10px] text-muted">{label}</div>
    </div>
  )
}
