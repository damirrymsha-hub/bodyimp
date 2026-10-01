import { useEffect, useState } from 'react'
import { X, ChevronRight, Dumbbell, CalendarDays } from 'lucide-react'
import { getTrainingWeek, saveTrainingPlan } from '../api/training'
import type { TrainingProfile, TrainingWeek, Exercise } from '../api/training'
import { useSheet } from '../hooks/useSheet'
import { todayISO } from '../lib/date'

const DAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
const GOALS = { health: 'Здоровье и тонус', lose: 'Похудение', recomp: 'Рекомпозиция', gain: 'Набор мышц' }
const DEFAULT: TrainingProfile = { goal: 'health', experience: 'beginner', location: 'home', equipment: [], weekdays: [0, 2, 4], session_minutes: 45, cardio_enabled: false, cardio_weekdays: [], excluded_exercises: [] }
const toggle = (values: number[], value: number) => values.includes(value) ? values.filter(v => v !== value) : [...values, value].sort()
const errorMessage = (error: unknown) => {
  const detail = (error as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail
  return typeof detail === 'string' ? detail : 'Не удалось загрузить план. Проверьте соединение и повторите.'
}

function DayPicker({ value, onChange, max = 7 }: { value: number[]; onChange: (days: number[]) => void; max?: number }) {
  return <div className="grid grid-cols-7 gap-1">{DAYS.map((day, i) => <button key={day} type="button" aria-label={day} aria-pressed={value.includes(i)} disabled={!value.includes(i) && value.length >= max} onClick={() => onChange(toggle(value, i))} className={`rounded-xl text-sm font-semibold disabled:opacity-40 ${value.includes(i) ? 'bg-ink text-white' : 'bg-bg text-ink'}`}>{day}</button>)}</div>
}

function PlanSetup({ initial, onClose, onSaved }: { initial: TrainingProfile | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<TrainingProfile>(() => initial ? { ...initial, equipment: [...initial.equipment], weekdays: [...initial.weekdays], cardio_weekdays: [...initial.cardio_weekdays] } : { ...DEFAULT })
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const close = () => { if (!saving) onClose() }
  const ref = useSheet(close)
  const patch = (data: Partial<TrainingProfile>) => setForm(f => ({ ...f, ...data }))
  const valid = form.weekdays.length > 0 && (!form.cardio_enabled || form.cardio_weekdays.length > 0)
  async function submit() {
    if (!valid || saving) return
    setSaving(true); setError('')
    try { await saveTrainingPlan(form, todayISO()); onSaved() }
    catch (e) { setError(errorMessage(e)); setSaving(false) }
  }
  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={close}>
    <div ref={ref} role="dialog" aria-modal="true" aria-labelledby="plan-title" tabIndex={-1} onClick={e => e.stopPropagation()} className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-card p-5 pb-8 shadow-xl">
      <header className="mb-5 flex items-center justify-between"><div><p className="text-xs text-muted">Шаг {step + 1} из 3</p><h2 id="plan-title" className="text-xl font-bold">{['Ваш ориентир', 'Где и с чем', 'Ритм недели'][step]}</h2></div><button aria-label="Закрыть настройку плана" disabled={saving} onClick={close} className="flex h-11 w-11 items-center justify-center"><X /></button></header>
      <fieldset disabled={saving} className="space-y-5">
        {step === 0 && <>
          <label className="block text-sm font-semibold">Цель<select className="input mt-2 w-full" value={form.goal} onChange={e => patch({ goal: e.target.value as TrainingProfile['goal'] })}>{Object.entries(GOALS).map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>
          <label className="block text-sm font-semibold">Опыт силовых тренировок<select className="input mt-2 w-full" value={form.experience} onChange={e => patch({ experience: e.target.value as TrainingProfile['experience'] })}><option value="beginner">Начинаю или возвращаюсь после перерыва</option><option value="intermediate">Регулярно тренируюсь</option><option value="advanced">Опытный — хорошо знаю технику</option></select></label>
          <p className="text-sm text-muted">Начнём с посильной нагрузки. Цель плана не меняет норму питания в профиле.</p>
        </>}
        {step === 1 && <>
          <div className="grid grid-cols-2 gap-2">{(['home', 'gym'] as const).map(location => <button key={location} aria-pressed={form.location === location} onClick={() => patch({ location })} className={`rounded-2xl p-3 font-semibold ${form.location === location ? 'bg-ink text-white' : 'bg-bg'}`}>{location === 'home' ? 'Дома' : 'В зале'}</button>)}</div>
          {form.location === 'home' ? <div><p className="mb-2 text-sm font-semibold">Что есть дома?</p>{[['dumbbells', 'Гантели'], ['bands', 'Резинки'], ['sliders', 'Скользящие диски для ног']].map(([id, title]) => <label key={id} className="flex min-h-[48px] items-center gap-3"><input type="checkbox" checked={form.equipment.includes(id)} onChange={() => patch({ equipment: form.equipment.includes(id) ? form.equipment.filter(v => v !== id) : [...form.equipment, id] })} className="h-5 w-5 accent-ink" />{title}</label>)}<p className="text-sm text-muted">Нет инвентаря? Оставьте поля пустыми. Для полноценной тренировки спины понадобятся резинки или гантели.</p></div> : <p className="text-sm text-muted">План рассчитан на зал со штангой, гантелями и блочными тренажёрами.</p>}
          <label className="block text-sm font-semibold">Время на занятие<select className="input mt-2 w-full" value={form.session_minutes} onChange={e => patch({ session_minutes: Number(e.target.value) })}>{[30, 45, 60, 75].map(m => <option key={m} value={m}>{m} минут</option>)}</select></label>
        </>}
        {step === 2 && <>
          <div><p className="mb-2 font-semibold">Дни силовых тренировок</p><DayPicker value={form.weekdays} max={6} onChange={weekdays => patch({ weekdays })} /><p className="mt-2 text-xs text-muted">От 1 до 6 дней. По возможности оставляйте день между занятиями.</p></div>
          <div className="rounded-2xl bg-bg p-4"><label className="flex min-h-[44px] items-center gap-3 font-semibold"><input type="checkbox" className="h-5 w-5 accent-ink" checked={form.cardio_enabled} onChange={e => patch({ cardio_enabled: e.target.checked, cardio_weekdays: e.target.checked ? [form.weekdays[0] ?? 0] : [] })} />Добавить кардио в план</label><p className="text-sm text-muted">{form.goal === 'lose' ? 'Предлагаем посильную быструю ходьбу в дополнение к силовым.' : 'Быстрая ходьба или спокойный велосипед для выносливости.'} Учитывайте уже привычную активность.</p>
          {form.cardio_enabled && <div className="mt-3"><p className="mb-2 text-sm font-semibold">Дни кардио</p><DayPicker value={form.cardio_weekdays} onChange={cardio_weekdays => patch({ cardio_weekdays })} /><p className="mt-2 text-xs text-muted">В силовой день — после упражнений, внутри выбранного времени. В отдельный день — {form.goal === 'lose' ? 25 : 20} минут.</p></div>}</div>
          <p className="text-sm text-muted">Программа начнётся сегодня. Предыдущие дни сохранят старый план. Нагрузку выполняйте без боли; упражнение всегда можно пропустить.</p>
        </>}
      </fieldset>
      {error && <p role="alert" className="mt-4 text-sm text-red-700">{error}</p>}
      <div className="mt-6 flex gap-2">{step > 0 && <button disabled={saving} onClick={() => setStep(s => s - 1)} className="rounded-2xl bg-bg px-5">Назад</button>}<button disabled={saving || (step === 2 && !valid)} onClick={() => step < 2 ? setStep(s => s + 1) : void submit()} className="min-h-[48px] flex-1 rounded-2xl bg-ink px-4 font-semibold text-white disabled:opacity-40">{saving ? 'Сохраняем…' : step < 2 ? 'Далее' : 'Создать план'}</button></div>
    </div>
  </div>
}

function ExerciseCard({ exercise: e }: { exercise: Exercise }) {
  return <details className="rounded-2xl bg-bg p-3"><summary className="min-h-[44px] cursor-pointer list-none"><div className="flex items-center gap-3"><Dumbbell size={20} aria-hidden="true" className="shrink-0 text-muted" /><div className="min-w-0 flex-1"><h4 className="text-sm font-semibold">{e.name}</h4><p className="mt-1 text-sm text-muted">{e.sets} × {e.rep_min}–{e.rep_max} · отдых {e.rest_s / 60} мин</p></div><ChevronRight size={16} aria-hidden="true" /></div></summary><div className="mt-3 border-t border-black/10 pt-3 text-sm"><p className="mb-2 text-muted">{e.muscles} · оставляйте примерно {e.rir_target} повтора в запасе</p><ul className="list-disc space-y-1 pl-5">{e.cues.map(cue => <li key={cue}>{cue}</li>)}</ul></div></details>
}

export default function TrainingPlan({ selectedDate }: { selectedDate: string }) {
  const [week, setWeek] = useState<TrainingWeek | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(false)
  const [revision, setRevision] = useState(0)
  useEffect(() => {
    let active = true
    setLoading(true); setError(''); setWeek(null)
    getTrainingWeek(selectedDate).then(data => { if (active) setWeek(data) }).catch(e => { if (active) setError(errorMessage(e)) }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [selectedDate, revision])
  return <section aria-label="Недельный план" className="space-y-4 rounded-3xl bg-card p-4 shadow-card">
    <header className="flex items-center justify-between"><h2 className="text-lg font-bold">План тренировок</h2>{week?.profile && <button onClick={() => setEditing(true)} className="px-2 text-sm underline">Настроить</button>}</header>
    {loading && <p role="status" className="text-sm text-muted">Загружаем неделю…</p>}
    {error && <div role="alert"><p className="text-sm">{error}</p><button onClick={() => setRevision(r => r + 1)} className="mt-2 underline">Повторить загрузку плана</button></div>}
    {!loading && !error && week && !week.profile && <><CalendarDays className="text-muted" /><p className="text-sm text-muted">Выберите цель, оборудование и удобные дни. Получите неделю с упражнениями, подходами и повторениями.</p><button onClick={() => setEditing(true)} className="w-full rounded-2xl bg-ink p-3 font-semibold text-white">Составить мой план</button></>}
    {!loading && week?.profile && <>
      <p className="text-sm text-muted">{GOALS[week.profile.goal]} · {week.profile.weekdays.length} силовых дня · до {week.profile.session_minutes} мин</p>
      {week.notes.length > 0 && <p className="rounded-2xl bg-bg p-3 text-sm">{week.notes[0]}</p>}
      {week.days.map((day, index) => <details key={`${day.date}-${day.program_id}`} open={day.date === selectedDate} className={`rounded-2xl border p-3 ${day.date === selectedDate ? 'border-ink/40' : 'border-black/10'}`}><summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between gap-2"><div><span className="text-xs font-semibold text-muted">{DAYS[index]} · {day.date.slice(8)}.{day.date.slice(5, 7)}</span><h3 className="font-semibold">{day.plan?.title ?? (day.program_id ? 'Восстановление' : 'До начала программы')}</h3></div><span className="text-xs text-muted">{day.plan ? `≈ ${day.plan.estimated_minutes} мин` : '—'}</span></summary>
        {day.plan ? <div className="mt-3 space-y-2">{day.plan.warmup_minutes > 0 && <p className="text-sm text-muted">Разминка {day.plan.warmup_minutes} мин: лёгкое движение и пробные подходы без тяжёлого веса.</p>}{day.plan.exercises.map(e => <ExerciseCard key={e.id} exercise={e} />)}{day.plan.cardio_minutes > 0 && <div className="rounded-2xl bg-bg p-3 text-sm"><b>Кардио · {day.plan.cardio_minutes} мин</b><p className="mt-1 text-muted">Ходьба или велосипед в темпе, при котором можно говорить предложениями.{day.plan.exercises.length > 0 ? ' После силовых упражнений.' : ''}</p></div>}</div> : <p className="mt-2 text-sm text-muted">Силовая тренировка на этот день не назначена.</p>}
      </details>)}
      {week.notes.length > 0 && <details className="text-sm"><summary className="min-h-[44px] cursor-pointer font-semibold">Как план учёл ваши настройки</summary><ul className="list-disc space-y-2 pl-5 text-muted">{week.notes.map(note => <li key={note}>{note}</li>)}</ul></details>}
      <p className="text-xs text-muted">План повторяется по неделям. Выполненную тренировку записывайте ниже в «Добавить активность».</p>
    </>}
    {editing && <PlanSetup initial={week?.profile ?? null} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); setRevision(r => r + 1) }} />}
  </section>
}
