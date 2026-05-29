// Главный экран: календарь, кольцо калорий, макросы, вода/активность, список еды, FAB.
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { Plus, TrendingUp, User as UserIcon, UtensilsCrossed } from 'lucide-react'
import { useUserStore } from '../store/userStore'
import { useUIStore } from '../store/uiStore'
import { haptic } from '../lib/telegram'
import { humanDate } from '../lib/date'
import CalendarStrip from '../components/CalendarStrip'
import NutritionRing from '../components/NutritionRing'
import MacroCard from '../components/MacroCard'
import WaterCard from '../components/WaterCard'
import ActivityCard from '../components/ActivityCard'
import FoodItem from '../components/FoodItem'
import AddFood from './AddFood'
import type { FoodEntry } from '../types'

export default function Home() {
  const navigate = useNavigate()
  const { user, foods, removeFood, totals, burnedTotal, netCalories, loadDay } =
    useUserStore()
  const { selectedDate } = useUIStore()
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState<FoodEntry | null>(null)

  // Перезагружаем данные при смене выбранной даты в календаре.
  useEffect(() => {
    if (user) loadDay(selectedDate)
  }, [selectedDate, user, loadDay])

  if (!user) return null
  const t = totals()
  const burned = burnedTotal()
  const net = netCalories()
  const calGoal = user.daily_calories ?? 2000

  return (
    <div className="relative min-h-screen px-5 pb-28 pt-6">
      {/* Шапка */}
      <header className="mb-5 flex items-center justify-between">
        <div>
          <div className="text-xs font-medium text-muted">BodyImp</div>
          <h1 className="text-xl font-extrabold">{humanDate(selectedDate)}</h1>
        </div>
        <button
          onClick={() => navigate('/profile')}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-card shadow-card"
        >
          <UserIcon size={20} />
        </button>
      </header>

      {/* Недельный календарь */}
      <CalendarStrip />

      {/* Кольцо калорий (показываем чистые калории: съедено − сожжено) */}
      <section className="mt-6 flex flex-col items-center rounded-[2rem] bg-card p-6 shadow-card">
        <NutritionRing consumed={net} goal={calGoal} />
        <div className="mt-3 text-xs text-muted">
          {burned > 0 ? (
            <>
              Съедено {Math.round(t.calories)} − {burned} сожжено = {Math.round(net)}{' '}
              ккал
            </>
          ) : (
            <>
              Съедено {Math.round(t.calories)} из {calGoal} ккал
            </>
          )}
        </div>
      </section>

      {/* Макросы */}
      <section className="mt-4 flex flex-col gap-3 rounded-[2rem] bg-card p-5 shadow-card">
        <MacroCard
          label="Белки"
          current={t.protein_g}
          goal={user.daily_protein_g ?? 0}
          color="bg-protein"
        />
        <MacroCard
          label="Жиры"
          current={t.fat_g}
          goal={user.daily_fat_g ?? 0}
          color="bg-fat"
        />
        <MacroCard
          label="Углеводы"
          current={t.carbs_g}
          goal={user.daily_carbs_g ?? 0}
          color="bg-carbs"
        />
      </section>

      {/* Вода */}
      <section className="mt-4 flex gap-3">
        <WaterCard />
      </section>

      {/* Активность */}
      <section className="mt-4">
        <ActivityCard />
      </section>

      {/* Кнопка прогресса */}
      <button
        onClick={() => navigate('/progress')}
        className="mt-4 flex w-full items-center justify-between rounded-3xl bg-ink p-4 text-white"
      >
        <span className="flex items-center gap-2 text-sm font-semibold">
          <TrendingUp size={18} /> Мой прогресс
        </span>
        <span className="text-sm text-white/60">за неделю →</span>
      </button>

      {/* История еды */}
      <section className="mt-6">
        <h2 className="mb-3 text-sm font-bold text-ink">История</h2>
        {foods.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-3xl bg-card py-10 text-muted shadow-card">
            <UtensilsCrossed size={28} />
            <span className="text-sm">Пока ничего не добавлено</span>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {foods.map((f) => (
              <FoodItem
                key={f.id}
                entry={f}
                onDelete={removeFood}
                onEdit={setEditing}
              />
            ))}
          </div>
        )}
      </section>

      {/* FAB */}
      <button
        onClick={() => {
          haptic('medium')
          setShowAdd(true)
        }}
        className="fixed bottom-6 left-1/2 z-30 flex h-16 w-16 -translate-x-1/2 items-center justify-center rounded-full bg-ink text-white shadow-lg"
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
