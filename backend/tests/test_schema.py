# -*- coding: utf-8 -*-
"""
Проверки схемы БД, которые нельзя поймать на SQLite.

История: telegram_id был объявлен как Integer. В SQLite целые 64-битные, и
локально всё работало, а в проде (Postgres) INTEGER — это 4 байта, максимум
2 147 483 647. Идентификаторы аккаунтов, зарегистрированных в Telegram
недавно, больше этого предела, поэтому регистрация падала с ошибкой 500.

Запуск:  python backend/tests/test_schema.py
"""
import os
import sys
from pathlib import Path

BACKEND = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND))
os.environ.setdefault("DATABASE_URL", "sqlite:///./test_schema.db")

from sqlalchemy import BigInteger  # noqa: E402
from sqlalchemy.dialects import postgresql  # noqa: E402

import models  # noqa: E402

# Реальные идентификаторы Telegram: старый аккаунт и современный.
OLD_ACCOUNT_ID = 279058397
MODERN_ACCOUNT_ID = 7864171996  # больше предела 32-битного INTEGER
INT32_MAX = 2_147_483_647

failures = []


def check(label: str, condition: bool, detail: str = "") -> None:
    print(f"[{'OK  ' if condition else 'FAIL'}] {label}{f' — {detail}' if detail else ''}")
    if not condition:
        failures.append(label)


def column_ddl(column) -> str:
    """Как эта колонка выглядит именно в Postgres."""
    return column.type.compile(dialect=postgresql.dialect()).upper()


print("=== Тип telegram_id ===")
telegram_id = models.User.__table__.c.telegram_id
check(
    "в модели объявлен BigInteger",
    isinstance(telegram_id.type, BigInteger),
    type(telegram_id.type).__name__,
)
check(
    "в Postgres создаётся как BIGINT",
    column_ddl(telegram_id) == "BIGINT",
    column_ddl(telegram_id),
)
check(
    "современный идентификатор превышает предел INTEGER",
    MODERN_ACCOUNT_ID > INT32_MAX,
    f"{MODERN_ACCOUNT_ID} > {INT32_MAX}",
)

print("=== Запись и чтение пользователя ===")
from database import Base, SessionLocal, engine  # noqa: E402

Base.metadata.drop_all(bind=engine)
Base.metadata.create_all(bind=engine)

db = SessionLocal()
try:
    for label, tid in (("старый аккаунт", OLD_ACCOUNT_ID), ("современный аккаунт", MODERN_ACCOUNT_ID)):
        db.add(models.User(telegram_id=tid, username=f"u{tid}"))
        db.commit()
        stored = db.query(models.User).filter(models.User.telegram_id == tid).first()
        check(f"{label} сохранён без потерь", stored is not None and stored.telegram_id == tid,
              str(stored.telegram_id) if stored else "не найден")
finally:
    db.close()
    Base.metadata.drop_all(bind=engine)

engine.dispose()  # на Windows файл занят, пока живы соединения
db_file = BACKEND / "test_schema.db"
try:
    if db_file.exists():
        db_file.unlink()
except OSError:
    pass  # временный файл не помеха результату

print("\nИТОГ:", "ВСЁ ЗЕЛЕНОЕ" if not failures else f"ПРОВАЛЫ: {failures}")
sys.exit(0 if not failures else 1)
