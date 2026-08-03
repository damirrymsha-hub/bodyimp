"""
Роуты воды: добавление и суммарный объём за сегодня.
"""
from datetime import date as date_cls

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy import func
from sqlalchemy.orm import Session

from database import get_db
import models
import schemas
from services import authz

router = APIRouter(prefix="/api/water", tags=["water"])


@router.post("/add", response_model=schemas.WaterOut)
def add_water(payload: schemas.WaterAdd, request: Request, db: Session = Depends(get_db)):
    """Добавляет запись о выпитой воде и возвращает суммарный объём за день."""
    authz.require_user_id(request, db, payload.user_id)
    target = payload.date or date_cls.today()
    entry = models.WaterEntry(
        user_id=payload.user_id,
        date=target,
        amount_ml=payload.amount_ml,
    )
    db.add(entry)
    db.commit()

    total = (
        db.query(func.coalesce(func.sum(models.WaterEntry.amount_ml), 0))
        .filter(
            models.WaterEntry.user_id == payload.user_id,
            models.WaterEntry.date == target,
        )
        .scalar()
    )
    return schemas.WaterOut(total_ml=int(total), date=target)


@router.get("/today/{user_id}", response_model=schemas.WaterOut)
def get_today_water(
    user_id: int,
    request: Request,
    date: str = Query(default=None, description="Дата YYYY-MM-DD (по умолчанию сегодня)"),
    db: Session = Depends(get_db),
):
    """Возвращает суммарный объём воды за указанную дату (или за сегодня)."""
    authz.require_user_id(request, db, user_id)
    if date:
        try:
            target = date_cls.fromisoformat(date)
        except ValueError:
            raise HTTPException(status_code=400, detail="Неверный формат даты")
    else:
        target = date_cls.today()

    total = (
        db.query(func.coalesce(func.sum(models.WaterEntry.amount_ml), 0))
        .filter(
            models.WaterEntry.user_id == user_id,
            models.WaterEntry.date == target,
        )
        .scalar()
    )
    return schemas.WaterOut(total_ml=int(total), date=target)
