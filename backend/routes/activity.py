"""
Роуты активности: добавление тренировки, список за день, удаление.
Сожжённые калории рассчитываются по виду активности, длительности и весу пользователя.
"""
from datetime import date as date_cls

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from database import get_db
import models
import schemas
from services.nutrition_calc import calc_calories_burned

router = APIRouter(prefix="/api/activity", tags=["activity"])


@router.post("/add", response_model=schemas.ActivityOut)
def add_activity(payload: schemas.ActivityAdd, db: Session = Depends(get_db)):
    """Добавляет тренировку и считает сожжённые калории по весу пользователя."""
    user = db.query(models.User).filter(models.User.id == payload.user_id).first()
    weight = user.weight_kg if user and user.weight_kg else 70.0

    burned = calc_calories_burned(
        payload.activity_type, payload.duration_min, weight
    )

    entry = models.ActivityEntry(
        user_id=payload.user_id,
        date=payload.date or date_cls.today(),
        activity_type=payload.activity_type,
        duration_min=payload.duration_min,
        calories_burned=burned,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


@router.get("/today/{user_id}", response_model=list[schemas.ActivityOut])
def get_today_activity(
    user_id: int,
    date: str = Query(default=None, description="Дата YYYY-MM-DD (по умолчанию сегодня)"),
    db: Session = Depends(get_db),
):
    """Возвращает список тренировок за указанную дату (или за сегодня)."""
    if date:
        try:
            target = date_cls.fromisoformat(date)
        except ValueError:
            raise HTTPException(status_code=400, detail="Неверный формат даты")
    else:
        target = date_cls.today()

    return (
        db.query(models.ActivityEntry)
        .filter(
            models.ActivityEntry.user_id == user_id,
            models.ActivityEntry.date == target,
        )
        .order_by(models.ActivityEntry.created_at.asc())
        .all()
    )


@router.delete("/{entry_id}")
def delete_activity(entry_id: int, db: Session = Depends(get_db)):
    """Удаляет тренировку по id."""
    entry = (
        db.query(models.ActivityEntry)
        .filter(models.ActivityEntry.id == entry_id)
        .first()
    )
    if entry is None:
        raise HTTPException(status_code=404, detail="Запись не найдена")
    db.delete(entry)
    db.commit()
    return {"status": "deleted", "id": entry_id}
