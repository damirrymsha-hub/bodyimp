"""
Роуты питания: добавление, получение за сегодня/по дате, удаление.
"""
from datetime import date as date_cls

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from database import get_db
import models
import schemas

router = APIRouter(prefix="/api/food", tags=["food"])


@router.post("/add", response_model=schemas.FoodOut)
def add_food(payload: schemas.FoodAdd, db: Session = Depends(get_db)):
    """Добавляет запись о приёме пищи."""
    entry = models.FoodEntry(
        user_id=payload.user_id,
        date=payload.date or date_cls.today(),
        meal_type=payload.meal_type,
        name=payload.name,
        calories=payload.calories,
        protein_g=payload.protein_g,
        fat_g=payload.fat_g,
        carbs_g=payload.carbs_g,
        source=payload.source,
        base_per_100g=1 if payload.base_per_100g else 0,
        portion_size_g=payload.portion_size_g,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


@router.post("/copy-day", response_model=list[schemas.FoodOut])
def copy_day(payload: schemas.CopyDayIn, db: Session = Depends(get_db)):
    """
    Копирует все записи еды с одного дня на другой («Повторить вчера»).
    Возвращает созданные записи; 404 — если день-источник пуст.
    """
    src = (
        db.query(models.FoodEntry)
        .filter(
            models.FoodEntry.user_id == payload.user_id,
            models.FoodEntry.date == payload.from_date,
        )
        .all()
    )
    if not src:
        raise HTTPException(404, "В этот день не было записей")

    copies = [
        models.FoodEntry(
            user_id=e.user_id,
            date=payload.to_date,
            meal_type=e.meal_type,
            name=e.name,
            calories=e.calories,
            protein_g=e.protein_g,
            fat_g=e.fat_g,
            carbs_g=e.carbs_g,
            source=e.source,
            base_per_100g=e.base_per_100g,
            portion_size_g=e.portion_size_g,
        )
        for e in src
    ]
    db.add_all(copies)
    db.commit()
    for c in copies:
        db.refresh(c)
    return copies


@router.get("/recent/{user_id}", response_model=list[schemas.FoodOut])
def recent_foods(
    user_id: int,
    limit: int = Query(default=8, le=20),
    db: Session = Depends(get_db),
):
    """Недавние блюда без повторов по названию (для быстрого повторного добавления)."""
    rows = (
        db.query(models.FoodEntry)
        .filter(models.FoodEntry.user_id == user_id)
        .order_by(models.FoodEntry.created_at.desc())
        .limit(120)
        .all()
    )
    seen: set[str] = set()
    out = []
    for e in rows:
        key = e.name.strip().lower()
        if key in seen:
            continue
        seen.add(key)
        out.append(e)
        if len(out) >= limit:
            break
    return out


@router.get("/today/{user_id}", response_model=list[schemas.FoodOut])
def get_today(
    user_id: int,
    date: str = Query(default=None, description="Дата YYYY-MM-DD (по умолчанию сегодня)"),
    db: Session = Depends(get_db),
):
    """Возвращает записи питания за указанную дату (или за сегодня)."""
    if date:
        try:
            target = date_cls.fromisoformat(date)
        except ValueError:
            raise HTTPException(status_code=400, detail="Неверный формат даты")
    else:
        target = date_cls.today()

    return (
        db.query(models.FoodEntry)
        .filter(
            models.FoodEntry.user_id == user_id,
            models.FoodEntry.date == target,
        )
        .order_by(models.FoodEntry.created_at.asc())
        .all()
    )


@router.get("/history/{user_id}", response_model=list[schemas.FoodOut])
def get_history(
    user_id: int,
    date: str = Query(..., description="Дата в формате YYYY-MM-DD"),
    db: Session = Depends(get_db),
):
    """Возвращает записи питания за указанную дату."""
    try:
        target = date_cls.fromisoformat(date)
    except ValueError:
        raise HTTPException(status_code=400, detail="Неверный формат даты")

    return (
        db.query(models.FoodEntry)
        .filter(
            models.FoodEntry.user_id == user_id,
            models.FoodEntry.date == target,
        )
        .order_by(models.FoodEntry.created_at.asc())
        .all()
    )


@router.put("/{entry_id}", response_model=schemas.FoodOut)
def update_food(
    entry_id: int,
    payload: schemas.FoodUpdate,
    db: Session = Depends(get_db),
):
    """Обновляет существующую запись питания (режим редактирования)."""
    entry = db.query(models.FoodEntry).filter(models.FoodEntry.id == entry_id).first()
    if entry is None:
        raise HTTPException(status_code=404, detail="Запись не найдена")

    for field, value in payload.model_dump(exclude_unset=True).items():
        if field == "base_per_100g":
            value = 1 if value else 0
        setattr(entry, field, value)

    db.commit()
    db.refresh(entry)
    return entry


@router.delete("/{entry_id}")
def delete_food(entry_id: int, db: Session = Depends(get_db)):
    """Удаляет запись питания по id."""
    entry = db.query(models.FoodEntry).filter(models.FoodEntry.id == entry_id).first()
    if entry is None:
        raise HTTPException(status_code=404, detail="Запись не найдена")
    db.delete(entry)
    db.commit()
    return {"status": "deleted", "id": entry_id}
