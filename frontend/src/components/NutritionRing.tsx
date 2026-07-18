// SVG-кольцо прогресса с числом в центре (оставшиеся калории).
interface Props {
  consumed: number
  goal: number
  size?: number
  stroke?: number
}

export default function NutritionRing({
  consumed,
  goal,
  size = 168,
  stroke = 12,
}: Props) {
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const progress = goal > 0 ? Math.min(consumed / goal, 1) : 0
  const dashOffset = circumference * (1 - progress)
  const remaining = Math.max(Math.round(goal - consumed), 0)

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        {/* Фоновая дорожка */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#EDEFF2"
          strokeWidth={stroke}
        />
        {/* Прогресс */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#111111"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-4xl font-extrabold leading-none">{remaining}</span>
        <span className="mt-1 text-xs font-medium text-muted">ккал осталось</span>
      </div>
    </div>
  )
}
