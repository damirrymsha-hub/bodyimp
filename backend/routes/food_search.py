"""
Роуты поиска по встроенной базе продуктов (КБЖУ на 100 г).
"""
from fastapi import APIRouter, Query

from data.foods_database import FOODS_DATABASE

router = APIRouter(prefix="/api/food-search", tags=["food-search"])


@router.get("/")
async def search_foods(q: str = Query(default="", min_length=0)):
    """Поиск по названию/категории. Пустой запрос — первые 20 (популярные)."""
    q = q.strip().lower()
    if not q:
        return FOODS_DATABASE[:20]
    results = [
        f
        for f in FOODS_DATABASE
        if q in f["name"].lower() or q in f["category"].lower()
    ]
    return results[:30]


@router.get("/categories")
async def get_categories():
    """Список категорий в порядке появления (без дублей)."""
    return list(dict.fromkeys(f["category"] for f in FOODS_DATABASE))


@router.get("/category/{category}")
async def get_by_category(category: str):
    """Все продукты выбранной категории."""
    return [f for f in FOODS_DATABASE if f["category"] == category]
