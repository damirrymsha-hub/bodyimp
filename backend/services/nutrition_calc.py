"""
Научный расчёт КБЖУ для BodyImp.

Использует:
- Формулу Миффлина-Сан Жеора (BMR) — наиболее точная для обычных людей
- Коэффициенты активности PAL (Physical Activity Level)
- Целевую корректировку с учётом ИМТ и скорости изменения веса
- Макросы по принципу protein-first с учётом цели

ВНИМАНИЕ: в конце файла сохранены функции расчёта сожжённых калорий
(ACTIVITY_CALORIES / calc_calories_burned) — их использует раздел «Активность».
"""

from dataclasses import dataclass
from typing import Literal

Goal = Literal["lose", "maintain", "gain"]
ActivityLevel = Literal["sedentary", "light", "moderate", "active", "very_active"]
Gender = Literal["male", "female"]


@dataclass
class NutritionResult:
    bmr: int                  # Базовый метаболизм
    tdee: int                 # Суточная потребность с активностью
    target_calories: int      # Целевые калории с учётом цели
    protein_g: int
    fat_g: int
    carbs_g: int
    water_ml: int             # Рекомендуемая норма воды
    bmi: float                # Индекс массы тела
    bmi_category: str         # Категория ИМТ
    calorie_adjustment: int   # На сколько ккал скорректировано от TDEE
    notes: list[str]          # Пояснения к расчёту


# Коэффициенты активности PAL
PAL_COEFFICIENTS = {
    "sedentary":   1.2,    # Сидячий: офис, мало ходьбы
    "light":       1.375,  # Лёгкий: 1-2 тренировки/нед
    "moderate":    1.55,   # Умеренный: 3-4 тренировки/нед
    "active":      1.725,  # Высокий: 5-6 тренировок/нед
    "very_active": 1.9,    # Очень высокий: физический труд или 2 тр/день
}


def calculate_bmi(weight_kg: float, height_cm: float) -> tuple[float, str]:
    """Рассчитать ИМТ и его категорию."""
    height_m = height_cm / 100
    bmi = round(weight_kg / (height_m ** 2), 1)

    if bmi < 18.5:
        category = "Дефицит веса"
    elif bmi < 25.0:
        category = "Норма"
    elif bmi < 30.0:
        category = "Избыточный вес"
    elif bmi < 35.0:
        category = "Ожирение I степени"
    elif bmi < 40.0:
        category = "Ожирение II степени"
    else:
        category = "Ожирение III степени"

    return bmi, category


def calculate_bmr(gender: Gender, weight_kg: float, height_cm: float, age: int) -> int:
    """
    Формула Миффлина-Сан Жеора (1990).
    Точнее формулы Харриса-Бенедикта на 5% для современных людей.
    """
    if gender == "male":
        bmr = (10 * weight_kg) + (6.25 * height_cm) - (5 * age) + 5
    else:
        bmr = (10 * weight_kg) + (6.25 * height_cm) - (5 * age) - 161
    return round(bmr)


def calculate_calorie_adjustment(
    goal: Goal,
    bmi: float,
    weight_kg: float,
    tdee: int,
) -> tuple[int, list[str]]:
    """
    Умная корректировка калорий в зависимости от цели и ИМТ.

    Принципы:
    - Дефицит не должен быть больше 25% от TDEE (иначе потеря мышц)
    - При ожирении можно делать бо́льший дефицит безопасно
    - При дефиците веса — набор должен быть умеренным
    - Минимум 1200 ккал для женщин и 1500 для мужчин
    """
    notes = []

    if goal == "maintain":
        return 0, ["Калории на уровне TDEE для поддержания веса"]

    if goal == "lose":
        if bmi < 18.5:
            adjustment = -200
            notes.append("⚠️ ИМТ ниже нормы. Рекомендуем проконсультироваться с врачом.")
            notes.append("Установлен минимальный дефицит 200 ккал.")
        elif bmi < 25.0:
            adjustment = -300
            notes.append("Умеренный дефицит 300 ккал/день ≈ −0.3 кг/нед.")
        elif bmi < 30.0:
            adjustment = -500
            notes.append("Дефицит 500 ккал/день ≈ −0.5 кг/нед.")
        elif bmi < 35.0:
            adjustment = -600
            notes.append("Дефицит 600 ккал/день ≈ −0.6 кг/нед.")
        else:
            adjustment = -750
            notes.append("Дефицит 750 ккал/день. Рекомендуется наблюдение врача.")

        # Проверить что дефицит не превышает 25% TDEE
        max_deficit = round(tdee * 0.25)
        if abs(adjustment) > max_deficit:
            adjustment = -max_deficit
            notes.append(
                f"Дефицит ограничен до 25% TDEE ({max_deficit} ккал) для сохранения мышц."
            )

        return adjustment, notes

    if goal == "gain":
        if bmi >= 30.0:
            adjustment = 0
            notes.append("⚠️ При ИМТ ≥ 30 набор массы не рекомендуется. Установлено поддержание.")
        elif bmi >= 25.0:
            adjustment = +200
            notes.append("Минимальный профицит 200 ккал/день для набора без лишнего жира.")
        elif weight_kg < 60:
            adjustment = +500
            notes.append("Профицит 500 ккал/день ≈ +0.4 кг/нед.")
        else:
            adjustment = +300
            notes.append("Профицит 300 ккал/день ≈ +0.25 кг/нед. Медленный чистый набор.")

        return adjustment, notes

    return 0, []


