// Главный экран (редизайн 1a): питание одной карточкой (кольцо + макросы),
// вода и активность — сетка 2×1, единый шаг секций 16px.
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { Plus, UtensilsCrossed } from 'lucide-react'
import { useUserStore } from '../store/userStore'
import { useUIStore } from '../store/uiStore'
import { haptic } from '../lib/telegram'
import { dayParts } from '../lib/date'
import CalendarStrip from '../components/CalendarStrip'
import NutritionRing from '../components/NutritionRing'
import WaterCard from '../components/WaterCard'
import ActivityCard, { ActivityRows } from '../components/ActivityCard'
import FoodItem from '../components/FoodItem'
import AddFood from './AddFood'
import type { FoodEntry } from '../types'

export default function Home() {
  const navigate = useNavigate()
  const { user, foods, totals, netCalories, loadDay } = useUserStore()
  const { selectedDate } = useUIStore()
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState<FoodEntry | null>(null)

  // Перезагружаем данные при смене выбранной даты в календаре.
  useEffect(() => {
    if (user) loadDay(selectedDate)
  }, [selectedDate, user, loadDay])

  if (!user) return null
  const t = totals()
  const net = netCalories()
  const calGoal = user.daily_calories ?? 2000
  const { weekday, label } = dayParts(selectedDate)
  const initial = (user.username?.[0] ?? 'Я').toUpperCase()

  return (
    <div className="relative min-h-screen px-5 pb-28 pt-6">
      <div className="flex flex-col gap-4">
        {/* Шапка: день недели + дата, аватар-инициал */}
        <header className="flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-muted">{weekday}</div>
            <h1 className="text-xl font-extrabold">{label}</h1>
          </div>
          <button
            onClick={() => navigate('/profile')}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-ink text-sm font-bold text-white"
            aria-label="Профиль"
          >
            {initial}
          </button>
        </header>

        {/* Недельный календарь */}
        <CalendarStrip />

        {/* Питание: кольцо + макросы в одной карточке */}
        <section className="flex flex-col gap-5 rounded-[2rem] bg-card px-5 pb-5 pt-6 shadow-card">
          <div className="flex justify-center">
            <NutritionRing consumed={net} goal={calGoal} />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <MacroMini
              label="Белки"
              current={t.protein_g}
              goal={user.daily_protein_g ?? 0}
              color="bg-protein"
            />
            <MacroMini
              label="Жиры"
              current={t.fat_g}
              goal={user.daily_fat_g ?? 0}
              color="bg-fat"
            />
            <MacroMini
              label="Углев."
              current={t.carbs_g}
              goal={user.daily_carbs_g ?? 0}
              color="bg-carbs"
            />
          </div>
        </section>

        {/* Вода + Активность — равные карточки */}
        <section className="grid grid-cols-2 gap-3">
          <WaterCard />
          <ActivityCard />
        </section>

        {/* Тренировки за день (если есть) */}
        <ActivityRows />

        {/* Кнопка прогресса */}
        <button
          onClick={() => navigate('/progress')}
          className="rounded-2xl bg-ink p-4 text-center text-sm font-semibold text-white"
        >
          Мой прогресс
        </button>

        {/* История еды */}
        <section className="flex flex-col gap-2">
          <h2 className="px-1 text-xs font-semibold uppercase tracking-wider text-muted">
            История
          </h2>
          {foods.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-3xl bg-card py-10 text-muted shadow-card">
              <UtensilsCrossed size={28} />
              <span className="text-sm">Пока ничего не добавлено</span>
            </div>
          ) : (
            foods.map((f) => <FoodItem key={f.id} entry={f} onEdit={setEditing} />)
          )}
        </section>
      </div>

      {/* FAB */}
      <button
        onClick={() => {
          haptic('medium')
          setShowAdd(true)
        }}
        className="fixed bottom-6 left-1/2 z-30 flex h-16 w-16 -translate-x-1/2 items-center justify-center rounded-full bg-ink text-white shadow-[0_8px_20px_rgba(0,0,0,0.18)]"
        aria-label="Добавить еду"
      >
        <Plus size={28} />
      </button>

      <AnimatePresence>
        {showAdd && <AddFood onClose={() => setShowAdd(false)} />}
        {editing && (
          <AddFood editingEntry={editing} onClose={() => setEditing(null)} />
        )}
      </AnimatePresence>
    </div>
  )
}

// Мини-макрос (редизайн 1a): подпись + значения над тонким баром 6px.
function MacroMini({
  label,
  current,
  goal,
  color,
}: {
  label: string
  current: number
  goal: number
  color: string
}) {
  const pct = goal > 0 ? Math.min((current / goal) * 100, 100) : 0
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-1">
        <span className="text-xs font-semibold">{label}</span>
        <span className="text-[11px] font-medium text-muted">
          {Math.round(current)}/{goal}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink/5">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${pct}%`, transition: 'width 0.5s ease' }}
        />
      </div>
    </div>
  )
}
