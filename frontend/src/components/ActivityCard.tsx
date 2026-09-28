// Компактная карточка активности (редизайн 1a) — зеркальна карточке воды.
// Список тренировок рендерится отдельно на Home (ActivityRows ниже).
import { useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { Plus, X } from 'lucide-react'
import { useUserStore } from '../store/userStore'
import { haptic } from '../lib/telegram'
import type { ActivityType } from '../types'
import ActivityModal from './ActivityModal'

// Русские названия видов активности.
export const ACTIVITY_LABELS: Record<ActivityType, string> = {
  walking: 'Ходьба',
  running: 'Бег',
  cycling: 'Велосипед',
  swimming: 'Плавание',
  strength: 'Силовая',
}

// Показываем расход без произвольной цели сжигания калорий.


export default function ActivityCard() {
  const { burnedTotal } = useUserStore()
  const [showModal, setShowModal] = useState(false)
  const burned = burnedTotal()

  return (
    <div className="flex flex-col gap-3 rounded-3xl bg-card p-4 shadow-card">
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-semibold">Движение за день</span>

      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-extrabold leading-none">{burned}</span>
        <span className="text-xs font-medium text-muted">ккал</span>
      </div>
      <p className="text-xs text-muted">Оценка расхода по записанным тренировкам</p>
      <button onClick={() => { haptic('light'); setShowModal(true) }} className="flex min-h-[48px] items-center justify-center gap-2 rounded-2xl bg-ink px-4 text-sm font-semibold text-white"><Plus size={18} />Добавить активность</button>

      <AnimatePresence>
        {showModal && <ActivityModal onClose={() => setShowModal(false)} />}
      </AnimatePresence>
    </div>
  )
}

// Строки тренировок за день (под сеткой Вода/Активность на Home).
export function ActivityRows() {
  const { activities, removeActivity } = useUserStore()
  if (activities.length === 0) return null
  return (
    <div className="flex flex-col gap-1.5">
      {activities.map((a) => (
        <div
          key={a.id}
          className="flex items-center gap-2 rounded-2xl bg-card px-4 py-2.5 text-xs shadow-card"
        >
          <span className="flex-1 font-medium">
            {ACTIVITY_LABELS[a.activity_type]} · {a.duration_min} мин ·{' '}
            <span className="text-steps">{a.calories_burned} ккал</span>
          </span>
          <button
            onClick={() => {
              haptic('light')
              removeActivity(a.id)
            }}
            className="-mr-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted"
            aria-label="Удалить тренировку"
          >
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  )
}
