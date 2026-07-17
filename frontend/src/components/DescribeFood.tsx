// Описание еды текстом: пользователь пишет, что съел («2 яйца и тост с маслом»),
// ИИ оценивает КБЖУ → показываем результат для подтверждения перед сохранением.
import { useState } from 'react'
import { Loader2, RotateCcw, Sparkles } from 'lucide-react'
import { analyzeText } from '../api/client'
import type { PhotoAnalysisResult } from '../types'
import { useUIStore } from '../store/uiStore'
import { haptic } from '../lib/telegram'

interface Props {
  // Вызывается с распознанными данными, когда пользователь подтверждает.
  onConfirm: (result: PhotoAnalysisResult) => void
  // Переключиться на ручной ввод (если ИИ не справился).
  onManual: () => void
}

const EXAMPLES = [
  '2 яйца и тост с маслом',
  'Тарелка борща со сметаной',
  'Курица с рисом, примерно 300 г',
]

export default function DescribeFood({ onConfirm, onManual }: Props) {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<PhotoAnalysisResult | null>(null)
  const { showToast } = useUIStore()

  async function analyze() {
    const description = text.trim()
    if (description.length < 3) {
      showToast('Опиши, что ты съел — хотя бы пару слов', 'error')
      return
    }
    haptic('light')
    setLoading(true)
    setResult(null)
    try {
      const res = await analyzeText(description)
      if (res.error) {
        showToast('Не удалось распознать еду. Попробуй уточнить описание.', 'error')
        return
      }
      setResult(res)
    } catch (err) {
      console.error('Text analysis error:', err)
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail || 'Ошибка анализа. Попробуй ещё раз.'
      showToast(msg, 'error')
    } finally {
      setLoading(false)
    }
  }

  function reset() {
    setResult(null)
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Поле описания */}
      {!result && (
        <>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Напр.: 2 яйца, тост с маслом и стакан сока"
            rows={3}
            maxLength={1000}
            className="input resize-none"
            disabled={loading}
          />

          {/* Примеры-подсказки */}
          <div className="flex flex-wrap gap-2">
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                onClick={() => setText(ex)}
                disabled={loading}
                className="rounded-full bg-ink/5 px-3 py-1.5 text-xs text-muted"
              >
                {ex}
              </button>
            ))}
          </div>

          <button
            onClick={analyze}
            disabled={loading || text.trim().length < 3}
            className="flex items-center justify-center gap-2 rounded-2xl bg-ink py-4 text-sm font-semibold text-white disabled:opacity-40"
          >
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" /> Считаем КБЖУ…
              </>
            ) : (
              <>
                <Sparkles size={18} /> Определить КБЖУ
              </>
            )}
          </button>
        </>
      )}

      {/* Результат анализа */}
      {result && !loading && (
        <div className="rounded-3xl bg-card p-4 shadow-card">
          <div className="text-lg font-bold">{result.name}</div>
          {result.portion_g != null && (
            <div className="text-xs text-muted">Порция ≈ {result.portion_g} г</div>
          )}
          <div className="mt-3 grid grid-cols-4 gap-2 text-center">
            <Stat label="Ккал" value={result.calories} />
            <Stat label="Белки" value={result.protein_g} />
            <Stat label="Жиры" value={result.fat_g} />
            <Stat label="Углев." value={result.carbs_g} />
          </div>
          {result.items && result.items.length > 0 && (
            <div className="mt-3 text-xs text-muted">
              Состав: {result.items.join(', ')}
            </div>
          )}
          <div className="mt-4 flex gap-2">
            <button
              onClick={reset}
              className="flex items-center justify-center gap-1.5 rounded-2xl bg-ink/5 px-4 py-3 text-sm font-semibold"
            >
              <RotateCcw size={16} /> Заново
            </button>
            <button
              onClick={() => onConfirm(result)}
              className="flex-1 rounded-2xl bg-ink py-3 text-sm font-semibold text-white"
            >
              Добавить
            </button>
          </div>
        </div>
      )}

      {/* Фолбэк на ручной ввод */}
      {!result && (
        <button onClick={onManual} className="text-center text-xs text-muted underline">
          Ввести КБЖУ вручную
        </button>
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value?: number }) {
  return (
    <div className="rounded-2xl bg-ink/5 py-2">
      <div className="text-base font-bold">{value != null ? Math.round(value) : '—'}</div>
      <div className="text-[10px] text-muted">{label}</div>
    </div>
  )
}
