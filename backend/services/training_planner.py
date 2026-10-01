"""Детерминированный стартовый план; точные настройки — продуктовые правила C.

Основание: training_acsm_2026, split_ramos_2024, rir_robinson_2024,
rest_singer_2024, activity_who_2020 из docs/EVIDENCE.md.
"""
from itertools import product
from typing import Literal
from pydantic import BaseModel, Field, ConfigDict, model_validator
from data.training_exercises import EXERCISES

VERSION = 1
WARMUP_S = 300
TRANSITION_S = 60
SET_S = 60
REST_COMPOUND_S = 120
REST_ISOLATION_S = 90
SETS = {"beginner": 2, "intermediate": 3, "advanced": 4}
SPLITS = {"full": ["squat", "push", "row", "curl_leg", "press", "calf"],
          "upper": ["push", "row", "press", "triceps"],
          "lower": ["squat", "curl_leg", "calf"]}
TITLES = {"full": "Всё тело", "upper": "Верх тела", "lower": "Низ тела"}


class TrainingProfile(BaseModel):
    model_config = ConfigDict(extra="forbid")
    goal: Literal["lose", "recomp", "gain", "health"] = "health"
    experience: Literal["beginner", "intermediate", "advanced"] = "beginner"
    location: Literal["home", "gym"] = "home"
    equipment: list[Literal["dumbbells", "bands", "sliders"]] = Field(default_factory=list, max_length=3)
    weekdays: list[int] = Field(min_length=1, max_length=6)
    session_minutes: Literal[30, 45, 60, 75] = 45
    cardio_enabled: bool = False
    cardio_weekdays: list[int] = Field(default_factory=list, max_length=7)
    excluded_exercises: list[str] = Field(default_factory=list, max_length=len(EXERCISES))

    @model_validator(mode="after")
    def validate_choices(self):
        for days in (self.weekdays, self.cardio_weekdays):
            if len(days) != len(set(days)) or any(d < 0 or d > 6 for d in days):
                raise ValueError("Выберите разные дни от понедельника до воскресенья")
        if self.cardio_enabled != bool(self.cardio_weekdays):
            raise ValueError("Для кардио нужны согласие и выбранные дни")
        if any(id not in EXERCISES for id in self.excluded_exercises):
            raise ValueError("Неизвестное упражнение")
        self.weekdays = sorted(self.weekdays)
        self.cardio_weekdays = sorted(self.cardio_weekdays)
        return self


def schedule(days):
    """Проверка кольцевой недели: соседние дни не нагружают одну группу."""
    adjacent = [(i, j) for i in range(len(days)) for j in range(i + 1, len(days))
                if min(abs(days[i] - days[j]), 7 - abs(days[i] - days[j])) < 2]
    if not adjacent:
        return ["full"] * len(days)
    # До шести дней граф соседства всегда допускает разделение верх/низ.
    candidates = [s for s in product(("upper", "lower"), repeat=len(days))
                  if all(s[i] != s[j] for i, j in adjacent)]
    return list(min(candidates, key=lambda s: (abs(s.count("upper") - s.count("lower")), s)))


def generate(profile: TrainingProfile):
    equipment = {"gym"} if profile.location == "gym" else set(profile.equipment)
    candidates = [e for e in EXERCISES.values()
                  if set(e["equipment"]).issubset(equipment) and e["id"] not in profile.excluded_exercises]
    notes, days = [], []
    missing = set()
    split = schedule(profile.weekdays)
    for index, (weekday, kind) in enumerate(zip(profile.weekdays, split)):
        # Кардио по согласию занимает время внутри заданной длительности занятия.
        cardio_min = (15 if profile.goal == "lose" else 10) if weekday in profile.cardio_weekdays else 0
        budget = (profile.session_minutes - cardio_min) * 60
        used = WARMUP_S
        slots = []
        for pattern in SPLITS[kind]:
            options = [e for e in candidates if e["pattern"] == pattern]
            if not options:
                missing.add(pattern)
                continue
            # Предпочитаем доступный инвентарь; вариант стабилен между перезагрузками.
            options.sort(key=lambda e: (-len(e["equipment"]), e["id"]))
            exercise = options[index % min(2, len(options))]
            if profile.experience == "beginner" and exercise["id"] == "pushup":
                exercise = next((e for e in options if e["id"] == "pushup_knees"), exercise)
            isolation = pattern in ("calf", "curl_leg", "triceps")
            rest = REST_ISOLATION_S if isolation else REST_COMPOUND_S
            sets = SETS[profile.experience]
            # Сначала небольшой объём на все доступные паттерны, потом расширение.
            sets = min(sets, 2)
            duration = TRANSITION_S + sets * SET_S + (sets - 1) * rest
            if used + duration > budget:
                notes.append("Для выбранной длительности часть упражнений не включена. Можно увеличить время занятия.")
                continue
            used += duration
            slots.append(dict(**exercise, sets=sets, rep_min=10 if isolation or profile.location == "home" else 6,
                              rep_max=20 if isolation or profile.location == "home" else 10,
                              rir_target=3 if profile.experience == "beginner" else 2, rest_s=rest))
        for slot in slots:
            while slot["sets"] < SETS[profile.experience] and used + SET_S + slot["rest_s"] <= budget:
                slot["sets"] += 1
                used += SET_S + slot["rest_s"]
        if not slots:
            notes.append("Для одного из дней не нашлось подходящих упражнений. Измените оборудование или исключения.")
        days.append(dict(weekday=weekday, title=TITLES[kind], kind=kind, exercises=slots,
                         estimated_minutes=(used + 59) // 60 + cardio_min,
                         cardio_minutes=cardio_min, warmup_minutes=5))
    for weekday in profile.cardio_weekdays:
        if weekday not in profile.weekdays:
            minutes = 25 if profile.goal == "lose" else 20
            days.append(dict(weekday=weekday, title="Кардио", kind="cardio", exercises=[],
                             estimated_minutes=minutes, cardio_minutes=minutes, warmup_minutes=0))
    if missing:
        notes.append("Для полного плана не хватает движений: " + ", ".join(sorted({EXERCISES[next(k for k, e in EXERCISES.items() if e['pattern'] == p)]["muscles"] for p in missing})) + ". Добавьте оборудование или пересмотрите исключения.")
    frequencies = {p: sum(any(e["pattern"] == p for e in d["exercises"]) for d in days)
                   for p in ("squat", "push", "row", "curl_leg")}
    if min(frequencies.values()) < 2:
        notes.append("Некоторые мышцы получают нагрузку реже двух раз в неделю. План использует только выбранные дни; для большей частоты добавьте день с перерывом.")
    return dict(version=VERSION, profile=profile.model_dump(), days=sorted(days, key=lambda d: d["weekday"]),
                notes=list(dict.fromkeys(notes)), status="limited" if notes else "ready",
                evidence_keys=["training_acsm_2026", "split_ramos_2024", "rir_robinson_2024", "rest_singer_2024"])
