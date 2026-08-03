"""
Роуты пользователя: регистрация, получение и обновление профиля.
При наличии полных данных пересчитываются дневные нормы КБЖУ и воды.
Ответ дополняется вычисляемыми полями (BMR, TDEE, ИМТ, пояснения).
"""
from datetime import date as date_cls, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import func
from sqlalchemy.orm import Session

from database import get_db
import models
import schemas
from services import authz
from services.nutrition_calc import (
    calculate_nutrition,
    estimate_tdee_from_logs,
    smooth_adjustment,
    NutritionResult,
)

router = APIRouter(prefix="/api/users", tags=["users"])


def _is_complete(user: models.User) -> bool:
    """Заполнены ли все поля, необходимые для расчёта норм."""
    required = [
        user.gender, user.weight_kg, user.height_cm,
        user.age, user.activity_level, user.goal,
    ]
    return all(v is not None for v in required)


def _compute(user: models.User) -> Optional[NutritionResult]:
    """Считает нормы по данным пользователя (без записи в БД)."""
    if not _is_complete(user):
        return None
    return calculate_nutrition(
        gender=user.gender,
        age=user.age,
        height_cm=user.height_cm,
        weight_kg=user.weight_kg,
        activity_level=user.activity_level,
        goal=user.goal,
    )


def _apply_nutrition(user: models.User) -> Optional[NutritionResult]:
    """Пересчитывает нормы и записывает их в пользователя."""
    result = _compute(user)
    if result is None:
        return None

    target = result.target_calories
    carbs = result.carbs_g
    # Адаптивная поправка: сдвигаем калории (излишек/дефицит уходит в углеводы).
    if user.adaptive_tdee and (user.tdee_adjustment or 0) != 0:
        adj = int(user.tdee_adjustment)
        min_cal = 1500 if user.gender == "male" else 1200
        target = max(min_cal, target + adj)
        carbs = max(50, round(carbs + adj / 4))

    user.daily_calories = target
    user.daily_protein_g = result.protein_g
    user.daily_fat_g = result.fat_g
    user.daily_carbs_g = carbs
    # Норму воды перезаписываем только если пользователь не менял её вручную.
    if not user.water_goal_custom:
        user.daily_water_ml = result.water_ml
    return result


def _maybe_adapt_tdee(user: models.User, db: Session) -> bool:
    """
    Раз в 7 дней оцениваем фактический TDEE по логам еды и веса
    и обновляем поправку нормы. Возвращает True, если поправка изменилась.
    """
    if not user.adaptive_tdee:
        return False
    today = date_cls.today()
    if user.last_tdee_adjust and (today - user.last_tdee_adjust).days < 7:
        return False

    # Замеры веса за последние 14 дней (нужно минимум два с интервалом ≥5 дней).
    since = today - timedelta(days=14)
    weights = (
        db.query(models.WeightLog)
        .filter(models.WeightLog.user_id == user.id, models.WeightLog.date >= since)
        .order_by(models.WeightLog.date.asc())
        .all()
    )
    if len(weights) < 2:
        return False
    w_start, w_end = weights[0], weights[-1]
    span = (w_end.date - w_start.date).days
    if span < 5:
        return False

    # Калории по дням за тот же период.
    rows = (
        db.query(
            models.FoodEntry.date,
            func.coalesce(func.sum(models.FoodEntry.calories), 0),
        )
        .filter(
            models.FoodEntry.user_id == user.id,
            models.FoodEntry.date >= w_start.date,
            models.FoodEntry.date <= w_end.date,
        )
        .group_by(models.FoodEntry.date)
        .all()
    )
    est = estimate_tdee_from_logs(
        [float(r[1]) for r in rows], w_start.weight_kg, w_end.weight_kg, span
    )
    user.last_tdee_adjust = today
    if est is None:
        return False

    # Формульный TDEE как базовая точка.
    base = _compute(user)
    if base is None:
        return False
    new_adj = smooth_adjustment(user.tdee_adjustment or 0, est - base.tdee)
    changed = new_adj != (user.tdee_adjustment or 0)
    user.tdee_adjustment = new_adj
    return changed


def _user_out(user: models.User, result: Optional[NutritionResult]) -> schemas.UserOut:
    """Собирает ответ: поля БД + вычисляемые поля (BMR/TDEE/ИМТ/пояснения)."""
    out = schemas.UserOut.model_validate(user)
    if result is not None:
        out.bmr = result.bmr
        out.tdee = result.tdee
        out.bmi = result.bmi
        out.bmi_category = result.bmi_category
        out.notes = result.notes
    return out


@router.post("/register", response_model=schemas.UserOut)
def register_user(
    payload: schemas.UserRegister, request: Request, db: Session = Depends(get_db)
):
    """Регистрирует пользователя по telegram_id (или обновляет существующего)."""
    authz.require_tid(request, payload.telegram_id)
    user = (
        db.query(models.User)
        .filter(models.User.telegram_id == payload.telegram_id)
        .first()
    )

    if user is None:
        user = models.User(telegram_id=payload.telegram_id)
        db.add(user)

    for field, value in payload.model_dump(exclude_unset=True).items():
        if field == "telegram_id":
            continue
        setattr(user, field, value)

    result = _apply_nutrition(user)
    db.commit()
    db.refresh(user)
    return _user_out(user, result)


@router.get("/{telegram_id}", response_model=schemas.UserOut)
def get_user(telegram_id: int, request: Request, db: Session = Depends(get_db)):
    """Возвращает профиль. Заодно раз в неделю обновляет адаптивную норму."""
    authz.require_tid(request, telegram_id)
    user = (
        db.query(models.User)
        .filter(models.User.telegram_id == telegram_id)
        .first()
    )
    if user is None:
        raise HTTPException(status_code=404, detail="Пользователь не найден")

    # Ленивый еженедельный пересчёт адаптивной поправки.
    if _maybe_adapt_tdee(user, db):
        _apply_nutrition(user)
    db.commit()
    db.refresh(user)
    return _user_out(user, _compute(user))


@router.put("/{telegram_id}", response_model=schemas.UserOut)
def update_user(
    telegram_id: int,
    payload: schemas.UserUpdate,
    request: Request,
    db: Session = Depends(get_db),
):
    """Обновляет данные пользователя и пересчитывает нормы."""
    authz.require_tid(request, telegram_id)
    user = (
        db.query(models.User)
        .filter(models.User.telegram_id == telegram_id)
        .first()
    )
    if user is None:
        raise HTTPException(status_code=404, detail="Пользователь не найден")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(user, field, value)

    result = _apply_nutrition(user)
    db.commit()
    db.refresh(user)
    return _user_out(user, result)


@router.put("/{telegram_id}/water-goal", response_model=schemas.UserOut)
def update_water_goal(
    telegram_id: int,
    payload: schemas.WaterGoalUpdate,
    request: Request,
    db: Session = Depends(get_db),
):
    """Ручная установка дневной нормы воды (500–5000 мл)."""
    authz.require_tid(request, telegram_id)
    if payload.ml < 500 or payload.ml > 5000:
        raise HTTPException(400, "Норма воды должна быть от 500 до 5000 мл")

    user = (
        db.query(models.User)
        .filter(models.User.telegram_id == telegram_id)
        .first()
    )
    if user is None:
        raise HTTPException(status_code=404, detail="Пользователь не найден")

    user.daily_water_ml = payload.ml
    user.water_goal_custom = True
    db.commit()
    db.refresh(user)
    return _user_out(user, _compute(user))
