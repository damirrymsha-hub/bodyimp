import { useCallback, useEffect, useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useUserStore } from './store/userStore'
import { getInitData, getTelegramUser } from './lib/telegram'
import { getSession, saveSession } from './lib/auth'
import { exchangeInitData } from './api/client'
import Home from './pages/Home'
import Diagnostics from './pages/Diagnostics'
import Login from './pages/Login'
import Onboarding from './pages/Onboarding'
import Profile from './pages/Profile'
import Progress from './pages/Progress'
import Toasts from './components/Toasts'

interface Identity {
  id: number
  username: string | null
}

// Кто пользователь: внутри Telegram — из подписи (в dev — заглушка),
// в браузере — из сохранённой сессии. null → экран входа.
function resolveIdentity(): Identity | null {
  const tg = getTelegramUser()
  if (tg) return tg
  const session = getSession()
  if (session) return { id: session.telegramId, username: session.username }
  return null
}

export default function App() {
  const { user, loading, error, init } = useUserStore()
  const [identity, setIdentity] = useState<Identity | null>(resolveIdentity)
  const [showDiag, setShowDiag] = useState(false)
  const [attempt, setAttempt] = useState(0)

  const handleLoggedIn = useCallback(
    (id: number, username: string | null) => setIdentity({ id, username }),
    [],
  )

  // Меняем подпись Telegram на долгоживущую сессию: подпись живёт в адресной
  // строке и теряется при перезагрузке WebView, а JWT — нет.
  useEffect(() => {
    const initData = getInitData()
    if (!initData || getSession()) return
    let cancelled = false
    exchangeInitData(initData)
      .then((res) => {
        if (cancelled) return
        saveSession({
          token: res.token,
          telegramId: res.telegram_id,
          username: res.username,
        })
      })
      .catch(() => {
        /* не критично: запросы всё равно идут с подписью */
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (identity) init(identity.id, identity.username)
  }, [identity, init, attempt])

  if (showDiag) return <Diagnostics onClose={() => setShowDiag(false)} />

  if (!identity) {
    return <Login onLoggedIn={handleLoggedIn} />
  }

  if (loading && !user) {
    return (
      <div className="flex h-screen items-center justify-center bg-bg">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-ink/10 border-t-ink" />
      </div>
    )
  }

  // Профиль не загрузился из-за ошибки — показываем её честно, а не
  // проваливаем пользователя в онбординг, который тут же снова упадёт.
  if (!user && error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-bg px-8 text-center">
        <h1 className="text-lg font-bold text-ink">Не удалось загрузить данные</h1>
        <p className="text-sm text-muted">{error}</p>
        <button
          onClick={() => setAttempt((a) => a + 1)}
          className="min-h-[44px] w-full max-w-xs rounded-2xl bg-ink px-6 font-semibold text-white"
        >
          Повторить
        </button>
        <button
          onClick={() => setShowDiag(true)}
          className="min-h-[44px] text-sm font-medium text-muted underline"
        >
          Показать диагностику
        </button>
      </div>
    )
  }

  // Профиль не заполнен (нет рассчитанных норм) → онбординг.
  const needsOnboarding = !user || !user.daily_calories

  return (
    <div className="mx-auto min-h-screen w-full max-w-md bg-bg text-ink">
      <Routes>
        <Route path="/onboarding" element={<Onboarding />} />
        <Route
          path="/"
          element={
            needsOnboarding ? <Navigate to="/onboarding" replace /> : <Home />
          }
        />
        <Route path="/profile" element={<Profile />} />
        <Route path="/progress" element={<Progress />} />
        <Route path="/diagnostics" element={<Diagnostics onClose={() => history.back()} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toasts />
    </div>
  )
}
