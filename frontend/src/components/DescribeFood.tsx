// Описание еды текстом: пользователь пишет, что съел («2 яйца и тост с маслом»),
// ИИ оценивает КБЖУ → показываем результат для подтверждения перед сохранением.
import { useState } from 'react'
import { Loader2, Sparkles } from 'lucide-react'
import { analyzeText } from '../api/client'
import type { PhotoAnalysisResult } from '../types'
import { useUIStore } from '../store/uiStore'
import { haptic } from '../lib/telegram'
import AnalysisResultCard from './AnalysisResultCard'

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

      {/* Результат анализа: можно поправить перед добавлением (правки → фидбек) */}
      {result && !loading && (
        <AnalysisResultCard
          result={result}
          source="text"
          inputText={text.trim()}
          onConfirm={(final) => onConfirm(final)}
          onRetry={reset}
        />
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
