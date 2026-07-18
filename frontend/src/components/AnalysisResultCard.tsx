// Карточка результата ИИ-анализа (фото/текст) с возможностью поправить значения
// перед добавлением. Правки и подтверждения уходят в /api/feedback/analysis —
// это датасет для повышения точности распознавания.
import { useState } from 'react'
import { Pencil, RotateCcw } from 'lucide-react'
import type { PhotoAnalysisResult } from '../types'
import { sendAnalysisFeedback } from '../api/client'
import { useUserStore } from '../store/userStore'
import { haptic } from '../lib/telegram'

export interface FinalNutrition {
  name: string
  calories: number
  protein_g: number
  fat_g: number
  carbs_g: number
}

interface Props {
  result: PhotoAnalysisResult
  source: 'photo' | 'text'
  inputText?: string
  onConfirm: (final: FinalNutrition) => void
  onRetry: () => void
}

export default function AnalysisResultCard({
  result,
  source,
  inputText,
  onConfirm,
  onRetry,
}: Props) {
  const { user } = useUserStore()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(result.name ?? 'Блюдо')
  const [calories, setCalories] = useState(String(Math.round(result.calories ?? 0)))
  const [protein, setProtein] = useState(String(result.protein_g ?? 0))
  const [fat, setFat] = useState(String(result.fat_g ?? 0))
  const [carbs, setCarbs] = useState(String(result.carbs_g ?? 0))

  function confirm() {
    haptic('light')
    const final: FinalNutrition = {
      name: name.trim() || 'Блюдо',
      calories: Number(calories) || 0,
      protein_g: Number(protein) || 0,
      fat_g: Number(fat) || 0,
      carbs_g: Number(carbs) || 0,
    }
    const edited =
      final.name !== (result.name ?? 'Блюдо') ||
      Math.round(final.calories) !== Math.round(result.calories ?? 0) ||
      final.protein_g !== (result.protein_g ?? 0) ||
      final.fat_g !== (result.fat_g ?? 0) ||
      final.carbs_g !== (result.carbs_g ?? 0)

    // Фидбек (fire-and-forget): и правки, и подтверждения — полезный сигнал.
    sendAnalysisFeedback({
      user_id: user?.id ?? null,
      source,
      input_text: inputText ?? null,
      method: result.method ?? null,
      ai_name: result.name ?? null,
      ai_calories: result.calories ?? 0,
      ai_protein_g: result.protein_g ?? 0,
      ai_fat_g: result.fat_g ?? 0,
      ai_carbs_g: result.carbs_g ?? 0,
      final_name: final.name,
      final_calories: final.calories,
      final_protein_g: final.protein_g,
      final_fat_g: final.fat_g,
      final_carbs_g: final.carbs_g,
      edited,
    })
    onConfirm(final)
  }

  return (
    <div className="rounded-3xl bg-card p-4 shadow-card">
      {/* Название */}
      {editing ? (
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="input mb-1 text-base font-bold"
        />
      ) : (
        <div className="text-lg font-bold">{name}</div>
      )}
      {result.portion_g != null && !editing && (
        <div className="text-xs text-muted">Порция ≈ {result.portion_g} г</div>
      )}

      {/* КБЖУ: просмотр или правка */}
      {editing ? (
        <div className="mt-3 grid grid-cols-4 gap-2">
          <EditStat label="Ккал" value={calories} onChange={setCalories} />
          <EditStat label="Белки" value={protein} onChange={setProtein} />
          <EditStat label="Жиры" value={fat} onChange={setFat} />
          <EditStat label="Углев." value={carbs} onChange={setCarbs} />
        </div>
      ) : (
        <div className="mt-3 grid grid-cols-4 gap-2 text-center">
          <Stat label="Ккал" value={Number(calories)} />
          <Stat label="Белки" value={Number(protein)} />
          <Stat label="Жиры" value={Number(fat)} />
          <Stat label="Углев." value={Number(carbs)} />
        </div>
      )}

      {result.items && result.items.length > 0 && (
        <div className="mt-3 text-xs text-muted">
          Состав: {result.items.join(', ')}
        </div>
      )}

      <div className="mt-4 flex gap-2">
        <button
          onClick={onRetry}
          className="flex items-center justify-center gap-1.5 rounded-2xl bg-ink/5 px-3 py-3 text-sm font-semibold"
          aria-label="Заново"
        >
          <RotateCcw size={16} />
        </button>
        <button
          onClick={() => {
            haptic('light')
            setEditing((v) => !v)
          }}
          className={`flex items-center justify-center gap-1.5 rounded-2xl px-3 py-3 text-sm font-semibold ${
            editing ? 'bg-ink text-white' : 'bg-ink/5'
          }`}
          aria-label="Поправить"
        >
          <Pencil size={16} />
        </button>
        <button
          onClick={confirm}
          className="flex-1 rounded-2xl bg-ink py-3 text-sm font-semibold text-white"
        >
          {editing ? 'Сохранить и добавить' : 'Добавить'}
        </button>
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value?: number }) {
  return (
    <div className="rounded-2xl bg-ink/5 py-2">
      <div className="text-base font-bold">
        {value != null ? Math.round(value) : '—'}
      </div>
      <div className="text-[10px] text-muted">{label}</div>
    </div>
  )
}

function EditStat({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <label className="block text-center">
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        inputMode="decimal"
        className="input px-1 py-2 text-center text-sm font-bold"
      />
      <span className="text-[10px] text-muted">{label}</span>
    </label>
  )
}
