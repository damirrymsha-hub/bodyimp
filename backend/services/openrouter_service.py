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
# Без переменной — бесплатный набор по умолчанию (проверен по /api/v1/models).
# Порядок = приоритет; проверено каталогом /api/v1/models и живыми запросами.
# Замеры: minimax отвечает ~3 с чистым JSON; nemotron-3-nano-omni работает, но
# это reasoning-модель — ~35 с и 1400 токенов на разбор, поэтому она последняя.
# Обе Gemma сейчас отдают 429 (провайдер режет бесплатный поток), но остаются
# в списке: список перебирается по порядку, и они подхватятся при восстановлении.
# Модель nvidia/nemotron-nano-12b-v2-vl исчезла из каталога — удалена (давала 404).
_DEFAULT_MODELS = [
    "minimax/minimax-m3:free",            # основная: быстрая, стабильный JSON
    "google/gemma-4-31b-it:free",         # резерв
    "google/gemma-4-26b-a4b-it:free",     # резерв
    "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",  # крайний случай: медленная
]
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
        from PIL import Image
        import io

        img_bytes = base64.b64decode(image_base64)
        img = Image.open(io.BytesIO(img_bytes))

        # Конвертировать в RGB, если нужно (RGBA/палитра не сохраняются в JPEG).
        if img.mode in ("RGBA", "P"):
            img = img.convert("RGB")

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

    except ImportError:
        logger.warning("Pillow not installed, skipping compression")
        return image_base64
    except Exception as e:  # noqa: BLE001
        logger.error(f"Image compression error: {e}")
        return image_base64


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
    """
    Отправляет фото в OpenRouter (с перебором vision-моделей) и возвращает
    распознанные КБЖУ (dict). При отсутствии еды — {"error": "no_food"}.
    При недоступности всех моделей — выбрасывает Exception (обрабатывается в роуте).
    """
    if not OPENROUTER_API_KEY:
        logger.error("OPENROUTER_API_KEY not set!")
        raise ValueError("OPENROUTER_API_KEY не задан в .env")

    logger.debug(f"Starting food analysis, image size: {len(image_base64) / 1024:.1f} KB base64")

    # Сжать изображение перед отправкой.
    image_base64 = compress_image_base64(image_base64, max_size_kb=400)
    logger.debug(f"After compression: {len(image_base64) / 1024:.1f} KB base64")

    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://bodyimp.app",
        "X-Title": "BodyImp",
    }

    # Попробовать каждую модель по очереди.
    last_error = None
    for model in VISION_MODELS:
        logger.debug(f"Trying model: {model}")
        content = ""
        try:
            payload = {
                "model": model,
                # Кириллица в ответе «дорогая» по токенам — даём запас,
                # иначе JSON обрывается на полуслове (items) и не парсится.
                "max_tokens": 800,
                "temperature": 0.1,
                "messages": [
                    {"role": "system", "content": FOOD_SYSTEM_PROMPT},
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:{mime_type};base64,{image_base64}",
                                    "detail": "low",
                                },
                            },
                            {
                                "type": "text",
                                "text": "Analyze the food in this image and return JSON with nutrition info.",
                            },
                        ],
                    },
                ],
            }

            async with httpx.AsyncClient(timeout=45.0) as client:
                response = await client.post(
                    f"{OPENROUTER_BASE_URL}/chat/completions",
                    headers=headers,
                    json=payload,
                )

                logger.debug(f"Response status: {response.status_code}")
                logger.debug(f"Response body: {response.text[:500]}")

                if response.status_code == 429:
                    logger.warning(f"Rate limit on {model}, trying next...")
                    last_error = "rate_limit"
                    continue

                if response.status_code == 400:
                    err_body = response.json()
                    logger.error(f"Bad request for {model}: {err_body}")
                    # Если модель не поддерживает vision — пробуем следующую.
                    if "vision" in str(err_body).lower() or "image" in str(err_body).lower():
                        continue
                    last_error = err_body
                    continue

                response.raise_for_status()
                data = response.json()

                logger.debug(f"Full API response: {json.dumps(data, ensure_ascii=False)[:800]}")

                # Извлечь текст ответа.
                choices = data.get("choices", [])
                if not choices:
                    logger.error(f"No choices in response: {data}")
                    continue

                msg = choices[0].get("message", {})
                content = msg.get("content", "")

                if not content:
                    logger.error(f"Empty content in response: {msg}")
                    continue

                logger.debug(f"Raw content from {model}: {content}")

                # Очистить от markdown-обёрток.
                content = content.strip()
                if "```" in content:
                    parts = content.split("```")
                    for part in parts:
                        part = part.strip()
                        if part.startswith("json"):
                            part = part[4:].strip()
                        if part.startswith("{"):
                            content = part
                            break

                # Найти JSON в тексте, если модель добавила пояснения.
                if not content.startswith("{"):
                    json_match = re.search(r"\{.*\}", content, re.DOTALL)
                    if json_match:
                        content = json_match.group(0)
                    else:
                        logger.error(f"No JSON found in: {content}")
                        continue

                result = _loads_salvage(content)
                logger.info(f"Successfully parsed result from {model}: {result}")

                if "error" in result:
                    return result

                # Валидировать обязательные поля.
                required = ["name", "calories", "protein_g", "fat_g", "carbs_g"]
                if all(k in result for k in required):
                    return result
                logger.warning(f"Missing fields in result: {result}")
                continue

        except json.JSONDecodeError as e:
            logger.error(f"JSON parse error for {model}: {e}, content was: {content}")
            last_error = str(e)
            continue
        except httpx.TimeoutException:
            logger.error(f"Timeout for model {model}")
            last_error = "timeout"
            continue
        except Exception as e:  # noqa: BLE001
            logger.error(f"Error with model {model}: {type(e).__name__}: {e}")
            last_error = str(e)
            continue

    logger.error(f"All models failed. Last error: {last_error}")
    raise Exception(f"Все модели недоступны. Последняя ошибка: {last_error}")


