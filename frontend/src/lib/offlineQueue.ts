// Оффлайн-очередь: неотправленные записи еды сохраняются в localStorage
// и досылаются на бэкенд при следующей успешной загрузке.
import type { FoodAddPayload } from '../api/client'
import { addFood } from '../api/client'

const QUEUE_KEY = 'bodyimp_offline_food_queue'

export function enqueueFood(payload: FoodAddPayload) {
  const queue = readQueue()
  queue.push(payload)
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue))
}

function readQueue(): FoodAddPayload[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY)
    return raw ? (JSON.parse(raw) as FoodAddPayload[]) : []
  } catch {
    return []
  }
}

// Пытается отправить все накопленные записи. Удачно отправленные удаляются.
export async function flushQueue(): Promise<number> {
  const queue = readQueue()
  if (queue.length === 0) return 0

  const remaining: FoodAddPayload[] = []
  let sent = 0
  for (const item of queue) {
    try {
      await addFood(item)
      sent += 1
    } catch {
      remaining.push(item) // оставляем для следующей попытки
    }
  }
  localStorage.setItem(QUEUE_KEY, JSON.stringify(remaining))
  return sent
}
