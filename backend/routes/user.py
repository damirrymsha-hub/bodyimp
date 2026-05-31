"""
Роуты пользователя: регистрация, получение и обновление профиля.
При наличии полных данных пересчитываются дневные нормы КБЖУ и воды.
Ответ дополняется вычисляемыми полями (BMR, TDEE, ИМТ, пояснения).
"""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
import models
import schemas
from services.nutrition_calc import calculate_nutrition, NutritionResult

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
    user.daily_calories = result.target_calories
    user.daily_protein_g = result.protein_g
    user.daily_fat_g = result.fat_g
    user.daily_carbs_g = result.carbs_g
    # Норму воды перезаписываем только если пользователь не менял её вручную.
    if not user.water_goal_custom:
        user.daily_water_ml = result.water_ml
    return result


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

    for field, value in payload.model_dump(exclude_unset=True).items():
        if field == "telegram_id":
            continue
        setattr(user, field, value)

    result = _apply_nutrition(user)
    db.commit()
    db.refresh(user)
    return _user_out(user, result)


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
    return _user_out(user, _compute(user))


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

    result = _apply_nutrition(user)
    db.commit()
    db.refresh(user)
    return _user_out(user, result)


@router.put("/{telegram_id}/water-goal", response_model=schemas.UserOut)
def update_water_goal(
    telegram_id: int,
    payload: schemas.WaterGoalUpdate,
    db: Session = Depends(get_db),
):
    """Ручная установка дневной нормы воды (500–5000 мл)."""
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
