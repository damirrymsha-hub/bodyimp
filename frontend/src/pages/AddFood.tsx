// Модальное окно добавления/редактирования еды.
// Режимы: вручную (с пересчётом порции/100 г) / фото / быстрый поиск.
// Если передан editingEntry — окно открывается сразу в режиме правки.
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  X,
  PencilLine,
  Camera,
  Search,
  Sparkles,
  Star,
  Trash2,
  Barcode,
  History,
  Plus,
} from 'lucide-react'
import { getRecentFoods } from '../api/client'
import { z } from 'zod'
import { useUserStore } from '../store/userStore'
import { useUIStore } from '../store/uiStore'
import { haptic, hapticSuccess } from '../lib/telegram'
import type { MealType, PhotoAnalysisResult, FoodEntry } from '../types'
import ScanFood from './ScanFood'
import SearchTab from '../components/SearchTab'
import FavoritesTab from '../components/FavoritesTab'
import DescribeFood from '../components/DescribeFood'
import BarcodeTab from '../components/BarcodeTab'

type Mode = 'menu' | 'manual' | 'photo' | 'search' | 'favorites' | 'text' | 'barcode'
type UnitMode = 'portion' | 'per100'

const MEALS: { value: MealType; label: string }[] = [
  { value: 'breakfast', label: 'Завтрак' },
  { value: 'lunch', label: 'Обед' },
  { value: 'dinner', label: 'Ужин' },
  { value: 'snack', label: 'Перекус' },
]

// Схема валидации (проверяем уже пересчитанные итоговые значения).
const manualSchema = z.object({
  name: z.string().min(1, 'Введите название'),
  calories: z.number().min(0).max(10000),
  protein_g: z.number().min(0).max(1000),
  fat_g: z.number().min(0).max(1000),
  carbs_g: z.number().min(0).max(1000),
})

// Приём пищи по времени суток — разумный старт вместо вечного «Перекуса».
function mealByTime(): MealType {
  const h = new Date().getHours()
  if (h < 11) return 'breakfast'
  if (h < 16) return 'lunch'
  if (h < 21) return 'dinner'
  return 'snack'
}

const MEAL_IN: Record<MealType, string> = {
  breakfast: 'завтрак',
  lunch: 'обед',
  dinner: 'ужин',
  snack: 'перекус',
}

interface Props {
  onClose: () => void
  editingEntry?: FoodEntry // если задано — режим редактирования
  initialMeal?: MealType   // задан при входе из секции дневника
}

