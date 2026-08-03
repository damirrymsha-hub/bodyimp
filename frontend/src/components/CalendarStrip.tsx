// Недельный стрип (пн–вс) с навигацией по неделям.
// Строится от ВЫБРАННОЙ даты, поэтому история за прошлые недели доступна;
// листается свайпом влево/вправо, будущие дни не тапаются.
import { motion } from 'framer-motion'
import { useUIStore } from '../store/uiStore'
import { haptic } from '../lib/telegram'
import { toISODate as iso, todayISO } from '../lib/date'

const WEEKDAYS = ['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'ВС']
const MONTHS = [
  'ЯНВАРЬ', 'ФЕВРАЛЬ', 'МАРТ', 'АПРЕЛЬ', 'МАЙ', 'ИЮНЬ',
  'ИЮЛЬ', 'АВГУСТ', 'СЕНТЯБРЬ', 'ОКТЯБРЬ', 'НОЯБРЬ', 'ДЕКАБРЬ',
]

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
  const monday = startOfWeek(new Date(selectedDate + 'T00:00:00'))

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })

  const currentWeek = iso(monday) === iso(startOfWeek(new Date()))
  const monthLabel = `${MONTHS[days[3].getMonth()]} ${days[3].getFullYear()}`

  // Сдвиг на неделю: выбираем тот же день недели соседней недели,
  // но не уходим в будущее (там нет данных).
  function shiftWeek(dir: -1 | 1) {
    const d = new Date(selectedDate + 'T00:00:00')
    d.setDate(d.getDate() + dir * 7)
    const next = iso(d)
    haptic('light')
    setSelectedDate(next > today ? today : next)
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between px-1">
        <span className="text-[10px] font-bold tracking-wider text-faint">
          {monthLabel}
        </span>
        {currentWeek ? (
          <span className="text-[10px] font-medium text-muted">
            ‹ свайп по неделям ›
          </span>
        ) : (
          <button
            onClick={() => {
              haptic('light')
              setSelectedDate(today)
            }}
            className="rounded-full bg-ink/5 px-2.5 py-1 text-[10px] font-bold"
          >
            Сегодня
          </button>
        )}
      </div>

      {/* Свайп влево — следующая неделя, вправо — предыдущая */}
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.15}
        onDragEnd={(_, info) => {
          if (info.offset.x < -60) shiftWeek(1)
          else if (info.offset.x > 60) shiftWeek(-1)
        }}
        className="flex justify-between gap-1"
      >
        {days.map((d, i) => {
          const key = iso(d)
          const isSelected = key === selectedDate
          const isToday = key === today
          const isFuture = key > today
          return (
            <button
              key={key}
              disabled={isFuture}
              onClick={() => {
                haptic('light')
                setSelectedDate(key)
              }}
              className="flex flex-1 flex-col items-center gap-1.5"
            >
              <span
                className={`text-[10px] font-bold ${
                  isFuture ? 'text-ink/20' : 'text-faint'
                }`}
              >
                {WEEKDAYS[i]}
              </span>
              <span
                className={`flex h-9 w-9 items-center justify-center rounded-full text-[13px] font-bold transition-colors ${
                  isSelected
                    ? 'bg-ink text-white'
                    : isFuture
                      ? 'text-ink/25'
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
      </motion.div>
    </div>
  )
}
