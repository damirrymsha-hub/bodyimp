// Человекочитаемые сообщения об ошибках API.
//
// Важно различать три разных случая, которые раньше сливались в одно
// «проверьте соединение»:
//   • сервер ответил (401/403/404/5xx) — виноват не интернет;
//   • запрос ушёл, но ответа нет (обрыв связи, таймаут, недоступный хост);
//   • ошибка в самом коде до отправки запроса — это баг, а не сеть.

interface ApiErrorShape {
  response?: { status: number; data?: { reason?: string; detail?: string } }
  code?: string
  message?: string
  isAxiosError?: boolean
}

export function apiErrorMessage(err: unknown, fallback: string): string {
  const e = err as ApiErrorShape
  const res = e?.response

  if (res) {
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

  if (e?.code === 'ECONNABORTED') {
    return 'Сервер не ответил вовремя. Он мог засыпать — попробуйте ещё раз.'
  }

  // Ошибка вне axios означает сбой в самом приложении, а не в сети.
  if (e && e.isAxiosError !== true && e.code === undefined) {
    return `Сбой в приложении: ${e.message ?? 'неизвестная ошибка'}`
  }

  return 'Нет связи с сервером. Проверьте интернет и попробуйте снова.'
}
