import { describe, expect, it } from 'vitest'
import { validateManualFood } from './foodValidation'

const food = { name: 'Гречка', calories: 300, protein_g: 10, fat_g: 5, carbs_g: 50 }
describe('ручная порция', () => {
  it('принимает дробную порцию', () => expect(validateManualFood(food, 0.5)).toBeNull())
  it('отклоняет пустое название', () => expect(validateManualFood({ ...food, name: ' ' }, 1)).not.toBeNull())
  it.each([0, -1, Infinity, NaN])('отклоняет количество %s', (q) => expect(validateManualFood(food, q)).not.toBeNull())
  it.each([-1, Infinity, NaN, 10001])('отклоняет калории %s', (calories) => expect(validateManualFood({ ...food, calories }, 1)).not.toBeNull())
})