def calculate_macros(
    goal: Goal,
    target_calories: int,
    weight_kg: float,
    bmi: float,
) -> tuple[int, int, int]:
    """
    Расчёт макронутриентов по принципу protein-first.
    Источник: позиции ISSN (International Society of Sports Nutrition).
    """
    # --- БЕЛОК ---
    if goal == "lose":
        protein_per_kg = 2.0    # сохранение мышц при дефиците
    elif goal == "gain":
        protein_per_kg = 1.8    # рост мышц
    else:
        protein_per_kg = 1.6    # поддержание

    protein_g = round(weight_kg * protein_per_kg)

    # --- ЖИРЫ --- минимум для гормонального здоровья / 25% калорий
    fat_from_weight = round(weight_kg * 0.9)
    fat_from_calories = round(target_calories * 0.25 / 9)
    fat_g = max(fat_from_weight, fat_from_calories)

    # --- УГЛЕВОДЫ --- остаток калорий
    protein_calories = protein_g * 4
    fat_calories = fat_g * 9
    remaining_calories = target_calories - protein_calories - fat_calories
    carbs_g = max(0, round(remaining_calories / 4))

    # Если углеводов < 50 г — гарантируем минимум, ужимая белок.
    if carbs_g < 50:
        carbs_g = 50
        protein_calories = target_calories - (fat_g * 9) - (carbs_g * 4)
        protein_g = max(round(weight_kg * 1.2), round(protein_calories / 4))

    return protein_g, fat_g, carbs_g


def calculate_water(weight_kg: float, activity_level: ActivityLevel, goal: Goal) -> int:
    """
    Норма воды: 35 мл/кг базово + корректировка на активность и цель.
    Источник: European Food Safety Authority (EFSA) guidelines.
    """
    base_ml = round(weight_kg * 35)

    activity_bonus = {
        "sedentary":   0,
        "light":       200,
        "moderate":    400,
        "active":      600,
        "very_active": 800,
    }
    goal_bonus = {
        "lose":     200,
        "maintain": 0,
        "gain":     100,
    }

    total = base_ml + activity_bonus.get(activity_level, 0) + goal_bonus.get(goal, 0)
    total = round(total / 50) * 50  # округлить до 50 мл
    return max(1500, min(total, 4000))


def calculate_nutrition(
    gender: Gender,
    age: int,
    height_cm: float,
    weight_kg: float,
    activity_level: ActivityLevel,
    goal: Goal,
) -> NutritionResult:
    """
    Главная функция расчёта. Вызывается при регистрации и при каждом
    изменении профиля пользователя.
    """
    # 1. ИМТ
    bmi, bmi_category = calculate_bmi(weight_kg, height_cm)

    # 2. Базовый метаболизм (BMR)
    bmr = calculate_bmr(gender, weight_kg, height_cm, age)

    # 3. Суточная потребность (TDEE)
    pal = PAL_COEFFICIENTS.get(activity_level, 1.2)
    tdee = round(bmr * pal)

    # 4. Корректировка под цель
    adjustment, notes = calculate_calorie_adjustment(goal, bmi, weight_kg, tdee)
    target_calories = tdee + adjustment

    # 5. Минимальный порог безопасности
    min_calories = 1500 if gender == "male" else 1200
    if target_calories < min_calories:
        target_calories = min_calories
        notes.append(f"Калории не могут быть ниже {min_calories} ккал для безопасности.")

    # 6. Макросы
    protein_g, fat_g, carbs_g = calculate_macros(goal, target_calories, weight_kg, bmi)

    # 7. Вода
    water_ml = calculate_water(weight_kg, activity_level, goal)

    return NutritionResult(
        bmr=bmr,
        tdee=tdee,
        target_calories=target_calories,
        protein_g=protein_g,
        fat_g=fat_g,
        carbs_g=carbs_g,
        water_ml=water_ml,
        bmi=bmi,
        bmi_category=bmi_category,
        calorie_adjustment=adjustment,
        notes=notes,
    )


# ============================================================================
# Расход калорий по видам активности (используется разделом «Активность»).
# НЕ удалять — импортируется в routes/activity.py.
# ============================================================================
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
