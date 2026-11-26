"""Безопасные сообщения об ошибках ИИ: без ключей и текста пользовательской еды."""
class AnalysisError(Exception):
    def __init__(self, message, status=503, retry_after=None, terminal=False):
        super().__init__(message)
        self.message = message
        self.status = status
        self.retry_after = retry_after
        self.terminal = terminal


def provider_error(response, error=None):
    """Различаем авторизацию, квоту аккаунта и перегрузку конкретной модели."""
    error = error if isinstance(error, dict) else {}
    try:
        code = int(error.get("code") or response.status_code)
    except (TypeError, ValueError):
        code = response.status_code
    message = str(error.get("message", "")).lower()
    if code in (401, 403):
        return AnalysisError("Сервис ИИ не принимает настройки доступа. Сообщи владельцу приложения.", terminal=True)
    if code == 402:
        return AnalysisError("Исчерпан баланс или бюджет сервиса ИИ. Сообщи владельцу приложения.", terminal=True)
    if code == 429:
        daily = any(word in message for word in ("per-day", "per day", "daily", "quota", "credits"))
        try:
            retry = max(1, min(86400, int(response.headers.get("retry-after", "60"))))
        except ValueError:
            retry = 60
        return AnalysisError(
            "Исчерпан лимит запросов сервиса ИИ. Повтори после обновления квоты." if daily else
            "Бесплатные модели ИИ сейчас ограничивают запросы. Попробуй позже.",
            status=429, retry_after=retry, terminal=daily,
        )
    return AnalysisError("Модель ИИ временно недоступна. Попробуй позже.")
