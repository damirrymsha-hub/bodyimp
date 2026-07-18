# -*- coding: utf-8 -*-
"""
RAG-резолвер КБЖУ: сопоставляет распознанные ИИ продукты со справочником
(nutrition_reference + FOODS_DATABASE) и считает цифры из базы, а не из головы модели.
Плюс санити-проверка формулой Этуотера (ккал ≈ 4Б + 9Ж + 4У).
"""
import re
from difflib import SequenceMatcher

from data.nutrition_reference import REFERENCE_FOODS, PIECE_WEIGHTS
from data.foods_database import FOODS_DATABASE

# Порог принятия совпадения (эмпирически: ловит словоформы, не ловит чужие продукты).
MATCH_THRESHOLD = 0.74
# Допустимое отклонение калорий от формулы Этуотера до авто-коррекции.
ATWATER_TOLERANCE = 0.25


def _normalize(s: str) -> str:
    """Нижний регистр, ё→е, только буквы/цифры/пробелы, схлопнутые пробелы."""
    s = (s or "").lower().replace("ё", "е")
    s = re.sub(r"[^a-zа-я0-9 ]+", " ", s)
    return re.sub(r"\s+", " ", s).strip()


def _build_index():
    """Единый индекс: (нормализованный алиас) -> запись {name, kcal, protein, fat, carbs}."""
    index = []
    for f in REFERENCE_FOODS:
        entry = {
            "name": f["name"], "kcal": f["kcal"],
            "protein": f["protein"], "fat": f["fat"], "carbs": f["carbs"],
        }
        for alias in [f["name"], *f.get("aliases", [])]:
            index.append((_normalize(alias), entry))
    # Подключаем базу быстрого поиска (значения там тоже на 100 г).
    for f in FOODS_DATABASE:
        entry = {
            "name": f["name"], "kcal": f["calories_per_100g"],
            "protein": f["protein_per_100g"], "fat": f["fat_per_100g"],
            "carbs": f["carbs_per_100g"],
        }
        index.append((_normalize(f["name"]), entry))
    return index


_INDEX = _build_index()


def _similarity(query: str, alias: str) -> float:
    """Похожесть с бонусом за вхождение токенов (ловит «борща» ~ «борщ»)."""
    if not query or not alias:
        return 0.0
    if query == alias:
        return 1.0
    ratio = SequenceMatcher(None, query, alias).ratio()
    # Бонус: все токены алиаса встречаются как префиксы токенов запроса (падежи).
    q_tokens = query.split()
    a_tokens = alias.split()
    if a_tokens and all(
        any(qt.startswith(at[: max(3, len(at) - 2)]) for qt in q_tokens)
        for at in a_tokens
    ):
        ratio = max(ratio, 0.9 if len(a_tokens) > 1 else 0.85)
    return ratio


def match_food(name: str):
    """Ищет продукт в справочнике. Возвращает (запись, score) либо (None, score)."""
    q = _normalize(name)
    best, best_score = None, 0.0
    for alias, entry in _INDEX:
        s = _similarity(q, alias)
        if s > best_score:
            best, best_score = entry, s
    if best_score >= MATCH_THRESHOLD:
        return best, best_score
    return None, best_score


def atwater_check(kcal: float, protein: float, fat: float, carbs: float):
    """
    Санити-проверка: если ккал расходятся с формулой 4Б+9Ж+4У больше чем на
    ATWATER_TOLERANCE — возвращаем пересчитанное значение (и флаг коррекции).
    """
    formula = 4 * protein + 9 * fat + 4 * carbs
    if formula <= 0:
        return kcal, False
    if kcal <= 0 or abs(kcal - formula) / formula > ATWATER_TOLERANCE:
        return round(formula), True
    return kcal, False


def piece_weight_for(name: str) -> float | None:
    """Типичный вес 1 шт, если продукт «штучный» (для пересчёта штук в граммы)."""
    entry, _ = match_food(name)
    if entry and entry["name"] in PIECE_WEIGHTS:
        return PIECE_WEIGHTS[entry["name"]]
    return None


def resolve_items(items: list[dict]) -> dict:
    """
    Считает итоговые КБЖУ по списку распознанных позиций.
    Каждая позиция: {"name": str, "grams": float,
                     "kcal_100"?: float, "protein_100"?: float,
                     "fat_100"?: float, "carbs_100"?: float}
    Числа из базы приоритетнее оценок модели; оценки модели проходят Этуотера.
    """
    total = {"kcal": 0.0, "protein": 0.0, "fat": 0.0, "carbs": 0.0, "grams": 0.0}
    out_items, matched = [], 0

    for it in items:
        name = str(it.get("name", "")).strip()
        try:
            grams = float(it.get("grams") or 0)
        except (TypeError, ValueError):
            grams = 0.0
        if not name or grams <= 0:
            continue
        grams = min(grams, 2000)  # защита от абсурдных значений

        entry, score = match_food(name)
        if entry:
            k100, p100 = entry["kcal"], entry["protein"]
            f100, c100 = entry["fat"], entry["carbs"]
            src = "db"
            matched += 1
            display = entry["name"]
        else:
            # Фолбэк: оценки модели на 100 г + проверка Этуотера.
            def _f(key):
                try:
                    return max(0.0, float(it.get(key) or 0))
                except (TypeError, ValueError):
                    return 0.0
            k100, p100, f100, c100 = _f("kcal_100"), _f("protein_100"), _f("fat_100"), _f("carbs_100")
            k100, _ = atwater_check(k100, p100, f100, c100)
            src = "model"
            display = name

        factor = grams / 100.0
        total["kcal"] += k100 * factor
        total["protein"] += p100 * factor
        total["fat"] += f100 * factor
        total["carbs"] += c100 * factor
        total["grams"] += grams
        out_items.append({"name": display, "grams": round(grams), "source": src})

    # Финальная проверка Этуотера по сумме.
    kcal, corrected = atwater_check(
        total["kcal"], total["protein"], total["fat"], total["carbs"]
    )

    return {
        "calories": round(kcal),
        "protein_g": round(total["protein"], 1),
        "fat_g": round(total["fat"], 1),
        "carbs_g": round(total["carbs"], 1),
        "portion_g": round(total["grams"]),
        "items": out_items,
        "db_matched": matched,
        "items_total": len(out_items),
        "atwater_corrected": corrected,
    }
