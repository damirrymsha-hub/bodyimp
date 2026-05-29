// Карточка воды с прогрессом. Кнопка "+" открывает bottom-sheet модалку WaterModal.
import { useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { Droplet, Plus } from 'lucide-react'
import { useUserStore } from '../store/userStore'
import { haptic } from '../lib/telegram'
import WaterModal from './WaterModal'

const GOAL_ML = 2000

export default function WaterCard() {
  const { waterMl } = useUserStore()
  const [showModal, setShowModal] = useState(false)
  const pct = Math.min((waterMl / GOAL_ML) * 100, 100)

  return (
    <div className="flex-1 rounded-3xl bg-card p-4 shadow-card">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Droplet size={18} className="text-water" />
          <span className="text-sm font-semibold">Вода</span>
        </div>
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
      <div className="text-2xl font-extrabold leading-none">
        {(waterMl / 1000).toFixed(1)}
        <span className="ml-1 text-sm font-medium text-muted">/ 2 л</span>
      </div>
      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-ink/5">
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
