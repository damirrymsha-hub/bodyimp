// Хардкод популярных блюд для быстрого поиска (КБЖУ на 1 порцию).
export interface PopularFood {
  name: string
  calories: number
  protein_g: number
  fat_g: number
  carbs_g: number
}

export const POPULAR_FOODS: PopularFood[] = [
  { name: 'Овсянка на воде (200 г)', calories: 150, protein_g: 5, fat_g: 3, carbs_g: 27 },
  { name: 'Гречка отварная (200 г)', calories: 220, protein_g: 8, fat_g: 2, carbs_g: 45 },
  { name: 'Рис белый отварной (200 г)', calories: 260, protein_g: 5, fat_g: 1, carbs_g: 57 },
  { name: 'Куриная грудка (150 г)', calories: 248, protein_g: 46, fat_g: 5, carbs_g: 0 },
  { name: 'Яйцо варёное (2 шт)', calories: 156, protein_g: 13, fat_g: 11, carbs_g: 1 },
  { name: 'Творог 5% (150 г)', calories: 180, protein_g: 25, fat_g: 7, carbs_g: 3 },
  { name: 'Греческий йогурт (150 г)', calories: 90, protein_g: 15, fat_g: 0, carbs_g: 6 },
  { name: 'Банан (1 шт)', calories: 105, protein_g: 1, fat_g: 0, carbs_g: 27 },
  { name: 'Яблоко (1 шт)', calories: 95, protein_g: 0, fat_g: 0, carbs_g: 25 },
  { name: 'Лосось запечённый (150 г)', calories: 280, protein_g: 30, fat_g: 18, carbs_g: 0 },
  { name: 'Салат Цезарь (250 г)', calories: 360, protein_g: 20, fat_g: 25, carbs_g: 12 },
  { name: 'Борщ (300 г)', calories: 180, protein_g: 6, fat_g: 9, carbs_g: 18 },
  { name: 'Паста болоньезе (300 г)', calories: 450, protein_g: 22, fat_g: 15, carbs_g: 55 },
  { name: 'Бургер (1 шт)', calories: 550, protein_g: 25, fat_g: 30, carbs_g: 45 },
  { name: 'Пицца Маргарита (1 кусок)', calories: 270, protein_g: 11, fat_g: 10, carbs_g: 33 },
  { name: 'Сэндвич с курицей', calories: 320, protein_g: 22, fat_g: 12, carbs_g: 30 },
  { name: 'Протеиновый батончик', calories: 200, protein_g: 20, fat_g: 7, carbs_g: 18 },
  { name: 'Орехи миндаль (30 г)', calories: 174, protein_g: 6, fat_g: 15, carbs_g: 6 },
  { name: 'Кофе с молоком', calories: 60, protein_g: 3, fat_g: 3, carbs_g: 5 },
  { name: 'Шоколад тёмный (30 г)', calories: 170, protein_g: 2, fat_g: 12, carbs_g: 13 },
]
