// Утилиты работы с датами в локальном времени (YYYY-MM-DD),
// чтобы дни совпадали с тем, что считает бэкенд (date.today()).

// Форматирует Date в строку YYYY-MM-DD по локальному времени (без сдвига UTC).
export function toISODate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// Сегодняшняя дата в формате YYYY-MM-DD.
export function todayISO(): string {
  return toISODate(new Date())
}

const MONTHS_GEN = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
]
const WEEKDAYS_FULL = [
  'Воскресенье', 'Понедельник', 'Вторник', 'Среда',
  'Четверг', 'Пятница', 'Суббота',
]

// Человекочитаемая подпись даты: "Сегодня, 29 мая" / "Пятница, 27 мая".
export function humanDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00')
  const dayMonth = `${d.getDate()} ${MONTHS_GEN[d.getMonth()]}`
  if (iso === todayISO()) return `Сегодня, ${dayMonth}`
  return `${WEEKDAYS_FULL[d.getDay()]}, ${dayMonth}`
}
