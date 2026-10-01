import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { beforeEach, afterEach, expect, it, vi } from 'vitest'
import TrainingPlan from './TrainingPlan'
import { getTrainingWeek, saveTrainingPlan } from '../api/training'

vi.mock('../api/training', () => ({ getTrainingWeek: vi.fn(), saveTrainingPlan: vi.fn() }))
let host: HTMLDivElement, root: Root
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  vi.resetAllMocks()
  vi.mocked(getTrainingWeek).mockResolvedValue({ start: '2026-09-28', profile: null, notes: [], days: [] })
  vi.mocked(saveTrainingPlan).mockResolvedValue({})
  host = document.createElement('div'); document.body.append(host); root = createRoot(host)
})
afterEach(async () => { await act(async () => root.unmount()); host.remove() })
const render = async (date = '2026-10-01') => { await act(async () => root.render(<TrainingPlan selectedDate={date} />)) }
async function click(text: string) {
  const button = [...host.querySelectorAll('button')].find(b => b.textContent === text)
  expect(button).toBeTruthy(); await act(async () => button!.click())
}
it('сохраняет выбранные настройки без кардио по умолчанию и обновляет неделю', async () => {
  await render(); await click('Составить мой план'); await click('Далее'); await click('Далее')
  expect((host.querySelector('input[type=checkbox]') as HTMLInputElement).checked).toBe(false)
  await click('Создать план')
  expect(saveTrainingPlan).toHaveBeenCalledWith(expect.objectContaining({ weekdays: [0, 2, 4], cardio_enabled: false, cardio_weekdays: [] }), expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/))
  expect(getTrainingWeek).toHaveBeenCalledTimes(2)
  expect(host.querySelector('[role=dialog]')).toBeNull()
})
it('кардио появляется только после выбора, пустые дни блокируют сохранение', async () => {
  await render(); await click('Составить мой план'); await click('Далее'); await click('Далее')
  await act(async () => (host.querySelector('input[type=checkbox]') as HTMLInputElement).click())
  expect(host.textContent).toContain('Дни кардио')
  await act(async () => [...host.querySelectorAll('button[aria-label="Пн"]')][1].dispatchEvent(new MouseEvent('click', { bubbles: true })))
  const save = [...host.querySelectorAll('button')].find(b => b.textContent === 'Создать план')!
  expect(save.disabled).toBe(true)
})
it('ошибка сохранения оставляет форму открытой для повтора', async () => {
  vi.mocked(saveTrainingPlan).mockRejectedValue({ response: { data: { detail: 'База временно недоступна' } } })
  await render(); await click('Составить мой план'); await click('Далее'); await click('Далее'); await click('Создать план')
  expect(host.querySelector('[role=alert]')?.textContent).toBe('База временно недоступна')
  expect(host.querySelector('[role=dialog]')).not.toBeNull()
})
it('не показывает запоздалый ответ другой недели', async () => {
  let resolve: (value: Awaited<ReturnType<typeof getTrainingWeek>>) => void = () => {}
  vi.mocked(getTrainingWeek).mockReturnValueOnce(new Promise(r => { resolve = r }))
  await render('2026-09-20'); await render('2026-10-01')
  await act(async () => resolve({ start: '2026-09-14', profile: null, days: [], notes: ['OLD'] }))
  expect(host.textContent).not.toContain('OLD')
  expect(getTrainingWeek).toHaveBeenLastCalledWith('2026-10-01')
})
