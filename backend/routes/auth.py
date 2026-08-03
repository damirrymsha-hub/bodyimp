"""
Вход в PWA: Telegram Login Widget → проверка подписи → JWT-сессия.
Плюс публичная информация о боте (username нужен виджету на фронте).
"""
import logging

import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional

from database import get_db
import models
from services.telegram_auth import BOT_TOKEN, issue_jwt, verify_login_widget

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/auth", tags=["auth"])

_bot_username_cache: str | None = None


class LoginWidgetData(BaseModel):
    id: int
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    username: Optional[str] = None
    photo_url: Optional[str] = None
    auth_date: int
    hash: str


@router.post("/telegram-login")
def telegram_login(payload: LoginWidgetData, db: Session = Depends(get_db)):
    """Проверяет подпись виджета, создаёт пользователя при первом входе, выдаёт JWT."""
    tid = verify_login_widget(payload.model_dump())
    if tid is None:
        raise HTTPException(401, "Подпись Telegram не подтверждена")

    user = db.query(models.User).filter(models.User.telegram_id == tid).first()
    if user is None:
        user = models.User(telegram_id=tid, username=payload.username)
        db.add(user)
        db.commit()
        db.refresh(user)

    return {
        "token": issue_jwt(tid),
        "telegram_id": tid,
        "username": user.username,
        "needs_onboarding": user.daily_calories is None,
    }


@router.get("/bot-info")
async def bot_info():
    """Username бота — нужен Login Widget на фронте (кэшируется в процессе)."""
    global _bot_username_cache
    if _bot_username_cache:
        return {"username": _bot_username_cache}
    if not BOT_TOKEN:
        raise HTTPException(503, "Бот не настроен")
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            r = await client.get(
                f"https://api.telegram.org/bot{BOT_TOKEN}/getMe"
            )
            data = r.json()
        _bot_username_cache = data["result"]["username"]
        return {"username": _bot_username_cache}
    except Exception as e:  # noqa: BLE001
        logger.error(f"getMe failed: {e}")
        raise HTTPException(503, "Не удалось получить данные бота")
