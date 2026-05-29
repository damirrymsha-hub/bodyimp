// Карточка "Активность" на главном: сожжённые калории + список тренировок + кнопка добавления.
import { useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { Flame, Plus, X } from 'lucide-react'
import { useUserStore } from '../store/userStore'
import { haptic } from '../lib/telegram'
import type { ActivityType } from '../types'
import ActivityModal from './ActivityModal'

// Русские названия видов активности для списка.
const LABELS: Record<ActivityType, string> = {
  walking: 'Ходьба',
  running: 'Бег',
  cycling: 'Велосипед',
  swimming: 'Плавание',
  strength: 'Силовая',
}

export default function ActivityCard() {
  const { activities, burnedTotal, removeActivity } = useUserStore()
  const [showModal, setShowModal] = useState(false)
  const burned = burnedTotal()

  return (
    <div className="rounded-3xl bg-card p-4 shadow-card">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Flame size={18} className="text-steps" />
          <span className="text-sm font-semibold">Активность</span>
        </div>
        <button
          onClick={() => {
            haptic('light')
            setShowModal(true)
          }}
          className="flex items-center gap-1 rounded-full bg-steps/10 px-3 py-1.5 text-xs font-semibold text-steps"
        >
          <Plus size={14} /> Добавить
        </button>
      </div>

      <div className="text-2xl font-extrabold leading-none">
        {burned}
        <span className="ml-1 text-sm font-medium text-muted">ккал сожжено</span>
      </div>

      {/* Список тренировок за день */}
      {activities.length > 0 && (
        <div className="mt-3 flex flex-col gap-1.5">
          {activities.map((a) => (
            <div
              key={a.id}
              className="flex items-center gap-2 rounded-2xl bg-ink/5 px-3 py-2 text-xs"
            >
              <span className="flex-1 font-medium">
                {LABELS[a.activity_type]} · {a.duration_min} мин ·{' '}
                <span className="text-steps">{a.calories_burned} ккал</span>
              </span>
              <button
                onClick={() => {
                  haptic('light')
                  removeActivity(a.id)
                }}
                className="flex h-6 w-6 items-center justify-center rounded-full text-muted hover:bg-ink/10"
                aria-label="Удалить тренировку"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {showModal && <ActivityModal onClose={() => setShowModal(false)} />}
      </AnimatePresence>
    </div>
  )
}
