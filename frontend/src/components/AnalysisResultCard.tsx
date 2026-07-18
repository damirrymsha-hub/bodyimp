// Карточка результата ИИ-анализа (редизайн 1c-2): имя + мета, крупные ккал,
// три цветные плитки макросов, кнопки «Исправить»/«Добавить».
// Правки и подтверждения уходят в /api/feedback/analysis (датасет качества).
import { useState } from 'react'
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

const CONFIDENCE_RU: Record<string, string> = {
  high: 'высокая',
  medium: 'средняя',
  low: 'низкая',
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
}: Props) {
  const { user } = useUserStore()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(result.name ?? 'Блюдо')
  const [calories, setCalories] = useState(String(Math.round(result.calories ?? 0)))
  const [protein, setProtein] = useState(String(result.protein_g ?? 0))
  const [fat, setFat] = useState(String(result.fat_g ?? 0))
  const [carbs, setCarbs] = useState(String(result.carbs_g ?? 0))

  const conf = CONFIDENCE_RU[result.confidence ?? ''] ?? null
  const meta = [
    result.portion_g != null ? `порция ~${result.portion_g} г` : null,
    conf ? `уверенность ${conf}` : null,
  ]
    .filter(Boolean)
    .join(' · ')

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
    <div className="flex flex-col gap-3.5 rounded-3xl bg-card p-5 shadow-card">
      {/* Заголовок: имя + мета слева, крупные ккал справа */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {editing ? (
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input py-2 text-[15px] font-bold"
            />
          ) : (
            <div className="text-[15px] font-bold">{name}</div>
          )}
          {meta && !editing && (
            <div className="mt-0.5 text-[11px] font-medium text-muted">{meta}</div>
          )}
        </div>
        <div className="text-right">
          {editing ? (
            <input
              value={calories}
              onChange={(e) => setCalories(e.target.value)}
              inputMode="numeric"
              className="input w-20 px-2 py-2 text-center text-lg font-extrabold"
            />
          ) : (
            <span className="text-2xl font-extrabold leading-none">{calories}</span>
          )}
          <div className="text-[10px] font-medium text-muted">ккал</div>
        </div>
      </div>

      {/* Цветные плитки макросов */}
      <div className="grid grid-cols-3 gap-2">
        <MacroTile
          label="белки, г"
          value={protein}
          onChange={setProtein}
          editing={editing}
          bg="bg-protein/10"
          text="text-protein"
        />
        <MacroTile
          label="жиры, г"
          value={fat}
          onChange={setFat}
          editing={editing}
          bg="bg-fat/[0.12]"
          text="text-[#D99A1F]"
        />
        <MacroTile
          label="углеводы, г"
          value={carbs}
          onChange={setCarbs}
          editing={editing}
          bg="bg-carbs/10"
          text="text-carbs"
        />
      </div>

      {result.items && result.items.length > 0 && !editing && (
        <div className="text-[11px] font-medium text-muted">
          Состав: {result.items.join(', ')}
        </div>
      )}

      {/* Кнопки: Исправить / Добавить */}
      <div className="flex gap-2">
        <button
          onClick={() => {
            haptic('light')
            setEditing((v) => !v)
          }}
          className={`flex-1 rounded-2xl py-3.5 text-[13px] font-semibold ${
            editing ? 'bg-ink text-white' : 'bg-ink/5'
          }`}
        >
          {editing ? 'Готово' : 'Исправить'}
        </button>
        <button
          onClick={confirm}
          className="flex-1 rounded-2xl bg-ink py-3.5 text-[13px] font-semibold text-white"
        >
          Добавить
        </button>
      </div>
    </div>
  )
}

function MacroTile({
  label,
  value,
  onChange,
  editing,
  bg,
  text,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  editing: boolean
  bg: string
  text: string
}) {
  return (
    <div className={`rounded-2xl ${bg} px-2 py-2.5 text-center`}>
      {editing ? (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          inputMode="decimal"
          className={`w-full bg-transparent text-center text-base font-extrabold outline-none ${text}`}
          aria-label={label}
        />
      ) : (
        <div className={`text-base font-extrabold ${text}`}>
          {Math.round(Number(value) || 0)}
        </div>
      )}
      <div className="text-[10px] font-semibold text-muted">{label}</div>
    </div>
  )
}
