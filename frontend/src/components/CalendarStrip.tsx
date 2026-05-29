// Горизонтальный недельный стрип (пн–вс). Текущий/выбранный день — закрашенный кружок.
import { useUIStore } from '../store/uiStore'
import { haptic } from '../lib/telegram'
import { toISODate as iso, todayISO } from '../lib/date'

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

function startOfWeek(d: Date): Date {
  const date = new Date(d)
  const day = (date.getDay() + 6) % 7 // 0 = понедельник
  date.setDate(date.getDate() - day)
  date.setHours(0, 0, 0, 0)
  return date
}

export default function CalendarStrip() {
  const { selectedDate, setSelectedDate } = useUIStore()
  const today = todayISO()
  const monday = startOfWeek(new Date())

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })

  return (
    <div className="flex justify-between gap-1">
      {days.map((d, i) => {
        const key = iso(d)
        const isSelected = key === selectedDate
        const isToday = key === today
        return (
          <button
            key={key}
            onClick={() => {
              haptic('light')
              setSelectedDate(key)
            }}
            className="flex flex-1 flex-col items-center gap-1.5"
          >
            <span className="text-xs font-medium text-muted">{WEEKDAYS[i]}</span>
            <span
              className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold transition-colors ${
                isSelected
                  ? 'bg-ink text-white'
                  : isToday
                    ? 'bg-ink/5 text-ink'
                    : 'text-ink'
              }`}
            >
              {d.getDate()}
            </span>
          </button>
        )
      })}
    </div>
  )
}
