import { useEffect, useId, useRef, useState } from 'react'
import { Pause, Play, RotateCcw, X } from 'lucide-react'
import type { Exercise } from '../api/training'
import { useSheet } from '../hooks/useSheet'
import { EXERCISE_GUIDES, type Guide, type Point } from './exerciseGuides'
import { interpolatePose, motionProgress, REP_DURATION_MS } from './exerciseMotion'

function Figure({ guide: g, phase, name, progress }: { guide: Guide; phase: 0 | 1; name: string; progress: number }) {
  const id = useId()
  const p = interpolatePose(g.poses[0], g.poses[1], progress)
  const line = (a: Point, b: Point) => `${a.join(',')} ${b.join(',')}`
  const point = (pose: typeof p) => g.scene === 'chair' && g.load === 'leg_pad' || g.scene === 'lying' || g.scene === 'sliders' || name.includes('носки') ? pose.foot : name.includes('Приседания') ? pose.hip : name.includes('Отжимания') ? pose.shoulder : pose.hand
  const from = point(g.poses[0]), to = point(g.poses[1])
  const dumbbell = (at: Point) => <g transform={`translate(${at[0]} ${at[1]})`} stroke="#557765" strokeWidth="4"><path d="M-13 0H13" /><path d="M-12 -8V8 M12 -8V8" strokeWidth="6" /></g>
  return <svg role="img" aria-labelledby={`${id}-title`} viewBox="0 -20 240 240" className="mx-auto w-full max-w-[320px]">
    <title id={`${id}-title`}>{name}. {g.captions[phase]}</title>
    <defs><marker id={`${id}-arrow`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0L10 5L0 10Z" fill="#16775b" /></marker></defs>
    <path d="M15 203H225" stroke="#b8c6bd" strokeWidth="2" />
    {/* Опоры и оборудование рисуются под фигурой, а не заменяются общим значком. */}
    {g.scene === 'bench' && <path d="M26 150H137 M45 150V203 M123 150V203" fill="none" stroke="#9aa89f" strokeWidth="8" strokeLinejoin="round" />}
    {g.scene === 'lying' && <path d="M45 128H168 M55 128V203 M156 128V203" fill="none" stroke="#9aa89f" strokeWidth="9" />}
    {g.scene === 'chair' && <path d={`M${p.shoulder[0]-18} 65V144H${p.hip[0]+35} M${p.hip[0]-15} 144V203 M${p.hip[0]+28} 144V203`} fill="none" stroke="#9aa89f" strokeWidth="8" strokeLinejoin="round" />}
    {g.scene === 'row_seat' && <path d="M67 165H111 M82 165V203 M181 199L202 175" stroke="#9aa89f" strokeWidth="7" />}
    {g.scene === 'sliders' && <ellipse cx={p.foot[0]} cy="199" rx="13" ry="4" fill="#557765" />}
    {g.load === 'smith' && <path d="M53 15V200 M178 15V200 M46 200H189" stroke="#9aa89f" strokeWidth="5" fill="none" />}
    {g.load.startsWith('band') && <path d={g.load === 'band_row' ? `M${p.foot.join(' ')} Q215 130 ${p.hand.join(' ')}` : g.load === 'band_triceps' ? `M${p.foot.join(' ')} Q55 122 ${p.hand.join(' ')}` : `M${p.foot.join(' ')} L${p.hand.join(' ')}`} stroke="#d09836" strokeWidth="3" fill="none" />}
    {g.load.startsWith('cable') && <g stroke="#9aa89f" fill="none"><path d={g.load === 'cable_row' ? 'M220 55V195' : 'M22 60V195'} strokeWidth="6" /><path d={`M${g.load === 'cable_row' ? '220 127' : '22 177'} L${p.hand.join(' ')}`} strokeWidth="2" /></g>}
    {/* Дальний контур делает различимыми обе руки и ноги в боковом ракурсе. */}
    <g transform="translate(-9 0)" fill="none" stroke="#a5b8ac" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round"><polyline points={`${line(p.shoulder, p.elbow)} ${p.hand.join(',')}`} /><polyline points={`${line(p.hip, p.knee)} ${p.foot.join(',')}`} /></g>
    <g fill="none" stroke="#243d31" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round"><polyline points={`${line(p.head, p.shoulder)} ${p.hip.join(',')}`} /><polyline points={`${line(p.shoulder, p.elbow)} ${p.hand.join(',')}`} /><polyline points={`${line(p.hip, p.knee)} ${p.foot.join(',')}`} /><path d={`M${p.foot[0]-5} ${p.foot[1]+3} L${p.foot[0]+12} ${name.includes('носки') ? 198 : Math.min(p.foot[1]+7,198)}`} /></g>
    <circle cx={p.head[0]} cy={p.head[1]} r="12" fill="#e8c6a7" stroke="#243d31" strokeWidth="2" />
    {[p.elbow, p.knee].map((a, i) => <circle key={i} cx={a[0]} cy={a[1]} r="3" fill="#c8dccb" />)}
    {g.load === 'dumbbell' && dumbbell(p.hand)}
    {g.load === 'goblet' && <g transform={`translate(${p.hand[0]} ${p.hand[1]}) rotate(90)`}><path d="M-11 0H11 M-11 -7V7 M11 -7V7" stroke="#557765" strokeWidth="6" /></g>}
    {(g.load === 'bar' || g.load === 'smith' || g.load === 'bar_hand') && <g transform={`translate(${g.load === 'bar_hand' ? p.hand[0] : p.shoulder[0]} ${g.load === 'bar_hand' ? p.hand[1] : p.shoulder[1]+3})`} stroke="#557765"><path d="M-45 0H45" strokeWidth="4" /><path d="M-33 -13V13 M33 -13V13" strokeWidth="8" /></g>}
    {g.load === 'leg_pad' && <g><circle cx={p.knee[0]} cy={p.knee[1]} r="7" stroke="#9aa89f" fill="none" /><path d={`M${p.knee.join(' ')} L${p.foot.join(' ')}`} stroke="#9aa89f" strokeWidth="3" /><ellipse cx={p.foot[0]} cy={p.foot[1]-5} rx="10" ry="7" fill="#557765" /></g>}
    {g.load === 'machine_press' && <path d={`M195 175V55 L${p.hand.join(' ')}`} fill="none" stroke="#9aa89f" strokeWidth="5" />}
    {g.load === 'calf_machine' && <path d={`M83 ${p.shoulder[1]}H140 M148 30V195 M100 201H146`} stroke="#9aa89f" strokeWidth="8" fill="none" />}
    {g.load === 'calf_seated' && <path d={`M${p.knee[0]-22} ${p.knee[1]-10}H${p.knee[0]+8} M140 201H184`} stroke="#557765" strokeWidth="8" />}
    <path d={`M${from[0]+25} ${from[1]} Q${Math.max(from[0],to[0])+55} ${(from[1]+to[1])/2} ${to[0]+25} ${to[1]}`} stroke="#16775b" strokeWidth="2.5" strokeDasharray="4 4" fill="none" markerEnd={`url(#${id}-arrow)`} />
  </svg>
}

export default function ExerciseInfo({ exercise, onClose }: { exercise: Exercise; onClose: () => void }) {
  const ref = useSheet(onClose)
  const titleId = useId()
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [time, setTime] = useState(0)
  const elapsed = useRef(0)
  const progress = motionProgress(time)
  const phase: 0 | 1 = progress >= 0.5 ? 1 : 0
  const seek = (value: number) => { setPlaying(false); elapsed.current = value; setTime(value) }
  useEffect(() => {
    if (!playing) return
    let frame = 0
    let previous = performance.now()
    const tick = (now: number) => {
      elapsed.current = (elapsed.current + (now - previous) * speed) % REP_DURATION_MS
      previous = now
      setTime(elapsed.current)
      frame = requestAnimationFrame(tick)
    }
    // В фоне не продолжаем демонстрацию и не расходуем батарею.
    const hide = () => { if (document.hidden) setPlaying(false) }
    document.addEventListener('visibilitychange', hide)
    frame = requestAnimationFrame(tick)
    return () => { cancelAnimationFrame(frame); document.removeEventListener('visibilitychange', hide) }
  }, [playing, speed])
  const guide = EXERCISE_GUIDES[exercise.id]
  return <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40" onClick={onClose}>
    <div ref={ref} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} onClick={e => e.stopPropagation()} className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-card p-5 pb-[max(24px,env(safe-area-inset-bottom))] shadow-xl">
      <header className="flex items-start justify-between gap-2"><div><p className="mb-1 text-xs font-semibold text-muted">Техника выполнения</p><h2 id={titleId} className="text-xl font-bold">{exercise.name}</h2><p className="mt-1 text-sm text-muted">{exercise.muscles}</p></div><button onClick={onClose} aria-label="Закрыть инструкцию" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-bg"><X size={22} /></button></header>
      {guide ? <>
        <div className="mt-5 rounded-3xl bg-bg p-3">
          <div className="grid grid-cols-2 gap-2">{([0, 1] as const).map(i => <button key={i} aria-pressed={phase === i} onClick={() => seek(i * REP_DURATION_MS / 2)} className={`rounded-xl px-2 text-sm font-semibold ${phase === i ? 'bg-ink text-white' : 'bg-card'}`}>{i + 1}. {i === 0 ? 'Исходное' : 'Движение'}</button>)}</div>
          <Figure guide={guide} phase={phase} name={exercise.name} progress={progress} />
          <p className="text-center text-sm font-semibold">{guide.captions[phase]}</p>
          <label className="mt-3 block text-xs text-muted">Полный повтор · движение и возврат<input aria-label="Момент демонстрации" type="range" min="0" max={REP_DURATION_MS} step="50" value={time} onChange={e => seek(Number(e.target.value))} className="block h-11 w-full accent-ink" /></label>
          <div className="flex items-center gap-2"><button onClick={() => setPlaying(p => !p)} aria-label={playing ? 'Приостановить демонстрацию' : 'Воспроизвести демонстрацию'} className="flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl bg-ink px-2 text-sm font-semibold text-white">{playing ? <Pause size={18} aria-hidden="true" /> : <Play size={18} aria-hidden="true" />}{playing ? 'Пауза' : 'Смотреть'}</button><button aria-label="В начало демонстрации" onClick={() => seek(0)} className="flex h-11 w-11 items-center justify-center rounded-xl bg-card"><RotateCcw size={18} aria-hidden="true" /></button><select aria-label="Скорость демонстрации" value={speed} onChange={e => setSpeed(Number(e.target.value))} className="h-11 rounded-xl bg-card px-2 text-base"><option value={1}>1×</option><option value={0.5}>0,5×</option></select></div>
          <p className="mt-3 text-center text-xs text-muted">Схематическая демонстрация. Темп можно замедлить.</p>
        </div>
        <section className="mt-5"><h3 className="font-bold">Подготовка</h3><p className="mt-2 text-sm leading-relaxed">{guide.setup}</p></section>
        <section className="mt-5"><h3 className="font-bold">Как выполнять</h3><ol className="mt-3 space-y-3">{guide.steps.map((step, i) => <li key={step} className="flex gap-3 text-sm leading-relaxed"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-bg font-bold">{i + 1}</span><span>{step}</span></li>)}</ol></section>
        <section className="mt-5 rounded-2xl bg-bg p-4"><h3 className="font-bold">Чего избегать</h3><ul className="mt-2 list-disc space-y-2 pl-5 text-sm">{guide.mistakes.map(m => <li key={m}>{m}</li>)}</ul></section>
      </> : <div className="mt-5"><p className="text-sm text-muted">Иллюстрация этого упражнения пока недоступна.</p><ul className="mt-3 list-disc space-y-2 pl-5">{exercise.cues.map(cue => <li key={cue}>{cue}</li>)}</ul></div>}
      <p className="mt-5 text-sm text-muted">По вашему плану: {exercise.sets} подхода × {exercise.rep_min}–{exercise.rep_max}. Оставляйте примерно {exercise.rir_target} повтора в запасе. Отдых — {exercise.rest_s / 60} мин.</p>
      <button onClick={onClose} className="mt-5 min-h-[48px] w-full rounded-2xl bg-ink px-4 font-semibold text-white">Понятно</button>
    </div>
  </div>
}
