"""Пинги не будят БД; сервер переживает временную недоступность базы.

Запуск: python -m unittest discover -s backend/tests -p test_idle_database.py
Все внешние обращения заменены моками; бот ничего не отправляет.
"""
import os
import sys
import unittest
from pathlib import Path
from unittest.mock import patch

os.environ['DATABASE_URL'] = 'sqlite://'
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from fastapi.testclient import TestClient
from fastapi import HTTPException
from sqlalchemy.exc import OperationalError
import database
import main


class IdleTests(unittest.TestCase):
    def test_postgres_driver_is_explicit(self):
        for scheme in ('postgres://', 'postgresql://'):
            self.assertEqual(database.normalize_database_url(scheme + 'host/db'), 'postgresql+psycopg2://host/db')
        self.assertEqual(database.normalize_database_url('sqlite://'), 'sqlite://')
        self.assertEqual(database.normalize_database_url('postgresql+psycopg://host/db'), 'postgresql+psycopg://host/db')

    def test_get_and_head_never_touch_database(self):
        with patch.object(database.engine, 'connect', side_effect=AssertionError('DB touched')), \
             patch('sqlalchemy.inspect', side_effect=AssertionError('Schema inspected')):
            client = TestClient(main.app)
            for method in ('GET', 'HEAD', 'GET', 'HEAD'):
                self.assertEqual(client.request(method, '/').status_code, 200)
            self.assertNotIn('telegram_id_type', client.get('/').json())

    def test_deferred_initialization_has_backoff_and_recovers(self):
        failure = OperationalError(None, None, Exception('quota'))
        with patch.object(database, '_initialized', False), \
             patch.object(database, '_retry_initialization_at', 0), \
             patch.object(database, 'init_db', side_effect=[failure, None]) as init, \
             patch.object(database.time, 'monotonic', return_value=1000) as clock:
            with self.assertRaises(OperationalError): database.ensure_initialized()
            with self.assertRaises(HTTPException) as caught: database.ensure_initialized()
            self.assertEqual(caught.exception.status_code, 503)
            self.assertEqual(init.call_count, 1)
            clock.return_value = 1900
            database.ensure_initialized()
            database.ensure_initialized()
            self.assertEqual(init.call_count, 2)


class AsyncIdleTests(unittest.IsolatedAsyncioTestCase):
    async def test_startup_survives_unavailable_database(self):
        with patch.object(main, 'ensure_initialized', side_effect=OperationalError(None, None, Exception('quota'))), \
             patch.dict(os.environ, {'TELEGRAM_BOT_TOKEN': ''}):
            await main.on_startup()

    async def test_database_failure_is_safe_503(self):
        result = await main.database_unavailable(None, OperationalError('secret SQL', None, Exception('secret password')))
        self.assertEqual(result.status_code, 503)
        self.assertNotIn(b'secret', result.body)


if __name__ == '__main__': unittest.main()
