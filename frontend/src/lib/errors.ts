// Человекочитаемые сообщения об ошибках API.
// Важно различать «нет сети» и «сервер отказал»: раньше всё выглядело как
// «проверьте соединение», из-за чего проблемы авторизации было не отличить.

interface ApiErrorShape {
  response?: { status: number; data?: { reason?: string; detail?: string } }
}

export function apiErrorMessage(err: unknown, fallback: string): string {
  const res = (err as ApiErrorShape)?.response
  if (!res) return 'Нет связи с сервером. Проверьте интернет и попробуйте снова.'

  const reason = res.data?.reason
  switch (res.status) {
    case 401:
      return reason === 'stale'
        ? 'Сессия Telegram устарела. Закройте приложение и откройте заново.'
        : `Telegram не подтвердил вход. Закройте приложение и откройте заново.${
            reason ? ` (код: ${reason})` : ''
          }`
    case 403:
      return 'Доступ к этим данным закрыт.'
    case 404:
      return 'Данные не найдены.'
    default:
      return res.status >= 500
        ? 'Сервер временно недоступен, попробуйте через минуту.'
        : fallback
  }
}
