"""
Роут анализа фото еды через OpenRouter vision-модели.
Возвращает {"success": True, "data": {...}} либо подробную ошибку.
"""
import logging

from fastapi import APIRouter, HTTPException

import schemas
from services.ai_errors import AnalysisError
from services.nutrition_ai import analyze_photo_v2, analyze_text_v2

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/analyze", tags=["analyze"])


@router.post("/photo")
async def analyze_photo(payload: schemas.PhotoAnalyzeRequest):
    """
    Принимает base64 изображения, возвращает распознанные КБЖУ.
    Формат ответа:
      - успех:      {"success": True, "data": {...}}
      - нет еды:    {"success": False, "error": "no_food", "message": "..."}
      - ошибка:     HTTP 4xx/5xx с detail.
    """
    try:
        logger.debug(f"Received photo, base64 length: {len(payload.image_base64)}")

        if not payload.image_base64:
            raise HTTPException(400, "Фото не получено")

        # Слишком маленькое = пустое/повреждённое.
        if len(payload.image_base64) < 1000:
            raise HTTPException(400, "Фото слишком маленькое или повреждённое")

        result = await analyze_photo_v2(
            payload.image_base64, payload.mime_type or "image/jpeg"
        )

        if "error" in result:
            return {"success": False, "error": "no_food", "message": "На фото не обнаружена еда"}

        return {"success": True, "data": result}

    except AnalysisError as e:
        raise HTTPException(e.status, e.message, headers={"Retry-After": str(e.retry_after)} if e.retry_after else None)
    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"Config error: {e}")
        raise HTTPException(502, "Не удалось обработать ответ ИИ. Попробуй ещё раз.")
    except Exception as e:  # noqa: BLE001
        logger.error(f"Analysis failed: {type(e).__name__}: {e}")
        raise HTTPException(502, "Сервис анализа временно недоступен. Попробуй позже.")


@router.post("/text")
async def analyze_text(payload: schemas.TextAnalyzeRequest):
    """
    Принимает текстовое описание еды («2 яйца и тост с маслом»),
    возвращает оценку КБЖУ в том же формате, что и анализ фото:
      - успех:   {"success": True, "data": {...}}
      - не еда:  {"success": False, "error": "no_food", "message": "..."}
    """
    try:
        description = (payload.description or "").strip()
        logger.debug(f"Received text description, length: {len(description)}")

        if len(description) < 3:
            raise HTTPException(400, "Опиши, что ты съел — хотя бы пару слов")
        if len(description) > 1000:
            raise HTTPException(400, "Слишком длинное описание (максимум 1000 символов)")

        result = await analyze_text_v2(description)

        if "error" in result:
            return {
                "success": False,
                "error": "no_food",
                "message": "Не удалось распознать еду в описании",
            }
        return {"success": True, "data": result}

    except AnalysisError as e:
        raise HTTPException(e.status, e.message, headers={"Retry-After": str(e.retry_after)} if e.retry_after else None)
    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"Config error: {e}")
        raise HTTPException(502, "Не удалось обработать ответ ИИ. Попробуй ещё раз.")
    except Exception as e:  # noqa: BLE001
        logger.error(f"Text analysis failed: {type(e).__name__}: {e}")
        raise HTTPException(502, "Сервис анализа временно недоступен. Попробуй позже.")
