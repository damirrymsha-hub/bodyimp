import { useEffect, useRef } from 'react'

const stack: HTMLDivElement[] = []
let previousOverflow = ''
let rootFocus: HTMLElement | null = null

// Только верхнее окно получает Escape и фокус; вложенная порция не закрывает меню.
export function useSheet(onClose: () => void, active = true) {
  const ref = useRef<HTMLDivElement>(null)
  const close = useRef(onClose)
  close.current = onClose
  useEffect(() => {
    const panel = ref.current
    if (!active || !panel) return
    const previous = document.activeElement as HTMLElement | null
    if (stack.length === 0) {
      rootFocus = previous
      previousOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
    }
    stack.push(panel)
    panel.focus()
    const isTop = () => stack[stack.length - 1] === panel
    const focusables = () => [...panel.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled):not([type=hidden]), textarea:not(:disabled), select:not(:disabled), a[href], [tabindex="0"]')]
      .filter((el) => !el.closest('[hidden]') && getComputedStyle(el).display !== 'none')
    const keydown = (event: KeyboardEvent) => {
      if (!isTop()) return
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close.current() }
      if (event.key !== 'Tab') return
      const items = focusables()
      const first = items[0], last = items[items.length - 1]
      if (!first) { event.preventDefault(); panel.focus(); return }
      if (event.shiftKey && (document.activeElement === first || document.activeElement === panel)) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && (document.activeElement === last || document.activeElement === panel)) { event.preventDefault(); first.focus() }
    }
    const focusin = (event: FocusEvent) => { if (isTop() && !panel.contains(event.target as Node)) panel.focus() }
    document.addEventListener('keydown', keydown, true)
    document.addEventListener('focusin', focusin)
    return () => {
      document.removeEventListener('keydown', keydown, true)
      document.removeEventListener('focusin', focusin)
      const index = stack.indexOf(panel)
      if (index >= 0) stack.splice(index, 1)
      if (!stack.length) {
        document.body.style.overflow = previousOverflow
        if (rootFocus?.isConnected) rootFocus.focus()
        rootFocus = null
      } else if (previous?.isConnected) previous.focus()
    }
  }, [active])
  return ref
}
