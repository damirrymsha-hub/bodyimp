// Хук работы с камерой и галереей в Telegram Mini App.
//
// Реальность: у Telegram WebApp НЕТ нативного API съёмки фото (requestPhotoAccess
// не существует, showScanQrPopup — только для QR). Атрибут capture в WebView —
// лишь подсказка, которую браузер может проигнорировать. Поэтому делаем максимально
// совместимо:
//   • камера — свежий <input capture="environment"> + СИНХРОННЫЙ click
//     (нельзя через setTimeout: теряется user-activation и iOS блокирует открытие);
//   • галерея — обычный <input> без capture.
import { useCallback, useRef } from 'react'
import { getTelegramPlatform } from '../lib/telegram'

// iPhone снимает в HEIC/HEIF — принимаем эти форматы (бэкенд через Pillow конвертирует).
const ACCEPT = 'image/*,.heic,.heif'

export function useCamera(onPhoto: (file: File) => void) {
  // Галерея — статический input (рендерится в PhotoSourcePicker).
  const galleryInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      e.target.value = '' // сброс — чтобы можно было выбрать то же фото повторно
      if (file) onPhoto(file)
    },
    [onPhoto],
  )

  // Открыть КАМЕРУ.
  const openCamera = useCallback(() => {
    // Свежий элемент на каждый вызов: некоторые WebView «кешируют» прежний input
    // и теряют атрибут capture.
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = ACCEPT
    input.capture = 'environment' // подсказка открыть заднюю камеру
    input.style.cssText =
      'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;opacity:0'
    document.body.appendChild(input)

    const cleanup = () => {
      if (input.isConnected) input.remove()
    }
    input.addEventListener('change', () => {
      const file = input.files?.[0]
      if (file) onPhoto(file)
      cleanup()
    })
    // Событие cancel (отмена выбора) — поддерживается в современных WebView.
    input.addEventListener('cancel', cleanup)

    // ВАЖНО: клик синхронно в обработчике жеста. Без setTimeout —
    // иначе iOS WKWebView заблокирует открытие из-за потери user-activation.
    input.click()
  }, [onPhoto])

  // Открыть ГАЛЕРЕЮ.
  const openGallery = useCallback(() => {
    galleryInputRef.current?.click()
  }, [])

  return {
    openCamera,
    openGallery,
    handleFileChange,
    galleryInputRef,
    platform: getTelegramPlatform(),
  }
}
