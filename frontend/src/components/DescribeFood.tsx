// Описание еды текстом (редизайн 1c): скелетон вместо спиннера,
// ошибка — карточка с retry (ввод не теряется), результат — с правкой.
import { useState } from 'react'
import { Sparkles } from 'lucide-react'
import { analyzeText } from '../api/client'
import type { PhotoAnalysisResult } from '../types'
import { haptic } from '../lib/telegram'
import AnalysisResultCard from './AnalysisResultCard'
import AnalysisSkeleton, { AnalysisError } from './AnalysisSkeleton'

interface Props {
  onConfirm: (result: PhotoAnalysisResult) => void
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
  const [failed, setFailed] = useState(false)
  const [result, setResult] = useState<PhotoAnalysisResult | null>(null)

  async function analyze() {
    const description = text.trim()
    if (description.length < 3) return
    haptic('light')
    setLoading(true)
    setFailed(false)
    setResult(null)
    try {
      const res = await analyzeText(description)
      if (res.error) {
        setFailed(true)
        return
      }
      setResult(res)
    } catch (err) {
      console.error('Text analysis error:', err)
      setFailed(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Поле описания (остаётся видимым при ошибке — ввод не теряется) */}
      {!result && !loading && (
        <>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Напр.: 2 яйца, тост с маслом и стакан сока"
            rows={3}
            maxLength={1000}
            className="input resize-none"
          />

          {!failed && (
            <div className="flex flex-wrap gap-2">
              {EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  onClick={() => setText(ex)}
                  className="rounded-full bg-ink/5 px-3 py-1.5 text-xs text-muted"
                >
                  {ex}
                </button>
              ))}
            </div>
          )}

          {failed ? (
            <AnalysisError
              subtitle="Текст сохранён — попробуйте ещё раз или введите вручную"
              onRetry={analyze}
              onManual={onManual}
            />
          ) : (
            <>
              <button
                onClick={analyze}
                disabled={text.trim().length < 3}
                className="flex items-center justify-center gap-2 rounded-2xl bg-ink py-4 text-sm font-semibold text-white disabled:opacity-40"
              >
                <Sparkles size={18} /> Определить КБЖУ
              </button>
              <button
                onClick={onManual}
                className="text-center text-xs text-muted underline"
              >
                Ввести КБЖУ вручную
              </button>
            </>
          )}
        </>
      )}

      {/* Скелетон анализа */}
      {loading && <AnalysisSkeleton />}

      {/* Результат с возможностью правки */}
      {result && !loading && (
        <AnalysisResultCard
          result={result}
          source="text"
          inputText={text.trim()}
          onConfirm={(final) => onConfirm(final)}
          onRetry={() => setResult(null)}
        />
      )}
    </div>
  )
}
