"""
Роуты статистики и веса: недельные калории, лог веса, история веса.
"""
from datetime import date as date_cls, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from database import get_db
import models
import schemas

router = APIRouter(prefix="/api", tags=["stats"])


@router.get("/stats/weekly/{user_id}", response_model=schemas.WeeklyStats)
def weekly_stats(user_id: int, db: Session = Depends(get_db)):
    """Возвращает суммарные калории за каждый из последних 7 дней."""
    today = date_cls.today()
    start = today - timedelta(days=6)

    # Сумма калорий по дням в диапазоне.
    rows = (
        db.query(
            models.FoodEntry.date,
            func.coalesce(func.sum(models.FoodEntry.calories), 0),
        )
        .filter(
            models.FoodEntry.user_id == user_id,
            models.FoodEntry.date >= start,
            models.FoodEntry.date <= today,
        )
        .group_by(models.FoodEntry.date)
        .all()
    )
    by_date = {row[0]: float(row[1]) for row in rows}

    # Заполняем все 7 дней (включая дни без записей — 0 ккал).
    days = []
    for i in range(7):
        d = start + timedelta(days=i)
        days.append(schemas.DailyCalories(date=d, calories=by_date.get(d, 0.0)))

    total = sum(day.calories for day in days)
    avg = round(total / 7, 1)

    # Средние макросы за те же 7 дней (для карточки на экране Прогресс).
    macros = (
        db.query(
            func.coalesce(func.sum(models.FoodEntry.protein_g), 0),
            func.coalesce(func.sum(models.FoodEntry.fat_g), 0),
            func.coalesce(func.sum(models.FoodEntry.carbs_g), 0),
        )
        .filter(
            models.FoodEntry.user_id == user_id,
            models.FoodEntry.date >= start,
            models.FoodEntry.date <= today,
        )
        .first()
    )
    return schemas.WeeklyStats(
        days=days,
        avg_calories=avg,
        avg_protein_g=round(float(macros[0]) / 7, 1),
        avg_fat_g=round(float(macros[1]) / 7, 1),
        avg_carbs_g=round(float(macros[2]) / 7, 1),
    )


@router.post("/weight/log", response_model=schemas.WeightOut)
def log_weight(payload: schemas.WeightLogIn, db: Session = Depends(get_db)):
    """Сохраняет замер веса. Также обновляет текущий вес в профиле."""
    target = payload.date or date_cls.today()
    entry = models.WeightLog(
        user_id=payload.user_id,
        date=target,
        weight_kg=payload.weight_kg,
    )
    db.add(entry)

    # Синхронизируем актуальный вес в профиле.
    user = db.query(models.User).filter(models.User.id == payload.user_id).first()
    if user is not None:
        user.weight_kg = payload.weight_kg

    db.commit()
    db.refresh(entry)
    return entry


@router.get("/weight/history/{user_id}", response_model=list[schemas.WeightOut])
def weight_history(user_id: int, db: Session = Depends(get_db)):
    """Возвращает историю замеров веса (по возрастанию даты)."""
    return (
        db.query(models.WeightLog)
        .filter(models.WeightLog.user_id == user_id)
        .order_by(models.WeightLog.date.asc())
        .all()
    )