FOOD_TEXT_SYSTEM_PROMPT = """You are a nutrition analyst. The user describes food they ate in natural language (usually Russian), possibly with quantities (e.g. "2 яйца и тост с маслом", "тарелка борща со сметаной").
Estimate the TOTAL nutrition for everything described and respond ONLY with a JSON object in this exact format, no markdown, no explanation:
{
  "name": "short summary of the food in Russian",
  "portion_g": 300,
  "calories": 450,
  "protein_g": 25,
  "fat_g": 15,
  "carbs_g": 50,
  "confidence": "high",
  "items": ["позиция 1", "позиция 2"]
}
Use realistic average values. If quantities are not specified, assume typical portions.
If the text does not describe any food or drink, respond with: {"error": "no_food"}
Respond ONLY with the JSON object."""


async def analyze_food_text(description: str) -> dict:
    """
    Оценивает КБЖУ по текстовому описанию еды (тот же формат ответа, что и фото).
    Перебирает те же бесплатные модели; при недоступности всех — Exception.
    """
    if not OPENROUTER_API_KEY:
        logger.error("OPENROUTER_API_KEY not set!")
        raise ValueError("OPENROUTER_API_KEY не задан в .env")

    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://bodyimp.app",
        "X-Title": "BodyImp",
    }

    last_error = None
    for model in VISION_MODELS:  # эти модели отлично работают и с чистым текстом
        logger.debug(f"Text analysis, trying model: {model}")
        content = ""
        try:
            payload = {
                "model": model,
                "max_tokens": 800,
                "temperature": 0.1,
                "messages": [
                    {"role": "system", "content": FOOD_TEXT_SYSTEM_PROMPT},
                    {"role": "user", "content": description.strip()},
                ],
            }

            async with httpx.AsyncClient(timeout=45.0) as client:
                response = await client.post(
                    f"{OPENROUTER_BASE_URL}/chat/completions",
                    headers=headers,
                    json=payload,
                )
                logger.debug(f"Text response status: {response.status_code}")

                if response.status_code == 429:
                    last_error = "rate_limit"
                    continue
                response.raise_for_status()
                data = response.json()

                choices = data.get("choices", [])
                if not choices:
                    continue
                content = choices[0].get("message", {}).get("content", "")
                if not content:
                    continue

                # Очистка от markdown и поиск JSON — та же логика, что для фото.
                content = content.strip()
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
                        continue
                    content = m.group(0)

                result = _loads_salvage(content)
                logger.info(f"Text analysis result from {model}: {result}")

                if "error" in result:
                    return result
                required = ["name", "calories", "protein_g", "fat_g", "carbs_g"]
                if all(k in result for k in required):
                    return result
                continue

        except json.JSONDecodeError as e:
            logger.error(f"Text JSON parse error for {model}: {e}")
            last_error = str(e)
            continue
        except httpx.TimeoutException:
            last_error = "timeout"
            continue
        except Exception as e:  # noqa: BLE001
            logger.error(f"Text analysis error with {model}: {type(e).__name__}: {e}")
            last_error = str(e)
            continue

    logger.error(f"All models failed for text analysis. Last error: {last_error}")
    raise Exception(f"Все модели недоступны. Последняя ошибка: {last_error}")
