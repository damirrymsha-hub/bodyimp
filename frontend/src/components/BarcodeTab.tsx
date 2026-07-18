// Режим «Штрихкод»: скан камерой (BarcodeDetector) или ручной ввод кода →
// поиск в Open Food Facts → выбор количества через AmountModal.
// Для магазинных упаковок это точнее любого ИИ: данные прямо с этикетки.
import { useEffect, useRef, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { Barcode, Camera, Loader2, Search, X } from 'lucide-react'
import { lookupBarcode, type BarcodeProduct } from '../api/client'
import { useUIStore } from '../store/uiStore'
import { haptic, hapticSuccess } from '../lib/telegram'
import type { MealType, SearchFood } from '../types'
import AmountModal from './AmountModal'

interface Props {
  meal: MealType
  onAdded?: () => void
}

// Поддерживается ли нативное распознавание штрихкодов в этом WebView.
function detectorSupported(): boolean {
  return typeof (window as any).BarcodeDetector === 'function'
}

// Продукт OFF → формат AmountModal (граммы, значения на 100 г).
function productToSearchFood(p: BarcodeProduct): SearchFood {
  return {
    id: -1,
    name: p.brand ? `${p.name} (${p.brand})` : p.name || 'Продукт',
    category: 'Штрихкод',
    calories_per_100g: p.calories_per_100g ?? 0,
    protein_per_100g: p.protein_per_100g ?? 0,
    fat_per_100g: p.fat_per_100g ?? 0,
    carbs_per_100g: p.carbs_per_100g ?? 0,
    portion_type: 'grams',
    default_amount: p.serving_g && p.serving_g > 0 ? Math.round(p.serving_g) : 100,
  }
}

export default function BarcodeTab({ meal, onAdded }: Props) {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [product, setProduct] = useState<SearchFood | null>(null)
  const { showToast } = useUIStore()
  const canScan = detectorSupported()

  async function lookup(rawCode: string) {
    const clean = rawCode.replace(/\D/g, '')
    if (clean.length < 6) {
      showToast('Введи штрихкод целиком (обычно 13 цифр)', 'error')
      return
    }
    setLoading(true)
    try {
      const p = await lookupBarcode(clean)
      if (!p.found) {
        showToast('Продукт не найден в базе. Попробуй ввести КБЖУ вручную.', 'error')
        return
      }
      hapticSuccess()
      setProduct(productToSearchFood(p))
    } catch {
      showToast('Не удалось проверить штрихкод. Попробуй ещё раз.', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Скан камерой */}
      {canScan ? (
        <button
          onClick={() => {
            haptic('light')
            setScanning(true)
          }}
          disabled={loading}
          className="flex flex-col items-center justify-center gap-2 rounded-3xl border-2 border-dashed border-ink/15 bg-card py-10 text-muted disabled:opacity-50"
        >
          <Camera size={32} className="text-ink" />
          <span className="text-sm font-semibold text-ink">Сканировать камерой</span>
          <span className="text-xs">Наведи на штрихкод упаковки</span>
        </button>
      ) : (
        <div className="rounded-3xl bg-ink/5 p-4 text-center text-xs text-muted">
          На этом устройстве сканер камерой недоступен — введи цифры штрихкода
          вручную ниже.
        </div>
      )}

      {/* Ручной ввод кода */}
      <div className="flex items-center gap-2">
        <div className="flex flex-1 items-center gap-2 rounded-2xl bg-card px-4 py-3 shadow-card">
          <Barcode size={18} className="text-muted" />
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            inputMode="numeric"
            maxLength={14}
            placeholder="Цифры под штрихкодом"
            className="w-full bg-transparent text-sm outline-none"
          />
        </div>
        <button
          onClick={() => lookup(code)}
          disabled={loading || code.length < 6}
          className="flex h-12 w-12 items-center justify-center rounded-2xl bg-ink text-white disabled:opacity-40"
          aria-label="Найти"
        >
          {loading ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
        </button>
      </div>

      {/* Оверлей сканера */}
      {scanning && (
        <ScannerOverlay
          onDetected={(c) => {
            setScanning(false)
            setCode(c)
            lookup(c)
          }}
          onClose={() => setScanning(false)}
        />
      )}

      {/* Выбор количества найденного продукта */}
      <AnimatePresence>
        {product && (
          <AmountModal
            food={product}
            initialMeal={meal}
            onClose={() => setProduct(null)}
            onAdded={onAdded}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

// Полноэкранный сканер: видеопоток + BarcodeDetector в цикле.
function ScannerOverlay({
  onDetected,
  onClose,
}: {
  onDetected: (code: string) => void
  onClose: () => void
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let stream: MediaStream | null = null
    let stopped = false
    let timer: ReturnType<typeof setInterval> | undefined

    async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        })
        if (stopped) return
        const video = videoRef.current
        if (!video) return
        video.srcObject = stream
        await video.play().catch(() => {})

        const Detector = (window as any).BarcodeDetector
        const detector = new Detector({
          formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128'],
        })
        // Проверяем кадр ~3 раза в секунду.
        timer = setInterval(async () => {
          if (!video.videoWidth) return
          try {
            const codes = await detector.detect(video)
            const value = codes?.[0]?.rawValue
            if (value && /^\d{6,14}$/.test(value)) {
              haptic('medium')
              if (timer) clearInterval(timer)
              onDetected(value)
            }
          } catch {
            /* кадр не распознался — пробуем дальше */
          }
        }, 350)
      } catch {
        setError('Нет доступа к камере. Разреши доступ или введи код вручную.')
      }
    }

    start()
    return () => {
      stopped = true
      if (timer) clearInterval(timer)
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [onDetected])

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-black">
      <div className="flex items-center justify-between p-4">
        <button
          onClick={onClose}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white"
          aria-label="Закрыть"
        >
          <X size={20} />
        </button>
        <span className="text-sm font-medium text-white/80">
          Наведи на штрихкод
        </span>
        <span className="w-10" />
      </div>
      <div className="relative flex-1 overflow-hidden">
        {error ? (
          <div className="flex h-full items-center justify-center px-8 text-center text-sm text-white/80">
            {error}
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              className="h-full w-full object-cover"
              playsInline
              muted
              autoPlay
            />
            {/* Рамка-прицел */}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="h-32 w-72 rounded-2xl border-2 border-white/70" />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
