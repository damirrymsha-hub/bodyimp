// Экран диагностики: показывает, что именно мешает приложению работать.
// Нужен, чтобы не гадать по описанию «не работает» — достаточно скриншота.
import { getLastApiError } from '../api/client'
import { getSession } from '../lib/auth'
import { storageAvailable } from '../lib/storage'
import { getInitData, getTelegramPlatform, initDataSource, WebApp } from '../lib/telegram'

const API_URL = import.meta.env.VITE_API_URL || '(не задан)'

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3 border-b border-ink/10 py-2 text-xs">
      <span className="w-40 shrink-0 text-muted">{label}</span>
      <span className="break-all font-mono text-ink">{value}</span>
    </div>
  )
}

export default function Diagnostics({ onClose }: { onClose: () => void }) {
  const initData = getInitData()
  const session = getSession()
  const err = getLastApiError()

  let tgVersion = '—'
  let tgUser = '—'
  try {
    tgVersion = WebApp.version ?? '—'
    const u = WebApp.initDataUnsafe?.user
    tgUser = u ? `${u.id}${u.username ? ` @${u.username}` : ''}` : 'нет'
  } catch {
    /* вне Telegram */
  }

  return (
    <div className="min-h-screen bg-bg px-5 py-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-bold text-ink">Диагностика</h1>
        <button
          onClick={onClose}
          className="min-h-[44px] rounded-2xl bg-card px-4 text-sm font-semibold text-ink"
        >
          Назад
        </button>
      </div>

      <p className="mb-4 text-xs text-muted">
        Сделайте скриншот этого экрана и отправьте — по нему видно точную причину.
      </p>

      <Row label="Платформа Telegram" value={getTelegramPlatform()} />
      <Row label="Версия Telegram" value={tgVersion} />
      <Row label="Пользователь" value={tgUser} />
      <Row label="Подпись получена" value={initData ? 'да' : 'НЕТ'} />
      <Row label="Источник подписи" value={initDataSource()} />
      <Row label="Длина подписи" value={String(initData.length)} />
      <Row label="Сессия (JWT)" value={session ? 'есть' : 'нет'} />
      <Row label="Хранилище" value={storageAvailable() ? 'работает' : 'ЗАБЛОКИРОВАНО'} />
      <Row label="Адрес сервера" value={API_URL} />
      <Row label="Онлайн (по мнению ОС)" value={navigator.onLine ? 'да' : 'нет'} />

      <h2 className="mb-2 mt-6 text-sm font-bold text-ink">Последняя ошибка запроса</h2>
      {err ? (
        <>
          <Row label="Запрос" value={err.url ?? '—'} />
          <Row label="HTTP-код" value={err.status === null ? 'ответа не было' : String(err.status)} />
          <Row label="Причина сервера" value={err.reason ?? '—'} />
          <Row label="Код ошибки" value={err.code ?? '—'} />
          <Row label="Сообщение" value={err.message} />
          <Row label="Время" value={err.at} />
        </>
      ) : (
        <p className="text-xs text-muted">Ошибок не было.</p>
      )}
    </div>
  )
}
