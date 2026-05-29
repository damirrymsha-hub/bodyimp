// Прогресс: линейный график калорий за 7 дней + карточки средних значений и веса.
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  CartesianGrid,
} from 'recharts'
import { ChevronLeft, Plus } from 'lucide-react'
import { useUserStore } from '../store/userStore'
import { useUIStore } from '../store/uiStore'
import { getWeeklyStats, getWeightHistory, logWeight } from '../api/client'
import { haptic } from '../lib/telegram'
import type { WeeklyStats, WeightLog } from '../types'

const WEEKDAY_SHORT = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']

export default function Progress() {
  const navigate = useNavigate()
  const { user, waterMl } = useUserStore()
  const { showToast } = useUIStore()
  const [weekly, setWeekly] = useState<WeeklyStats | null>(null)
  const [weights, setWeights] = useState<WeightLog[]>([])
  const [newWeight, setNewWeight] = useState('')

  useEffect(() => {
    if (!user) return
    getWeeklyStats(user.id).then(setWeekly).catch(() => {})
    getWeightHistory(user.id).then(setWeights).catch(() => {})
  }, [user])

  if (!user) return null

  const chartData =
    weekly?.days.map((d) => {
      const date = new Date(d.date)
      return { day: WEEKDAY_SHORT[date.getDay()], calories: Math.round(d.calories) }
    }) ?? []

  // Динамика веса: разница между первым и последним замером.
  const weightDelta =
    weights.length >= 2
      ? +(weights[weights.length - 1].weight_kg - weights[0].weight_kg).toFixed(1)
      : 0

  const waterPct = Math.round((waterMl / 2000) * 100)

  async function saveWeight() {
    if (!user) return
    const w = Number(newWeight)
    if (!w || w < 20 || w > 400) {
      showToast('Введите корректный вес', 'error')
      return
    }
    try {
      await logWeight(user.id, w)
      const fresh = await getWeightHistory(user.id)
      setWeights(fresh)
      setNewWeight('')
      showToast('Вес записан', 'success')
    } catch {
      showToast('Не удалось сохранить вес', 'error')
    }
  }

  return (
    <div className="min-h-screen px-5 pb-10 pt-6">
      <header className="mb-6 flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-card shadow-card"
        >
          <ChevronLeft size={20} />
        </button>
        <h1 className="text-xl font-extrabold">Мой прогресс</h1>
      </header>

      {/* График калорий */}
      <section className="rounded-[2rem] bg-card p-5 shadow-card">
        <div className="mb-1 text-sm font-bold">Калории за неделю</div>
        <div className="mb-3 text-xs text-muted">
          Цель: {user.daily_calories} ккал/день
        </div>
        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#EDEFF2" vertical={false} />
              <XAxis dataKey="day" tickLine={false} axisLine={false} fontSize={12} stroke="#8A8F98" />
              <YAxis tickLine={false} axisLine={false} fontSize={12} stroke="#8A8F98" />
              <Tooltip
                contentStyle={{
                  borderRadius: 12,
                  border: 'none',
                  boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
                  fontSize: 12,
                }}
              />
              <Line
                type="monotone"
                dataKey="calories"
                stroke="#111111"
                strokeWidth={2.5}
                dot={{ r: 3, fill: '#111111' }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Карточки сводки */}
      <section className="mt-4 grid grid-cols-2 gap-3">
        <SummaryCard
          label="Средние ккал/день"
          value={weekly ? Math.round(weekly.avg_calories) : '—'}
        />
        <SummaryCard label="Норма воды сегодня" value={`${waterPct}%`} />
        <SummaryCard
          label="Динамика веса"
          value={`${weightDelta > 0 ? '+' : ''}${weightDelta} кг`}
        />
        <SummaryCard
          label="Текущий вес"
          value={user.weight_kg ? `${user.weight_kg} кг` : '—'}
        />
      </section>

      {/* Запись веса */}
      <section className="mt-4 rounded-[2rem] bg-card p-5 shadow-card">
        <div className="mb-3 text-sm font-bold">Записать вес</div>
        <div className="flex gap-2">
          <input
            value={newWeight}
            onChange={(e) => setNewWeight(e.target.value)}
            inputMode="decimal"
            placeholder="кг"
            className="input flex-1"
          />
          <button
            onClick={() => {
              haptic('light')
              saveWeight()
            }}
            className="flex h-12 w-12 items-center justify-center rounded-2xl bg-ink text-white"
            aria-label="Сохранить вес"
          >
            <Plus size={20} />
          </button>
        </div>
        {weights.length > 0 && (
          <div className="mt-3 text-xs text-muted">
            Последний замер: {weights[weights.length - 1].weight_kg} кг (
            {weights[weights.length - 1].date})
          </div>
        )}
      </section>
    </div>
  )
}

function SummaryCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-3xl bg-card p-4 shadow-card">
      <div className="text-2xl font-extrabold">{value}</div>
      <div className="mt-1 text-xs text-muted">{label}</div>
    </div>
  )
}
