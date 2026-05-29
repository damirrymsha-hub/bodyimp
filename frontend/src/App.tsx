import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useUserStore } from './store/userStore'
import { getTelegramUser } from './lib/telegram'
import Home from './pages/Home'
import Onboarding from './pages/Onboarding'
import Profile from './pages/Profile'
import Progress from './pages/Progress'
import Toasts from './components/Toasts'

export default function App() {
  const { user, loading, init } = useUserStore()

  // При старте инициализируем профиль по telegram_id.
  useEffect(() => {
    const tg = getTelegramUser()
    init(tg.id, tg.username)
  }, [init])

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
