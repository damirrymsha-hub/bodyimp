// Всплывающие уведомления (toast). Управляются через uiStore.
import { useUIStore } from '../store/uiStore'

export default function Toasts() {
  const { toasts, dismissToast } = useUIStore()

  return (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-50 flex flex-col items-center gap-2 px-4">

        {toasts.map((t) => (
          <button type="button" role="status"
            key={t.id}

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
          </button>
        ))}

    </div>
  )
}
