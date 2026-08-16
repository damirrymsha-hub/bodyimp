// Безопасный доступ к localStorage.
//
// В WebView (особенно на iOS, а также в приватном режиме и при запрете
// межсайтовых данных) обращение к localStorage может БРОСИТЬ исключение —
// не вернуть null, а именно упасть. Если такой вызов стоит на пути запроса,
// падает весь запрос, и это выглядит как «нет интернета».
// Поэтому всё хранилище идёт только через эти функции, а на случай отказа
// есть резервная копия в памяти на время сессии.

const memory = new Map<string, string>()

let available: boolean | null = null

/** Работает ли localStorage в этом окружении (проверяется один раз). */
export function storageAvailable(): boolean {
  if (available !== null) return available
  try {
    const probe = '__bodyimp_probe__'
    window.localStorage.setItem(probe, '1')
    window.localStorage.removeItem(probe)
    available = true
  } catch {
    available = false
  }
  return available
}

export function readStored(key: string): string | null {
  try {
    const value = window.localStorage.getItem(key)
    if (value !== null) return value
  } catch {
    /* хранилище недоступно — берём из памяти */
  }
  return memory.get(key) ?? null
}

export function writeStored(key: string, value: string): void {
  memory.set(key, value)
  try {
    window.localStorage.setItem(key, value)
  } catch {
    /* остаётся только копия в памяти — приложение продолжает работать */
  }
}

export function removeStored(key: string): void {
  memory.delete(key)
  try {
    window.localStorage.removeItem(key)
  } catch {
    /* ignore */
  }
}
