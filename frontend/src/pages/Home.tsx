// Питание: дневник дня и прямой вход в фото/текст.
import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Camera, PencilLine } from 'lucide-react'
import { useUserStore } from '../store/userStore'
import { useUIStore } from '../store/uiStore'
import { getStreak, getWeeklyStats } from '../api/client'
import { haptic } from '../lib/telegram'
import { dayParts } from '../lib/date'
import CalendarStrip from '../components/CalendarStrip'
import NutritionRing from '../components/NutritionRing'
import FoodItem from '../components/FoodItem'
import TabBar from '../components/TabBar'
import LazyBoundary from '../components/LazyBoundary'
const AddFood = lazy(() => import('./AddFood'))
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
  const { user, foods, totals, netCalories, burnedTotal, loadDay, error } = useUserStore()
  const { selectedDate } = useUIStore()
  // adding: null — закрыто; {} — общий вход с FAB; {meal} — из секции.
  const [adding, setAdding] = useState<{ meal?: MealType; mode?: 'menu' | 'photo' | 'text' } | null>(null)
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
              className="flex h-11 w-11 items-center justify-center rounded-full bg-ink text-sm font-bold text-white"
              aria-label="Профиль"
            >
              {initial}
            </button>
          </div>
        </header>

        <CalendarStrip />
        {error && <div role="alert" className="rounded-2xl bg-card p-3 text-sm">{error}<button onClick={() => void loadDay(selectedDate)} className="ml-2 min-h-[44px] underline">Повторить</button></div>}

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

        <section className="grid grid-cols-2 gap-3" aria-label="Добавить еду">
          <button onClick={() => { haptic('light'); setAdding({ mode: 'photo' }) }} className="flex min-h-[76px] items-center justify-center gap-3 rounded-3xl bg-ink text-base font-bold text-white"><Camera size={22} />Фото</button>
          <button onClick={() => { haptic('light'); setAdding({ mode: 'text' }) }} className="flex min-h-[76px] items-center justify-center gap-3 rounded-3xl bg-card text-base font-bold shadow-card"><PencilLine size={22} />Текст</button>
        </section>

        {/* Дневник по приёмам пищи */}
        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted">
              Дневник
            </span>
            <button
              onClick={() => {
                haptic('light')
                setAdding({ mode: 'menu' })
              }}
              className="min-h-[44px] rounded-full bg-ink/5 px-3 py-2 text-xs font-semibold text-muted"
            >
              Ещё
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

        <p className="px-1 text-center text-xs text-muted">🔥 {streak} дн. подряд{avgKcal != null && <> · среднее {avgKcal} ккал</>}</p>
      </div>

      <TabBar />

      {/* key обязателен: без него React переиспользует смонтированный AddFood
          и сохраняет прежний выбранный приём пищи при повторном открытии. */}
      <LazyBoundary><Suspense fallback={<div role="status" className="fixed inset-x-0 bottom-0 z-50 rounded-t-3xl bg-card p-8 text-center">Открываем…</div>}>
        {adding && (
          <AddFood
            key={`add-${adding.meal ?? 'any'}-${adding.mode ?? 'menu'}`}
            initialMeal={adding.meal}
            initialMode={adding.mode}
            onClose={() => setAdding(null)}
          />
        )}
        {editing && (
          <AddFood
            key={`edit-${editing.id}`}
            editingEntry={editing}
            onClose={() => setEditing(null)}
          />
        )}
      </Suspense></LazyBoundary>
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
