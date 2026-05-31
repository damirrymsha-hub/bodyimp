"""
Роут целей: ручной просмотр/пересчёт дневных норм КБЖУ.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
import models
from services.nutrition_calc import calculate_nutrition

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
        "daily_water_ml": user.daily_water_ml or 2000,
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

    result = calculate_nutrition(
        gender=user.gender,
        weight_kg=user.weight_kg,
        height_cm=user.height_cm,
        age=user.age,
        activity_level=user.activity_level,
        goal=user.goal,
    )
    user.daily_calories = result.target_calories
    user.daily_protein_g = result.protein_g
    user.daily_fat_g = result.fat_g
    user.daily_carbs_g = result.carbs_g
    if not user.water_goal_custom:
        user.daily_water_ml = result.water_ml
    db.commit()
    return {
        "daily_calories": result.target_calories,
        "daily_protein_g": result.protein_g,
        "daily_fat_g": result.fat_g,
        "daily_carbs_g": result.carbs_g,
        "daily_water_ml": user.daily_water_ml,
    }
