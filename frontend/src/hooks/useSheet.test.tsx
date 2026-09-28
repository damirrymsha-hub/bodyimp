import React, { act, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, it } from 'vitest'
import { useSheet } from './useSheet'

let container: HTMLDivElement
let root: Root
function Sheet({ close, children }: { close: () => void; children?: React.ReactNode }) {
  const ref = useSheet(close)
  return <div ref={ref} role="dialog" tabIndex={-1}><button>Первый</button>{children}<button>Последний</button></div>
}
function Example() {
  const [open, setOpen] = useState(false)
  const [nested, setNested] = useState(false)
  return <><button id="opener" onClick={() => setOpen(true)}>Открыть</button>{open && <Sheet close={() => setOpen(false)}><button id="nested" onClick={() => setNested(true)}>Вложенное</button>{nested && <Sheet close={() => setNested(false)} />}</Sheet>}</>
}
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  container = document.createElement('div'); document.body.appendChild(container); root = createRoot(container)
})
afterEach(async () => { await act(async () => root.unmount()); container.remove() })
async function click(id: string) {
  const el = container.querySelector<HTMLButtonElement>(id)!
  el.focus()
  await act(async () => el.click())
}
async function key(key: string, shiftKey = false) {
  await act(async () => document.dispatchEvent(new KeyboardEvent('keydown', { key, shiftKey, bubbles: true, cancelable: true })))
}
it('удерживает фокус и восстанавливает его после закрытия', async () => {
  await act(async () => root.render(<Example />))
  await click('#opener')
  const panel = container.querySelector('[role=dialog]')!
  expect(document.activeElement).toBe(panel)
  await key('Tab', true)
  expect(document.activeElement?.textContent).toBe('Последний')
  await key('Tab')
  expect(document.activeElement?.textContent).toBe('Первый')
  expect(document.body.style.overflow).toBe('hidden')
  await key('Escape')
  expect(document.activeElement?.id).toBe('opener')
  expect(document.body.style.overflow).toBe('')
})
it('Escape закрывает только верхнее окно', async () => {
  await act(async () => root.render(<Example />))
  await click('#opener'); await click('#nested')
  expect(container.querySelectorAll('[role=dialog]')).toHaveLength(2)
  await key('Escape')
  expect(container.querySelectorAll('[role=dialog]')).toHaveLength(1)
  expect(document.activeElement?.id).toBe('nested')
  expect(document.body.style.overflow).toBe('hidden')
  await key('Escape')
  expect(document.activeElement?.id).toBe('opener')
})
