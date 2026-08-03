// Нижняя навигация: Дневник · Прогресс · Профиль.
// Убирает тупики (раньше Прогресс и Профиль открывались только из Home
// и закрывались через navigate(-1)) и снимает чёрную кнопку с полотна Home.
import { useLocation, useNavigate } from 'react-router-dom'
import { ClipboardList, TrendingUp, User } from 'lucide-react'
import { haptic } from '../lib/telegram'

const TABS = [
  { path: '/', label: 'Дневник', Icon: ClipboardList },
  { path: '/progress', label: 'Прогресс', Icon: TrendingUp },
  { path: '/profile', label: 'Профиль', Icon: User },
]

export default function TabBar() {
  const navigate = useNavigate()
  const { pathname } = useLocation()

  return (
    <nav
      className="fixed bottom-0 left-1/2 z-30 w-full max-w-md -translate-x-1/2 border-t border-ink/5 bg-card/95 backdrop-blur"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex h-[60px] items-center justify-around">
        {TABS.map(({ path, label, Icon }) => {
          const active = pathname === path
          return (
            <button
              key={path}
              onClick={() => {
                haptic('light')
                navigate(path)
              }}
              className={`flex h-full flex-1 flex-col items-center justify-center gap-1 ${
                active ? 'text-ink' : 'text-faint'
              }`}
            >
              <Icon size={20} strokeWidth={active ? 2.4 : 2} />
              <span className="text-[10px] font-bold">{label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
