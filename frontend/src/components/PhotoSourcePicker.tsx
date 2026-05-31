// Две кнопки выбора источника фото: камера и галерея.
// Камера: встроенный CameraCapture (getUserMedia), т.к. Telegram WebView
// игнорирует <input capture>. Если getUserMedia недоступен — фолбэк на input.
// Галерея: обычный input без capture.
import { useState } from 'react'
import { Camera, ImagePlus } from 'lucide-react'
import { useCamera } from '../hooks/useCamera'
import { haptic } from '../lib/telegram'
import CameraCapture from './CameraCapture'

interface Props {
  onPhoto: (file: File) => void
  disabled?: boolean
}

// Поддерживается ли прямой доступ к камере в этом WebView.
function supportsCamera(): boolean {
  return !!navigator.mediaDevices?.getUserMedia
}

export default function PhotoSourcePicker({ onPhoto, disabled }: Props) {
  const { openCamera, openGallery, handleFileChange, galleryInputRef } =
    useCamera(onPhoto)
  const [showCamera, setShowCamera] = useState(false)

  function onCameraClick() {
    haptic('light')
    // Предпочитаем встроенную камеру; если её нет — старый input с capture.
    if (supportsCamera()) setShowCamera(true)
    else openCamera()
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        {/* Скрытый input ТОЛЬКО для галереи — без capture */}
        <input
          ref={galleryInputRef}
          type="file"
          accept="image/*,.heic,.heif"
          className="hidden"
          onChange={handleFileChange}
        />

        <button
          disabled={disabled}
          onClick={onCameraClick}
          className="flex flex-col items-center justify-center gap-2 rounded-3xl border-2 border-dashed border-ink/15 bg-card py-10 text-muted disabled:opacity-50"
        >
          <Camera size={32} className="text-ink" />
          <span className="text-sm font-semibold text-ink">Сфотографировать</span>
          <span className="text-xs">Открыть камеру</span>
        </button>

        <button
          disabled={disabled}
          onClick={() => {
            haptic('light')
            openGallery()
          }}
          className="flex flex-col items-center justify-center gap-2 rounded-3xl border-2 border-dashed border-ink/15 bg-card py-10 text-muted disabled:opacity-50"
        >
          <ImagePlus size={32} className="text-ink" />
          <span className="text-sm font-semibold text-ink">Из галереи</span>
          <span className="text-xs">Выбрать фото</span>
        </button>
      </div>

      {/* Встроенная камера */}
      {showCamera && (
        <CameraCapture
          onCapture={(file) => {
            setShowCamera(false)
            onPhoto(file)
          }}
          onClose={() => setShowCamera(false)}
          onPickGallery={openGallery}
        />
      )}
    </>
  )
}
