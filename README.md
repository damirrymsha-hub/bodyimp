# BodyImp

**BodyImp** — Telegram Mini App (TWA) для трекинга питания и калорий. Минималистичный
дизайн в стиле health-приложения: светлая тема, крупные числа, карточки с округлёнными
углами, недельный календарь вверху.

## Возможности

- Онбординг из 5 шагов с расчётом дневной нормы КБЖУ (формула Миффлина-Сан Жеора).
- Главный экран: кольцо прогресса калорий, макросы (Б/Ж/У), вода, шаги, список еды.
- Добавление еды тремя способами:
  - вручную (название + КБЖУ);
  - по фото — анализ через OpenRouter vision-модель;
  - быстрый поиск по списку популярных блюд.
- Учёт воды и веса, экран прогресса с графиком калорий за неделю.
- Telegram-бот: `/start` (кнопка запуска приложения) и `/today` (сводка дня).
- Оффлайн-режим: неотправленные записи сохраняются в localStorage и досылаются позже.
- Верификация Telegram `initData` через HMAC-SHA256.

## Стек

**Frontend:** React + Vite (TypeScript), Tailwind CSS, Zustand, Axios, Zod,
Framer Motion, Lucide React, Recharts, `@twa-dev/sdk`.

**Backend:** Python + FastAPI, SQLAlchemy + SQLite, httpx (OpenRouter),
python-telegram-bot.

## Структура

```
bodyimp/
├── backend/          # FastAPI: API, БД, бот, расчёты, интеграция с OpenRouter
│   ├── main.py
│   ├── database.py / models.py / schemas.py
│   ├── bot.py
│   ├── routes/       # user, food, analyze, water, stats, goals
│   └── services/     # nutrition_calc, openrouter_service, telegram_auth
└── frontend/         # React + Vite Mini App
    └── src/
        ├── pages/        # Onboarding, Home, AddFood, ScanFood, Profile, Progress
        ├── components/   # CalendarStrip, MacroCard, WaterCard, StepsCard, FoodItem, NutritionRing
        ├── api/client.ts
        ├── store/        # userStore, uiStore (Zustand)
        └── lib/          # telegram, offlineQueue
```

## Запуск

### Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

API стартует на `http://localhost:8000` (Swagger — `/docs`). При старте автоматически
создаётся БД `bodyimp.db` и в фоне запускается Telegram-бот (если задан токен).

> Требуется Python 3.11+. На Python 3.14 версии в `requirements.txt` указаны как `>=`,
> чтобы подтянулись колёса (wheels) с поддержкой новой версии.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Dev-сервер: `http://localhost:5173`. Сборка для деплоя — `npm run build` (артефакты в `dist/`).

## Конфигурация

`backend/.env`:

```
OPENROUTER_API_KEY=sk-or-...
TELEGRAM_BOT_TOKEN=...
DATABASE_URL=sqlite:///./bodyimp.db
FRONTEND_URL=https://your-frontend.vercel.app
APP_NAME=BodyImp
ENV=dev   # production → CORS только для FRONTEND_URL
```

`frontend/.env`:

```
VITE_API_URL=http://localhost:8000
VITE_APP_NAME=BodyImp
```

## Деплой

- **Backend:** Railway / Render / VPS. Команда запуска: `uvicorn main:app --host 0.0.0.0 --port $PORT`.
  Установите `ENV=production` и реальный `FRONTEND_URL`.
- **Frontend:** `npm run build` → Vercel / Netlify / GitHub Pages. Используется `HashRouter`,
  поэтому маршрутизация работает на статическом хостинге без доп. настроек.
- В **BotFather** укажите URL Mini App = задеплоенный фронтенд; он же идёт в `FRONTEND_URL`
  для кнопки `/start`.

## Расчёт норм (Миффлин-Сан Жеор)

- BMR (муж.): `10·вес + 6.25·рост − 5·возраст + 5`; (жен.): `… − 161`.
- TDEE = BMR × коэффициент активности (1.2 … 1.9).
- Калории: похудеть `TDEE−500`, поддерживать `TDEE`, набор `TDEE+500`.
- Макросы: белки 30%, жиры 30%, углеводы 40% от калорийности.

## API (основное)

| Метод | Путь | Назначение |
|-------|------|-----------|
| POST | `/api/users/register` | Регистрация + расчёт норм |
| GET/PUT | `/api/users/{telegram_id}` | Профиль / обновление |
| POST | `/api/food/add` | Добавить приём пищи |
| GET | `/api/food/today/{user_id}` | Питание за сегодня |
| GET | `/api/food/history/{user_id}?date=` | Питание за дату |
| DELETE | `/api/food/{entry_id}` | Удалить запись |
| POST | `/api/analyze/photo` | Анализ фото еды (OpenRouter) |
| POST/GET | `/api/water/...` | Вода |
| GET | `/api/stats/weekly/{user_id}` | Калории за 7 дней |
| POST/GET | `/api/weight/...` | Лог и история веса |
| POST | `/api/auth/verify` | Проверка Telegram initData |
