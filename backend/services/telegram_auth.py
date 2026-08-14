"""
Аутентификация BodyImp:
- verify_init_data / init_data_telegram_id — подпись Telegram WebApp initData
  (HMAC-SHA256, ключ = HMAC("WebAppData", bot_token));
- verify_login_widget — подпись Telegram Login Widget для входа в PWA
  (другая схема: ключ = SHA256(bot_token));
- issue_jwt / jwt_telegram_id — сессия браузера после входа через виджет.
Документация: https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
и https://core.telegram.org/widgets/login#checking-authorization
"""
import hashlib
import hmac
import json
import os
import time
from urllib.parse import parse_qsl

import jwt as pyjwt
from dotenv import load_dotenv

load_dotenv()

BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")

# Секрет JWT: свой env или детерминированный вывод из токена бота
# (стабилен между рестартами, не требует отдельной настройки).
JWT_SECRET = (
    os.getenv("JWT_SECRET")
    or hashlib.sha256(f"bodyimp-jwt:{BOT_TOKEN}".encode()).hexdigest()
)
JWT_TTL_SECONDS = 30 * 24 * 3600  # сессия PWA — 30 дней

# Свежесть подписей Telegram. initData перевыпускается при каждом открытии,
# но iOS держит мини-приложение в фоне сутками и возвращает старый initData —
# поэтому окно широкое, иначе живой пользователь ловит 401 на ровном месте.
INIT_DATA_MAX_AGE = 30 * 24 * 3600
WIDGET_MAX_AGE = 24 * 3600


def _parse_init_data(init_data: str) -> dict[str, str]:
    """
    Разбирает initData в словарь.
    keep_blank_values=True обязателен: клиенты Telegram присылают часть полей
    пустыми (например signature=), и они участвуют в подписи — если их
    потерять, хэш не сойдётся и живой пользователь получит 401.
    """
    return dict(parse_qsl(init_data, keep_blank_values=True))


def verify_init_data(init_data: str) -> bool:
    """Проверяет подлинность строки initData из Telegram WebApp."""
    return _check_init_data(init_data)[0]


def _check_init_data(init_data: str) -> tuple[bool, str]:
    """Как verify_init_data, но возвращает ещё и причину отказа (для логов)."""
    if not init_data:
        return False, "no_init_data"
    if not BOT_TOKEN:
        return False, "no_bot_token"

    parsed = _parse_init_data(init_data)
    received_hash = parsed.pop("hash", "")
    if not received_hash:
        return False, "no_hash"

    secret_key = hmac.new(
        b"WebAppData", BOT_TOKEN.encode(), hashlib.sha256
    ).digest()

    # Разные версии клиентов по-разному учитывают поле signature (его добавили
    # для сторонней Ed25519-проверки). Принимаем оба варианта строки подписи.
    for excluded in ((), ("signature",)):
        data_check_string = "\n".join(
            f"{key}={value}"
            for key, value in sorted(parsed.items())
            if key not in excluded
        )
        calculated_hash = hmac.new(
            secret_key, data_check_string.encode(), hashlib.sha256
        ).hexdigest()
        if hmac.compare_digest(calculated_hash, received_hash):
            return True, "ok"

    return False, "bad_signature"


def init_data_telegram_id(init_data: str) -> int | None:
    """
    Полная проверка initData: подпись + свежесть auth_date.
    Возвращает telegram_id пользователя либо None.
    """
    return init_data_telegram_id_verbose(init_data)[0]


def init_data_telegram_id_verbose(init_data: str) -> tuple[int | None, str]:
    """Как init_data_telegram_id, но с кодом причины отказа для логов и ответа."""
    ok, reason = _check_init_data(init_data)
    if not ok:
        return None, reason
    try:
        parsed = _parse_init_data(init_data)
        auth_date = int(parsed.get("auth_date", "0"))
        if auth_date and time.time() - auth_date > INIT_DATA_MAX_AGE:
            return None, "stale"
        user = json.loads(parsed.get("user", "{}"))
        return int(user["id"]), "ok"
    except (ValueError, KeyError, json.JSONDecodeError):
        return None, "malformed_user"


def verify_login_widget(data: dict) -> int | None:
    """
    Проверяет данные Telegram Login Widget (вход в PWA из браузера).
    Схема отличается от initData: secret_key = SHA256(bot_token).
    Возвращает telegram_id либо None.
    """
    if not BOT_TOKEN:
        return None
    payload = {k: v for k, v in data.items() if v is not None}
    received_hash = payload.pop("hash", None)
    if not received_hash:
        return None

    data_check_string = "\n".join(
        f"{key}={value}" for key, value in sorted(payload.items())
    )
    secret_key = hashlib.sha256(BOT_TOKEN.encode()).digest()
    calculated_hash = hmac.new(
        secret_key, data_check_string.encode(), hashlib.sha256
    ).hexdigest()
    if not hmac.compare_digest(calculated_hash, received_hash):
        return None

    try:
        if time.time() - int(payload.get("auth_date", 0)) > WIDGET_MAX_AGE:
            return None
        return int(payload["id"])
    except (ValueError, KeyError):
        return None


def issue_jwt(telegram_id: int) -> str:
    """Выпускает сессионный токен PWA."""
    now = int(time.time())
    return pyjwt.encode(
        {"tid": telegram_id, "iat": now, "exp": now + JWT_TTL_SECONDS},
        JWT_SECRET,
        algorithm="HS256",
    )


def jwt_telegram_id(token: str) -> int | None:
    """Проверяет JWT и возвращает telegram_id либо None."""
    try:
        payload = pyjwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        return int(payload["tid"])
    except (pyjwt.PyJWTError, KeyError, ValueError):
        return None
