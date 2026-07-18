// Сканирование еды по фото (редизайн 1c): скелетон-загрузка, карточка ошибки
// с повтором того же снимка, результат с правкой перед сохранением.
import { useRef, useState } from 'react'
import { analyzePhoto } from '../api/client'
import type { PhotoAnalysisResult } from '../types'
import PhotoSourcePicker from '../components/PhotoSourcePicker'
import AnalysisResultCard from '../components/AnalysisResultCard'
import AnalysisSkeleton, { AnalysisError } from '../components/AnalysisSkeleton'

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
  const [failed, setFailed] = useState(false)
  const [result, setResult] = useState<PhotoAnalysisResult | null>(null)
  // Последний снимок — для «Повторить» без пересъёмки.
  const lastFileRef = useRef<File | null>(null)

  async function handlePhoto(file: File) {
    lastFileRef.current = file
    setPreview(URL.createObjectURL(file))
    setResult(null)
    setFailed(false)
    setLoading(true)
    try {
      const { base64, mime } = await fileToBase64(file)
      const res = await analyzePhoto(base64, mime)
      if (res.error) {
        setFailed(true)
        return
      }
      setResult(res)
    } catch (err) {
      console.error('Photo analysis error:', err)
      setFailed(true)
    } finally {
      setLoading(false)
    }
  }

  function retry() {
    if (lastFileRef.current) handlePhoto(lastFileRef.current)
  }

  function reset() {
    setPreview(null)
    setResult(null)
    setFailed(false)
    lastFileRef.current = null
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Выбор источника: камера / галерея */}
      {!preview && <PhotoSourcePicker onPhoto={handlePhoto} disabled={loading} />}

      {preview && (
        <button
          onClick={reset}
          className="overflow-hidden rounded-3xl"
          aria-label="Выбрать другое фото"
        >
          <img src={preview} alt="Фото еды" className="h-44 w-full object-cover" />
        </button>
      )}

      {/* Скелетон анализа */}
      {loading && <AnalysisSkeleton />}

      {/* Ошибка: фото сохранено, можно повторить */}
      {failed && !loading && (
        <AnalysisError
          subtitle="Фото сохранено — попробуйте ещё раз или введите вручную"
          onRetry={retry}
          onManual={onManual}
        />
      )}

      {/* Результат с правкой перед добавлением */}
      {result && !loading && (
        <AnalysisResultCard
          result={result}
          source="photo"
          onConfirm={(final) => onConfirm(final)}
          onRetry={reset}
        />
      )}
    </div>
  )
}
