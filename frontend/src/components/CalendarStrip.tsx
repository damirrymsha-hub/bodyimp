// Недельный стрип (пн–вс) с навигацией по неделям.
// Строится от ВЫБРАННОЙ даты, поэтому история за прошлые недели доступна;
// листается свайпом влево/вправо, будущие дни не тапаются.
import { useRef } from 'react'
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
  const pointer = useRef<{ x: number; y: number } | null>(null)
  const swiped = useRef(false)
  const { selectedDate, setSelectedDate } = useUIStore()
  const today = todayISO()
  const monday = startOfWeek(new Date(selectedDate + 'T00:00:00'))

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })

  const currentWeek = iso(monday) === iso(startOfWeek(new Date()))
  const selected = new Date(selectedDate + 'T00:00:00')
  const monthLabel = `${MONTHS[selected.getMonth()]} ${selected.getFullYear()}`

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
            className="min-h-[44px] rounded-full bg-ink/5 px-2.5 py-1 text-[10px] font-bold"
          >
            Сегодня
          </button>
        )}
      </div>

      {/* Свайп влево — следующая неделя, вправо — предыдущая */}
      <div
        style={{ touchAction: 'pan-y' }}
        onPointerDown={(e) => { pointer.current = { x: e.clientX, y: e.clientY }; swiped.current = false }}
        onPointerCancel={() => { pointer.current = null }}
        onPointerUp={(e) => {
          if (!pointer.current) return
          const dx = e.clientX - pointer.current.x
          const dy = e.clientY - pointer.current.y
          pointer.current = null
          if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy)) {
            swiped.current = true
            shiftWeek(dx < 0 ? 1 : -1)
          }
        }}
        onClickCapture={(e) => { if (swiped.current) { e.preventDefault(); e.stopPropagation(); swiped.current = false } }}
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
              className="flex min-h-[44px] flex-1 flex-col items-center gap-1.5"
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
      </div>
    </div>
  )
}
