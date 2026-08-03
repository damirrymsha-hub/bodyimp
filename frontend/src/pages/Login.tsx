// Экран входа для PWA (вне Telegram): Telegram Login Widget.
// Виджет рисует кнопку «Log in with Telegram»; после подтверждения Telegram
// вызывает onTelegramAuth с подписанными данными, мы меняем их на JWT.
import { useEffect, useRef, useState } from 'react'
import {
  getBotInfo,
  telegramLogin,
  type LoginWidgetUser,
} from '../api/client'
import { saveSession } from '../lib/auth'

declare global {
  interface Window {
    onTelegramAuth?: (user: LoginWidgetUser) => void
  }
}

interface Props {
  onLoggedIn: (telegramId: number, username: string | null) => void
}

export default function Login({ onLoggedIn }: Props) {
  const widgetRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [waiting, setWaiting] = useState(false)

  useEffect(() => {
    let cancelled = false

    window.onTelegramAuth = async (user: LoginWidgetUser) => {
      setWaiting(true)
      setError(null)
      try {
        const res = await telegramLogin(user)
        saveSession({
          token: res.token,
          telegramId: res.telegram_id,
          username: res.username,
        })
        onLoggedIn(res.telegram_id, res.username)
      } catch {
        setError('Не удалось войти. Попробуйте ещё раз.')
        setWaiting(false)
      }
    }

    // Скрипт виджета нужно вставлять после того, как знаем username бота.
    getBotInfo()
      .then(({ username }) => {
        if (cancelled || !widgetRef.current) return
        const script = document.createElement('script')
        script.src = 'https://telegram.org/js/telegram-widget.js?22'
        script.async = true
        script.setAttribute('data-telegram-login', username)
        script.setAttribute('data-size', 'large')
        script.setAttribute('data-radius', '14')
        script.setAttribute('data-onauth', 'onTelegramAuth(user)')
        script.setAttribute('data-request-access', 'write')
        widgetRef.current.appendChild(script)
      })
      .catch(() => {
        if (!cancelled) setError('Сервер недоступен. Обновите страницу.')
      })

    return () => {
      cancelled = true
      delete window.onTelegramAuth
    }
  }, [onLoggedIn])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-bg px-8 text-center">
      <div>
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-ink text-3xl">
          🥗
        </div>
        <h1 className="text-2xl font-bold text-ink">BodyImp</h1>
        <p className="mt-2 text-sm text-muted">
          Дневник питания с ИИ-распознаванием еды.
          <br />
          Войдите через Telegram — данные общие с ботом.
        </p>
      </div>

      {waiting ? (
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-ink/10 border-t-ink" />
      ) : (
        <div ref={widgetRef} className="min-h-[48px]" />
      )}

      {error && <p className="text-sm text-red-500">{error}</p>}

      <p className="max-w-xs text-xs text-faint">
        Приложение получит только ваш Telegram-ID и имя. Никаких сообщений без
        вашего разрешения.
      </p>
    </div>
  )
}
