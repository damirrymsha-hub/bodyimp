// Онбординг — 5 шагов: пол, антропометрия, активность, цель, итог.
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronRight, ChevronLeft, Check } from 'lucide-react'
import { useUserStore } from '../store/userStore'
import { useUIStore } from '../store/uiStore'
import { updateUser } from '../api/client'
import { haptic, hapticSuccess } from '../lib/telegram'
import type { Gender, Goal, ActivityLevel, User } from '../types'

const ACTIVITIES: { value: ActivityLevel; label: string; desc: string }[] = [
  { value: 'sedentary', label: 'Минимальная', desc: 'Сидячий образ жизни' },
  { value: 'light', label: 'Лёгкая', desc: '1–3 тренировки в неделю' },
  { value: 'moderate', label: 'Средняя', desc: '3–5 тренировок в неделю' },
  { value: 'active', label: 'Высокая', desc: '6–7 тренировок в неделю' },
  { value: 'very_active', label: 'Очень высокая', desc: 'Спорт + физический труд' },
]

const GOALS: { value: Goal; label: string; desc: string }[] = [
  { value: 'lose', label: 'Похудеть', desc: 'Дефицит 500 ккал' },
  { value: 'maintain', label: 'Поддерживать', desc: 'Текущий вес' },
  { value: 'gain', label: 'Набрать массу', desc: 'Профицит 500 ккал' },
]

