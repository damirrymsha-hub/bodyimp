"""
Роут целей: ручной просмотр/пересчёт дневных норм КБЖУ.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
import models
from services.nutrition_calc import calculate_targets

router = APIRouter(prefix="/api/goals", tags=["goals"])


@router.get("/{telegram_id}")
def get_goals(telegram_id: int, db: Session = Depends(get_db)):
    """Возвращает текущие дневные нормы пользователя."""
    user = (
        db.query(models.User)
        .filter(models.User.telegram_id == telegram_id)
        .first()
    )
    if user is None:
        raise HTTPException(status_code=404, detail="Пользователь не найден")

    return {
        "daily_calories": user.daily_calories,
        "daily_protein_g": user.daily_protein_g,
        "daily_fat_g": user.daily_fat_g,
        "daily_carbs_g": user.daily_carbs_g,
        # Дополнительные фиксированные цели приложения.
        "daily_water_ml": 2000,
        "daily_steps": 10000,
    }


@router.post("/{telegram_id}/recalculate")
def recalculate_goals(telegram_id: int, db: Session = Depends(get_db)):
    """Принудительно пересчитывает нормы на основе текущих данных профиля."""
    user = (
        db.query(models.User)
        .filter(models.User.telegram_id == telegram_id)
        .first()
    )
    if user is None:
        raise HTTPException(status_code=404, detail="Пользователь не найден")

    required = [user.gender, user.weight_kg, user.height_cm, user.age,
                user.activity_level, user.goal]
    if not all(v is not None for v in required):
        raise HTTPException(
            status_code=400, detail="Недостаточно данных профиля для расчёта"
        )

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
    db.commit()
    return targets
