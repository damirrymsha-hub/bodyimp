// Встроенная камера для Telegram Mini App через getUserMedia.
// Нужна потому, что Telegram WebView игнорирует <input capture> и всегда
// открывает галерею. Здесь мы сами показываем поток с камеры и снимаем кадр.
import { useEffect, useRef, useState } from 'react'
import { X, Camera as CameraIcon, RefreshCw } from 'lucide-react'

interface Props {
  onCapture: (file: File) => void
  onClose: () => void
  // Открыть галерею (фолбэк, если доступ к камере не дали).
  onPickGallery?: () => void
}

export default function CameraCapture({ onCapture, onClose, onPickGallery }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [ready, setReady] = useState(false)
  // Какая камера: задняя (environment) или фронтальная (user).
  const [facing, setFacing] = useState<'environment' | 'user'>('environment')

  useEffect(() => {
    let cancelled = false

    async function start() {
      setReady(false)
      setError(null)
      // Останавливаем прежний поток при смене камеры.
      streamRef.current?.getTracks().forEach((t) => t.stop())
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: facing } },
          audio: false,
        })
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play().catch(() => {})
        }
        setReady(true)
      } catch {
        setError(
          'Нет доступа к камере. Разреши доступ в настройках Telegram или выбери фото из галереи.',
        )
      }
    }

    start()
    return () => {
      cancelled = true
      streamRef.current?.getTracks().forEach((t) => t.stop())
    }
  }, [facing])

  // Снять кадр из видеопотока в файл JPEG.
  function shoot() {
    const video = videoRef.current
    if (!video || !video.videoWidth) return
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    canvas.toBlob(
      (blob) => {
        if (!blob) return
        const file = new File([blob], `photo_${Date.now()}.jpg`, {
          type: 'image/jpeg',
        })
        streamRef.current?.getTracks().forEach((t) => t.stop())
        onCapture(file)
      },
      'image/jpeg',
      0.9,
    )
  }

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-black">
      {/* Верхняя панель */}
      <div className="flex items-center justify-between p-4">
        <button
          onClick={onClose}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white"
          aria-label="Закрыть"
        >
          <X size={20} />
        </button>
        {!error && (
          <button
            onClick={() => setFacing((f) => (f === 'environment' ? 'user' : 'environment'))}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white"
            aria-label="Сменить камеру"
          >
            <RefreshCw size={18} />
          </button>
        )}
      </div>

      {/* Видеопоток / ошибка */}
      <div className="relative flex-1 overflow-hidden">
        {error ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 px-8 text-center">
            <p className="text-sm text-white/80">{error}</p>
            {onPickGallery && (
              <button
                onClick={() => {
                  onClose()
                  onPickGallery()
                }}
                className="rounded-2xl bg-white px-6 py-3 text-sm font-semibold text-black"
              >
                Выбрать из галереи
              </button>
            )}
          </div>
        ) : (
          <video
            ref={videoRef}
            className="h-full w-full object-cover"
            playsInline
            muted
            autoPlay
          />
        )}
      </div>

      {/* Кнопка съёмки */}
      {!error && (
        <div className="flex items-center justify-center pb-10 pt-6">
          <button
            onClick={shoot}
            disabled={!ready}
            className="flex items-center justify-center rounded-full border-4 border-white/40 bg-white text-black disabled:opacity-40"
            style={{ height: 72, width: 72 }}
            aria-label="Снять фото"
          >
            <CameraIcon size={28} />
          </button>
        </div>
      )}
    </div>
  )
}
