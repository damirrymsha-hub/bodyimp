// Профиль: одна объединённая форма данных + live-расчёт норм + норма воды.
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Droplet, Flame } from 'lucide-react'
import { useUserStore } from '../store/userStore'
import { useUIStore } from '../store/uiStore'
import { updateUser, updateWaterGoal } from '../api/client'
import { haptic } from '../lib/telegram'
import { calculateNutrition } from '../utils/nutritionCalc'
import TabBar from '../components/TabBar'
import type { Gender, Goal, ActivityLevel } from '../types'

const GOALS: { value: Goal; label: string }[] = [
  { value: 'lose', label: 'Похудеть' },
  { value: 'maintain', label: 'Поддерживать' },
  { value: 'gain', label: 'Набрать массу' },
]

const ACTIVITIES: { value: ActivityLevel; label: string }[] = [
  { value: 'sedentary', label: 'Сидячий образ жизни (офис, мало движения)' },
  { value: 'light', label: 'Лёгкая активность (1–2 тренировки в неделю)' },
  { value: 'moderate', label: 'Умеренная активность (3–4 тренировки в неделю)' },
  { value: 'active', label: 'Высокая активность (5–6 тренировок в неделю)' },
  { value: 'very_active', label: 'Очень высокая (физ. труд или 2 трен/день)' },
]

