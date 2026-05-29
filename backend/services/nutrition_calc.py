"""
Расчёт дневных норм КБЖУ по формуле Миффлина-Сан Жеора.
"""

# Коэффициенты физической активности (множитель к BMR -> TDEE).
ACTIVITY_MULTIPLIERS = {
    "sedentary": 1.2,
    "light": 1.375,
    "moderate": 1.55,
    "active": 1.725,
    "very_active": 1.9,
}

# Корректировка калорий под цель.
GOAL_ADJUSTMENTS = {
    "lose": -500,
    "maintain": 0,
    "gain": 500,
}


def calculate_bmr(gender: str, weight_kg: float, height_cm: float, age: int) -> float:
    """Базовый обмен веществ (BMR), ккал/сут."""
    base = (10 * weight_kg) + (6.25 * height_cm) - (5 * age)
    if gender == "male":
        return base + 5
    # Для женщин и неуказанного пола используем женскую формулу.
    return base - 161


def calculate_targets(
    gender: str,
    weight_kg: float,
    height_cm: float,
    age: int,
    activity_level: str,
    goal: str,
) -> dict:
    """
    Возвращает дневные нормы: калории и макросы (Б/Ж/У в граммах).
    Распределение: белки 30%, жиры 30%, углеводы 40%.
    """
    bmr = calculate_bmr(gender, weight_kg, height_cm, age)
    multiplier = ACTIVITY_MULTIPLIERS.get(activity_level, 1.2)
    tdee = bmr * multiplier

    adjustment = GOAL_ADJUSTMENTS.get(goal, 0)
    calories = max(1200, tdee + adjustment)  # не опускаемся ниже безопасного минимума

    protein_g = round((calories * 0.30) / 4)
    fat_g = round((calories * 0.30) / 9)
    carbs_g = round((calories * 0.40) / 4)

    return {
        "daily_calories": round(calories),
        "daily_protein_g": protein_g,
        "daily_fat_g": fat_g,
        "daily_carbs_g": carbs_g,
    }


# Расход калорий по видам активности (ккал/мин для человека ~70 кг).
ACTIVITY_CALORIES = {
    "walking": 4.0,    # ходьба
    "running": 9.0,    # бег
    "cycling": 6.5,    # велосипед
    "swimming": 7.0,   # плавание
    "strength": 5.0,   # силовая
}


def calc_calories_burned(
    activity_type: str, duration_min: int, weight_kg: float
) -> int:
    """
    Считает сожжённые калории. Базовый расход масштабируется
    по весу пользователя относительно эталонных 70 кг.
    """
    base = ACTIVITY_CALORIES.get(activity_type, 5.0)
    factor = (weight_kg or 70.0) / 70.0
    return round(base * duration_min * factor)
