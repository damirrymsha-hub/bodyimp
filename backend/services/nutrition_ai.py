# -*- coding: utf-8 -*-
"""
Пайплайн анализа еды v2 («курс на точность»):
  1. ИИ (few-shot) распознаёт СОСТАВ и ГРАММЫ, а не итоговые калории.
  2. Ансамбль: две модели параллельно, выбираем результат с бОльшей долей
     совпадений со справочником КБЖУ.
  3. Цифры считает food_resolver из проверенной базы (RAG), фолбэк — оценки
     модели на 100 г, пропущенные через проверку Этуотера.
Формат ответа совместим со старым (name/portion_g/calories/.../items).
"""
import asyncio
import json
import logging
import os
import re

import httpx

from services.openrouter_service import (
    OPENROUTER_API_KEY,
    OPENROUTER_BASE_URL,
    VISION_MODELS,
    _loads_salvage,
    compress_image_base64,
)
from services.food_resolver import resolve_items

logger = logging.getLogger(__name__)

# Ансамбль можно выключить переменной окружения AI_ENSEMBLE=0 (напр., для evals).
ENSEMBLE_ENABLED = os.getenv("AI_ENSEMBLE", "1") != "0"

# Few-shot примеры: показываем модели, КАК раскладывать еду на позиции и граммы.
# Значения kcal_100 и т.п. — реалистичные, чтобы фолбэк без базы тоже был точнее.
FEW_SHOT_EXAMPLES = """Examples:

User: 2 яйца и тост с маслом
Answer: {"dish":"Яйца с тостом и маслом","items":[{"name":"яйцо варёное","grams":110,"kcal_100":155,"protein_100":13,"fat_100":11,"carbs_100":1},{"name":"хлеб белый","grams":30,"kcal_100":265,"protein_100":7.6,"fat_100":3.2,"carbs_100":50},{"name":"масло сливочное","grams":10,"kcal_100":717,"protein_100":0.9,"fat_100":81,"carbs_100":0.1}],"confidence":"high"}

User: тарелка борща со сметаной и кусок чёрного хлеба
Answer: {"dish":"Борщ со сметаной и хлебом","items":[{"name":"борщ","grams":350,"kcal_100":45,"protein_100":2.5,"fat_100":1.5,"carbs_100":6},{"name":"сметана","grams":25,"kcal_100":190,"protein_100":2.5,"fat_100":18,"carbs_100":3.4},{"name":"хлеб чёрный","grams":35,"kcal_100":259,"protein_100":6.6,"fat_100":1.2,"carbs_100":54}],"confidence":"high"}

User: гречка с куриной грудкой, примерно 300 грамм
Answer: {"dish":"Гречка с куриной грудкой","items":[{"name":"гречка отварная","grams":180,"kcal_100":110,"protein_100":4,"fat_100":1.1,"carbs_100":21},{"name":"куриная грудка","grams":120,"kcal_100":165,"protein_100":31,"fat_100":3.6,"carbs_100":0}],"confidence":"medium"}

User: капучино и круассан
Answer: {"dish":"Капучино с круассаном","items":[{"name":"кофе с молоком","grams":250,"kcal_100":40,"protein_100":1.7,"fat_100":1.8,"carbs_100":4},{"name":"круассан","grams":60,"kcal_100":406,"protein_100":8,"fat_100":21,"carbs_100":46}],"confidence":"high"}

User: большая порция плова
Answer: {"dish":"Плов","items":[{"name":"плов","grams":400,"kcal_100":190,"protein_100":8,"fat_100":8,"carbs_100":22}],"confidence":"medium"}
"""

RECOGNIZE_SYSTEM_PROMPT = f"""You are a nutrition analyst. Decompose the food (described in text or shown in a photo) into individual items with realistic gram weights for a typical Russian diet.

Rules:
- item "name": Russian, nominative case, singular, generic product name (e.g. "борщ", "куриная грудка", "хлеб белый").
- "grams": realistic edible weight. If quantity given by user — respect it. Typical portions: суп тарелка 300-350г, гарнир 150-200г, мясо/рыба 100-150г, хлеб ломтик 30-35г, сметана ложка 25г, масло на тост 10г, стакан напитка 250мл≈250г.
- Also give your own per-100g estimate: kcal_100, protein_100, fat_100, carbs_100 (numbers).
- "confidence": high | medium | low.
- If there is NO food/drink: respond {{"error":"no_food"}}.
Respond ONLY with a JSON object, no markdown, no explanations.

{FEW_SHOT_EXAMPLES}"""


def _extract_json(content: str) -> dict:
    """Достаёт JSON из ответа модели (markdown-обёртки, лишний текст, обрывы)."""
    content = (content or "").strip()
    if "```" in content:
        for part in content.split("```"):
            part = part.strip()
            if part.startswith("json"):
                part = part[4:].strip()
            if part.startswith("{"):
                content = part
                break
    if not content.startswith("{"):
        m = re.search(r"\{.*\}", content, re.DOTALL)
        if not m:
            raise json.JSONDecodeError("no JSON found", content, 0)
        content = m.group(0)
    return _loads_salvage(content)


