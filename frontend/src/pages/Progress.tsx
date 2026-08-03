// Прогресс (редизайн 1d/1e): сегмент Калории/Вес.
// Калории — скруглённые бары в стиле треков системы + пунктирная цель.
// Вес — чернильная линия с точками + средние макросы недели. Без Recharts.
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Plus } from 'lucide-react'
import { useUserStore } from '../store/userStore'
import { useUIStore } from '../store/uiStore'
import { getWeeklyStats, getWeightHistory, logWeight } from '../api/client'
import { haptic, hapticSuccess } from '../lib/telegram'
import { toISODate, todayISO } from '../lib/date'
import TabBar from '../components/TabBar'
import type { WeeklyStats, WeightLog } from '../types'

const WEEKDAYS = ['ВС', 'ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ']
const MONTHS_GEN = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
]

// Числа в русском формате: 82.4 → «82,4»; 1870 → «1 870».
const ruW = (n: number) => n.toFixed(1).replace('.', ',')
const ruK = (n: number) => Math.round(n).toLocaleString('ru-RU')

export default function Progress() {
  const navigate = useNavigate()
  const { user } = useUserStore()
  const { showToast } = useUIStore()
  const [tab, setTab] = useState<'cal' | 'weight'>('cal')
  const [weekly, setWeekly] = useState<WeeklyStats | null>(null)
  const [weights, setWeights] = useState<WeightLog[]>([])
  const [logging, setLogging] = useState(false)
  const [newWeight, setNewWeight] = useState('')

  useEffect(() => {
    if (!user) return
    getWeeklyStats(user.id).then(setWeekly).catch(() => {})
    getWeightHistory(user.id).then(setWeights).catch(() => {})
  }, [user])

  if (!user) return null
  const goal = user.daily_calories ?? 2000

  async function saveWeight() {
    if (!user) return
    const w = Number(newWeight.replace(',', '.'))
    if (!w || w < 20 || w > 400) {
      showToast('Введите корректный вес', 'error')
      return
    }
    try {
      await logWeight(user.id, w)
      setWeights(await getWeightHistory(user.id))
      setNewWeight('')
      setLogging(false)
      hapticSuccess()
      showToast('Вес записан', 'success')
    } catch {
      showToast('Не удалось сохранить вес', 'error')
    }
  }

  return (
    <div className="min-h-screen px-5 pb-28 pt-6">
      <div className="flex flex-col gap-4">
        <header className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-card shadow-card"
          >
            <ChevronLeft size={20} />
          </button>
          <h1 className="text-xl font-extrabold">Прогресс</h1>
        </header>

        {/* Сегмент Калории / Вес */}
        <div className="flex rounded-2xl bg-ink/5 p-1">
          <SegBtn active={tab === 'cal'} onClick={() => setTab('cal')}>
            Калории
          </SegBtn>
          <SegBtn active={tab === 'weight'} onClick={() => setTab('weight')}>
            Вес
          </SegBtn>
        </div>

        {/* Калории: график + средние макросы (макросы — это про еду) */}
        {tab === 'cal' && (
          <>
            <CaloriesCard weekly={weekly} goal={goal} />
            <MacrosWeekCard weekly={weekly} user={user} />
          </>
        )}

        {/* Вес: график динамики + запись нового замера */}
        {tab === 'weight' && (
          <>
            <WeightCard weights={weights} />
            {logging ? (
              <div className="flex gap-2">
                <input
                  value={newWeight}
                  onChange={(e) => setNewWeight(e.target.value)}
                  inputMode="decimal"
                  placeholder="Вес, кг"
                  autoFocus
                  className="input flex-1"
                />
                <button
                  onClick={() => {
                    haptic('light')
                    saveWeight()
                  }}
                  className="flex h-12 w-12 items-center justify-center rounded-2xl bg-ink text-white"
                  aria-label="Сохранить вес"
                >
                  <Plus size={20} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  haptic('light')
                  setLogging(true)
                }}
                className="rounded-2xl bg-ink p-4 text-center text-sm font-semibold text-white"
              >
                Записать вес
              </button>
            )}
          </>
        )}
      </div>

      <TabBar />
    </div>
  )
}

