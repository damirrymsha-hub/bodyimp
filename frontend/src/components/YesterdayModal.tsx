// «Повторить вчера»: bottom-sheet со списком вчерашних блюд.
// Пользователь выбирает галочками, что добавить в текущий день.
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Check, X } from 'lucide-react'
import { getTodayFood } from '../api/client'
import { useUserStore } from '../store/userStore'
import { useUIStore } from '../store/uiStore'
import { haptic, hapticSuccess } from '../lib/telegram'
import { toISODate } from '../lib/date'
import type { FoodEntry } from '../types'

interface Props {
  onClose: () => void
}

export default function YesterdayModal({ onClose }: Props) {
  const { user, addFood, currentDate } = useUserStore()
  const { showToast } = useUIStore()
  const [items, setItems] = useState<FoodEntry[]>([])
  const [checked, setChecked] = useState<Set<number>>(new Set())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Вчера относительно выбранного дня.
  useEffect(() => {
    if (!user) return
    const prev = new Date(currentDate + 'T00:00:00')
    prev.setDate(prev.getDate() - 1)
    getTodayFood(user.id, toISODate(prev))
      .then((list) => {
        setItems(list)
        setChecked(new Set(list.map((f) => f.id))) // по умолчанию выбрано всё
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }, [user, currentDate])

  function toggle(id: number) {
    haptic('light')
    setChecked((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function addSelected() {
    const selected = items.filter((f) => checked.has(f.id))
    if (selected.length === 0) return
    setSaving(true)
    try {
      // Добавляем в текущий день с теми же приёмами пищи и КБЖУ.
      for (const f of selected) {
        await addFood({
          meal_type: f.meal_type,
          name: f.name,
          calories: f.calories,
          protein_g: f.protein_g,
          fat_g: f.fat_g,
          carbs_g: f.carbs_g,
          source: f.source,
          base_per_100g: false,
          portion_size_g: f.portion_size_g ?? null,
        })
      }
      hapticSuccess()
      showToast(`Добавлено блюд: ${selected.length}`, 'success')
      onClose()
    } finally {
      setSaving(false)
    }
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
        className="max-h-[80vh] w-full max-w-md overflow-y-auto rounded-t-[2rem] bg-bg p-5 pb-8"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">Вчерашние блюда</h2>
          <button
            onClick={onClose}
            className="-mr-1 flex h-11 w-11 items-center justify-center rounded-full bg-ink/5"
            aria-label="Закрыть"
          >
            <X size={18} />
          </button>
        </div>

        {loading ? (
          <div className="py-8 text-center text-sm text-muted">Загружаем…</div>
        ) : items.length === 0 ? (
          <div className="rounded-3xl bg-card py-10 text-center text-sm text-muted shadow-card">
            Вчера не было записей
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {items.map((f) => {
              const on = checked.has(f.id)
              return (
                <button
                  key={f.id}
                  onClick={() => toggle(f.id)}
                  className={`flex items-center gap-3 rounded-3xl p-4 text-left transition-colors ${
                    on ? 'bg-card shadow-card' : 'bg-ink/5 opacity-60'
                  }`}
                >
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                      on ? 'bg-ink text-white' : 'bg-ink/10'
                    }`}
                  >
                    {on && <Check size={14} />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">
                      {f.name}
                    </span>
                    <span className="block text-[11px] font-medium text-muted">
                      {Math.round(f.calories)} ккал · Б {Math.round(f.protein_g)} · Ж{' '}
                      {Math.round(f.fat_g)} · У {Math.round(f.carbs_g)}
                    </span>
                  </span>
                </button>
              )
            })}
          </div>
        )}

        {items.length > 0 && (
          <button
            onClick={addSelected}
            disabled={saving || checked.size === 0}
            className="mt-4 w-full rounded-2xl bg-ink py-4 text-sm font-semibold text-white disabled:opacity-40"
          >
            {saving ? 'Добавляем…' : `Добавить (${checked.size})`}
          </button>
        )}
      </motion.div>
    </div>
  )
}
