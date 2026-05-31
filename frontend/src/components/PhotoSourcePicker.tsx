// Две кнопки выбора источника фото: камера и галерея.
// Камера открывается через динамический input (см. useCamera), галерея — через статический.
import { Camera, ImagePlus } from 'lucide-react'
import { useCamera } from '../hooks/useCamera'
import { haptic } from '../lib/telegram'

interface Props {
  onPhoto: (file: File) => void
  disabled?: boolean
}

export default function PhotoSourcePicker({ onPhoto, disabled }: Props) {
  const { openCamera, openGallery, handleFileChange, galleryInputRef } =
    useCamera(onPhoto)

  return (
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
        onClick={() => {
          haptic('light')
          openCamera()
        }}
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
  )
}
