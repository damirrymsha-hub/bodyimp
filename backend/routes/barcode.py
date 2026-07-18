# -*- coding: utf-8 -*-
"""
Поиск продукта по штрихкоду через Open Food Facts (бесплатно, без ключа).
Для магазинных упаковок это точнее любого ИИ: данные с этикетки.
"""
import logging
import re

import httpx
from fastapi import APIRouter, HTTPException

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/barcode", tags=["barcode"])

OFF_URL = "https://world.openfoodfacts.org/api/v2/product/{code}.json"
OFF_FIELDS = (
    "product_name,product_name_ru,brands,nutriments,serving_quantity,quantity"
)
# Open Food Facts просит указывать осмысленный User-Agent.
OFF_HEADERS = {"User-Agent": "BodyImp/1.0 (Telegram Mini App; bodyimp.vercel.app)"}

# Простенький кэш в памяти процесса: код -> ответ (упаковки не меняются часто).
_cache: dict[str, dict] = {}


@router.get("/{code}")
async def lookup_barcode(code: str):
    """
    Возвращает КБЖУ продукта на 100 г по штрихкоду (EAN-8/13, UPC).
      найден:     {"found": True, "name", "brand", "calories_per_100g", ...}
      не найден:  {"found": False}
    """
    code = re.sub(r"\D", "", code)
    if not (6 <= len(code) <= 14):
        raise HTTPException(400, "Некорректный штрихкод")

    if code in _cache:
        return _cache[code]

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            r = await client.get(
                OFF_URL.format(code=code),
                params={"fields": OFF_FIELDS},
                headers=OFF_HEADERS,
            )
    except Exception as e:  # noqa: BLE001
        logger.error(f"OFF request failed: {e}")
        raise HTTPException(502, "База штрихкодов недоступна, попробуй позже")

    if r.status_code == 404:
        result = {"found": False}
        _cache[code] = result
        return result
    if r.status_code != 200:
        raise HTTPException(502, f"База штрихкодов вернула {r.status_code}")

    data = r.json()
    product = data.get("product") or {}
    if data.get("status") != 1 or not product:
        result = {"found": False}
        _cache[code] = result
        return result

    n = product.get("nutriments") or {}

    def _num(*keys):
        for k in keys:
            v = n.get(k)
            if isinstance(v, (int, float)):
                return float(v)
        return None

    kcal = _num("energy-kcal_100g")
    if kcal is None:
        kj = _num("energy_100g", "energy-kj_100g")
        kcal = round(kj / 4.184, 1) if kj else None

    if kcal is None:
        # Продукт есть, но без данных о питании — честно говорим «не найден».
        result = {"found": False}
        _cache[code] = result
        return result

    serving = product.get("serving_quantity")
    try:
        serving_g = float(serving) if serving else None
    except (TypeError, ValueError):
        serving_g = None

    result = {
        "found": True,
        "code": code,
        "name": (
            product.get("product_name_ru")
            or product.get("product_name")
            or "Продукт"
        ).strip()[:120],
        "brand": (product.get("brands") or "").split(",")[0].strip()[:60] or None,
        "calories_per_100g": round(kcal, 1),
        "protein_per_100g": round(_num("proteins_100g") or 0, 1),
        "fat_per_100g": round(_num("fat_100g") or 0, 1),
        "carbs_per_100g": round(_num("carbohydrates_100g") or 0, 1),
        "serving_g": serving_g,
    }
    _cache[code] = result
    return result
