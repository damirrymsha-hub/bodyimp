// Всплывающие уведомления (toast). Управляются через uiStore.
import { AnimatePresence, motion } from 'framer-motion'
import { useUIStore } from '../store/uiStore'

export default function Toasts() {
  const { toasts, dismissToast } = useUIStore()

  return (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-50 flex flex-col items-center gap-2 px-4">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            onClick={() => dismissToast(t.id)}
            className={`pointer-events-auto w-full max-w-sm rounded-2xl px-4 py-3 text-sm font-medium shadow-card ${
              t.type === 'error'
                ? 'bg-red-500 text-white'
                : t.type === 'success'
                  ? 'bg-emerald-500 text-white'
                  : 'bg-ink text-white'
            }`}
          >
            {t.message}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