export default function Profile() {
  const navigate = useNavigate()
  const { user, telegramId, setUser } = useUserStore()
  const { showToast } = useUIStore()

  // Локальный стейт формы (инициализируем из профиля).
  const [gender, setGender] = useState<Gender>(user?.gender ?? 'male')
  const [age, setAge] = useState(String(user?.age ?? ''))
  const [height, setHeight] = useState(String(user?.height_cm ?? ''))
  const [weight, setWeight] = useState(String(user?.weight_kg ?? ''))
  const [goal, setGoal] = useState<Goal>(user?.goal ?? 'maintain')
  const [activity, setActivity] = useState<ActivityLevel>(
    user?.activity_level ?? 'moderate',
  )
  const [saving, setSaving] = useState(false)

  // Вода.
  const [editingWater, setEditingWater] = useState(false)
  const [waterInput, setWaterInput] = useState(String(user?.daily_water_ml ?? 2000))
  const [savingWater, setSavingWater] = useState(false)

  // Live-расчёт норм (пересчитывается при любом изменении формы).
  const calc = useMemo(() => {
    const a = Number(age)
    const h = Number(height)
    const w = Number(weight)
    if (!(a > 0 && h > 0 && w > 0)) return null
    return calculateNutrition({
      gender,
      age: a,
      height_cm: h,
      weight_kg: w,
      activity_level: activity,
      goal,
    })
  }, [gender, age, height, weight, activity, goal])

  if (!user) return null

  async function save() {
    if (!telegramId) return
    if (!(Number(age) > 0 && Number(height) > 0 && Number(weight) > 0)) {
      showToast('Заполни возраст, рост и вес', 'error')
      return
    }
    setSaving(true)
    try {
      const updated = await updateUser(telegramId, {
        gender,
        age: Number(age),
        height_cm: Number(height),
        weight_kg: Number(weight),
        goal,
        activity_level: activity,
      })
      setUser(updated)
      showToast('Сохранено', 'success')
    } catch {
      showToast('Не удалось сохранить', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function saveWater() {
    if (!telegramId) return
    const ml = Number(waterInput)
    if (!(ml >= 500 && ml <= 5000)) {
      showToast('Норма воды: от 500 до 5000 мл', 'error')
      return
    }
    setSavingWater(true)
    try {
      const updated = await updateWaterGoal(telegramId, ml)
      setUser(updated)
      showToast('Норма воды обновлена', 'success')
      setEditingWater(false)
    } catch {
      showToast('Не удалось сохранить', 'error')
    } finally {
      setSavingWater(false)
    }
  }

  return (
    <div className="min-h-screen px-5 pb-28 pt-6">
      <header className="mb-6 flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-card shadow-card"
        >
          <ChevronLeft size={20} />
        </button>
        <h1 className="text-xl font-extrabold">Профиль</h1>
      </header>

      {/* Мои данные */}
      <section className="flex flex-col gap-4 rounded-[2rem] bg-card p-5 shadow-card">
        <div className="text-sm font-bold">Мои данные</div>

        {/* Пол */}
        <div>
          <span className="mb-1 block text-xs font-medium text-muted">Пол</span>
          <div className="flex gap-2">
            {(['male', 'female'] as Gender[]).map((g) => (
              <button
                key={g}
                onClick={() => setGender(g)}
                className={`flex-1 rounded-2xl py-2.5 text-sm font-semibold ${
                  gender === g ? 'bg-ink text-white' : 'bg-ink/5 text-ink'
                }`}
              >
                {g === 'male' ? 'Мужской' : 'Женский'}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <NumField label="Возраст" value={age} onChange={setAge} />
          <NumField label="Рост, см" value={height} onChange={setHeight} />
          <NumField label="Вес, кг" value={weight} onChange={setWeight} />
        </div>

        {/* Цель */}
        <div>
          <span className="mb-1 block text-xs font-medium text-muted">Цель</span>
          <div className="flex gap-2">
            {GOALS.map((g) => (
              <button
                key={g.value}
                onClick={() => setGoal(g.value)}
                className={`flex-1 rounded-2xl px-2 py-2 text-xs font-semibold ${
                  goal === g.value ? 'bg-ink text-white' : 'bg-ink/5 text-ink'
                }`}
              >
                {g.label}
              </button>
            ))}
          </div>
        </div>

        {/* Уровень активности */}
        <div>
          <span className="mb-1 block text-xs font-medium text-muted">
            Уровень активности
          </span>
          <select
            value={activity}
            onChange={(e) => setActivity(e.target.value as ActivityLevel)}
            className="input"
          >
            {ACTIVITIES.map((a) => (
              <option key={a.value} value={a.value}>
                {a.label}
              </option>
            ))}
          </select>
        </div>
      </section>

      {/* Рассчитанная норма (read-only, пересчитывается в реальном времени) */}
      <section className="mt-4 rounded-[2rem] bg-card p-5 shadow-card">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm font-bold">Рассчитанная норма</span>
          {calc && (
            <span className="text-xs text-muted">
              ИМТ {calc.bmi} · {calc.bmiCategory}
            </span>
          )}
        </div>
        <div className="grid grid-cols-4 gap-2 text-center">
          <Stat label="ккал" value={calc?.targetCalories ?? '—'} accent />
          <Stat label="Б, г" value={calc?.proteinG ?? '—'} />
          <Stat label="Ж, г" value={calc?.fatG ?? '—'} />
          <Stat label="У, г" value={calc?.carbsG ?? '—'} />
        </div>
        {calc && (
          <div className="mt-3 grid grid-cols-2 gap-2 text-center text-xs text-muted">
            <div className="rounded-2xl bg-ink/5 py-2">BMR {calc.bmr} ккал</div>
            <div className="rounded-2xl bg-ink/5 py-2">TDEE {calc.tdee} ккал</div>
          </div>
        )}
        {calc?.notes?.map((n, i) => (
          <div key={i} className="mt-2 text-xs text-muted">
            • {n}
          </div>
        ))}
        {/* Бейдж адаптивной поправки (считается на сервере раз в неделю) */}
        {user.adaptive_tdee && (user.tdee_adjustment ?? 0) !== 0 && (
          <div className="mt-2 text-xs font-semibold text-steps">
            Умная норма: {(user.tdee_adjustment ?? 0) > 0 ? '+' : ''}
            {user.tdee_adjustment} ккал по динамике веса
          </div>
        )}
      </section>

      <button
        onClick={save}
        disabled={saving}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-ink py-4 text-sm font-semibold text-white disabled:opacity-40"
      >
        <Flame size={16} /> {saving ? 'Сохранение…' : 'Сохранить изменения'}
      </button>

      {/* Помощники: напоминания и адаптивная норма */}
      <section className="mt-6">
        <h2 className="mb-2 px-1 text-xs font-semibold uppercase text-muted">
          Помощники
        </h2>
        <div className="flex flex-col gap-2">
          <ToggleRow
            title="Напоминания от бота"
            desc="Вода днём и вечерняя сводка в чат"
            value={!!user.notifications_enabled}
            onChange={async (v) => {
              if (!telegramId) return
              haptic('light')
              try {
                setUser(await updateUser(telegramId, { notifications_enabled: v }))
              } catch {
                showToast('Не удалось сохранить', 'error')
              }
            }}
          />
          <ToggleRow
            title="Умная норма калорий"
            desc="Еженедельная коррекция по динамике веса"
            value={!!user.adaptive_tdee}
            onChange={async (v) => {
              if (!telegramId) return
              haptic('light')
              try {
                setUser(await updateUser(telegramId, { adaptive_tdee: v }))
              } catch {
                showToast('Не удалось сохранить', 'error')
              }
            }}
          />
        </div>
      </section>

      {/* Цели приложения — только норма воды */}
      <section className="mt-6">
        <h2 className="mb-2 px-1 text-xs font-semibold uppercase text-muted">Цели</h2>
        <div className="rounded-3xl bg-card p-4 shadow-card">
          <button
            onClick={() => {
              haptic('light')
              setEditingWater((v) => !v)
            }}
            className="flex w-full items-center gap-3 text-left"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-water/10">
              <Droplet size={18} className="text-water" />
            </div>
            <span className="flex-1 text-sm font-medium">Дневная норма воды</span>
            <span className="text-sm text-muted">{user.daily_water_ml ?? 2000} мл</span>
          </button>

          {editingWater && (
            <div className="mt-3 flex items-center gap-2">
              <input
                type="number"
                min={500}
                max={5000}
                value={waterInput}
                onChange={(e) => setWaterInput(e.target.value)}
                className="input flex-1"
                placeholder="мл (500–5000)"
              />
              <button
                onClick={saveWater}
                disabled={savingWater}
                className="rounded-2xl bg-ink px-5 py-3 text-sm font-semibold text-white disabled:opacity-40"
              >
                {savingWater ? '…' : 'Сохранить'}
              </button>
            </div>
          )}
        </div>
      </section>

      <TabBar />
    </div>
  )
}

// Строка-переключатель (Помощники): заголовок + описание + свитч.
function ToggleRow({
  title,
  desc,
  value,
  onChange,
}: {
  title: string
  desc: string
  value: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <button
      onClick={() => onChange(!value)}
      className="flex w-full items-center gap-3 rounded-3xl bg-card p-4 text-left shadow-card"
    >
      <div className="flex-1">
        <div className="text-sm font-semibold">{title}</div>
        <div className="mt-0.5 text-[11px] font-medium text-muted">{desc}</div>
      </div>
      <span
        className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
          value ? 'bg-ink' : 'bg-ink/10'
        }`}
      >
        <span
          className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${
            value ? 'left-6' : 'left-1'
          }`}
        />
      </span>
    </button>
  )
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string
  value: string | number
  accent?: boolean
}) {
  return (
    <div className="rounded-2xl bg-ink/5 py-3">
      <div className={`text-base font-bold ${accent ? 'text-steps' : ''}`}>{value}</div>
      <div className="text-[11px] text-muted">{label}</div>
    </div>
  )
}

function NumField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-muted">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        inputMode="numeric"
        className="input"
      />
    </label>
  )
}
