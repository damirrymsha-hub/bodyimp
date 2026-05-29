"""
Верификация Telegram WebApp initData через HMAC-SHA256.
Документация: https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
"""
import hashlib
import hmac
import os
from urllib.parse import parse_qsl

from dotenv import load_dotenv

load_dotenv()

BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")


def verify_init_data(init_data: str) -> bool:
    """
    Проверяет подлинность строки initData, полученной из Telegram WebApp.
    Возвращает True, если подпись корректна.
    """
    if not init_data or not BOT_TOKEN:
        return False

    try:
        parsed = dict(parse_qsl(init_data, strict_parsing=True))
    except ValueError:
        return False

    received_hash = parsed.pop("hash", None)
    if not received_hash:
        return False

    # Строка проверки: отсортированные пары key=value через перевод строки.
    data_check_string = "\n".join(
        f"{key}={value}" for key, value in sorted(parsed.items())
    )

    # Секретный ключ = HMAC_SHA256(bot_token, "WebAppData").
    secret_key = hmac.new(
        b"WebAppData", BOT_TOKEN.encode(), hashlib.sha256
    ).digest()
    calculated_hash = hmac.new(
        secret_key, data_check_string.encode(), hashlib.sha256
    ).hexdigest()

    return hmac.compare_digest(calculated_hash, received_hash)
