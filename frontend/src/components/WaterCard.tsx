// Компактная карточка воды (редизайн 1a): заголовок + «+», крупное число, бар.
// Кнопка "+" открывает bottom-sheet модалку WaterModal.
import { useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { Plus } from 'lucide-react'
import { useUserStore } from '../store/userStore'
import { haptic } from '../lib/telegram'
import WaterModal from './WaterModal'

// Литры в русском формате: 1.2 → «1,2».
const ru = (l: number) => l.toFixed(1).replace('.', ',')

export default function WaterCard() {
  const { waterMl, user } = useUserStore()
  const [showModal, setShowModal] = useState(false)
  const goalMl = user?.daily_water_ml ?? 2000
  const pct = Math.min((waterMl / goalMl) * 100, 100)

  return (
    <div className="flex flex-col gap-3 rounded-3xl bg-card p-4 shadow-card">
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-semibold">Вода</span>
        <button
          onClick={() => {
            haptic('light')
            setShowModal(true)
          }}
          className="flex h-7 w-7 items-center justify-center rounded-full bg-water/10 text-water"
          aria-label="Добавить воду"
        >
          <Plus size={16} />
        </button>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-extrabold leading-none">{ru(waterMl / 1000)}</span>
        <span className="text-xs font-medium text-muted">/ {ru(goalMl / 1000)} л</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-ink/5">
        <div
          className="h-full rounded-full bg-water"
          style={{ width: `${pct}%`, transition: 'width 0.5s ease' }}
        />
      </div>

      <AnimatePresence>
        {showModal && <WaterModal onClose={() => setShowModal(false)} />}
      </AnimatePresence>
    </div>
  )
}
