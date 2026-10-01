import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import exerciseSource from '../../../backend/data/training_exercises.py?raw'
import ExerciseInfo from './ExerciseInfo'
import { EXERCISE_GUIDES } from './exerciseGuides'
import type { Exercise } from '../api/training'
import { interpolatePose, motionProgress } from './exerciseMotion'

let host: HTMLDivElement, root: Root
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  host = document.createElement('div'); document.body.append(host); root = createRoot(host)
})
afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.restoreAllMocks() })
const exercise = { id: 'squat_goblet', name: 'Приседания с гантелью у груди', muscles: 'Ноги', sets: 2, rep_min: 10, rep_max: 20, rir_target: 3, rest_s: 120, cues: ['Контролируйте движение'] } as Exercise

it('все упражнения сервера имеют явную инструкцию и разные фазы', () => {
  const ids = [...exerciseSource.matchAll(/^    \("([a-z_]+)",/gm)].map(m => m[1])
  expect(ids.length).toBe(26)
  expect(Object.keys(EXERCISE_GUIDES).sort()).toEqual(ids.sort())
  for (const g of Object.values(EXERCISE_GUIDES)) {
    expect(g.poses[0]).not.toEqual(g.poses[1])
    expect(g.steps.length).toBeGreaterThanOrEqual(4)
    expect(g.setup.length).toBeGreaterThan(20)
  }
})
it('показывает технику и переключает доступную иллюстрацию', async () => {
  const close = vi.fn()
  await act(async () => root.render(<ExerciseInfo exercise={exercise} onClose={close} />))
  expect(host.querySelector('[role=dialog]')).not.toBeNull()
  expect(host.querySelector('svg[role=img] title')?.textContent).toContain('Встаньте устойчиво')
  const phase = [...host.querySelectorAll('button')].find(b => b.textContent === '2. Движение')!
  await act(async () => phase.click())
  expect(phase.getAttribute('aria-pressed')).toBe('true')
  expect(host.querySelector('svg[role=img] title')?.textContent).toContain('Опуститесь')
  expect(host.textContent).toContain('Чего избегать')
  await act(async () => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })))
  expect(close).toHaveBeenCalledOnce()
})
it('для неизвестного упражнения не подставляет чужую картинку', async () => {
  await act(async () => root.render(<ExerciseInfo exercise={{ ...exercise, id: 'future_exercise' }} onClose={() => {}} />))
  expect(host.querySelector('svg[role=img]')).toBeNull()
  expect(host.textContent).toContain('Контролируйте движение')
})

it('полный повтор плавно проходит крайние положения и возвращается', () => {
  expect(motionProgress(0)).toBe(0)
  expect(motionProgress(1500)).toBeCloseTo(0.5)
  expect(motionProgress(3000)).toBe(1)
  expect(motionProgress(6000)).toBe(0)
  for (const g of Object.values(EXERCISE_GUIDES)) {
    expect(interpolatePose(g.poses[0], g.poses[1], 0)).toEqual(g.poses[0])
    expect(interpolatePose(g.poses[0], g.poses[1], 1)).toEqual(g.poses[1])
  }
})

it('анимация запускается только кнопкой и останавливается в фоне', async () => {
  let tick: FrameRequestCallback = () => {}
  const raf = vi.spyOn(window, 'requestAnimationFrame').mockImplementation(fn => { tick = fn; return 42 })
  const cancel = vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {})
  await act(async () => root.render(<ExerciseInfo exercise={exercise} onClose={() => {}} />))
  expect(raf).not.toHaveBeenCalled()
  await act(async () => host.querySelector<HTMLButtonElement>('[aria-label="Воспроизвести демонстрацию"]')!.click())
  await act(async () => tick(performance.now() + 1500))
  expect(Number(host.querySelector<HTMLInputElement>('input[type=range]')!.value)).toBeGreaterThan(1000)
  vi.spyOn(document, 'hidden', 'get').mockReturnValue(true)
  await act(async () => document.dispatchEvent(new Event('visibilitychange')))
  expect(host.querySelector('[aria-label="Воспроизвести демонстрацию"]')).not.toBeNull()
  expect(cancel).toHaveBeenCalledWith(42)
})
