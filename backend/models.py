"""
ORM-модели BodyImp.
Таблицы: users, food_entries, water_entries, weight_logs.
"""
from datetime import datetime, date

from sqlalchemy import (
    Column,
    Integer,
    String,
    Float,
    Boolean,
    Date,
    DateTime,
    ForeignKey,
)
from sqlalchemy.orm import relationship

from database import Base


class User(Base):
    """Профиль пользователя + рассчитанные дневные нормы КБЖУ."""

    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    telegram_id = Column(Integer, unique=True, index=True, nullable=False)
    username = Column(String, nullable=True)

    # Антропометрия и цели
    gender = Column(String, nullable=True)          # "male" | "female"
    age = Column(Integer, nullable=True)
    height_cm = Column(Float, nullable=True)
    weight_kg = Column(Float, nullable=True)
    goal = Column(String, nullable=True)            # "lose" | "maintain" | "gain"
    activity_level = Column(String, nullable=True)  # sedentary..very_active

    # Рассчитанные нормы
    daily_calories = Column(Integer, nullable=True)
    daily_protein_g = Column(Integer, nullable=True)
    daily_fat_g = Column(Integer, nullable=True)
    daily_carbs_g = Column(Integer, nullable=True)

    # Норма воды: рассчитывается автоматически, но пользователь может задать вручную.
    daily_water_ml = Column(Integer, default=2000)
    water_goal_custom = Column(Boolean, default=False)

    created_at = Column(DateTime, default=datetime.utcnow)

    # Связи (каскадное удаление записей при удалении пользователя)
    food_entries = relationship(
        "FoodEntry", back_populates="user", cascade="all, delete-orphan"
    )
    water_entries = relationship(
        "WaterEntry", back_populates="user", cascade="all, delete-orphan"
    )
    activity_entries = relationship(
        "ActivityEntry", back_populates="user", cascade="all, delete-orphan"
    )
    weight_logs = relationship(
        "WeightLog", back_populates="user", cascade="all, delete-orphan"
    )
    favorite_foods = relationship(
        "FavoriteFood", back_populates="user", cascade="all, delete-orphan"
    )


class FoodEntry(Base):
    """Запись о приёме пищи."""

    __tablename__ = "food_entries"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True, nullable=False)
    date = Column(Date, default=date.today, index=True)
    meal_type = Column(String, nullable=False)  # breakfast|lunch|dinner|snack
    name = Column(String, nullable=False)
    calories = Column(Float, default=0)
    protein_g = Column(Float, default=0)
    fat_g = Column(Float, default=0)
    carbs_g = Column(Float, default=0)
    source = Column(String, default="manual")    # manual|photo|scan
    # Режим ввода: True — КБЖУ заданы на 100 г, False — на порцию.
    base_per_100g = Column(Integer, default=0)
    # Сколько грамм было указано (если режим "на 100 г").
    portion_size_g = Column(Float, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="food_entries")


class WaterEntry(Base):
    """Запись о выпитой воде."""

    __tablename__ = "water_entries"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True, nullable=False)
    date = Column(Date, default=date.today, index=True)
    amount_ml = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="water_entries")


class ActivityEntry(Base):
    """Запись о тренировке/активности за день."""

    __tablename__ = "activity_entries"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True, nullable=False)
    date = Column(Date, default=date.today, index=True)
    activity_type = Column(String, nullable=False)  # walking|running|cycling|swimming|strength
    duration_min = Column(Integer, default=0)
    calories_burned = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="activity_entries")


class FavoriteFood(Base):
    """Избранный продукт пользователя для быстрого добавления."""

    __tablename__ = "favorite_foods"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True, nullable=False)
    name = Column(String, nullable=False)
    calories = Column(Float, nullable=False)        # базовые значения (на 100 г или на 1 шт)
    protein_g = Column(Float, default=0)
    fat_g = Column(Float, default=0)
    carbs_g = Column(Float, default=0)
    # Тип порции: "grams" (вводить граммы) или "piece" (вводить штуки)
    portion_type = Column(String, default="grams")
    # Базовый вес: для "grams" — основа в граммах (обычно 100),
    # для "piece" — средний вес одной штуки в граммах.
    base_weight_g = Column(Float, default=100)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="favorite_foods")


class AnalysisFeedback(Base):
    """
    Обратная связь по распознаванию еды: что предложил ИИ и что подтвердил/
    поправил пользователь. Копится как датасет для few-shot и будущего файнтюна.
    """

    __tablename__ = "analysis_feedback"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True, nullable=True)
    source = Column(String, nullable=False)        # photo | text | barcode
    input_text = Column(String, nullable=True)     # описание (для text), null для фото
    method = Column(String, nullable=True)         # rag:3/3|ensemble:... — диагностика
    # Что предложил ИИ:
    ai_name = Column(String, nullable=True)
    ai_calories = Column(Float, default=0)
    ai_protein_g = Column(Float, default=0)
    ai_fat_g = Column(Float, default=0)
    ai_carbs_g = Column(Float, default=0)
    # Что в итоге сохранил пользователь:
    final_name = Column(String, nullable=True)
    final_calories = Column(Float, default=0)
    final_protein_g = Column(Float, default=0)
    final_fat_g = Column(Float, default=0)
    final_carbs_g = Column(Float, default=0)
    edited = Column(Boolean, default=False)        # правил ли пользователь ответ ИИ
    created_at = Column(DateTime, default=datetime.utcnow)


class WeightLog(Base):
    """Лог веса для отслеживания динамики."""

    __tablename__ = "weight_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True, nullable=False)
    date = Column(Date, default=date.today, index=True)
    weight_kg = Column(Float, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="weight_logs")
