"""
Проверки владения ресурсами. Аутентификацию делает middleware в main.py
(кладёт telegram_id в request.state); здесь — сверка «чьё это».
"""
from fastapi import HTTPException, Request
from sqlalchemy.orm import Session

import models


def auth_tid(request: Request) -> int:
    """telegram_id текущего пользователя (положен middleware'ом)."""
    tid = getattr(request.state, "telegram_id", None)
    if tid is None:
        raise HTTPException(401, "Не авторизован")
    return tid


def require_tid(request: Request, telegram_id: int) -> None:
    """Разрешает доступ только к своему telegram_id."""
    if auth_tid(request) != telegram_id:
        raise HTTPException(403, "Нет доступа к чужим данным")


def current_user(request: Request, db: Session) -> models.User:
    """Пользователь из БД по авторизованному telegram_id."""
    user = (
        db.query(models.User)
        .filter(models.User.telegram_id == auth_tid(request))
        .first()
    )
    if user is None:
        # Именно 404, а не 401: аутентификация прошла, просто профиля ещё нет.
        # На 401 фронтенд сбрасывает сессию PWA — получился бы цикл входа.
        raise HTTPException(404, "Профиль не найден — пройдите регистрацию")
    return user


def require_user_id(request: Request, db: Session, user_id: int) -> models.User:
    """Разрешает доступ только к данным своего user_id (внутреннего id БД)."""
    user = current_user(request, db)
    if user.id != user_id:
        raise HTTPException(403, "Нет доступа к чужим данным")
    return user
