# -*- coding: utf-8 -*-
"""
Приём обратной связи по распознаванию еды (подтверждения и правки пользователя).
Данные копятся в БД — это датасет для повышения точности (few-shot, файнтюн, evals).
"""
import logging

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from database import get_db
from models import AnalysisFeedback
import schemas
from services import authz

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/feedback", tags=["feedback"])


@router.post("/analysis")
def save_analysis_feedback(
    payload: schemas.AnalysisFeedbackIn, request: Request, db: Session = Depends(get_db)
):
    """Сохраняет пару «ответ ИИ → финальное значение пользователя»."""
    # user_id не доверяем клиенту — берём из авторизации.
    data = payload.model_dump()
    data["user_id"] = authz.current_user(request, db).id
    fb = AnalysisFeedback(**data)
    db.add(fb)
    db.commit()
    return {"success": True, "id": fb.id}


@router.get("/analysis/stats")
def feedback_stats(db: Session = Depends(get_db)):
    """Краткая статистика качества: сколько ответов правили и средняя ошибка калорий."""
    rows = db.query(AnalysisFeedback).all()
    total = len(rows)
    edited = [r for r in rows if r.edited]
    if not total:
        return {"total": 0, "edited": 0, "edit_rate": 0, "mean_kcal_error_pct": 0}
    errs = [
        abs(r.ai_calories - r.final_calories) / r.final_calories * 100
        for r in edited
        if (r.final_calories or 0) > 0
    ]
    return {
        "total": total,
        "edited": len(edited),
        "edit_rate": round(len(edited) / total * 100, 1),
        "mean_kcal_error_pct": round(sum(errs) / len(errs), 1) if errs else 0,
    }