function SegBtn({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={() => {
        haptic('light')
        onClick()
      }}
      className={`flex-1 rounded-xl py-2.5 text-[13px] transition-colors ${
        active ? 'bg-card font-semibold shadow-card' : 'font-medium text-muted'
      }`}
    >
      {children}
    </button>
  )
}

// ---- Калории: бары 7 дней + пунктирная цель (редизайн 1d) ----
function CaloriesCard({ weekly, goal }: { weekly: WeeklyStats | null; goal: number }) {
  const days = weekly?.days ?? []
  const maxVal = Math.max(goal, ...days.map((d) => d.calories), 1)
  const goalTop = (1 - goal / maxVal) * 100

  return (
    <section className="flex flex-col gap-4 rounded-[2rem] bg-card p-5 shadow-card">
      <div className="flex items-end justify-between">
        <div>
          <div className="text-[11px] font-medium text-muted">в среднем за неделю</div>
          <div className="mt-0.5 flex items-baseline gap-1.5">
            <span className="text-3xl font-extrabold leading-none">
              {weekly ? ruK(weekly.avg_calories) : '—'}
            </span>
            <span className="text-xs font-medium text-muted">ккал/день</span>
          </div>
        </div>
        <span className="rounded-full bg-ink/5 px-3 py-1.5 text-[11px] font-semibold">
          цель {ruK(goal)}
        </span>
      </div>

      {days.length === 0 ? (
        <div className="py-10 text-center text-sm text-muted">
          Пока нет записей за неделю
          <div className="mt-1 text-xs">Добавь еду — здесь появится график</div>
        </div>
      ) : (
        <>
          <div className="relative h-36">
            {/* Пунктир цели */}
            <div
              className="absolute inset-x-0 border-t-2 border-dashed border-ink/15"
              style={{ top: `${goalTop}%` }}
            />
            <div className="absolute inset-0 grid grid-cols-7 items-end gap-2.5">
              {days.map((d) => {
                const h = Math.max((d.calories / maxVal) * 100, 3)
                return (
                  <div
                    key={d.date}
                    className={`rounded-full ${
                      d.date === todayISO() ? 'bg-ink' : 'bg-ink/10'
                    }`}
                    style={{ height: `${h}%`, transition: 'height 0.5s ease' }}
                  />
                )
              })}
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2.5 text-center text-[10px] font-semibold text-muted">
            {days.map((d) => {
              const wd = WEEKDAYS[new Date(d.date + 'T00:00:00').getDay()]
              return (
                <span key={d.date} className={d.date === todayISO() ? 'text-ink' : ''}>
                  {wd}
                </span>
              )
            })}
          </div>
        </>
      )}
    </section>
  )
}

