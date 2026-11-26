"""Проверки анализа: реальные форматы HTTP, квоты, отмена и JPEG-нормализация."""
import asyncio
import base64
import io
import sys
import unittest
from pathlib import Path
from unittest.mock import AsyncMock, patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import httpx
from PIL import Image
from fastapi import FastAPI
from fastapi.testclient import TestClient
from services import nutrition_ai as ai
from services.ai_errors import AnalysisError
from services.openrouter_service import compress_image_base64
from routes.analyze import router

RECOGNITION = {"dish": "Яйца", "items": [{"name": "яйцо варёное", "grams": 100,
    "kcal_100": 155, "protein_100": 13, "fat_100": 11, "carbs_100": 1}], "confidence": "high"}


class AnalysisTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        ai._model_cooldown.clear()
        ai._account_cooldown = None
        self.patches = [patch.object(ai, "OPENROUTER_API_KEY", "test"),
                        patch.object(ai, "VISION_MODELS", ["first", "second"]),
                        patch.object(ai, "ENSEMBLE_ENABLED", False)]
        for p in self.patches:
            p.start()
            self.addCleanup(p.stop)

    def http(self, responses):
        calls = []
        def handler(request):
            calls.append(request)
            return responses.pop(0)
        client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
        return patch.object(ai.httpx, "AsyncClient", return_value=client), calls

    async def test_success_uses_database_and_one_request(self):
        import json
        mock, calls = self.http([httpx.Response(200, json={"choices": [{"message": {"content": json.dumps(RECOGNITION)}}]})])
        with mock:
            result = await ai.analyze_text_v2("2 варёных яйца 100 г")
        self.assertEqual(len(calls), 1)
        self.assertEqual(result["portion_g"], 100)
        self.assertTrue(result["method"].startswith("rag:"))
        self.assertGreater(result["calories"], 100)

    async def test_auth_fails_without_second_model(self):
        mock, calls = self.http([httpx.Response(401, json={"error": {"message": "User not found"}})])
        with mock, self.assertRaises(AnalysisError) as caught:
            await ai.analyze_text_v2("яйца")
        self.assertTrue(caught.exception.terminal)
        self.assertEqual(len(calls), 1)

    async def test_daily_quota_is_not_retried(self):
        mock, calls = self.http([httpx.Response(429, headers={"Retry-After": "90"}, json={"error": {"message": "Rate limit exceeded: free-models-per-day"}})])
        with mock:
            for _ in range(2):
                with self.assertRaises(AnalysisError) as caught:
                    await ai.analyze_text_v2("яйца")
                self.assertEqual(caught.exception.status, 429)
        self.assertEqual(len(calls), 1)

    async def test_missing_model_falls_back_once(self):
        recognize = AsyncMock(side_effect=[AnalysisError("unavailable"), RECOGNITION])
        with patch.object(ai, "_recognize", recognize):
            result = await ai.analyze_text_v2("яйца")
        self.assertEqual(recognize.await_count, 2)
        self.assertEqual(result["model"], "second")

    async def test_http_200_error_is_not_food(self):
        mock, _ = self.http([httpx.Response(200, json={"error": {"code": 402, "message": "budget"}})])
        with mock, self.assertRaises(AnalysisError) as caught:
            await ai.analyze_text_v2("яйца")
        self.assertTrue(caught.exception.terminal)

    async def test_timeout_cancels_request(self):
        cancelled = asyncio.Event()
        async def slow(*args):
            try:
                await asyncio.sleep(10)
            finally:
                cancelled.set()
        with patch.object(ai, "_recognize", slow), patch.object(ai, "ANALYSIS_TIMEOUT", .01):
            with self.assertRaises(AnalysisError) as caught:
                await ai.analyze_text_v2("яйца")
        self.assertEqual(caught.exception.status, 504)
        self.assertTrue(cancelled.is_set())

    async def test_no_food_does_not_override_valid_ensemble(self):
        with patch.object(ai, "ENSEMBLE_ENABLED", True), patch.object(ai, "_recognize", AsyncMock(side_effect=[{"error": "no_food"}, RECOGNITION])):
            self.assertIn("calories", await ai.analyze_text_v2("яйца"))

    async def test_photo_mime_matches_encoded_bytes(self):
        buf = io.BytesIO()
        Image.new("RGBA", (50, 50), (255, 0, 0, 128)).save(buf, "PNG")
        encoded = "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode()
        recognize = AsyncMock(return_value=RECOGNITION)
        with patch.object(ai, "_recognize", recognize):
            await ai.analyze_photo_v2(encoded, "image/png")
        url = recognize.call_args.args[1][0]["image_url"]["url"]
        self.assertTrue(url.startswith("data:image/jpeg;base64,"))
        self.assertEqual(Image.open(io.BytesIO(base64.b64decode(url.split(",")[1]))).format, "JPEG")

    async def test_invalid_photo_never_calls_provider(self):
        mock = AsyncMock()
        with patch.object(ai, "_recognize", mock), self.assertRaises(AnalysisError) as caught:
            await ai.analyze_photo_v2("broken" * 300)
        self.assertEqual(caught.exception.status, 400)
        mock.assert_not_called()


class RouteTests(unittest.TestCase):
    def test_both_routes_preserve_quota_and_do_not_restart_pipeline(self):
        app = FastAPI()
        app.include_router(router)
        client = TestClient(app)
        for route, func, payload in [("text", "analyze_text_v2", {"description": "варёные яйца"}),
                ("photo", "analyze_photo_v2", {"image_base64": "a" * 1200, "mime_type": "image/jpeg"})]:
            mock = AsyncMock(side_effect=AnalysisError("Лимит ИИ", 429, 90))
            with patch("routes.analyze." + func, mock):
                response = client.post("/api/analyze/" + route, json=payload)
            self.assertEqual(response.status_code, 429)
            self.assertEqual(response.headers["retry-after"], "90")
            self.assertEqual(response.json()["detail"], "Лимит ИИ")
            self.assertEqual(mock.await_count, 1)


if __name__ == "__main__":
    unittest.main()
