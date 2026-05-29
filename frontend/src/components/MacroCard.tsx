// Строка макроса: название + факт/норма + прогресс-бар.
interface Props {
  label: string
  current: number
  goal: number
  color: string // tailwind-класс фона бара, напр. 'bg-protein'
  unit?: string
}

export default function MacroCard({ label, current, goal, color, unit = 'г' }: Props) {
  const pct = goal > 0 ? Math.min((current / goal) * 100, 100) : 0
  return (
    <div className="flex-1">
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="text-sm font-semibold text-ink">{label}</span>
        <span className="text-xs font-medium text-muted">
          {Math.round(current)}/{goal} {unit}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-ink/5">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${pct}%`, transition: 'width 0.5s ease' }}
        />
      </div>
    </div>
  )
}
