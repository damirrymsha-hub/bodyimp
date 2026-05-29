// Сканирование еды по фото: выбор/съёмка фото → отправка на /api/analyze/photo
// → показ результата для подтверждения перед сохранением.
import { useRef, useState } from 'react'
import { Camera, Loader2, RotateCcw } from 'lucide-react'
import { analyzePhoto } from '../api/client'
import type { PhotoAnalysisResult } from '../types'
import { useUIStore } from '../store/uiStore'

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
  const fileRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<PhotoAnalysisResult | null>(null)
  const { showToast } = useUIStore()

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setPreview(URL.createObjectURL(file))
    setResult(null)
    setLoading(true)
    try {
      const { base64, mime } = await fileToBase64(file)
      // Диагностика: размеры фото в консоли браузера.
      console.log('Photo size:', file.size, 'bytes')
      console.log('Base64 length:', base64.length)
      console.log('MIME type:', mime)

      const res = await analyzePhoto(base64, mime)
      console.log('Analysis response:', res)

      if (res.error) {
        // Еда не распознана / ошибка модели — предлагаем ручной ввод.
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
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div className="flex flex-col gap-4">
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFile}
      />

      {!preview && (
        <button
          onClick={() => fileRef.current?.click()}
          className="flex flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed border-ink/15 bg-card py-12 text-muted"
        >
          <Camera size={36} className="text-ink" />
          <span className="text-sm font-medium">Сделать или выбрать фото еды</span>
        </button>
      )}

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