export default function AddFood({ onClose, editingEntry, initialMeal }: Props) {
  const isEditing = !!editingEntry
  const [mode, setMode] = useState<Mode>(isEditing ? 'manual' : 'menu')
  const [meal, setMeal] = useState<MealType>(
    editingEntry?.meal_type ?? initialMeal ?? mealByTime(),
  )
  // Аккордеон «Другие способы» — свёрнут, когда пришли из секции дневника.
  const [modesOpen, setModesOpen] = useState(!initialMeal)
  const { user, addFood, updateFood, removeFood, addFavorite } = useUserStore()
  const { showToast } = useUIStore()

  // Чекбокс «Сохранить в избранное» (только при ручном добавлении).
  const [saveFav, setSaveFav] = useState(false)

  // Недавние блюда — быстрое повторное добавление прямо из меню.
  const [recents, setRecents] = useState<FoodEntry[]>([])
  useEffect(() => {
    if (user && !isEditing) {
      getRecentFoods(user.id, 5).then(setRecents).catch(() => {})
    }
  }, [user, isEditing])

  async function quickAddRecent(entry: FoodEntry) {
    haptic('light')
    await addFood({
      meal_type: entry.meal_type, // тот же приём пищи, что и в прошлый раз
      name: entry.name,
      calories: entry.calories,
      protein_g: entry.protein_g,
      fat_g: entry.fat_g,
      carbs_g: entry.carbs_g,
      source: entry.source,
      base_per_100g: false,
      portion_size_g: entry.portion_size_g ?? null,
    })
    hapticSuccess()
    showToast('Добавлено', 'success')
    onClose()
  }

  // Режим ввода базовых КБЖУ: на порцию или на 100 г.
  const initUnit: UnitMode = editingEntry?.base_per_100g ? 'per100' : 'portion'
  const [unitMode, setUnitMode] = useState<UnitMode>(initUnit)

  // Количество: для порций — число порций (шаг 0.5), для 100 г — граммы.
  const initQty =
    initUnit === 'per100' ? String(editingEntry?.portion_size_g ?? 100) : '1'
  const [qty, setQty] = useState<string>(initQty)

  // Базовые значения КБЖУ. При редактировании раскручиваем итог обратно к базе.
  const initFactor =
    initUnit === 'per100'
      ? (editingEntry?.portion_size_g ?? 100) / 100
      : 1
  const back = (v: number | undefined) =>
    v === undefined ? '' : String(Math.round((v / (initFactor || 1)) * 10) / 10)

  const [name, setName] = useState(editingEntry?.name ?? '')
  const [calories, setCalories] = useState(back(editingEntry?.calories))
  const [protein, setProtein] = useState(back(editingEntry?.protein_g))
  const [fat, setFat] = useState(back(editingEntry?.fat_g))
  const [carbs, setCarbs] = useState(back(editingEntry?.carbs_g))

  // Множитель пересчёта: порции = ×N, 100 г = ×(граммы/100).
  const q = Number(qty) || 0
  const factor = unitMode === 'per100' ? q / 100 : q

  // Итоговые (пересчитанные) значения для сохранения и для превью.
  const computed = {
    calories: Math.round((Number(calories) || 0) * factor),
    protein_g: Math.round((Number(protein) || 0) * factor),
    fat_g: Math.round((Number(fat) || 0) * factor),
    carbs_g: Math.round((Number(carbs) || 0) * factor),
  }

  async function handleManualSave() {
    const parsed = manualSchema.safeParse({
      name: name.trim(),
      ...computed,
    })
    if (!parsed.success) {
      showToast(parsed.error.issues[0]?.message ?? 'Проверьте данные', 'error')
      return
    }
    const base = {
      ...parsed.data,
      base_per_100g: unitMode === 'per100',
      portion_size_g: unitMode === 'per100' ? q || null : null,
    }
    if (isEditing && editingEntry) {
      await updateFood(editingEntry.id, { ...base, meal_type: meal })
      showToast('Сохранено', 'success')
    } else {
      await addFood({ ...base, meal_type: meal, source: 'manual' })
      // Опционально — сохранить продукт в избранное (базовые значения).
      if (saveFav) {
        await addFavorite({
          name: parsed.data.name,
          calories: Number(calories) || 0,
          protein_g: Number(protein) || 0,
          fat_g: Number(fat) || 0,
          carbs_g: Number(carbs) || 0,
          portion_type: 'grams',
          base_weight_g: 100,
        })
      }
      showToast('Добавлено', 'success')
    }
    hapticSuccess()
    onClose()
  }

  async function handleDelete() {
    if (!editingEntry) return
    haptic('medium')
    await removeFood(editingEntry.id)
    showToast('Удалено', 'success')
    onClose()
  }

  async function saveAndClose(payload: {
    name: string
    calories: number
    protein_g: number
    fat_g: number
    carbs_g: number
    source: 'manual' | 'photo' | 'scan' | 'text'
  }) {
    await addFood({ ...payload, meal_type: meal })
    hapticSuccess()
    showToast('Добавлено', 'success')
    onClose()
  }

  function handlePhotoConfirm(r: PhotoAnalysisResult) {
    saveAndClose({
      name: r.name ?? 'Блюдо с фото',
      calories: r.calories ?? 0,
      protein_g: r.protein_g ?? 0,
      fat_g: r.fat_g ?? 0,
      carbs_g: r.carbs_g ?? 0,
      source: 'photo',
    })
  }

  // Подтверждение результата текстового описания — калории уходят в дневной итог.
  function handleTextConfirm(r: PhotoAnalysisResult) {
    saveAndClose({
      name: r.name ?? 'Блюдо по описанию',
      calories: r.calories ?? 0,
      protein_g: r.protein_g ?? 0,
      fat_g: r.fat_g ?? 0,
      carbs_g: r.carbs_g ?? 0,
      source: 'text',
    })
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40">
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-[2rem] bg-bg p-5 pb-8"
      >
        {/* Заголовок */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">
            {isEditing
              ? 'Редактировать'
              : mode === 'menu'
                ? initialMeal
                  ? `Добавить в ${MEAL_IN[initialMeal]}`
                  : 'Добавить еду'
                : mode === 'manual'
                  ? 'Вручную'
                  : mode === 'photo'
                    ? 'Сфотографировать'
                    : mode === 'favorites'
                      ? 'Избранное'
                      : mode === 'text'
                        ? 'Описать текстом'
                        : mode === 'barcode'
                          ? 'Штрихкод'
                          : 'Быстрый поиск'}
          </h2>
          <button
            onClick={() =>
              isEditing || mode === 'menu' ? onClose() : setMode('menu')
            }
            className="-mr-1 flex h-11 w-11 items-center justify-center rounded-full bg-ink/5"
            aria-label="Закрыть"
          >
            <X size={18} />
          </button>
        </div>

        {/* Выбор приёма пищи (виден во всех режимах кроме меню) */}
        {mode !== 'menu' && (
          <div className="no-scrollbar mb-4 flex gap-2 overflow-x-auto">
            {MEALS.map((m) => (
              <button
                key={m.value}
                onClick={() => setMeal(m.value)}
                className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium ${
                  meal === m.value ? 'bg-ink text-white' : 'bg-card text-ink'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        )}

        {/* Меню (редизайн 1b): 2 частых режима крупно + компактная сетка 2×2 */}
        {mode === 'menu' && (
          <div className="flex flex-col gap-4">
            {/* Недавние — самый быстрый путь, поэтому первым блоком */}
            {recents.length > 0 && (
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-1.5 px-1 text-xs font-semibold uppercase tracking-wider text-muted">
                  <History size={12} /> Недавние
                </div>
                {recents.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center gap-2 rounded-3xl bg-card p-3 shadow-card"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold">{r.name}</div>
                      <div className="text-[11px] font-medium text-muted">
                        {Math.round(r.calories)} ккал · Б {Math.round(r.protein_g)} ·
                        Ж {Math.round(r.fat_g)} · У {Math.round(r.carbs_g)}
                      </div>
                    </div>
                    <button
                      onClick={() => quickAddRecent(r)}
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-ink text-white"
                      aria-label="Добавить снова"
                    >
                      <Plus size={18} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Способы добавления сворачиваем, если вход из секции дневника */}
            {initialMeal && (
              <button
                onClick={() => {
                  haptic('light')
                  setModesOpen((v) => !v)
                }}
                className="flex items-center gap-2 rounded-3xl bg-card p-4 text-left shadow-card"
              >
                <span className="flex-1 text-sm font-semibold">Другие способы</span>
                <span className="text-muted">{modesOpen ? '⌃' : '⌄'}</span>
              </button>
            )}

            {modesOpen && (
              <>
            <div className="flex flex-col gap-2">
              <ModeButton
                icon={<Camera size={20} />}
                title="Сфотографировать"
                subtitle="ИИ распознает блюдо и посчитает КБЖУ"
                onClick={() => {
                  haptic('light')
                  setMode('photo')
                }}
              />
              <ModeButton
                icon={<Sparkles size={20} />}
                title="Описать текстом"
                subtitle="ИИ оценит КБЖУ по описанию"
                onClick={() => {
                  haptic('light')
                  setMode('text')
                }}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <GridModeButton
                icon={<Search size={18} />}
                title="Быстрый поиск"
                subtitle="База продуктов"
                onClick={() => {
                  haptic('light')
                  setMode('search')
                }}
              />
              <GridModeButton
                icon={<Barcode size={18} />}
                title="Штрихкод"
                subtitle="Скан упаковки"
                onClick={() => {
                  haptic('light')
                  setMode('barcode')
                }}
              />
              <GridModeButton
                icon={<PencilLine size={18} />}
                title="Вручную"
                subtitle="Своё КБЖУ"
                onClick={() => {
                  haptic('light')
                  setMode('manual')
                }}
              />
              <GridModeButton
                icon={<Star size={18} className="text-yellow-400" fill="currentColor" />}
                title="Избранное"
                subtitle="Частые блюда"
                onClick={() => {
                  haptic('light')
                  setMode('favorites')
                }}
              />
            </div>
              </>
            )}
          </div>
        )}

        {/* Ручной ввод / редактирование */}
        {mode === 'manual' && (
          <div className="flex flex-col gap-3">
            <Field label="Название">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Напр. Куриный салат"
                className="input"
              />
            </Field>

            {/* Переключатель режима: на порцию / на 100 г */}
            <div className="flex gap-2 rounded-2xl bg-ink/5 p-1">
              <button
                onClick={() => {
                  haptic('light')
                  setUnitMode('portion')
                  setQty('1')
                }}
                className={`flex-1 rounded-xl py-2 text-sm font-semibold transition-colors ${
                  unitMode === 'portion' ? 'bg-card text-ink shadow-card' : 'text-muted'
                }`}
              >
                На порцию
              </button>
              <button
                onClick={() => {
                  haptic('light')
                  setUnitMode('per100')
                  setQty('100')
                }}
                className={`flex-1 rounded-xl py-2 text-sm font-semibold transition-colors ${
                  unitMode === 'per100' ? 'bg-card text-ink shadow-card' : 'text-muted'
                }`}
              >
                На 100 г
              </button>
            </div>

            <Field
              label={
                unitMode === 'per100'
                  ? 'Калории на 100 г, ккал'
                  : 'Калории на порцию, ккал'
              }
            >
              <input
                value={calories}
                onChange={(e) => setCalories(e.target.value)}
                inputMode="numeric"
                placeholder="0"
                className="input"
              />
            </Field>
            <div className="grid grid-cols-3 gap-2">
              <Field label="Белки, г">
                <input
                  value={protein}
                  onChange={(e) => setProtein(e.target.value)}
                  inputMode="numeric"
                  placeholder="0"
                  className="input"
                />
              </Field>
              <Field label="Жиры, г">
                <input
                  value={fat}
                  onChange={(e) => setFat(e.target.value)}
                  inputMode="numeric"
                  placeholder="0"
                  className="input"
                />
              </Field>
              <Field label="Углев., г">
                <input
                  value={carbs}
                  onChange={(e) => setCarbs(e.target.value)}
                  inputMode="numeric"
                  placeholder="0"
                  className="input"
                />
              </Field>
            </div>

            {/* Количество */}
            <Field
              label={unitMode === 'per100' ? 'Количество, г' : 'Количество порций'}
            >
              <input
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                inputMode="decimal"
                step={unitMode === 'per100' ? 10 : 0.5}
                type="number"
                placeholder={unitMode === 'per100' ? '100' : '1'}
                className="input"
              />
            </Field>

            {/* Живой пересчёт итога */}
            <div className="rounded-2xl bg-ink/5 px-4 py-3 text-center text-sm font-semibold">
              Итого: {computed.calories} ккал · Б {computed.protein_g}г · Ж{' '}
              {computed.fat_g}г · У {computed.carbs_g}г
            </div>

            {/* Чекбокс «Сохранить в избранное» (только при добавлении) */}
            {!isEditing && (
              <button
                onClick={() => {
                  haptic('light')
                  setSaveFav((v) => !v)
                }}
                className="flex items-center gap-2 text-left text-sm font-medium text-ink"
              >
                <Star
                  size={18}
                  className={saveFav ? 'text-yellow-400' : 'text-muted'}
                  fill={saveFav ? 'currentColor' : 'none'}
                />
                Сохранить в избранное
              </button>
            )}

            <button
              onClick={handleManualSave}
              className="mt-1 rounded-2xl bg-ink py-4 text-sm font-semibold text-white"
            >
              {isEditing ? 'Сохранить изменения' : 'Сохранить'}
            </button>

            {/* Удаление записи (только при редактировании) */}
            {isEditing && (
              <button
                onClick={handleDelete}
                className="flex items-center justify-center gap-2 rounded-2xl bg-red-500/10 py-3 text-sm font-semibold text-red-500"
              >
                <Trash2 size={16} /> Удалить запись
              </button>
            )}
          </div>
        )}

        {/* Фото */}
        {mode === 'photo' && (
          <ScanFood onConfirm={handlePhotoConfirm} onManual={() => setMode('manual')} />
        )}

        {/* Описание еды текстом — ИИ считает КБЖУ */}
        {mode === 'text' && (
          <DescribeFood
            onConfirm={handleTextConfirm}
            onManual={() => setMode('manual')}
          />
        )}

        {/* Штрихкод: скан или ручной ввод → Open Food Facts */}
        {mode === 'barcode' && <BarcodeTab meal={meal} onAdded={onClose} />}

        {/* Быстрый поиск по базе продуктов */}
        {mode === 'search' && <SearchTab meal={meal} onAdded={onClose} />}

        {/* Избранное */}
        {mode === 'favorites' && (
          <FavoritesTab meal={meal} onAdded={onClose} />
        )}
      </motion.div>
    </div>
  )
}

function ModeButton({
  icon,
  title,
  subtitle,
  onClick,
}: {
  icon: React.ReactNode
  title: string
  subtitle: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3.5 rounded-3xl bg-card p-4 text-left shadow-card active:bg-ink/[0.03]"
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-ink/5 text-ink">
        {icon}
      </div>
      <div className="flex-1">
        <div className="text-sm font-semibold">{title}</div>
        <div className="mt-0.5 text-[11px] font-medium text-muted">{subtitle}</div>
      </div>
      <span className="text-base text-muted">›</span>
    </button>
  )
}

// Компактная плитка сетки 2×2 (редизайн 1b).
function GridModeButton({
  icon,
  title,
  subtitle,
  onClick,
}: {
  icon: React.ReactNode
  title: string
  subtitle: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col gap-2.5 rounded-3xl bg-card p-4 text-left shadow-card active:bg-ink/[0.03]"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-ink/5 text-ink">
        {icon}
      </div>
      <div>
        <div className="text-[13px] font-semibold">{title}</div>
        <div className="mt-0.5 text-[10px] font-medium text-muted">{subtitle}</div>
      </div>
    </button>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-muted">{label}</span>
      {children}
    </label>
  )
}
