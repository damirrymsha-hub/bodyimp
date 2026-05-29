// Маленькая карточка шагов с прогрессом.
// Telegram не отдаёт данные шагомера, поэтому значение демонстрационное/локальное.
import { Footprints } from 'lucide-react'

const GOAL_STEPS = 10000

interface Props {
  steps?: number
}

export default function StepsCard({ steps = 0 }: Props) {
  const pct = Math.min((steps / GOAL_STEPS) * 100, 100)
  return (
    <div className="flex-1 rounded-3xl bg-card p-4 shadow-card">
      <div className="mb-2 flex items-center gap-2">
        <Footprints size={18} className="text-steps" />
        <span className="text-sm font-semibold">Шаги</span>
      </div>
      <div className="text-2xl font-extrabold leading-none">
        {steps.toLocaleString('ru-RU')}
        <span className="ml-1 text-sm font-medium text-muted">
          / {GOAL_STEPS.toLocaleString('ru-RU')}
        </span>
      </div>
      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-ink/5">
        <div
          className="h-full rounded-full bg-steps"
          style={{ width: `${pct}%`, transition: 'width 0.5s ease' }}
        />
      </div>
    </div>
  )
}
