"""
База продуктов для быстрого поиска. Значения КБЖУ — на 100 г.
Типы порции:
  - "grams" — вводить граммы (сыпучие, жидкости, блюда), default_amount в граммах
  - "piece" — вводить штуки (штучные фрукты/овощи), piece_weight_g = вес 1 шт, default_amount в штуках
"""

FOODS_DATABASE = [
    # === МЯСО И ПТИЦА ===
    {"id": 1, "name": "Куриная грудка варёная", "category": "Мясо и птица", "calories_per_100g": 165, "protein_per_100g": 31, "fat_per_100g": 3.6, "carbs_per_100g": 0, "portion_type": "grams", "default_amount": 150},
    {"id": 2, "name": "Куриное бедро варёное", "category": "Мясо и птица", "calories_per_100g": 209, "protein_per_100g": 26, "fat_per_100g": 11, "carbs_per_100g": 0, "portion_type": "grams", "default_amount": 150},
    {"id": 3, "name": "Говядина варёная", "category": "Мясо и птица", "calories_per_100g": 254, "protein_per_100g": 26, "fat_per_100g": 17, "carbs_per_100g": 0, "portion_type": "grams", "default_amount": 150},
    {"id": 4, "name": "Свинина варёная", "category": "Мясо и птица", "calories_per_100g": 294, "protein_per_100g": 25, "fat_per_100g": 21, "carbs_per_100g": 0, "portion_type": "grams", "default_amount": 150},
    {"id": 5, "name": "Индейка варёная", "category": "Мясо и птица", "calories_per_100g": 189, "protein_per_100g": 29, "fat_per_100g": 7, "carbs_per_100g": 0, "portion_type": "grams", "default_amount": 150},
    {"id": 6, "name": "Фарш говяжий жареный", "category": "Мясо и птица", "calories_per_100g": 272, "protein_per_100g": 26, "fat_per_100g": 18, "carbs_per_100g": 0, "portion_type": "grams", "default_amount": 100},
    {"id": 7, "name": "Сосиска варёная", "category": "Мясо и птица", "calories_per_100g": 256, "protein_per_100g": 11, "fat_per_100g": 23, "carbs_per_100g": 1, "portion_type": "grams", "default_amount": 80},
    {"id": 8, "name": "Колбаса докторская", "category": "Мясо и птица", "calories_per_100g": 257, "protein_per_100g": 13, "fat_per_100g": 22, "carbs_per_100g": 1.5, "portion_type": "grams", "default_amount": 50},
    {"id": 9, "name": "Бекон жареный", "category": "Мясо и птица", "calories_per_100g": 541, "protein_per_100g": 37, "fat_per_100g": 42, "carbs_per_100g": 1.4, "portion_type": "grams", "default_amount": 30},
    {"id": 10, "name": "Котлета жареная", "category": "Мясо и птица", "calories_per_100g": 290, "protein_per_100g": 15, "fat_per_100g": 20, "carbs_per_100g": 12, "portion_type": "grams", "default_amount": 100},

    # === РЫБА И МОРЕПРОДУКТЫ ===
    {"id": 11, "name": "Лосось жареный", "category": "Рыба", "calories_per_100g": 206, "protein_per_100g": 28, "fat_per_100g": 10, "carbs_per_100g": 0, "portion_type": "grams", "default_amount": 150},
    {"id": 12, "name": "Тунец консервированный", "category": "Рыба", "calories_per_100g": 116, "protein_per_100g": 25, "fat_per_100g": 1, "carbs_per_100g": 0, "portion_type": "grams", "default_amount": 100},
    {"id": 13, "name": "Треска отварная", "category": "Рыба", "calories_per_100g": 78, "protein_per_100g": 18, "fat_per_100g": 0.6, "carbs_per_100g": 0, "portion_type": "grams", "default_amount": 150},
    {"id": 14, "name": "Скумбрия запечённая", "category": "Рыба", "calories_per_100g": 221, "protein_per_100g": 24, "fat_per_100g": 13, "carbs_per_100g": 0, "portion_type": "grams", "default_amount": 150},
    {"id": 15, "name": "Креветки варёные", "category": "Рыба", "calories_per_100g": 99, "protein_per_100g": 24, "fat_per_100g": 0.3, "carbs_per_100g": 0, "portion_type": "grams", "default_amount": 100},
    {"id": 16, "name": "Сельдь солёная", "category": "Рыба", "calories_per_100g": 215, "protein_per_100g": 17, "fat_per_100g": 16, "carbs_per_100g": 0, "portion_type": "grams", "default_amount": 80},

    # === ЯЙЦА И МОЛОЧНЫЕ ===
    {"id": 17, "name": "Яйцо куриное", "category": "Яйца и молочные", "calories_per_100g": 155, "protein_per_100g": 13, "fat_per_100g": 11, "carbs_per_100g": 1.1, "portion_type": "piece", "piece_weight_g": 60, "default_amount": 1},
    {"id": 18, "name": "Творог 5%", "category": "Яйца и молочные", "calories_per_100g": 121, "protein_per_100g": 17, "fat_per_100g": 5, "carbs_per_100g": 2.8, "portion_type": "grams", "default_amount": 150},
    {"id": 19, "name": "Творог 0%", "category": "Яйца и молочные", "calories_per_100g": 71, "protein_per_100g": 16, "fat_per_100g": 0.5, "carbs_per_100g": 2, "portion_type": "grams", "default_amount": 150},
    {"id": 20, "name": "Молоко 2.5%", "category": "Яйца и молочные", "calories_per_100g": 52, "protein_per_100g": 2.9, "fat_per_100g": 2.5, "carbs_per_100g": 4.7, "portion_type": "grams", "default_amount": 200},
    {"id": 21, "name": "Кефир 1%", "category": "Яйца и молочные", "calories_per_100g": 40, "protein_per_100g": 2.9, "fat_per_100g": 1, "carbs_per_100g": 4, "portion_type": "grams", "default_amount": 200},
    {"id": 22, "name": "Йогурт натуральный", "category": "Яйца и молочные", "calories_per_100g": 59, "protein_per_100g": 3.5, "fat_per_100g": 3.3, "carbs_per_100g": 4.7, "portion_type": "grams", "default_amount": 150},
    {"id": 23, "name": "Сметана 15%", "category": "Яйца и молочные", "calories_per_100g": 158, "protein_per_100g": 2.6, "fat_per_100g": 15, "carbs_per_100g": 3.6, "portion_type": "grams", "default_amount": 30},
    {"id": 24, "name": "Сыр Российский", "category": "Яйца и молочные", "calories_per_100g": 364, "protein_per_100g": 23, "fat_per_100g": 30, "carbs_per_100g": 0, "portion_type": "grams", "default_amount": 30},
    {"id": 25, "name": "Сыр Моцарелла", "category": "Яйца и молочные", "calories_per_100g": 280, "protein_per_100g": 22, "fat_per_100g": 22, "carbs_per_100g": 0, "portion_type": "grams", "default_amount": 50},
    {"id": 26, "name": "Масло сливочное", "category": "Яйца и молочные", "calories_per_100g": 717, "protein_per_100g": 0.9, "fat_per_100g": 81, "carbs_per_100g": 0.1, "portion_type": "grams", "default_amount": 10},

    # === КРУПЫ И ЗЛАКИ (сухие) ===
    {"id": 27, "name": "Овсянка сухая", "category": "Крупы", "calories_per_100g": 389, "protein_per_100g": 17, "fat_per_100g": 7, "carbs_per_100g": 66, "portion_type": "grams", "default_amount": 60},
    {"id": 28, "name": "Гречка сухая", "category": "Крупы", "calories_per_100g": 343, "protein_per_100g": 13, "fat_per_100g": 3.4, "carbs_per_100g": 70, "portion_type": "grams", "default_amount": 60},
    {"id": 29, "name": "Рис белый сухой", "category": "Крупы", "calories_per_100g": 365, "protein_per_100g": 7, "fat_per_100g": 0.7, "carbs_per_100g": 80, "portion_type": "grams", "default_amount": 60},
    {"id": 30, "name": "Рис бурый сухой", "category": "Крупы", "calories_per_100g": 370, "protein_per_100g": 8, "fat_per_100g": 2.7, "carbs_per_100g": 77, "portion_type": "grams", "default_amount": 60},
    {"id": 31, "name": "Перловка сухая", "category": "Крупы", "calories_per_100g": 354, "protein_per_100g": 12, "fat_per_100g": 2.3, "carbs_per_100g": 74, "portion_type": "grams", "default_amount": 60},
    {"id": 32, "name": "Макароны сухие", "category": "Крупы", "calories_per_100g": 371, "protein_per_100g": 13, "fat_per_100g": 1.5, "carbs_per_100g": 75, "portion_type": "grams", "default_amount": 80},
    {"id": 33, "name": "Хлеб белый пшеничный", "category": "Крупы", "calories_per_100g": 265, "protein_per_100g": 7.6, "fat_per_100g": 3.2, "carbs_per_100g": 50, "portion_type": "grams", "default_amount": 50},
    {"id": 34, "name": "Хлеб чёрный ржаной", "category": "Крупы", "calories_per_100g": 259, "protein_per_100g": 6.6, "fat_per_100g": 1.2, "carbs_per_100g": 54, "portion_type": "grams", "default_amount": 50},
    {"id": 35, "name": "Булгур сухой", "category": "Крупы", "calories_per_100g": 342, "protein_per_100g": 12, "fat_per_100g": 1.3, "carbs_per_100g": 76, "portion_type": "grams", "default_amount": 60},
    {"id": 36, "name": "Киноа сухая", "category": "Крупы", "calories_per_100g": 368, "protein_per_100g": 14, "fat_per_100g": 6, "carbs_per_100g": 64, "portion_type": "grams", "default_amount": 60},

    # === БОБОВЫЕ ===
    {"id": 37, "name": "Чечевица варёная", "category": "Бобовые", "calories_per_100g": 116, "protein_per_100g": 9, "fat_per_100g": 0.4, "carbs_per_100g": 20, "portion_type": "grams", "default_amount": 150},
    {"id": 38, "name": "Фасоль красная варёная", "category": "Бобовые", "calories_per_100g": 127, "protein_per_100g": 8.7, "fat_per_100g": 0.5, "carbs_per_100g": 23, "portion_type": "grams", "default_amount": 150},
    {"id": 39, "name": "Нут варёный", "category": "Бобовые", "calories_per_100g": 164, "protein_per_100g": 8.9, "fat_per_100g": 2.6, "carbs_per_100g": 27, "portion_type": "grams", "default_amount": 150},
    {"id": 40, "name": "Горох варёный", "category": "Бобовые", "calories_per_100g": 118, "protein_per_100g": 8, "fat_per_100g": 0.4, "carbs_per_100g": 21, "portion_type": "grams", "default_amount": 150},

    # === ФРУКТЫ ===
    {"id": 41, "name": "Банан", "category": "Фрукты", "calories_per_100g": 89, "protein_per_100g": 1.1, "fat_per_100g": 0.3, "carbs_per_100g": 23, "portion_type": "piece", "piece_weight_g": 120, "default_amount": 1},
    {"id": 42, "name": "Яблоко", "category": "Фрукты", "calories_per_100g": 52, "protein_per_100g": 0.3, "fat_per_100g": 0.2, "carbs_per_100g": 14, "portion_type": "piece", "piece_weight_g": 180, "default_amount": 1},
    {"id": 43, "name": "Апельсин", "category": "Фрукты", "calories_per_100g": 47, "protein_per_100g": 0.9, "fat_per_100g": 0.1, "carbs_per_100g": 12, "portion_type": "piece", "piece_weight_g": 160, "default_amount": 1},
    {"id": 44, "name": "Груша", "category": "Фрукты", "calories_per_100g": 57, "protein_per_100g": 0.4, "fat_per_100g": 0.1, "carbs_per_100g": 15, "portion_type": "piece", "piece_weight_g": 170, "default_amount": 1},
    {"id": 45, "name": "Мандарин", "category": "Фрукты", "calories_per_100g": 53, "protein_per_100g": 0.8, "fat_per_100g": 0.3, "carbs_per_100g": 13, "portion_type": "piece", "piece_weight_g": 80, "default_amount": 2},
    {"id": 46, "name": "Персик", "category": "Фрукты", "calories_per_100g": 39, "protein_per_100g": 0.9, "fat_per_100g": 0.3, "carbs_per_100g": 10, "portion_type": "piece", "piece_weight_g": 150, "default_amount": 1},
    {"id": 47, "name": "Слива", "category": "Фрукты", "calories_per_100g": 46, "protein_per_100g": 0.7, "fat_per_100g": 0.3, "carbs_per_100g": 11, "portion_type": "piece", "piece_weight_g": 40, "default_amount": 3},
    {"id": 48, "name": "Виноград", "category": "Фрукты", "calories_per_100g": 69, "protein_per_100g": 0.7, "fat_per_100g": 0.2, "carbs_per_100g": 18, "portion_type": "grams", "default_amount": 100},
    {"id": 49, "name": "Клубника", "category": "Фрукты", "calories_per_100g": 32, "protein_per_100g": 0.7, "fat_per_100g": 0.3, "carbs_per_100g": 8, "portion_type": "grams", "default_amount": 100},
    {"id": 50, "name": "Арбуз", "category": "Фрукты", "calories_per_100g": 30, "protein_per_100g": 0.6, "fat_per_100g": 0.2, "carbs_per_100g": 8, "portion_type": "grams", "default_amount": 300},
    {"id": 51, "name": "Киви", "category": "Фрукты", "calories_per_100g": 61, "protein_per_100g": 1.1, "fat_per_100g": 0.5, "carbs_per_100g": 15, "portion_type": "piece", "piece_weight_g": 80, "default_amount": 1},
    {"id": 52, "name": "Манго", "category": "Фрукты", "calories_per_100g": 60, "protein_per_100g": 0.8, "fat_per_100g": 0.4, "carbs_per_100g": 15, "portion_type": "grams", "default_amount": 150},
    {"id": 53, "name": "Ананас", "category": "Фрукты", "calories_per_100g": 50, "protein_per_100g": 0.5, "fat_per_100g": 0.1, "carbs_per_100g": 13, "portion_type": "grams", "default_amount": 150},
    {"id": 54, "name": "Лимон", "category": "Фрукты", "calories_per_100g": 29, "protein_per_100g": 1.1, "fat_per_100g": 0.3, "carbs_per_100g": 9, "portion_type": "piece", "piece_weight_g": 80, "default_amount": 1},
    {"id": 55, "name": "Черника", "category": "Фрукты", "calories_per_100g": 57, "protein_per_100g": 0.7, "fat_per_100g": 0.3, "carbs_per_100g": 14, "portion_type": "grams", "default_amount": 100},

    # === ОВОЩИ ===
    {"id": 56, "name": "Картофель варёный", "category": "Овощи", "calories_per_100g": 87, "protein_per_100g": 1.9, "fat_per_100g": 0.1, "carbs_per_100g": 20, "portion_type": "grams", "default_amount": 150},
    {"id": 57, "name": "Картофель запечённый", "category": "Овощи", "calories_per_100g": 93, "protein_per_100g": 2.1, "fat_per_100g": 0.1, "carbs_per_100g": 21, "portion_type": "grams", "default_amount": 150},
    {"id": 58, "name": "Помидор", "category": "Овощи", "calories_per_100g": 18, "protein_per_100g": 0.9, "fat_per_100g": 0.2, "carbs_per_100g": 3.9, "portion_type": "piece", "piece_weight_g": 120, "default_amount": 1},
    {"id": 59, "name": "Огурец", "category": "Овощи", "calories_per_100g": 15, "protein_per_100g": 0.7, "fat_per_100g": 0.1, "carbs_per_100g": 3.6, "portion_type": "piece", "piece_weight_g": 120, "default_amount": 1},
    {"id": 60, "name": "Морковь", "category": "Овощи", "calories_per_100g": 41, "protein_per_100g": 0.9, "fat_per_100g": 0.2, "carbs_per_100g": 10, "portion_type": "piece", "piece_weight_g": 100, "default_amount": 1},
    {"id": 61, "name": "Капуста белокочанная", "category": "Овощи", "calories_per_100g": 25, "protein_per_100g": 1.3, "fat_per_100g": 0.1, "carbs_per_100g": 6, "portion_type": "grams", "default_amount": 100},
    {"id": 62, "name": "Перец болгарский", "category": "Овощи", "calories_per_100g": 31, "protein_per_100g": 1, "fat_per_100g": 0.3, "carbs_per_100g": 6, "portion_type": "piece", "piece_weight_g": 130, "default_amount": 1},
    {"id": 63, "name": "Брокколи отварная", "category": "Овощи", "calories_per_100g": 35, "protein_per_100g": 2.4, "fat_per_100g": 0.4, "carbs_per_100g": 7, "portion_type": "grams", "default_amount": 150},
    {"id": 64, "name": "Свёкла варёная", "category": "Овощи", "calories_per_100g": 44, "protein_per_100g": 1.7, "fat_per_100g": 0.2, "carbs_per_100g": 10, "portion_type": "grams", "default_amount": 100},
    {"id": 65, "name": "Лук репчатый", "category": "Овощи", "calories_per_100g": 40, "protein_per_100g": 1.1, "fat_per_100g": 0.1, "carbs_per_100g": 9, "portion_type": "grams", "default_amount": 50},
    {"id": 66, "name": "Кабачок тушёный", "category": "Овощи", "calories_per_100g": 24, "protein_per_100g": 1.2, "fat_per_100g": 0.3, "carbs_per_100g": 4.6, "portion_type": "grams", "default_amount": 150},
    {"id": 67, "name": "Авокадо", "category": "Овощи", "calories_per_100g": 160, "protein_per_100g": 2, "fat_per_100g": 15, "carbs_per_100g": 9, "portion_type": "piece", "piece_weight_g": 150, "default_amount": 1},
    {"id": 68, "name": "Шпинат свежий", "category": "Овощи", "calories_per_100g": 23, "protein_per_100g": 2.9, "fat_per_100g": 0.4, "carbs_per_100g": 3.6, "portion_type": "grams", "default_amount": 50},
    {"id": 69, "name": "Кукуруза варёная", "category": "Овощи", "calories_per_100g": 96, "protein_per_100g": 3.4, "fat_per_100g": 1.5, "carbs_per_100g": 21, "portion_type": "grams", "default_amount": 100},
    {"id": 70, "name": "Тыква запечённая", "category": "Овощи", "calories_per_100g": 45, "protein_per_100g": 1.4, "fat_per_100g": 0.2, "carbs_per_100g": 11, "portion_type": "grams", "default_amount": 150},

    # === ОРЕХИ И СЕМЕНА ===
    {"id": 71, "name": "Миндаль", "category": "Орехи", "calories_per_100g": 579, "protein_per_100g": 21, "fat_per_100g": 50, "carbs_per_100g": 22, "portion_type": "grams", "default_amount": 30},
    {"id": 72, "name": "Грецкий орех", "category": "Орехи", "calories_per_100g": 654, "protein_per_100g": 15, "fat_per_100g": 65, "carbs_per_100g": 14, "portion_type": "grams", "default_amount": 30},
    {"id": 73, "name": "Кешью", "category": "Орехи", "calories_per_100g": 553, "protein_per_100g": 18, "fat_per_100g": 44, "carbs_per_100g": 30, "portion_type": "grams", "default_amount": 30},
    {"id": 74, "name": "Арахис", "category": "Орехи", "calories_per_100g": 567, "protein_per_100g": 26, "fat_per_100g": 49, "carbs_per_100g": 16, "portion_type": "grams", "default_amount": 30},
    {"id": 75, "name": "Семена подсолнечника", "category": "Орехи", "calories_per_100g": 584, "protein_per_100g": 21, "fat_per_100g": 51, "carbs_per_100g": 20, "portion_type": "grams", "default_amount": 20},
    {"id": 76, "name": "Арахисовая паста", "category": "Орехи", "calories_per_100g": 588, "protein_per_100g": 25, "fat_per_100g": 50, "carbs_per_100g": 20, "portion_type": "grams", "default_amount": 20},

    # === МАСЛА ===
    {"id": 77, "name": "Масло подсолнечное", "category": "Масла", "calories_per_100g": 899, "protein_per_100g": 0, "fat_per_100g": 100, "carbs_per_100g": 0, "portion_type": "grams", "default_amount": 10},
    {"id": 78, "name": "Масло оливковое", "category": "Масла", "calories_per_100g": 884, "protein_per_100g": 0, "fat_per_100g": 100, "carbs_per_100g": 0, "portion_type": "grams", "default_amount": 10},

    # === ГОТОВЫЕ БЛЮДА ===
    {"id": 79, "name": "Пельмени варёные", "category": "Готовые блюда", "calories_per_100g": 275, "protein_per_100g": 11, "fat_per_100g": 13, "carbs_per_100g": 29, "portion_type": "grams", "default_amount": 200},
    {"id": 80, "name": "Борщ", "category": "Готовые блюда", "calories_per_100g": 45, "protein_per_100g": 2.5, "fat_per_100g": 1.5, "carbs_per_100g": 6, "portion_type": "grams", "default_amount": 300},
    {"id": 81, "name": "Омлет", "category": "Готовые блюда", "calories_per_100g": 184, "protein_per_100g": 10, "fat_per_100g": 15, "carbs_per_100g": 1.5, "portion_type": "grams", "default_amount": 150},
    {"id": 82, "name": "Блины", "category": "Готовые блюда", "calories_per_100g": 233, "protein_per_100g": 6, "fat_per_100g": 10, "carbs_per_100g": 30, "portion_type": "grams", "default_amount": 150},
    {"id": 83, "name": "Оливье", "category": "Готовые блюда", "calories_per_100g": 198, "protein_per_100g": 6, "fat_per_100g": 14, "carbs_per_100g": 13, "portion_type": "grams", "default_amount": 200},
    {"id": 84, "name": "Греческий салат", "category": "Готовые блюда", "calories_per_100g": 96, "protein_per_100g": 3, "fat_per_100g": 7, "carbs_per_100g": 6, "portion_type": "grams", "default_amount": 200},
    {"id": 85, "name": "Пицца Маргарита", "category": "Готовые блюда", "calories_per_100g": 266, "protein_per_100g": 11, "fat_per_100g": 10, "carbs_per_100g": 33, "portion_type": "grams", "default_amount": 200},
    {"id": 86, "name": "Роллы калифорния", "category": "Готовые блюда", "calories_per_100g": 165, "protein_per_100g": 6, "fat_per_100g": 5, "carbs_per_100g": 24, "portion_type": "grams", "default_amount": 200},

    # === НАПИТКИ ===
    {"id": 87, "name": "Кофе с молоком", "category": "Напитки", "calories_per_100g": 47, "protein_per_100g": 1.7, "fat_per_100g": 2.5, "carbs_per_100g": 4.5, "portion_type": "grams", "default_amount": 200},
    {"id": 88, "name": "Апельсиновый сок", "category": "Напитки", "calories_per_100g": 45, "protein_per_100g": 0.7, "fat_per_100g": 0.2, "carbs_per_100g": 10, "portion_type": "grams", "default_amount": 200},
    {"id": 89, "name": "Протеиновый коктейль", "category": "Напитки", "calories_per_100g": 110, "protein_per_100g": 20, "fat_per_100g": 2, "carbs_per_100g": 5, "portion_type": "grams", "default_amount": 300},

    # === СЛАДКОЕ ===
    {"id": 90, "name": "Шоколад тёмный 70%", "category": "Сладкое", "calories_per_100g": 598, "protein_per_100g": 8, "fat_per_100g": 43, "carbs_per_100g": 46, "portion_type": "grams", "default_amount": 25},
    {"id": 91, "name": "Мёд", "category": "Сладкое", "calories_per_100g": 304, "protein_per_100g": 0.3, "fat_per_100g": 0, "carbs_per_100g": 82, "portion_type": "grams", "default_amount": 15},
    {"id": 92, "name": "Варенье", "category": "Сладкое", "calories_per_100g": 268, "protein_per_100g": 0.3, "fat_per_100g": 0.1, "carbs_per_100g": 70, "portion_type": "grams", "default_amount": 20},
]
