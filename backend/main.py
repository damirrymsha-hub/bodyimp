"""
Точка входа BodyImp backend.
- Поднимает FastAPI с роутами.
- Настраивает CORS (в проде — только FRONTEND_URL, в dev — '*').
- Запускает Telegram-бота в фоне рядом с API.
"""
import os
import asyncio
import contextlib

from dotenv import load_dotenv
from fastapi import FastAPI, Header, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware

from database import init_db
from routes import (
    user, food, analyze, water, stats, goals, activity,
    favorites, food_search, barcode, feedback,
)
from services.telegram_auth import verify_init_data

load_dotenv()

APP_NAME = os.getenv("APP_NAME", "BodyImp")
FRONTEND_URL = os.getenv("FRONTEND_URL", "")
# Режим разработки определяем по наличию dev-флага.
IS_DEV = os.getenv("ENV", "dev").lower() != "production"

app = FastAPI(title=f"{APP_NAME} API")

# CORS: в разработке разрешаем всё, в проде — только фронтенд.
allowed_origins = ["*"] if IS_DEV else [FRONTEND_URL]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Регистрация роутов.
app.include_router(user.router)
app.include_router(food.router)
app.include_router(analyze.router)
app.include_router(water.router)
app.include_router(activity.router)
app.include_router(stats.router)
app.include_router(goals.router)
app.include_router(favorites.router)
app.include_router(food_search.router)
app.include_router(barcode.router)
app.include_router(feedback.router)


@app.get("/")
def root():
    """Проверка работоспособности API."""
    return {"app": APP_NAME, "status": "ok"}


@app.get("/api/test/openrouter")
async def test_openrouter():
    """Проверить подключение к OpenRouter без фото (диагностика ключа и vision-моделей)."""
    import httpx

    key = os.getenv("OPENROUTER_API_KEY", "")
    if not key:
        return {"status": "error", "message": "OPENROUTER_API_KEY не задан"}

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            r = await client.get(
                "https://openrouter.ai/api/v1/models",
                headers={"Authorization": f"Bearer {key}"},
            )
            if r.status_code == 200:
                models = r.json().get("data", [])
                vision_models = [
                    m["id"]
                    for m in models
                    if "vision" in m.get("id", "").lower()
                    or "gemini" in m.get("id", "").lower()
                    or "qwen" in m.get("id", "").lower()
                ]
                return {
                    "status": "ok",
                    "key_prefix": key[:12] + "...",
                    "vision_models_available": vision_models[:10],
                }
            return {"status": "error", "code": r.status_code, "body": r.text}
    except Exception as e:  # noqa: BLE001
        return {"status": "error", "message": str(e)}


@app.post("/api/auth/verify")
def auth_verify(x_init_data: str = Header(default="")):
    """
    Проверяет подпись Telegram initData (HMAC-SHA256).
    Фронтенд передаёт строку в заголовке X-Init-Data.
    """
    if not verify_init_data(x_init_data):
        raise HTTPException(status_code=401, detail="Невалидные initData")
    return {"verified": True}


# ---------- Жизненный цикл: БД + бот ----------
_bot_app = None  # ссылка на Application бота

# Базовый публичный URL бэкенда для webhook-режима бота.
# На Render переменная RENDER_EXTERNAL_URL выставляется автоматически.
WEBHOOK_BASE = (
    os.getenv("WEBHOOK_BASE_URL") or os.getenv("RENDER_EXTERNAL_URL") or ""
).rstrip("/")
# Секрет для проверки, что запросы на webhook приходят именно от Telegram.
WEBHOOK_SECRET = os.getenv("TELEGRAM_WEBHOOK_SECRET", "")


@app.post("/api/bot/webhook")
async def bot_webhook(request: Request):
    """
    Принимает обновления от Telegram в webhook-режиме.
    Нужен на хостингах со «сном» (Render free): входящее сообщение
    само будит сервис, long-polling там работать не может.
    """
    if _bot_app is None:
        raise HTTPException(status_code=503, detail="Бот не запущен")
    # Проверка секретного токена Telegram (заголовок ставит сам Telegram).
    if WEBHOOK_SECRET:
        header = request.headers.get("X-Telegram-Bot-Api-Secret-Token", "")
        if header != WEBHOOK_SECRET:
            raise HTTPException(status_code=403, detail="Неверный секрет")

    from telegram import Update

    data = await request.json()
    update = Update.de_json(data, _bot_app.bot)
    await _bot_app.process_update(update)
    return {"ok": True}


@app.on_event("startup")
async def on_startup():
    """Инициализирует БД и запускает Telegram-бота в фоне."""
    init_db()

    global _bot_app
    token = os.getenv("TELEGRAM_BOT_TOKEN")
    if token:
        # Запуск бота не должен ронять API: при ошибке (невалидный токен,
        # сетевой сбой, конфликт polling) просто логируем и работаем без бота.
        try:
            # Импорт здесь, чтобы приложение поднималось даже без настроенного бота.
            from bot import build_application

            _bot_app = build_application()
            await _bot_app.initialize()
            await _bot_app.start()
            if WEBHOOK_BASE:
                # Webhook-режим: Telegram шлёт обновления HTTP-запросом
                # и тем самым будит «уснувший» бесплатный инстанс.
                await _bot_app.bot.set_webhook(
                    url=f"{WEBHOOK_BASE}/api/bot/webhook",
                    secret_token=WEBHOOK_SECRET or None,
                    drop_pending_updates=True,
                )
                print(f"Telegram-бот запущен (webhook: {WEBHOOK_BASE}).")
            else:
                # Локальная разработка — обычный polling.
                await _bot_app.updater.start_polling(drop_pending_updates=True)
                print("Telegram-бот запущен (polling).")
        except Exception as exc:  # noqa: BLE001
            _bot_app = None
            print(f"[WARN] Не удалось запустить Telegram-бота: {exc}. API работает без бота.")


@app.on_event("shutdown")
async def on_shutdown():
    """Корректно останавливает бота при завершении приложения."""
    global _bot_app
    if _bot_app is not None:
        # Раздельный suppress: в webhook-режиме updater не запускался,
        # его stop() бросит исключение — не должен мешать остальной очистке.
        with contextlib.suppress(Exception):
            await _bot_app.updater.stop()
        with contextlib.suppress(Exception):
            await _bot_app.stop()
        with contextlib.suppress(Exception):
            await _bot_app.shutdown()