async def _recognize(model: str, user_content) -> dict:
    """Один запрос распознавания состава к конкретной модели."""
    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://bodyimp.app",
        "X-Title": "BodyImp",
    }
    payload = {
        "model": model,
        "max_tokens": 900,
        "temperature": 0.1,
        "messages": [
            {"role": "system", "content": RECOGNIZE_SYSTEM_PROMPT},
            {"role": "user", "content": user_content},
        ],
    }
    async with httpx.AsyncClient(timeout=50.0) as client:
        r = await client.post(
            f"{OPENROUTER_BASE_URL}/chat/completions", headers=headers, json=payload
        )
        r.raise_for_status()
        data = r.json()
    content = (data.get("choices") or [{}])[0].get("message", {}).get("content", "")
    if not content:
        raise ValueError("empty content")
    result = _extract_json(content)
    logger.info(f"[v2] {model} recognized: {json.dumps(result, ensure_ascii=False)[:300]}")
    return result


def _finalize(recognition: dict, model: str) -> dict | None:
    """Резолвит распознанные позиции через базу; None — если позиций нет."""
    items = recognition.get("items") or []
    if not isinstance(items, list) or not items:
        return None
    resolved = resolve_items(items)
    if resolved["items_total"] == 0:
        return None
    match_ratio = resolved["db_matched"] / resolved["items_total"]

    confidence = str(recognition.get("confidence", "medium"))
    if match_ratio >= 0.99 and confidence == "medium":
        confidence = "high"  # все позиции из проверенной базы

    return {
        "name": str(recognition.get("dish") or "Блюдо")[:120],
        "portion_g": resolved["portion_g"],
        "calories": resolved["calories"],
        "protein_g": resolved["protein_g"],
        "fat_g": resolved["fat_g"],
        "carbs_g": resolved["carbs_g"],
        "confidence": confidence,
        "items": [f"{i['name']} ({i['grams']} г)" for i in resolved["items"]],
        # Диагностика (фронтенд игнорирует лишние поля):
        "method": f"rag:{resolved['db_matched']}/{resolved['items_total']}",
        "model": model,
        "_match_ratio": match_ratio,
    }


async def analyze_v2(user_content) -> dict:
    """
    Общий вход: user_content — строка (текст) или список блоков (фото).
    Возвращает итоговый dict либо {"error": "no_food"}. Бросает Exception,
    если ни одна модель не дала пригодного ответа.
    """
    if not OPENROUTER_API_KEY:
        raise ValueError("OPENROUTER_API_KEY не задан в .env")

    candidates: list[dict] = []
    last_error: Exception | None = None

    # Ансамбль: две модели параллельно (сбои каждой — не фатальны).
    models = VISION_MODELS[:2] if ENSEMBLE_ENABLED else VISION_MODELS[:1]
    results = await asyncio.gather(
        *[_recognize(m, user_content) for m in models], return_exceptions=True
    )
    for model, res in zip(models, results):
        if isinstance(res, Exception):
            logger.warning(f"[v2] {model} failed: {res}")
            last_error = res
            continue
        if "error" in res:
            return {"error": "no_food"}
        final = _finalize(res, model)
        if final:
            candidates.append(final)

    # Резерв: третья модель, если обе не справились.
    if not candidates and len(VISION_MODELS) > 2:
        try:
            res = await _recognize(VISION_MODELS[2], user_content)
            if "error" in res:
                return {"error": "no_food"}
            final = _finalize(res, VISION_MODELS[2])
            if final:
                candidates.append(final)
        except Exception as e:  # noqa: BLE001
            last_error = e

    if not candidates:
        raise Exception(f"Все модели недоступны. Последняя ошибка: {last_error}")

    # Выбор: больше совпадений с базой → надёжнее цифры; при равенстве — первая.
    candidates.sort(key=lambda c: c["_match_ratio"], reverse=True)
    best = candidates[0]
    if len(candidates) == 2:
        a, b = candidates[0]["calories"], candidates[1]["calories"]
        agree = min(a, b) / max(a, b) if max(a, b) > 0 else 1
        best["method"] += f"|ensemble:{'agree' if agree >= 0.7 else 'disagree'}"
    best.pop("_match_ratio", None)
    return best


async def analyze_text_v2(description: str) -> dict:
    """Анализ текстового описания через пайплайн v2."""
    return await analyze_v2(description.strip())


async def analyze_photo_v2(image_base64: str, mime_type: str = "image/jpeg") -> dict:
    """Анализ фото через пайплайн v2 (то же распознавание состава)."""
    image_base64 = compress_image_base64(image_base64, max_size_kb=400)
    content = [
        {
            "type": "image_url",
            "image_url": {"url": f"data:{mime_type};base64,{image_base64}"},
        },
        {"type": "text", "text": "Разложи еду на фото на позиции и граммы."},
    ]
    return await analyze_v2(content)
