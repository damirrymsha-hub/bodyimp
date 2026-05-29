// Bottom-sheet модалка добавления воды: быстрые объёмы + своё количество.
import { useState } from 'react'
import { motion } from 'framer-motion'
import { X, Droplet } from 'lucide-react'
import { useUserStore } from '../store/userStore'
import { haptic, hapticSuccess } from '../lib/telegram'

const QUICK_AMOUNTS = [100, 200, 250, 500]

interface Props {
  onClose: () => void
}

export default function WaterModal({ onClose }: Props) {
  const { addWater } = useUserStore()
  const [amount, setAmount] = useState<number>(250)

  async function confirm() {
    if (amount <= 0) return
    haptic('light')
    await addWater(amount)
    hapticSuccess()
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-black/40"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-t-[2rem] bg-bg p-5 pb-8"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <Droplet size={20} className="text-water" /> Добавить воду
          </h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-ink/5"
          >
            <X size={18} />
          </button>
        </div>

        {/* Быстрые кнопки */}
        <div className="grid grid-cols-4 gap-2">
          {QUICK_AMOUNTS.map((ml) => (
            <button
              key={ml}
              onClick={() => {
                haptic('light')
                setAmount(ml)
              }}
              className={`rounded-2xl py-3 text-sm font-semibold transition-colors ${
                amount === ml ? 'bg-water text-white' : 'bg-card text-ink shadow-card'
              }`}
            >
              {ml}
            </button>
          ))}
        </div>

        {/* Своё количество */}
        <div className="mt-4">
          <span className="mb-1 block text-xs font-medium text-muted">
            Своё количество, мл
          </span>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              max={3000}
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              placeholder="Введи мл"
              className="input flex-1"
            />
          </div>
        </div>

        <button
          onClick={confirm}
          className="mt-5 w-full rounded-2xl bg-ink py-4 text-sm font-semibold text-white"
        >
          Подтвердить · {amount} мл
        </button>
      </motion.div>
    </div>
  )
}
