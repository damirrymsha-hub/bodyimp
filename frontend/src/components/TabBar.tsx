// Две основные вкладки; профиль и прогресс доступны через аватар.
import { useLocation, useNavigate } from 'react-router-dom'
import { ClipboardList, Dumbbell } from 'lucide-react'
import { haptic } from '../lib/telegram'

const TABS = [
  { path: '/', label: 'Питание', Icon: ClipboardList },
  { path: '/activity', label: 'Активность', Icon: Dumbbell },
]

export default function TabBar() {
  const navigate = useNavigate()
  const { pathname } = useLocation()

  return (
    <nav aria-label="Основные разделы"
      className="fixed bottom-0 left-1/2 z-30 w-full max-w-md -translate-x-1/2 border-t border-ink/5 bg-card/95 backdrop-blur"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex h-[60px] items-center justify-around">
        {TABS.map(({ path, label, Icon }) => {
          const active = pathname === path
          return (
            <button
              key={path}
              aria-current={active ? 'page' : undefined}
              onClick={() => {
                haptic('light')
                navigate(path)
              }}
              className={`mx-2 my-1 flex h-[52px] flex-1 flex-col rounded-2xl items-center justify-center gap-1 ${
                active ? 'text-ink bg-ink/5' : 'text-muted'
              }`}
            >
              <Icon size={20} strokeWidth={active ? 2.4 : 2} />
              <span className="text-sm font-semibold">{label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
