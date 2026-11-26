"""
Интеграция с OpenRouter для анализа фото еды через vision-модели.
Особенности:
- автоматический перебор нескольких vision-моделей (fallback);
- сжатие изображения перед отправкой (Pillow), чтобы не упереться в лимиты;
- подробное логирование на каждом шаге для диагностики.
OpenRouter совместим с форматом OpenAI Chat Completions.
"""
import httpx
import json
import os
import base64
import logging
import re

from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"

# Список моделей настраивается переменной окружения AI_MODELS
# (id через запятую, порядок = приоритет; первые 1–2 — основные, дальше фолбэк).
# Пример платной конфигурации:
#   AI_MODELS=google/gemini-3.1-flash-lite,google/gemma-4-31b-it:free
# Бесплатный маршрутизатор сам выбирает доступную модель с нужными возможностями.
# Явный AI_MODELS сохраняется для управляемого переключения моделей.
_DEFAULT_MODELS = ["openrouter/free"]
_env_models = [m.strip() for m in os.getenv("AI_MODELS", "").split(",") if m.strip()]
VISION_MODELS = _env_models or _DEFAULT_MODELS

FOOD_SYSTEM_PROMPT = """You are a nutrition analyst. Analyze the food in the image and respond ONLY with a JSON object in this exact format, no markdown, no explanation:
{
  "name": "dish name in Russian",
  "portion_g": 300,
  "calories": 450,
  "protein_g": 25,
  "fat_g": 15,
  "carbs_g": 50,
  "confidence": "high",
  "items": ["ingredient 1", "ingredient 2"]
}
If there is no food in the image respond with: {"error": "no_food"}
Respond ONLY with the JSON object."""


def compress_image_base64(image_base64: str, max_size_kb: int = 500) -> str:
    """Сжать изображение, если оно слишком большое. При отсутствии Pillow — вернуть как есть."""
    try:
        from PIL import Image, ImageOps
        import io

        if image_base64.startswith("data:"):
            image_base64 = image_base64.split(",", 1)[1]
        if len(image_base64) > 16 * 1024 * 1024:
            raise ValueError("image too large")
        img_bytes = base64.b64decode(image_base64, validate=True)
        img = Image.open(io.BytesIO(img_bytes))

        if img.width * img.height > 25_000_000:
            raise ValueError("image dimensions too large")
        img = ImageOps.exif_transpose(img).convert("RGB")

        # Уменьшить разрешение, если больше 1024px по большей стороне.
        max_dim = 1024
        if max(img.size) > max_dim:
            ratio = max_dim / max(img.size)
            new_size = (int(img.size[0] * ratio), int(img.size[1] * ratio))
            img = img.resize(new_size, Image.LANCZOS)
            logger.debug(f"Resized image to {new_size}")

        # Сжимать, понижая качество, пока не уложимся в max_size_kb.
        quality = 85
        buf = io.BytesIO()
        while quality > 20:
            buf = io.BytesIO()
            img.save(buf, format="JPEG", quality=quality)
            size_kb = buf.tell() / 1024
            logger.debug(f"Image size at quality {quality}: {size_kb:.1f} KB")
            if size_kb <= max_size_kb:
                break
            quality -= 15

        buf.seek(0)
        return base64.b64encode(buf.read()).decode("utf-8")

    except Exception as exc:
        # Повреждённые байты не отправляем модели под ложным MIME.
        raise ValueError("invalid image") from exc


def _loads_salvage(content: str) -> dict:
    """
    Парсит JSON; если ответ обрезан (частая беда — незакрытый массив items),
    отрезает хвост до последней полной пары и достраивает закрывающие скобки.
    """
    try:
        return json.loads(content)
    except json.JSONDecodeError:
        s = content
        last_comma = s.rfind(",")
        if last_comma != -1:
            s = s[:last_comma]
        if s.count("[") > s.count("]"):
            s += "]"
        if s.count("{") > s.count("}"):
            s += "}"
        return json.loads(s)  # пусть пробросит ошибку, если не спаслось


async def analyze_food_photo(image_base64: str, mime_type: str = "image/jpeg") -> dict:
    """Совместимость со старым интерфейсом без повторных запросов к провайдеру."""
    from services.nutrition_ai import analyze_photo_v2
    return await analyze_photo_v2(image_base64, mime_type)


async def analyze_food_text(description: str) -> dict:
    """Все способы ввода используют единый ограниченный по времени пайплайн."""
    from services.nutrition_ai import analyze_text_v2
    return await analyze_text_v2(description)
