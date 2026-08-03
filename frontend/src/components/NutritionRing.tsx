// SVG-кольцо прогресса. При переборе нормы рисуется вторая дуга (цвет белков),
// а число в центре меняет смысл: «осталось» → «сверх нормы».
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

  // Перебор: доля превышения нормы (визуально ограничена одним оборотом).
  const over = goal > 0 && consumed > goal
  const overRatio = over ? Math.min((consumed - goal) / goal, 1) : 0
  const overDash = circumference * overRatio

  const diff = Math.round(goal - consumed)

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
        {/* Прогресс до нормы */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#111111"
          strokeWidth={stroke}
          strokeLinecap={over ? 'butt' : 'round'}
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
        {/* Дуга перебора поверх заполненного кольца */}
        {over && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#FF7A59"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${overDash} ${circumference}`}
            style={{ transition: 'stroke-dasharray 0.6s ease' }}
          />
        )}
      </svg>
      <div className="absolute flex flex-col items-center">
        <span
          className={`text-4xl font-extrabold leading-none ${
            over ? 'text-[#E05A32]' : ''
          }`}
        >
          {over ? `+${Math.abs(diff)}` : diff}
        </span>
        <span className="mt-1 text-xs font-medium text-muted">
          {over ? 'ккал сверх нормы' : 'ккал осталось'}
        </span>
      </div>
    </div>
  )
}
