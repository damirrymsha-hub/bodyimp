"""Планировщик: расписание, согласие, длительность и изоляция пользователей."""
import os
import sys
from pathlib import Path
os.environ["DATABASE_URL"] = "sqlite://"
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import unittest
from itertools import combinations, product
from datetime import date, timedelta
from fastapi import FastAPI, Request
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from database import Base, get_db
from models import User, TrainingProgram
from routes.training import router
from services.training_planner import TrainingProfile, generate


class PlannerTests(unittest.TestCase):
    def test_all_4536_base_scenarios(self):
        count = 0
        for n in range(1, 7):
            for days, equipment, goal, experience in product(combinations(range(7), n), ("gym", "body", "dumbbells"), ("lose", "recomp", "gain", "health"), ("beginner", "intermediate", "advanced")):
                p = TrainingProfile(weekdays=list(days), location="gym" if equipment == "gym" else "home", equipment=["dumbbells"] if equipment == "dumbbells" else [], goal=goal, experience=experience, session_minutes=30)
                plan = generate(p)
                self.assertEqual([d["weekday"] for d in plan["days"]], list(days))
                for d in plan["days"]:
                    self.assertLessEqual(d["estimated_minutes"], 30)
                    self.assertEqual(d["cardio_minutes"], 0)
                    self.assertTrue(d["exercises"])
                    for e in d["exercises"]:
                        self.assertTrue(set(e["equipment"]).issubset({"gym"} if equipment == "gym" else set(p.equipment)))
                        self.assertGreaterEqual(e["sets"], 2)
                for a, b in combinations(plan["days"], 2):
                    gap = abs(a["weekday"] - b["weekday"])
                    if min(gap, 7 - gap) < 2:
                        self.assertEqual({a["kind"], b["kind"]}, {"upper", "lower"})
                count += 1
        self.assertEqual(count, 4536)

    def test_cardio_consent_and_time_budget(self):
        with self.assertRaises(ValueError):
            TrainingProfile(weekdays=[0], cardio_weekdays=[1])
        with self.assertRaises(ValueError):
            TrainingProfile(weekdays=[0], cardio_enabled=True)
        for minutes in (30, 45, 60, 75):
            p = TrainingProfile(weekdays=[0, 2], cardio_enabled=True, cardio_weekdays=[0, 1], session_minutes=minutes, goal="lose")
            plan = generate(p)
            self.assertTrue(all(d["estimated_minutes"] <= minutes for d in plan["days"]))
            self.assertEqual([d["weekday"] for d in plan["days"] if d["cardio_minutes"]], [0, 1])

    def test_validation_exclusions_and_repeatability(self):
        for days in ([], [0, 0], [7], list(range(7))):
            with self.assertRaises(ValueError):
                TrainingProfile(weekdays=days)
        p = TrainingProfile(weekdays=[0, 6], excluded_exercises=["pushup", "pushup_knees"])
        result = generate(p)
        self.assertEqual(result, generate(p))
        self.assertEqual(result["status"], "limited")
        self.assertFalse(any(e["id"] in p.excluded_exercises for d in result["days"] for e in d["exercises"]))


class TrainingApiTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
        Base.metadata.create_all(self.engine)
        self.session = sessionmaker(bind=self.engine)
        with self.session() as db:
            db.add_all([User(telegram_id=1, age=25), User(telegram_id=2, age=30), User(telegram_id=3, age=17)])
            db.commit()
        app = FastAPI()
        @app.middleware("http")
        async def identity(request: Request, call_next):
            request.state.telegram_id = int(request.headers["test-user"]) if "test-user" in request.headers else None
            return await call_next(request)
        def test_db():
            with self.session() as db:
                yield db
        app.dependency_overrides[get_db] = test_db
        app.include_router(router)
        self.client = TestClient(app)

    def tearDown(self):
        self.client.close()
        self.engine.dispose()

    def test_ownership_versions_and_idempotent_retry(self):
        body = {"weekdays": [0, 2, 4], "start_date": date.today().isoformat()}
        url = "/api/training/program/generate"
        self.assertEqual(self.client.post(url, json=body).status_code, 401)
        headers = {"test-user": "1"}
        first = self.client.post(url, json=body, headers=headers)
        self.assertEqual(first.status_code, 200, first.text)
        self.assertEqual(self.client.post(url, json=body, headers=headers).json()["id"], first.json()["id"])
        week = "/api/training/week?start=" + date.today().isoformat()
        self.assertIsNone(self.client.get(week, headers={"test-user": "2"}).json()["profile"])
        self.assertEqual(self.client.get(week, headers=headers).json()["profile"]["weekdays"], [0, 2, 4])
        body["weekdays"] = [1, 3]
        self.assertNotEqual(self.client.post(url, json=body, headers=headers).json()["id"], first.json()["id"])
        with self.session() as db:
            self.assertEqual(db.query(TrainingProgram).count(), 2)
        self.assertEqual(self.client.post(url, json=body, headers={"test-user": "3"}).status_code, 422)
        body["start_date"] = (date.today() - timedelta(days=10)).isoformat()
        self.assertEqual(self.client.post(url, json=body, headers=headers).status_code, 422)


if __name__ == "__main__":
    unittest.main()
