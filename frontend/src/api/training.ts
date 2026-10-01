import { api } from './client'

export interface TrainingProfile {
  goal: 'lose' | 'recomp' | 'gain' | 'health'
  experience: 'beginner' | 'intermediate' | 'advanced'
  location: 'home' | 'gym'
  equipment: string[]
  weekdays: number[]
  session_minutes: number
  cardio_enabled: boolean
  cardio_weekdays: number[]
  excluded_exercises: string[]
}
export interface Exercise {
  id: string; name: string; pattern: string; muscles: string; cues: string[]
  equipment: string[]; sets: number; rep_min: number; rep_max: number; rir_target: number; rest_s: number
}
export interface PlannedDay {
  title: string; kind: string; exercises: Exercise[]; estimated_minutes: number
  cardio_minutes: number; warmup_minutes: number
}
export interface TrainingWeek {
  start: string; profile: TrainingProfile | null; notes: string[]
  days: { date: string; plan: PlannedDay | null; program_id: number | null }[]
}
export const getTrainingWeek = async (start: string): Promise<TrainingWeek> =>
  (await api.get('/api/training/week', { params: { start } })).data
export const saveTrainingPlan = async (profile: TrainingProfile, start_date: string) =>
  (await api.post('/api/training/program/generate', { ...profile, start_date })).data
