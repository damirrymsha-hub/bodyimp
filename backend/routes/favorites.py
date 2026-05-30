"""
Роуты раздела «Избранное»: список, добавление, удаление продуктов пользователя.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import FavoriteFood
from schemas import FavoriteFoodCreate, FavoriteFoodOut

router = APIRouter(prefix="/api/favorites", tags=["favorites"])


@router.get("/{user_id}", response_model=list[FavoriteFoodOut])
async def get_favorites(user_id: int, db: Session = Depends(get_db)):
    """Все избранные продукты пользователя (новые сверху)."""
    return (
        db.query(FavoriteFood)
        .filter(FavoriteFood.user_id == user_id)
        .order_by(FavoriteFood.created_at.desc())
        .all()
    )


@router.post("/{user_id}", response_model=FavoriteFoodOut)
async def add_favorite(
    user_id: int, data: FavoriteFoodCreate, db: Session = Depends(get_db)
):
    """Добавляет продукт в избранное (без дублей по имени)."""
    exists = (
        db.query(FavoriteFood)
        .filter(FavoriteFood.user_id == user_id, FavoriteFood.name == data.name)
        .first()
    )
    if exists:
        raise HTTPException(400, "Уже в избранном")
    fav = FavoriteFood(user_id=user_id, **data.model_dump())
    db.add(fav)
    db.commit()
    db.refresh(fav)
    return fav


@router.delete("/{user_id}/{food_id}")
async def remove_favorite(
    user_id: int, food_id: int, db: Session = Depends(get_db)
):
    """Удаляет продукт из избранного."""
    fav = (
        db.query(FavoriteFood)
        .filter(FavoriteFood.id == food_id, FavoriteFood.user_id == user_id)
        .first()
    )
    if not fav:
        raise HTTPException(404, "Не найдено")
    db.delete(fav)
    db.commit()
    return {"success": True}