// ---- Вес: линия с точками (редизайн 1e) ----
function WeightCard({ weights }: { weights: WeightLog[] }) {
  // Берём замеры за последние 30 дней (не «последние 7 записей» — это врало,
  // когда взвешивания редкие). Подпись динамическая: по фактическому диапазону.
  const since = new Date()
  since.setDate(since.getDate() - 30)
  const sinceISO = toISODate(since)
  const recent = weights.filter((w) => w.date >= sinceISO)
  const pts = (recent.length >= 2 ? recent : weights).slice(-10)

  const current = pts.length ? pts[pts.length - 1].weight_kg : null
  const delta = pts.length >= 2 ? current! - pts[0].weight_kg : 0
  const spanDays =
    pts.length >= 2
      ? Math.max(
          1,
          Math.round(
            (new Date(pts[pts.length - 1].date + 'T00:00:00').getTime() -
              new Date(pts[0].date + 'T00:00:00').getTime()) /
              86400000,
          ),
        )
      : 0

  if (current == null) {
    return (
      <section className="rounded-[2rem] bg-card p-6 text-center shadow-card">
        <div className="text-sm font-semibold">Пока нет замеров</div>
        <div className="mt-1 text-xs text-muted">
          Запиши вес кнопкой ниже — здесь появится график динамики.
        </div>
      </section>
    )
  }

  // Координаты линии в viewBox 330×120 с полями.
  const W = 330, H = 120, PX = 12, PY = 14
  const vals = pts.map((p) => p.weight_kg)
  const min = Math.min(...vals), max = Math.max(...vals)
  const span = Math.max(max - min, 0.5)
  const x = (i: number) =>
    pts.length === 1 ? W / 2 : PX + (i * (W - 2 * PX)) / (pts.length - 1)
  const y = (v: number) => PY + ((max - v) / span) * (H - 2 * PY)

  // Плавная линия через середины отрезков (quadratic smoothing).
  let d = `M ${x(0)} ${y(vals[0])}`
  for (let i = 1; i < pts.length; i++) {
    const mx = (x(i - 1) + x(i)) / 2
    const my = (y(vals[i - 1]) + y(vals[i])) / 2
    d += ` Q ${x(i - 1)} ${y(vals[i - 1])}, ${mx} ${my}`
  }
  d += ` L ${x(pts.length - 1)} ${y(vals[pts.length - 1])}`

  const first = pts[0]
  const fd = new Date(first.date + 'T00:00:00')

  return (
    <section className="flex flex-col gap-4 rounded-[2rem] bg-card p-5 shadow-card">
      <div className="flex items-end justify-between">
        <div>
          <div className="text-[11px] font-medium text-muted">текущий вес</div>
          <div className="mt-0.5 flex items-baseline gap-1.5">
            <span className="text-3xl font-extrabold leading-none">{ruW(current)}</span>
            <span className="text-xs font-medium text-muted">кг</span>
          </div>
        </div>
        {pts.length >= 2 && (
          <span className="rounded-full bg-ink/5 px-3 py-1.5 text-[11px] font-semibold">
            {delta > 0 ? '+' : '−'}
            {ruW(Math.abs(delta))} за {spanDays}{' '}
            {spanDays % 10 === 1 && spanDays % 100 !== 11 ? 'день' : 'дн.'}
          </span>
        )}
      </div>

      {/* Без preserveAspectRatio="none": иначе линия и точки растягиваются */}
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 'auto' }}>
        <path d={d} fill="none" stroke="#111111" strokeWidth="3" strokeLinecap="round" />
        {pts.map((p, i) =>
          i === pts.length - 1 ? (
            <circle key={p.id} cx={x(i)} cy={y(p.weight_kg)} r="5" fill="#fff" stroke="#111" strokeWidth="3" />
          ) : (
            <circle key={p.id} cx={x(i)} cy={y(p.weight_kg)} r="4" fill="#111" />
          ),
        )}
      </svg>

      <div className="flex justify-between text-[10px] font-semibold text-muted">
        <span>
          {fd.getDate()} {MONTHS_GEN[fd.getMonth()]} · {ruW(first.weight_kg)}
        </span>
        <span className="text-ink">сегодня · {ruW(current)}</span>
      </div>
    </section>
  )
}

// ---- Средние макросы за неделю (редизайн 1e) ----
function MacrosWeekCard({
  weekly,
  user,
}: {
  weekly: WeeklyStats | null
  user: { daily_protein_g: number | null; daily_fat_g: number | null; daily_carbs_g: number | null }
}) {
  const rows = [
    { label: 'Белки', avg: weekly?.avg_protein_g ?? 0, goal: user.daily_protein_g ?? 0, color: 'bg-protein' },
    { label: 'Жиры', avg: weekly?.avg_fat_g ?? 0, goal: user.daily_fat_g ?? 0, color: 'bg-fat' },
    { label: 'Углеводы', avg: weekly?.avg_carbs_g ?? 0, goal: user.daily_carbs_g ?? 0, color: 'bg-carbs' },
  ]
  return (
    <section className="flex flex-col gap-3.5 rounded-[2rem] bg-card p-5 shadow-card">
      <div className="text-[13px] font-bold">Средние макросы за неделю</div>
      <div className="flex flex-col gap-2.5">
        {rows.map((r) => {
          const pct = r.goal > 0 ? Math.min((r.avg / r.goal) * 100, 100) : 0
          return (
            <div key={r.label} className="flex items-center gap-2.5">
              <span className="w-16 text-xs font-semibold">{r.label}</span>
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink/5">
                <div
                  className={`h-full rounded-full ${r.color}`}
                  style={{ width: `${pct}%`, transition: 'width 0.5s ease' }}
                />
              </div>
              <span className="w-16 text-right text-[11px] font-semibold text-muted">
                {Math.round(r.avg)}/{r.goal}
              </span>
            </div>
          )
        })}
      </div>
    </section>
  )
}
