// Скелетон ИИ-анализа (редизайн 1c): повторяет форму будущей карточки
// результата + этапный статус с анимированными точками. Без спиннеров.
import { useEffect, useState } from 'react'

const STAGES = ['Распознаём блюдо', 'Считаем КБЖУ', 'Сверяем с базой']

export default function AnalysisSkeleton() {
  const [stage, setStage] = useState(0)

  // Этапы сменяются каждые 2.5 секунды — видно, что процесс живой.
  useEffect(() => {
    const t = setInterval(() => setStage((s) => (s + 1) % STAGES.length), 2500)
    return () => clearInterval(t)
  }, [])

  return (
    <div className="flex flex-col gap-3.5 rounded-3xl bg-card p-5 shadow-card">
      <div className="flex items-center gap-3">
        <div className="bi-pulse h-14 w-14 rounded-2xl bg-[#EDEFF2]" />
        <div className="flex flex-1 flex-col gap-2">
          <div className="bi-pulse h-3.5 w-[70%] rounded-full bg-[#EDEFF2]" />
          <div
            className="bi-pulse h-2.5 w-[45%] rounded-full bg-[#EDEFF2]"
            style={{ animationDelay: '0.2s' }}
          />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2.5">
        <div className="bi-pulse h-2 rounded-full bg-[#EDEFF2]" />
        <div className="bi-pulse h-2 rounded-full bg-[#EDEFF2]" style={{ animationDelay: '0.15s' }} />
        <div className="bi-pulse h-2 rounded-full bg-[#EDEFF2]" style={{ animationDelay: '0.3s' }} />
      </div>
      <div className="flex items-center gap-2 text-xs font-medium text-muted">
        <span>{STAGES[stage]}</span>
        <span className="flex gap-[3px]">
          <span className="bi-dot h-1 w-1 rounded-full bg-muted" />
          <span className="bi-dot h-1 w-1 rounded-full bg-muted" style={{ animationDelay: '0.2s' }} />
          <span className="bi-dot h-1 w-1 rounded-full bg-muted" style={{ animationDelay: '0.4s' }} />
        </span>
      </div>
    </div>
  )
}

// Карточка ошибки анализа (редизайн 1c-3): ввод не теряется, есть retry.
export function AnalysisError({
  onRetry,
  onManual,
  subtitle,
}: {
  onRetry: () => void
  onManual: () => void
  subtitle: string
}) {
  return (
    <div className="flex flex-col gap-3.5 rounded-3xl bg-card p-5 shadow-card">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-red-500/10 text-lg font-extrabold text-red-500">
          !
        </span>
        <div>
          <div className="text-sm font-bold">Не удалось распознать</div>
          <div className="mt-0.5 text-[11px] font-medium text-muted">{subtitle}</div>
        </div>
      </div>
      <div className="flex gap-2">
        <button
          onClick={onManual}
          className="flex-1 rounded-2xl bg-ink/5 py-3.5 text-[13px] font-semibold"
        >
          Вручную
        </button>
        <button
          onClick={onRetry}
          className="flex-1 rounded-2xl bg-ink py-3.5 text-[13px] font-semibold text-white"
        >
          Повторить
        </button>
      </div>
    </div>
  )
}
