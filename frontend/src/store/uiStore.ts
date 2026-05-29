// UI-состояние: тосты и выбранная дата календаря.
import { create } from 'zustand'
import { todayISO } from '../lib/date'

interface Toast {
  id: number
  message: string
  type: 'info' | 'error' | 'success'
}

interface UIState {
  toasts: Toast[]
  selectedDate: string // YYYY-MM-DD
  showToast: (message: string, type?: Toast['type']) => void
  dismissToast: (id: number) => void
  setSelectedDate: (date: string) => void
}

export const useUIStore = create<UIState>((set, get) => ({
  toasts: [],
  selectedDate: todayISO(),

  showToast: (message, type = 'info') => {
    const id = Date.now()
    set({ toasts: [...get().toasts, { id, message, type }] })
    // Автоскрытие через 3 секунды.
    setTimeout(() => get().dismissToast(id), 3000)
  },

  dismissToast: (id) =>
    set({ toasts: get().toasts.filter((t) => t.id !== id) }),

  setSelectedDate: (date) => set({ selectedDate: date }),
}))
