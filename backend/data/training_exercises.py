"""Версионируемое ядро упражнений. Источники и границы переноса — docs/EVIDENCE.md."""

# Это конкретные варианты движений, а не сгенерированные нейросетью назначения.
PATTERNS = {
    "squat": ("Ноги", ["Держите стопы устойчиво", "Опускайтесь до комфортной глубины", "Колени направляйте по линии стоп"], "squat_kubo_2019"),
    "curl_leg": ("Задняя поверхность бедра", ["Двигайтесь плавно", "Не прогибайте поясницу", "Возвращайте ноги под контролем"], "hamstrings_maeo_2021"),
    "push": ("Грудь и трицепс", ["Сохраняйте устойчивую опору", "Не разводите локти строго в стороны", "Опускайте вес плавно, без рывка"], "pushup_kikuchi_2017"),
    "row": ("Спина и бицепс", ["Держите спину устойчиво", "Ведите локти назад без рывка", "Не поднимайте плечи к ушам"], "equipment_hernandez_2023"),
    "press": ("Плечи и трицепс", ["Не прогибайте поясницу", "Поднимайте руки без рывка", "Используйте комфортную амплитуду"], "equipment_hernandez_2023"),
    "calf": ("Икры", ["Поднимайтесь на носки плавно", "Не пружиньте внизу", "При необходимости держитесь за устойчивую опору"], "calf_kinoshita_2023"),
    "triceps": ("Трицепс", ["Сохраняйте локти устойчивыми", "Не двигайте всем корпусом", "Плавно сгибайте и разгибайте руки"], "triceps_maeo_2023"),
}

# Оборудование указано полностью: дома с гантелями не предполагается наличие скамьи.
ROWS = [
    ("squat_body", "Приседания без веса", "squat", [], "home"),
    ("squat_goblet", "Приседания с гантелью у груди", "squat", ["dumbbells"], "home"),
    ("squat_band", "Приседания с резинкой", "squat", ["bands"], "home"),
    ("squat_bar", "Приседания со штангой", "squat", ["gym"], "gym"),
    ("squat_smith", "Приседания в Смите", "squat", ["gym"], "gym"),
    ("leg_curl_seated", "Сгибание ног сидя", "curl_leg", ["gym"], "gym"),
    ("leg_curl_lying", "Сгибание ног лёжа в тренажёре", "curl_leg", ["gym"], "gym"),
    ("leg_curl_slide", "Скользящее сгибание ног", "curl_leg", ["sliders"], "home"),
    ("pushup", "Отжимания от пола", "push", [], "home"),
    ("pushup_knees", "Отжимания с колен", "push", [], "home"),
    ("press_floor", "Жим гантелей с пола", "push", ["dumbbells"], "home"),
    ("bench_press", "Жим штанги лёжа", "push", ["gym"], "gym"),
    ("bench_dumbbell", "Жим гантелей лёжа", "push", ["gym"], "gym"),
    ("row_cable", "Тяга горизонтального блока", "row", ["gym"], "gym"),
    ("row_dumbbell", "Тяга гантелей в наклоне", "row", ["dumbbells"], "home"),
    ("row_band", "Тяга резинки сидя", "row", ["bands"], "home"),
    ("press_dumbbell", "Жим гантелей стоя", "press", ["dumbbells"], "home"),
    ("press_band", "Жим резинки над головой", "press", ["bands"], "home"),
    ("press_machine", "Жим вверх в тренажёре", "press", ["gym"], "gym"),
    ("calf_body", "Подъёмы на носки стоя", "calf", [], "home"),
    ("calf_dumbbell", "Подъёмы на носки с гантелями", "calf", ["dumbbells"], "home"),
    ("calf_machine", "Подъёмы на носки в тренажёре", "calf", ["gym"], "gym"),
    ("calf_seated", "Подъёмы на носки сидя в тренажёре", "calf", ["gym"], "gym"),
    ("triceps_cable", "Разгибание рук над головой на блоке", "triceps", ["gym"], "gym"),
    ("triceps_dumbbell", "Разгибание рук с гантелью над головой", "triceps", ["dumbbells"], "home"),
    ("triceps_band", "Разгибание рук с резинкой над головой", "triceps", ["bands"], "home"),
]

EXERCISES = {
    id: dict(id=id, name=name, pattern=pattern, muscles=PATTERNS[pattern][0],
             equipment=equipment, location=location, cues=PATTERNS[pattern][1],
             evidence_keys=[PATTERNS[pattern][2]],
             # Перенос на варианты хранится в данных, без научных ярлыков в карточке.
             evidence_scope="movement_family")
    for id, name, pattern, equipment, location in ROWS
}
