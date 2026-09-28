import { lazy, Suspense, useCallback, useEffect, useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useUserStore } from './store/userStore'
import { getInitData, getTelegramUser } from './lib/telegram'
import { initDataUser } from './lib/initData'
import { getSession, saveSession } from './lib/auth'
import { exchangeInitData } from './api/client'
import LazyBoundary from './components/LazyBoundary'
import Toasts from './components/Toasts'

const Home = lazy(() => import('./pages/Home'))
const Activity = lazy(() => import('./pages/Activity'))
const Diagnostics = lazy(() => import('./pages/Diagnostics'))
const Login = lazy(() => import('./pages/Login'))
const Onboarding = lazy(() => import('./pages/Onboarding'))
const Profile = lazy(() => import('./pages/Profile'))
const Progress = lazy(() => import('./pages/Progress'))

interface Identity {
  id: number
  username: string | null
}

// Кто пользователь. Три источника по убыванию свежести:
// SDK Telegram → сохранённая подпись (WebView мог перезагрузиться и потерять
// адресную строку) → сессия PWA. null → экран входа.
function resolveIdentity(): Identity | null {
  const tg = getTelegramUser()
  if (tg) return tg
  const fromCaptured = initDataUser()
  if (fromCaptured) return fromCaptured
  const session = getSession()
  if (session) return { id: session.telegramId, username: session.username }
  return null
}

export default function App() {
  return <LazyBoundary><Suspense fallback={<div role="status" className="p-8 text-center text-muted">Загрузка BodyImp…</div>}><AppContent /></Suspense></LazyBoundary>
}

function AppContent() {
  const { user, loading, error, init } = useUserStore()
  const [identity, setIdentity] = useState<Identity | null>(resolveIdentity)
  const [showDiag, setShowDiag] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [initializedIdentity, setInitializedIdentity] = useState<number | null>(null)

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
    let active = true
    if (identity) {
      // Не направляем в анкету до завершения первой загрузки профиля.
      void init(identity.id, identity.username).finally(() => {
        if (active) setInitializedIdentity(identity.id)
      })
    }
    return () => { active = false }
  }, [identity, init, attempt])

  if (showDiag) return <Diagnostics onClose={() => setShowDiag(false)} />

  if (!identity) {
    return <Login onLoggedIn={handleLoggedIn} />
  }

  if (initializedIdentity !== identity.id || (loading && !user)) {
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
        <Route path="/activity" element={needsOnboarding ? <Navigate to="/onboarding" replace /> : <Activity />} />
        <Route path="/progress" element={<Progress />} />
        <Route path="/diagnostics" element={<Diagnostics onClose={() => history.back()} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toasts />
    </div>
  )
}
