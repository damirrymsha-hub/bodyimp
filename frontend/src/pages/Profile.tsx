// Профиль: карточка данных + персонализация + цели. Редактирование личных данных.
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ChevronLeft,
  ChevronRight,
  User as UserIcon,
  Target,
  Ruler,
  Droplet,
  Footprints,
} from 'lucide-react'
import { useUserStore } from '../store/userStore'
import { useUIStore } from '../store/uiStore'
import { updateUser } from '../api/client'
import { haptic } from '../lib/telegram'
import type { Goal } from '../types'

const GOAL_LABELS: Record<Goal, string> = {
  lose: 'Похудеть',
  maintain: 'Поддерживать',
  gain: 'Набрать массу',
}

export default function Profile() {
  const navigate = useNavigate()
  const { user, telegramId, setUser } = useUserStore()
  const { showToast } = useUIStore()
  const [editing, setEditing] = useState(false)
  const [age, setAge] = useState(String(user?.age ?? ''))
  const [height, setHeight] = useState(String(user?.height_cm ?? ''))
  const [weight, setWeight] = useState(String(user?.weight_kg ?? ''))
  const [goal, setGoal] = useState<Goal>(user?.goal ?? 'maintain')
  const [saving, setSaving] = useState(false)

  if (!user) return null

  async function save() {
    if (!telegramId) return
    setSaving(true)
    try {
      const updated = await updateUser(telegramId, {
        age: Number(age),
        height_cm: Number(height),
        weight_kg: Number(weight),
        goal,
      })
      setUser(updated)
      showToast('Сохранено', 'success')
      setEditing(false)
    } catch {
      showToast('Не удалось сохранить', 'error')
    } finally {
      setSaving(false)
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
        <h1 className="text-xl font-extrabold">Профиль</h1>
      </header>

      {/* Карточка данных */}
      <section className="rounded-[2rem] bg-card p-5 shadow-card">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-ink/5">
            <UserIcon size={24} />
          </div>
          <div>
            <div className="text-base font-bold">
              {user.username ? `@${user.username}` : 'Пользователь'}
            </div>
            <div className="text-xs text-muted">
              Цель: {user.goal ? GOAL_LABELS[user.goal] : '—'}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-2 text-center">
          <Stat label="Пол" value={user.gender === 'male' ? 'М' : 'Ж'} />
          <Stat label="Возраст" value={user.age ?? '—'} />
          <Stat label="Рост" value={user.height_cm ?? '—'} />
          <Stat label="Вес" value={user.weight_kg ?? '—'} />
        </div>
      </section>

      {/* Норма КБЖУ */}
      <section className="mt-4 rounded-[2rem] bg-card p-5 shadow-card">
        <div className="mb-3 text-sm font-bold">Дневная норма</div>
        <div className="grid grid-cols-4 gap-2 text-center">
          <Stat label="Ккал" value={user.daily_calories ?? '—'} />
          <Stat label="Белки" value={user.daily_protein_g ?? '—'} />
          <Stat label="Жиры" value={user.daily_fat_g ?? '—'} />
          <Stat label="Углев." value={user.daily_carbs_g ?? '—'} />
        </div>
      </section>

      {/* Персонализация */}
      <section className="mt-4">
        <h2 className="mb-2 px-1 text-xs font-semibold uppercase text-muted">
          Персонализация
        </h2>
        <div className="flex flex-col gap-2">
          <Row
            icon={<UserIcon size={18} />}
            title="Личные данные"
            onClick={() => {
              haptic('light')
              setEditing((v) => !v)
            }}
          />
          {editing && (
            <div className="flex flex-col gap-3 rounded-3xl bg-card p-4 shadow-card">
              <Field label="Возраст" value={age} onChange={setAge} />
              <Field label="Рост, см" value={height} onChange={setHeight} />
              <Field label="Вес, кг" value={weight} onChange={setWeight} />
              <div>
                <span className="mb-1 block text-xs font-medium text-muted">Цель</span>
                <div className="flex gap-2">
                  {(['lose', 'maintain', 'gain'] as Goal[]).map((g) => (
                    <button
                      key={g}
                      onClick={() => setGoal(g)}
                      className={`flex-1 rounded-2xl px-2 py-2 text-xs font-semibold ${
                        goal === g ? 'bg-ink text-white' : 'bg-ink/5 text-ink'
                      }`}
                    >
                      {GOAL_LABELS[g]}
                    </button>
                  ))}
                </div>
              </div>
              <button
                onClick={save}
                disabled={saving}
                className="rounded-2xl bg-ink py-3 text-sm font-semibold text-white disabled:opacity-40"
              >
                {saving ? 'Сохранение…' : 'Сохранить и пересчитать'}
              </button>
            </div>
          )}
          <Row
            icon={<Target size={18} />}
            title="Изменить цели"
            onClick={() => {
              haptic('light')
              setEditing(true)
            }}
          />
          <Row icon={<Ruler size={18} />} title="Единицы измерения" subtitle="Метрические" />
        </div>
      </section>

      {/* Цели приложения */}
      <section className="mt-4">
        <h2 className="mb-2 px-1 text-xs font-semibold uppercase text-muted">Цели</h2>
        <div className="flex flex-col gap-2">
          <Row icon={<Droplet size={18} />} title="Норма воды" subtitle="2000 мл" />
          <Row icon={<Footprints size={18} />} title="Норма шагов" subtitle="10 000" />
        </div>
      </section>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl bg-ink/5 py-3">
      <div className="text-base font-bold">{value}</div>
      <div className="text-[11px] text-muted">{label}</div>
    </div>
  )
}

function Row({
  icon,
  title,
  subtitle,
  onClick,
}: {
  icon: React.ReactNode
  title: string
  subtitle?: string
  onClick?: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 rounded-3xl bg-card p-4 text-left shadow-card"
    >
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-ink/5">
        {icon}
      </div>
      <span className="flex-1 text-sm font-medium">{title}</span>
      {subtitle && <span className="text-sm text-muted">{subtitle}</span>}
      {onClick && <ChevronRight size={18} className="text-muted" />}
    </button>
  )
}

function Field({
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
