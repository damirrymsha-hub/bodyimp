"""
Конфигурация базы данных (SQLite + SQLAlchemy).
Здесь создаётся движок, фабрика сессий и базовый класс моделей.
"""
import os

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

load_dotenv()

# Строка подключения. По умолчанию — локальный файл SQLite.
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./bodyimp.db")

# Neon/Heroku выдают URL вида postgres://, а SQLAlchemy 2.x требует postgresql://
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# Для SQLite нужно отключить проверку потока (FastAPI работает в нескольких потоках).
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

# pool_pre_ping — для serverless-Postgres (Neon): соединения могут «протухать»
# после простоя, пинг перед использованием пересоздаёт их автоматически.
engine = create_engine(DATABASE_URL, connect_args=connect_args, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Базовый класс для всех ORM-моделей.
Base = declarative_base()


def get_db():
    """Зависимость FastAPI: выдаёт сессию БД и гарантированно закрывает её."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _ensure_columns():
    """
    Лёгкая миграция: добавляет недостающие колонки в существующие таблицы
    (create_all не умеет изменять уже созданные). Работает и для SQLite
    (PRAGMA + ALTER), и для Postgres (ADD COLUMN IF NOT EXISTS).
    """
    from sqlalchemy import text

    # Таблица -> {колонка: (sqlite DDL, postgres DDL)}.
    migrations = {
        "food_entries": {
            "base_per_100g": ("INTEGER DEFAULT 0", "INTEGER DEFAULT 0"),
            "portion_size_g": ("FLOAT", "DOUBLE PRECISION"),
        },
        "users": {
            "daily_water_ml": ("INTEGER DEFAULT 2000", "INTEGER DEFAULT 2000"),
            "water_goal_custom": ("INTEGER DEFAULT 0", "BOOLEAN DEFAULT FALSE"),
            "notifications_enabled": ("INTEGER DEFAULT 0", "BOOLEAN DEFAULT FALSE"),
            "last_water_notify": ("DATE", "DATE"),
            "last_evening_notify": ("DATE", "DATE"),
            "adaptive_tdee": ("INTEGER DEFAULT 0", "BOOLEAN DEFAULT FALSE"),
            "tdee_adjustment": ("INTEGER DEFAULT 0", "INTEGER DEFAULT 0"),
            "last_tdee_adjust": ("DATE", "DATE"),
        },
    }

    # Изменения типа уже существующих колонок (create_all их не трогает).
    # Только для Postgres: в SQLite тип колонки не фиксирован, а ALTER COLUMN
    # он и не поддерживает.
    type_migrations = [
        # Идентификаторы новых аккаунтов Telegram не помещаются в INTEGER.
        "ALTER TABLE users ALTER COLUMN telegram_id TYPE BIGINT",
    ]

    is_sqlite = DATABASE_URL.startswith("sqlite")
    with engine.begin() as conn:
        for table, columns in migrations.items():
            if is_sqlite:
                existing = {
                    row[1]
                    for row in conn.execute(text(f"PRAGMA table_info({table})"))
                }
                for col, (ddl, _) in columns.items():
                    if col not in existing:
                        conn.execute(
                            text(f"ALTER TABLE {table} ADD COLUMN {col} {ddl}")
                        )
            else:
                for col, (_, ddl) in columns.items():
                    conn.execute(
                        text(
                            f"ALTER TABLE {table} "
                            f"ADD COLUMN IF NOT EXISTS {col} {ddl}"
                        )
                    )

    if not is_sqlite:
        for statement in type_migrations:
            # Повторный запуск безопасен: смена типа на тот же — no-op.
            with engine.begin() as conn:
                conn.execute(text(statement))


def init_db():
    """Создаёт все таблицы при старте приложения (если их ещё нет)."""
    # Импорт моделей нужен, чтобы они зарегистрировались в Base.metadata.
    import models  # noqa: F401

    Base.metadata.create_all(bind=engine)
    # Досоздаём новые колонки в уже существующих таблицах.
    _ensure_columns()
