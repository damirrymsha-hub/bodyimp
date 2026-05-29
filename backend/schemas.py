"""
Pydantic-схемы запросов и ответов API.
"""
# Импортируем date под алиасом: иначе поле с именем `date` затеняет тип
# в пространстве имён модели, и pydantic ломает валидацию.
from datetime import date as date_type, datetime
from typing import Optional, List

from pydantic import BaseModel, Field


# ---------- Пользователь ----------
class UserRegister(BaseModel):
    telegram_id: int
    username: Optional[str] = None
    gender: Optional[str] = None
    age: Optional[int] = None
    height_cm: Optional[float] = None
    weight_kg: Optional[float] = None
    goal: Optional[str] = None
    activity_level: Optional[str] = None


class UserUpdate(BaseModel):
    username: Optional[str] = None
    gender: Optional[str] = None
    age: Optional[int] = None
    height_cm: Optional[float] = None
    weight_kg: Optional[float] = None
    goal: Optional[str] = None
    activity_level: Optional[str] = None


class UserOut(BaseModel):
    id: int
    telegram_id: int
    username: Optional[str]
    gender: Optional[str]
    age: Optional[int]
    height_cm: Optional[float]
    weight_kg: Optional[float]
    goal: Optional[str]
    activity_level: Optional[str]
    daily_calories: Optional[int]
    daily_protein_g: Optional[int]
    daily_fat_g: Optional[int]
    daily_carbs_g: Optional[int]
    created_at: datetime

    class Config:
        from_attributes = True


# ---------- Питание ----------
class FoodAdd(BaseModel):
    user_id: int
    meal_type: str = Field(default="snack")
    name: str
    calories: float = 0
    protein_g: float = 0
    fat_g: float = 0
    carbs_g: float = 0
    source: str = "manual"
    date: Optional[date_type] = None
    base_per_100g: bool = False
    portion_size_g: Optional[float] = None


class FoodUpdate(BaseModel):
    """Частичное обновление записи питания (режим редактирования)."""
    meal_type: Optional[str] = None
    name: Optional[str] = None
    calories: Optional[float] = None
    protein_g: Optional[float] = None
    fat_g: Optional[float] = None
    carbs_g: Optional[float] = None
    base_per_100g: Optional[bool] = None
    portion_size_g: Optional[float] = None


class FoodOut(BaseModel):
    id: int
    user_id: int
    date: date_type
    meal_type: str
    name: str
    calories: float
    protein_g: float
    fat_g: float
    carbs_g: float
    source: str
    base_per_100g: Optional[bool] = False
    portion_size_g: Optional[float] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ---------- Анализ фото ----------
class PhotoAnalyzeRequest(BaseModel):
    image_base64: str
    mime_type: str = "image/jpeg"


# ---------- Вода ----------
class WaterAdd(BaseModel):
    user_id: int
    amount_ml: int
    date: Optional[date_type] = None


class WaterOut(BaseModel):
    total_ml: int
    date: date_type


# ---------- Вес ----------
class WeightLogIn(BaseModel):
    user_id: int
    weight_kg: float
    date: Optional[date_type] = None


class WeightOut(BaseModel):
    id: int
    date: date_type
    weight_kg: float

    class Config:
        from_attributes = True


# ---------- Активность ----------
class ActivityAdd(BaseModel):
    user_id: int
    activity_type: str
    duration_min: int
    date: Optional[date_type] = None


class ActivityOut(BaseModel):
    id: int
    user_id: int
    date: date_type
    activity_type: str
    duration_min: int
    calories_burned: int
    created_at: datetime

    class Config:
        from_attributes = True


# ---------- Статистика ----------
class DailyCalories(BaseModel):
    date: date_type
    calories: float


class WeeklyStats(BaseModel):
    days: List[DailyCalories]
    avg_calories: float
