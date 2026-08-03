import { useCallback, useEffect, useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useUserStore } from './store/userStore'
import { getTelegramUser } from './lib/telegram'
import { getSession } from './lib/auth'
import Home from './pages/Home'
import Login from './pages/Login'
import Onboarding from './pages/Onboarding'
import Profile from './pages/Profile'
import Progress from './pages/Progress'
import Toasts from './components/Toasts'

interface Identity {
  id: number
  username: string | null
}

// Кто пользователь: внутри Telegram — из initData (в dev — заглушка),
// в браузере — из сохранённой PWA-сессии. null → экран входа.
function resolveIdentity(): Identity | null {
  const tg = getTelegramUser()
  if (tg) return tg
  const session = getSession()
  if (session) return { id: session.telegramId, username: session.username }
  return null
}

export default function App() {
  const { user, loading, init } = useUserStore()
  const [identity, setIdentity] = useState<Identity | null>(resolveIdentity)

  const handleLoggedIn = useCallback(
    (id: number, username: string | null) => setIdentity({ id, username }),
    [],
  )

  useEffect(() => {
    if (identity) init(identity.id, identity.username)
  }, [identity, init])

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

  // Профиль не заполнен (нет рассчитанных норм) → онбординг.
  const needsOnboarding = !user || !user.daily_calories

  return (
    <div className="mx-auto min-h-screen w-full max-w-md bg-bg text-ink">
      <Routes>
        <Route
          path="/onboarding"
          element={<Onboarding />}
        />
        <Route
          path="/"
          element={
            needsOnboarding ? <Navigate to="/onboarding" replace /> : <Home />
          }
        />
        <Route path="/profile" element={<Profile />} />
        <Route path="/progress" element={<Progress />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toasts />
    </div>
  )
}
