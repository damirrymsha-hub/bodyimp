"""Программы принадлежат пользователю из проверенной Telegram-сессии."""
from datetime import date, timedelta
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from database import get_db
from models import TrainingProgram
from services.authz import current_user
from services.training_planner import TrainingProfile, generate
from data.training_exercises import EXERCISES

router = APIRouter(prefix="/api/training", tags=["training"])


class GenerateRequest(TrainingProfile):
    start_date: date


@router.get("/exercises")
def exercises():
    return list(EXERCISES.values())


@router.post("/program/generate")
def generate_program(payload: GenerateRequest, request: Request, db: Session = Depends(get_db)):
    user = current_user(request, db)
    if user.age is None or user.age < 18:
        raise HTTPException(422, "Автоматическая программа доступна с 18 лет")
    # Разница часовых поясов допускается; историю прошедших недель не переписываем.
    if not date.today() - timedelta(days=1) <= payload.start_date <= date.today() + timedelta(days=7):
        raise HTTPException(422, "Выберите начало программы сегодня или в ближайшую неделю")
    profile = TrainingProfile.model_validate(payload.model_dump(exclude={"start_date"}))
    snapshot = generate(profile)
    latest = db.query(TrainingProgram).filter_by(user_id=user.id).order_by(TrainingProgram.id.desc()).first()
    # Повтор запроса после сетевого сбоя не создаёт лишнюю версию.
    if latest and latest.start_date == payload.start_date and latest.snapshot == snapshot:
        return {"id": latest.id, **snapshot}
    program = TrainingProgram(user_id=user.id, start_date=payload.start_date, snapshot=snapshot)
    db.add(program)
    db.commit()
    db.refresh(program)
    return {"id": program.id, **snapshot}


@router.get("/week")
def get_week(start: date, request: Request, db: Session = Depends(get_db)):
    user = current_user(request, db)
    monday = start - timedelta(days=start.weekday())
    programs = db.query(TrainingProgram).filter_by(user_id=user.id).order_by(TrainingProgram.id.desc()).all()
    latest = programs[0] if programs else None
    days = []
    for offset in range(7):
        target = monday + timedelta(days=offset)
        program = next((p for p in programs if p.start_date <= target), None)
        planned = next((d for d in program.snapshot["days"] if d["weekday"] == offset), None) if program else None
        days.append({"date": target.isoformat(), "plan": planned, "program_id": program.id if program else None})
    return {"start": monday.isoformat(), "profile": latest.snapshot["profile"] if latest else None,
            "notes": latest.snapshot["notes"] if latest else [], "days": days}
