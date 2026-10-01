import type { Pose } from './exerciseGuides'

export const REP_DURATION_MS = 6000
// Плавное замедление в крайних точках, полный цикл с возвратом.
export function motionProgress(timeMs: number) {
  return (1 - Math.cos((timeMs / REP_DURATION_MS) * Math.PI * 2)) / 2
}
export function interpolatePose(start: Pose, end: Pose, progress: number): Pose {
  const t = Math.min(1, Math.max(0, progress))
  const result = {} as Pose
  for (const key of Object.keys(start) as (keyof Pose)[]) {
    result[key] = [start[key][0] + (end[key][0] - start[key][0]) * t,
      start[key][1] + (end[key][1] - start[key][1]) * t]
  }
  return result
}
