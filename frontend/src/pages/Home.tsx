// Главный экран — дневник дня: питание одной карточкой (кольцо + макросы рядом),
// вода и активность сеткой, еда сгруппирована по приёмам пищи с суммами.
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { Plus } from 'lucide-react'
import { useUserStore } from '../store/userStore'
import { useUIStore } from '../store/uiStore'
import { getStreak, getWeeklyStats } from '../api/client'
import { haptic } from '../lib/telegram'
import { dayParts } from '../lib/date'
import CalendarStrip from '../components/CalendarStrip'
import NutritionRing from '../components/NutritionRing'
import WaterCard from '../components/WaterCard'
import ActivityCard, { ActivityRows } from '../components/ActivityCard'
import FoodItem from '../components/FoodItem'
import TabBar from '../components/TabBar'
import AddFood from './AddFood'
import YesterdayModal from '../components/YesterdayModal'
import type { FoodEntry, MealType } from '../types'

// Порядок секций дневника и подписи.
const MEALS: { key: MealType; label: string; add: string }[] = [
  { key: 'breakfast', label: 'Завтрак', add: 'Добавить завтрак' },
  { key: 'lunch', label: 'Обед', add: 'Добавить обед' },
  { key: 'dinner', label: 'Ужин', add: 'Добавить ужин' },
  { key: 'snack', label: 'Перекусы', add: 'Добавить перекус' },
]

