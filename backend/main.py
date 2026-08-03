"""
Точка входа BodyImp backend.
- Поднимает FastAPI с роутами.
- Настраивает CORS (в проде — только FRONTEND_URL, в dev — '*').
- Запускает Telegram-бота в фоне рядом с API.
- Фоновый планировщик напоминаний (вода днём, вечерняя сводка).
"""
import os
import asyncio
import contextlib
from datetime import datetime, timedelta, timezone, date as date_cls

from dotenv import load_dotenv
from fastapi import FastAPI, Header, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from database import init_db
from routes import (
    user, food, analyze, water, stats, goals, activity,
    favorites, food_search, barcode, feedback, auth,
)
from services.telegram_auth import (
    verify_init_data,
    init_data_telegram_id,
    jwt_telegram_id,
)

load_dotenv()

APP_NAME = os.getenv("APP_NAME", "BodyImp")
FRONTEND_URL = os.getenv("FRONTEND_URL", "")
# Режим разработки определяем по наличию dev-флага.
IS_DEV = os.getenv("ENV", "dev").lower() != "production"

# В проде документация API закрыта (не светим карту эндпоинтов).
app = FastAPI(
    title=f"{APP_NAME} API",
    docs_url="/docs" if IS_DEV else None,
    redoc_url=None,
    openapi_url="/openapi.json" if IS_DEV else None,
)

# Пути без аутентификации: health, вебхук бота (свой секрет), вход, инфо о боте.
PUBLIC_API_PATHS = {
    "/api/bot/webhook",
    "/api/auth/telegram-login",
    "/api/auth/bot-info",
}


# ВАЖНО: middleware добавлен ДО CORSMiddleware, чтобы CORS был внешним слоем
# и навешивал заголовки в том числе на наши 401-ответы.
@app.middleware("http")
async def auth_middleware(request: Request, call_next):
    """
    Аутентификация всех /api/*:
    - Mini App шлёт подписанный Telegram initData в X-Telegram-Init-Data;
    - PWA шлёт JWT в Authorization: Bearer (выдан после Login Widget);
    - в dev-режиме без заголовков подставляется тестовый пользователь.
    telegram_id кладётся в request.state — роуты сверяют владение (services/authz).
    """
    path = request.url.path
    if (
        request.method == "OPTIONS"
        or not path.startswith("/api")
        or path in PUBLIC_API_PATHS
    ):
        return await call_next(request)

    tid: int | None = None
    init_data = request.headers.get("X-Telegram-Init-Data", "")
    if init_data:
        tid = init_data_telegram_id(init_data)
    else:
        authz = request.headers.get("Authorization", "")
        if authz.startswith("Bearer "):
            tid = jwt_telegram_id(authz[7:])

    if tid is None and IS_DEV:
        # Локальная разработка и тесты — без подписи, с явным дев-идентификатором.
        try:
            tid = int(request.headers.get("X-Dev-Telegram-Id", "99000001"))
        except ValueError:
            tid = 99000001

    if tid is None:
        return JSONResponse(
            {"detail": "Не авторизован: откройте приложение через Telegram"},
            status_code=401,
        )

    request.state.telegram_id = tid
    return await call_next(request)


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
app.include_router(auth.router)


@app.api_route("/", methods=["GET", "HEAD"])
def root():
    """
    Проверка работоспособности API. HEAD нужен мониторам аптайма
    (UptimeRobot по умолчанию шлёт HEAD; без него монитор видит 405=Down).
    """
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


# ---------- Напоминания ботом ----------
# Время в МСК (UTC+3): вода — 12:00, вечерняя сводка — 20:00.
MSK = timezone(timedelta(hours=3))
WATER_HOUR = 12
EVENING_HOUR = 20


async def _send_reminders() -> None:
    """Один тик планировщика: рассылает напоминания, у кого они включены."""
    if _bot_app is None:
        return
    now = datetime.now(MSK)
    kind = "water" if now.hour == WATER_HOUR else "evening" if now.hour == EVENING_HOUR else None
    if kind is None:
        return

    from telegram import InlineKeyboardButton, InlineKeyboardMarkup, WebAppInfo
    from sqlalchemy import func
    from database import SessionLocal
    import models

    today = now.date()
    kb = None
    if FRONTEND_URL:
        kb = InlineKeyboardMarkup(
            [[InlineKeyboardButton("Открыть BodyImp", web_app=WebAppInfo(url=FRONTEND_URL))]]
        )

    db = SessionLocal()
    try:
        users = (
            db.query(models.User)
            .filter(models.User.notifications_enabled == True)  # noqa: E712
            .all()
        )
        for u in users:
            last = u.last_water_notify if kind == "water" else u.last_evening_notify
            if last == today:
                continue  # уже отправляли сегодня

            if kind == "water":
                drunk = (
                    db.query(func.coalesce(func.sum(models.WaterEntry.amount_ml), 0))
                    .filter(
                        models.WaterEntry.user_id == u.id,
                        models.WaterEntry.date == today,
                    )
                    .scalar()
                )
                goal = u.daily_water_ml or 2000
                text = (
                    f"💧 Не забудь попить воды!\n"
                    f"Сегодня выпито {int(drunk)} из {goal} мл."
                )
            else:
                eaten = (
                    db.query(func.coalesce(func.sum(models.FoodEntry.calories), 0))
                    .filter(
                        models.FoodEntry.user_id == u.id,
                        models.FoodEntry.date == today,
                    )
                    .scalar()
                )
                goal = u.daily_calories or 2000
                left = max(0, round(goal - float(eaten)))
                text = (
                    f"🌙 Как прошёл день?\n"
                    f"Съедено {round(float(eaten))} ккал, осталось {left}.\n"
                    f"Не забудь записать ужин!"
                )

            try:
                await _bot_app.bot.send_message(u.telegram_id, text, reply_markup=kb)
            except Exception as exc:  # noqa: BLE001
                print(f"[notify] не отправилось {u.telegram_id}: {exc}")
                continue

            if kind == "water":
                u.last_water_notify = today
            else:
                u.last_evening_notify = today
            db.commit()
    finally:
        db.close()


async def _notifier_loop() -> None:
    """Вечный цикл: проверяем напоминания раз в минуту."""
    while True:
        try:
            await _send_reminders()
        except Exception as exc:  # noqa: BLE001
            print(f"[notify] ошибка тика: {exc}")
        await asyncio.sleep(60)


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

    # Планировщик напоминаний (работает, пока инстанс не спит — держим
    # его бодрым пингом UptimeRobot).
    asyncio.create_task(_notifier_loop())


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
