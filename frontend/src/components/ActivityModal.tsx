import { useSheet } from '../hooks/useSheet'
// Bottom-sheet модалка добавления тренировки: вид активности + время + превью калорий.
import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  X,
  Footprints,
  Bike,
  Dumbbell,
  Waves,
  Flame,
  Zap,
} from 'lucide-react'
import { useUserStore } from '../store/userStore'
import { haptic, hapticSuccess } from '../lib/telegram'
import type { ActivityType } from '../types'

// Список видов активности + коэффициенты (ккал/мин на 70 кг) — для превью на клиенте.
const ACTIVITIES: {
  id: ActivityType
  label: string
  icon: React.ReactNode
  perMin: number
}[] = [
  { id: 'walking', label: 'Ходьба', icon: <Footprints size={22} />, perMin: 4.0 },
  { id: 'running', label: 'Бег', icon: <Zap size={22} />, perMin: 9.0 },
  { id: 'cycling', label: 'Велосипед', icon: <Bike size={22} />, perMin: 6.5 },
  { id: 'swimming', label: 'Плавание', icon: <Waves size={22} />, perMin: 7.0 },
  { id: 'strength', label: 'Силовая', icon: <Dumbbell size={22} />, perMin: 5.0 },
]

interface Props {
  onClose: () => void
}

export default function ActivityModal({ onClose }: Props) {
  const sheetRef = useSheet(onClose)
  const { user, addActivity } = useUserStore()
  const [selected, setSelected] = useState<ActivityType>('walking')
  const [duration, setDuration] = useState<number>(30)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const valid = Number.isInteger(duration) && duration >= 1 && duration <= 600

  // Превью сожжённых калорий (та же формула, что на бэкенде).
  const activity = ACTIVITIES.find((a) => a.id === selected)!
  const factor = (user?.weight_kg ?? 70) / 70
  const estimated = Math.round(activity.perMin * duration * factor)

  async function confirm() {
    if (!valid || saving) return
    setSaving(true)
    setError('')
    haptic('light')
    try {
      await addActivity(selected, duration)
      hapticSuccess()
      onClose()
    } catch {
      setError('Не удалось сохранить. Проверь соединение и попробуй ещё раз.')
    } finally { setSaving(false) }
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-black/40"
      onClick={onClose}
    >
      <motion.div ref={sheetRef} role="dialog" aria-modal="true" aria-label="Добавить активность" tabIndex={-1}
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
        className="sheet-panel w-full max-w-md rounded-t-[2rem] bg-bg p-5 pb-8"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">Добавить активность</h2>
          <button
            onClick={onClose}
            className="-mr-1 flex h-11 w-11 items-center justify-center rounded-full bg-ink/5"
            aria-label="Закрыть"
          >
            <X size={18} />
          </button>
        </div>

        {/* Выбор вида тренировки — горизонтальный скролл карточек */}
        <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
          {ACTIVITIES.map((a) => (
            <button
              key={a.id}
              aria-pressed={selected === a.id}
              onClick={() => {
                haptic('light')
                setSelected(a.id)
              }}
              className={`flex min-w-[84px] flex-col items-center gap-2 rounded-3xl px-3 py-4 transition-colors ${
                selected === a.id
                  ? 'bg-ink text-white'
                  : 'bg-card text-ink shadow-card'
              }`}
            >
              {a.icon}
              <span className="text-xs font-medium">{a.label}</span>
            </button>
          ))}
        </div>

        {/* Время */}
        <div className="mt-4">
          <span className="mb-1 block text-xs font-medium text-muted">
            Продолжительность, мин
          </span>
          <input
            type="number"
            aria-label="Продолжительность, мин"
            inputMode="numeric"
            min={1}
            max={600}
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            className="input"
          />
        </div>

        {/* Превью калорий */}
        {valid && (
          <div className="mt-4 flex items-center justify-center gap-2 rounded-2xl bg-steps/10 py-3 text-sm font-semibold text-steps">
            <Flame size={18} /> Сожжёт примерно: {estimated} ккал
          </div>
        )}

        {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
        {!valid && <p className="mt-3 text-sm text-muted">Укажи от 1 до 600 минут.</p>}
        <button
          onClick={confirm}
          disabled={!valid || saving}
          className="mt-5 w-full rounded-2xl bg-ink py-4 text-sm font-semibold text-white"
        >
          {saving ? 'Сохранение…' : 'Добавить активность'}
        </button>
      </motion.div>
    </div>
  )
}
