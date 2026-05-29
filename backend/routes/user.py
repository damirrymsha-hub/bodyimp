"""
Роуты пользователя: регистрация, получение и обновление профиля.
При наличии полных данных пересчитываются дневные нормы КБЖУ.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
import models
import schemas
from services.nutrition_calc import calculate_targets

router = APIRouter(prefix="/api/users", tags=["users"])


def _recalculate_targets(user: models.User) -> None:
    """Пересчитывает нормы, если заполнены все необходимые поля."""
    required = [user.gender, user.weight_kg, user.height_cm, user.age,
                user.activity_level, user.goal]
    if all(v is not None for v in required):
        targets = calculate_targets(
            gender=user.gender,
            weight_kg=user.weight_kg,
            height_cm=user.height_cm,
            age=user.age,
            activity_level=user.activity_level,
            goal=user.goal,
        )
        user.daily_calories = targets["daily_calories"]
        user.daily_protein_g = targets["daily_protein_g"]
        user.daily_fat_g = targets["daily_fat_g"]
        user.daily_carbs_g = targets["daily_carbs_g"]


@router.post("/register", response_model=schemas.UserOut)
def register_user(payload: schemas.UserRegister, db: Session = Depends(get_db)):
    """Регистрирует пользователя по telegram_id (или обновляет существующего)."""
    user = (
        db.query(models.User)
        .filter(models.User.telegram_id == payload.telegram_id)
        .first()
    )

    if user is None:
        user = models.User(telegram_id=payload.telegram_id)
        db.add(user)

    # Обновляем переданные поля.
    for field, value in payload.model_dump(exclude_unset=True).items():
        if field == "telegram_id":
            continue
        setattr(user, field, value)

    _recalculate_targets(user)
    db.commit()
    db.refresh(user)
    return user


@router.get("/{telegram_id}", response_model=schemas.UserOut)
def get_user(telegram_id: int, db: Session = Depends(get_db)):
    """Возвращает профиль пользователя по telegram_id."""
    user = (
        db.query(models.User)
        .filter(models.User.telegram_id == telegram_id)
        .first()
    )
    if user is None:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    return user


@router.put("/{telegram_id}", response_model=schemas.UserOut)
def update_user(
    telegram_id: int,
    payload: schemas.UserUpdate,
    db: Session = Depends(get_db),
):
    """Обновляет данные пользователя и пересчитывает нормы."""
    user = (
        db.query(models.User)
        .filter(models.User.telegram_id == telegram_id)
        .first()
    )
    if user is None:
        raise HTTPException(status_code=404, detail="Пользователь не найден")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(user, field, value)

    _recalculate_targets(user)
    db.commit()
    db.refresh(user)
    return user
