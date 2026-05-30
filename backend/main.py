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
from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from database import init_db
from routes import user, food, analyze, water, stats, goals, activity, favorites, food_search
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
            # Запускаем polling без блокировки event loop FastAPI.
            await _bot_app.updater.start_polling(drop_pending_updates=True)
            print("Telegram-бот запущен.")
        except Exception as exc:  # noqa: BLE001
            _bot_app = None
            print(f"[WARN] Не удалось запустить Telegram-бота: {exc}. API работает без бота.")


@app.on_event("shutdown")
async def on_shutdown():
    """Корректно останавливает бота при завершении приложения."""
    global _bot_app
    if _bot_app is not None:
        with contextlib.suppress(Exception):
            await _bot_app.updater.stop()
            await _bot_app.stop()
            await _bot_app.shutdown()
