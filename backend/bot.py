"""
Telegram-бот BodyImp на python-telegram-bot.
Команды:
  /start — приветствие + кнопка "Открыть BodyImp" (WebApp)
  /today — краткая текстовая сводка за сегодня
Бот запускается в фоне рядом с FastAPI (см. main.py).
"""
import os
from datetime import date as date_cls

from dotenv import load_dotenv
from sqlalchemy import func
from telegram import (
    Update,
    InlineKeyboardButton,
    InlineKeyboardMarkup,
    WebAppInfo,
)
from telegram.ext import (
    Application,
    CommandHandler,
    ContextTypes,
)

from database import SessionLocal
import models

load_dotenv()

BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
MINI_APP_URL = os.getenv("FRONTEND_URL", "https://your-frontend.vercel.app")


async def start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Приветствие и кнопка запуска Mini App."""
    keyboard = InlineKeyboardMarkup(
        [[InlineKeyboardButton(
            text="Открыть BodyImp",
            web_app=WebAppInfo(url=MINI_APP_URL),
        )]]
    )
    await update.message.reply_text(
        "Привет! Это BodyImp — твой трекер питания и калорий.\n\n"
        "Считай КБЖУ, фотографируй еду для анализа и следи за прогрессом.\n"
        "Нажми кнопку ниже, чтобы открыть приложение.",
        reply_markup=keyboard,
    )


async def today(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Краткая сводка за сегодня: калории/норма, белки, вода."""
    tg_id = update.effective_user.id
    db = SessionLocal()
    try:
        user = (
            db.query(models.User)
            .filter(models.User.telegram_id == tg_id)
            .first()
        )
        if user is None:
            await update.message.reply_text(
                "Сначала открой приложение и заполни профиль: /start"
            )
            return

        today_date = date_cls.today()
        totals = (
            db.query(
                func.coalesce(func.sum(models.FoodEntry.calories), 0),
                func.coalesce(func.sum(models.FoodEntry.protein_g), 0),
            )
            .filter(
                models.FoodEntry.user_id == user.id,
                models.FoodEntry.date == today_date,
            )
            .first()
        )
        cal, prot = float(totals[0]), float(totals[1])

        water = (
            db.query(func.coalesce(func.sum(models.WaterEntry.amount_ml), 0))
            .filter(
                models.WaterEntry.user_id == user.id,
                models.WaterEntry.date == today_date,
            )
            .scalar()
        )

        cal_norm = user.daily_calories or 0
        prot_norm = user.daily_protein_g or 0

        await update.message.reply_text(
            f"Сводка за сегодня:\n\n"
            f"Калории: {round(cal)} / {cal_norm} ккал\n"
            f"Белки: {round(prot)} / {prot_norm} г\n"
            f"Вода: {int(water)} / 2000 мл"
        )
    finally:
        db.close()


def build_application() -> Application:
    """Создаёт и настраивает приложение бота."""
    application = Application.builder().token(BOT_TOKEN).build()
    application.add_handler(CommandHandler("start", start))
    application.add_handler(CommandHandler("today", today))
    return application
