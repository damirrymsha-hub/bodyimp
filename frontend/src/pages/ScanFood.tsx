// Сканирование еды по фото: камера/галерея → отправка на /api/analyze/photo
// → показ результата для подтверждения перед сохранением.
import { useState } from 'react'
import { Loader2, RotateCcw } from 'lucide-react'
import { analyzePhoto } from '../api/client'
import type { PhotoAnalysisResult } from '../types'
import { useUIStore } from '../store/uiStore'
import PhotoSourcePicker from '../components/PhotoSourcePicker'

interface Props {
  // Вызывается с распознанными данными, когда пользователь подтверждает.
  onConfirm: (result: PhotoAnalysisResult) => void
  // Переключиться на ручной ввод (если фото не распозналось).
  onManual: () => void
}

// Преобразует File в чистую base64-строку (без префикса data:...).
function fileToBase64(file: File): Promise<{ base64: string; mime: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      const base64 = result.split(',')[1] ?? ''
      resolve({ base64, mime: file.type || 'image/jpeg' })
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export default function ScanFood({ onConfirm, onManual }: Props) {
  const [preview, setPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<PhotoAnalysisResult | null>(null)
  const { showToast } = useUIStore()

  // Обработка выбранного/снятого фото (из камеры или галереи).
  async function handlePhoto(file: File) {
    setPreview(URL.createObjectURL(file))
    setResult(null)
    setLoading(true)
    try {
      const { base64, mime } = await fileToBase64(file)
      console.log('Photo size:', file.size, 'bytes, mime:', mime)

      const res = await analyzePhoto(base64, mime)
      console.log('Analysis response:', res)

      if (res.error) {
        showToast(
          'Не удалось распознать еду. Попробуй ближе и при хорошем освещении.',
          'error',
        )
        onManual()
        return
      }
      setResult(res)
    } catch (err) {
      console.error('Photo analysis error:', err)
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail || 'Ошибка анализа фото. Попробуйте ещё раз.'
      showToast(msg, 'error')
    } finally {
      setLoading(false)
    }
  }

  function reset() {
    setPreview(null)
    setResult(null)
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Выбор источника: камера / галерея */}
      {!preview && <PhotoSourcePicker onPhoto={handlePhoto} disabled={loading} />}

      {preview && (
        <div className="overflow-hidden rounded-3xl">
          <img src={preview} alt="Фото еды" className="h-48 w-full object-cover" />
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center gap-2 py-4 text-muted">
          <Loader2 size={20} className="animate-spin" />
          <span className="text-sm">Анализируем фото…</span>
        </div>
      )}

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