export default function Onboarding() {
  const navigate = useNavigate()
  const { telegramId, setUser } = useUserStore()
  const { showToast } = useUIStore()

  const [step, setStep] = useState(0)
  const [gender, setGender] = useState<Gender | null>(null)
  const [age, setAge] = useState('')
  const [height, setHeight] = useState('')
  const [weight, setWeight] = useState('')
  const [activity, setActivity] = useState<ActivityLevel | null>(null)
  const [goal, setGoal] = useState<Goal | null>(null)
  const [result, setResult] = useState<User | null>(null)
  const [saving, setSaving] = useState(false)

  function next() {
    haptic('light')
    setStep((s) => s + 1)
  }
  function back() {
    haptic('light')
    setStep((s) => Math.max(0, s - 1))
  }

  // Валидация перехода с каждого шага.
  const canProceed = () => {
    if (step === 0) return gender !== null
    if (step === 1)
      return Number(age) > 0 && Number(height) > 0 && Number(weight) > 0
    if (step === 2) return activity !== null
    if (step === 3) return goal !== null
    return true
  }

  // На шаге 3 (после выбора цели) — рассчитываем нормы на сервере.
  async function calculate() {
    if (!telegramId) return
    setSaving(true)
    try {
      const user = await updateUser(telegramId, {
        gender: gender!,
        age: Number(age),
        height_cm: Number(height),
        weight_kg: Number(weight),
        activity_level: activity!,
        goal: goal!,
      })
      setUser(user)
      setResult(user)
      setStep(4)
    } catch {
      showToast('Не удалось рассчитать нормы. Проверьте соединение.', 'error')
    } finally {
      setSaving(false)
    }
  }

  function finish() {
    hapticSuccess()
    navigate('/')
  }

  return (
    <div className="flex min-h-screen flex-col px-5 pb-8 pt-6">
      {/* Прогресс-индикатор */}
      <div className="mb-6 flex gap-1.5">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full ${i <= step ? 'bg-ink' : 'bg-ink/10'}`}
          />
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -24 }}
          transition={{ duration: 0.2 }}
          className="flex-1"
        >
          {/* Шаг 0 — пол */}
          {step === 0 && (
            <Step title="Ваш пол">
              <div className="grid grid-cols-2 gap-3">
                <BigCard
                  active={gender === 'male'}
                  onClick={() => setGender('male')}
                  icon={<span className="text-4xl leading-none">♂</span>}
                  label="Мужской"
                />
                <BigCard
                  active={gender === 'female'}
                  onClick={() => setGender('female')}
                  icon={<span className="text-4xl leading-none">♀</span>}
                  label="Женский"
                />
              </div>
            </Step>
          )}

          {/* Шаг 1 — антропометрия */}
          {step === 1 && (
            <Step title="Основные данные">
              <div className="flex flex-col gap-3">
                <NumField label="Возраст, лет" value={age} onChange={setAge} />
                <NumField label="Рост, см" value={height} onChange={setHeight} />
                <NumField label="Вес, кг" value={weight} onChange={setWeight} />
              </div>
            </Step>
          )}

          {/* Шаг 2 — активность */}
          {step === 2 && (
            <Step title="Уровень активности">
              <div className="flex flex-col gap-2">
                {ACTIVITIES.map((a) => (
                  <ListCard
                    key={a.value}
                    active={activity === a.value}
                    onClick={() => setActivity(a.value)}
                    title={a.label}
                    desc={a.desc}
                  />
                ))}
              </div>
            </Step>
          )}

          {/* Шаг 3 — цель */}
          {step === 3 && (
            <Step title="Ваша цель">
              <div className="flex flex-col gap-2">
                {GOALS.map((g) => (
                  <ListCard
                    key={g.value}
                    active={goal === g.value}
                    onClick={() => setGoal(g.value)}
                    title={g.label}
                    desc={g.desc}
                  />
                ))}
              </div>
            </Step>
          )}

          {/* Шаг 4 — итог */}
          {step === 4 && result && (
            <Step title="Ваша дневная норма">
              <div className="rounded-3xl bg-card p-6 text-center shadow-card">
                <div className="text-5xl font-extrabold">{result.daily_calories}</div>
                <div className="mt-1 text-sm text-muted">ккал в день</div>
                <div className="mt-5 grid grid-cols-3 gap-3">
                  <Macro label="Белки" value={result.daily_protein_g} color="text-protein" />
                  <Macro label="Жиры" value={result.daily_fat_g} color="text-fat" />
                  <Macro label="Углев." value={result.daily_carbs_g} color="text-carbs" />
                </div>
              </div>
              <p className="mt-4 text-center text-xs text-muted">
                Норму можно изменить в профиле в любой момент.
              </p>
            </Step>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Навигация */}
      <div className="mt-6 flex gap-3">
        {step > 0 && step < 4 && (
          <button
            onClick={back}
            className="flex h-14 w-14 items-center justify-center rounded-2xl bg-card shadow-card"
          >
            <ChevronLeft size={22} />
          </button>
        )}

        {step < 3 && (
          <button
            disabled={!canProceed()}
            onClick={next}
            className="flex flex-1 items-center justify-center gap-1 rounded-2xl bg-ink py-4 text-sm font-semibold text-white disabled:opacity-30"
          >
            Далее <ChevronRight size={18} />
          </button>
        )}

        {step === 3 && (
          <button
            disabled={!canProceed() || saving}
            onClick={calculate}
            className="flex flex-1 items-center justify-center gap-1 rounded-2xl bg-ink py-4 text-sm font-semibold text-white disabled:opacity-30"
          >
            {saving ? 'Расчёт…' : 'Рассчитать'}
          </button>
        )}

        {step === 4 && (
          <button
            onClick={finish}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-ink py-4 text-sm font-semibold text-white"
          >
            <Check size={18} /> Начать
          </button>
        )}
      </div>
    </div>
  )
}

function Step({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h1 className="mb-5 text-2xl font-extrabold">{title}</h1>
      {children}
    </div>
  )
}

function BigCard({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
}) {
  return (
    <button
      onClick={onClick}
      className={`flex aspect-square flex-col items-center justify-center gap-3 rounded-3xl border-2 transition-colors ${
        active ? 'border-ink bg-ink text-white' : 'border-transparent bg-card text-ink shadow-card'
      }`}
    >
      {icon}
      <span className="text-base font-semibold">{label}</span>
    </button>
  )
}

function ListCard({
  active,
  onClick,
  title,
  desc,
}: {
  active: boolean
  onClick: () => void
  title: string
  desc: string
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center justify-between rounded-3xl border-2 p-4 text-left transition-colors ${
        active ? 'border-ink bg-ink text-white' : 'border-transparent bg-card shadow-card'
      }`}
    >
      <div>
        <div className="text-sm font-semibold">{title}</div>
        <div className={`text-xs ${active ? 'text-white/70' : 'text-muted'}`}>{desc}</div>
      </div>
      {active && <Check size={20} />}
    </button>
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
        placeholder="0"
        className="input text-lg"
      />
    </label>
  )
}

function Macro({
  label,
  value,
  color,
}: {
  label: string
  value: number | null
  color: string
}) {
  return (
    <div className="rounded-2xl bg-ink/5 py-3">
      <div className={`text-xl font-bold ${color}`}>{value ?? '—'}</div>
      <div className="text-[11px] text-muted">{label}, г</div>
    </div>
  )
}