export default function Home() {
  const navigate = useNavigate()
  const { user, foods, totals, netCalories, burnedTotal, loadDay } = useUserStore()
  const { selectedDate } = useUIStore()
  // adding: null — закрыто; {} — общий вход с FAB; {meal} — из секции.
  const [adding, setAdding] = useState<{ meal?: MealType } | null>(null)
  const [showYesterday, setShowYesterday] = useState(false)
  const [editing, setEditing] = useState<FoodEntry | null>(null)
  const [streak, setStreak] = useState(0)
  const [avgKcal, setAvgKcal] = useState<number | null>(null)

  // Перезагружаем данные при смене выбранной даты в календаре.
  useEffect(() => {
    if (user) loadDay(selectedDate)
  }, [selectedDate, user, loadDay])

  // Стрик и средние за неделю (обновляем при изменении списка еды).
  useEffect(() => {
    if (!user) return
    getStreak(user.id).then(setStreak).catch(() => {})
    getWeeklyStats(user.id)
      .then((w) => setAvgKcal(Math.round(w.avg_calories)))
      .catch(() => {})
  }, [user, foods.length])

  // Группировка еды по приёмам пищи + суммы калорий.
  const byMeal = useMemo(() => {
    const map: Record<MealType, FoodEntry[]> = {
      breakfast: [], lunch: [], dinner: [], snack: [],
    }
    for (const f of foods) map[f.meal_type]?.push(f)
    return map
  }, [foods])

  if (!user) return null
  const t = totals()
  const burned = burnedTotal()
  const net = netCalories()
  const calGoal = user.daily_calories ?? 2000
  const { weekday, label } = dayParts(selectedDate)
  const initial = (user.username?.[0] ?? 'Я').toUpperCase()

  // «Перекусы» показываем, только если непусто или остальные секции заполнены —
  // иначе экран растёт впустую.
  const mainFilled = MEALS.slice(0, 3).every((m) => byMeal[m.key].length > 0)

  return (
    <div className="relative min-h-screen px-5 pb-[150px] pt-6">
      <div className="flex flex-col gap-4">
        {/* Шапка: день недели + дата, стрик, аватар */}
        <header className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs font-medium text-muted">{weekday}</div>
            <h1 className="truncate text-xl font-extrabold">{label}</h1>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {streak >= 2 && (
              <span className="flex items-center gap-1 rounded-full bg-card px-3 py-1.5 text-xs font-bold shadow-card">
                🔥 {streak}
              </span>
            )}
            <button
              onClick={() => navigate('/profile')}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-ink text-sm font-bold text-white"
              aria-label="Профиль"
            >
              {initial}
            </button>
          </div>
        </header>

        <CalendarStrip />

        {/* Питание: кольцо и макросы рядом + формула дня */}
        <section className="rounded-[2rem] bg-card p-4 shadow-card">
          <div className="flex items-center gap-4">
            <div className="shrink-0">
              <NutritionRing consumed={net} goal={calGoal} size={126} stroke={10} />
            </div>
            <div className="flex flex-1 flex-col gap-2.5">
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
                label="Углеводы"
                current={t.carbs_g}
                goal={user.daily_carbs_g ?? 0}
                color="bg-carbs"
              />
            </div>
          </div>
          <div className="mt-3 text-center text-[11px] font-medium text-muted">
            съедено {Math.round(t.calories)}
            {burned > 0 && <> · сожжено {burned}</>} · норма {calGoal}
          </div>
        </section>

        {/* Вода + Активность */}
        <section className="grid grid-cols-2 gap-3">
          <WaterCard />
          <ActivityCard />
        </section>

        <ActivityRows />

        {/* Дневник по приёмам пищи */}
        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted">
              Дневник
            </span>
            <button
              onClick={() => {
                haptic('light')
                setShowYesterday(true)
              }}
              className="rounded-full bg-ink/5 px-3 py-2 text-xs font-semibold text-muted"
            >
              Повторить вчера
            </button>
          </div>

          {MEALS.map((m) => {
            const items = byMeal[m.key]
            if (m.key === 'snack' && items.length === 0 && !mainFilled) return null
            const sum = Math.round(
              items.reduce((s, f) => s + f.calories, 0),
            )
            return (
              <div key={m.key} className="flex flex-col gap-2">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted">
                    {m.label}
                  </span>
                  <div className="flex items-center gap-2">
                    {items.length > 0 && (
                      <span className="text-xs font-bold">{sum} ккал</span>
                    )}
                    <button
                      onClick={() => {
                        haptic('light')
                        setAdding({ meal: m.key })
                      }}
                      className="flex h-11 w-11 items-center justify-center rounded-full bg-ink/5"
                      aria-label={m.add}
                    >
                      <Plus size={18} />
                    </button>
                  </div>
                </div>
                {items.length === 0 ? (
                  <button
                    onClick={() => {
                      haptic('light')
                      setAdding({ meal: m.key })
                    }}
                    className="rounded-2xl bg-ink/[0.035] py-3 text-center text-xs font-semibold text-muted"
                  >
                    {m.add}
                  </button>
                ) : (
                  items.map((f) => (
                    <FoodItem key={f.id} entry={f} onEdit={setEditing} />
                  ))
                )}
              </div>
            )
          })}
        </section>

        {/* Сводка недели вместо чёрной кнопки на полотне */}
        <button
          onClick={() => navigate('/progress')}
          className="flex items-center gap-2 rounded-3xl bg-card p-4 text-left shadow-card"
        >
          <span className="flex-1 text-xs">
            <span className="font-bold">Стрик {streak} дн.</span>
            {avgKcal != null && (
              <span className="text-muted"> · средне {avgKcal} ккал</span>
            )}
          </span>
          <span className="text-muted">›</span>
        </button>
      </div>

      {/* FAB над таббаром */}
      <button
        onClick={() => {
          haptic('medium')
          setAdding({})
        }}
        className="fixed bottom-[76px] left-1/2 z-30 flex h-16 w-16 -translate-x-1/2 items-center justify-center rounded-full bg-ink text-white shadow-[0_8px_20px_rgba(0,0,0,0.18)]"
        aria-label="Добавить еду"
      >
        <Plus size={28} />
      </button>

      <TabBar />

      <AnimatePresence>
        {adding && (
          <AddFood initialMeal={adding.meal} onClose={() => setAdding(null)} />
        )}
        {showYesterday && (
          <YesterdayModal onClose={() => setShowYesterday(false)} />
        )}
        {editing && (
          <AddFood editingEntry={editing} onClose={() => setEditing(null)} />
        )}
      </AnimatePresence>
    </div>
  )
}

// Мини-макрос: подпись + значения над тонким баром.
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
          {Math.round(current)}
          {goal > 0 && `/${goal}`}
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
