import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import CalendarStrip from '../components/CalendarStrip'
import ActivityCard, { ActivityRows } from '../components/ActivityCard'
import TabBar from '../components/TabBar'
import TrainingPlan from '../components/TrainingPlan'
import { useUserStore } from '../store/userStore'
import { useUIStore } from '../store/uiStore'
import { dayParts } from '../lib/date'

// Общая дата связывает дневник питания и существующий журнал активности.
export default function Activity() {
  const navigate = useNavigate()
  const { user, loadDay, totals, activities, error } = useUserStore()
  const { selectedDate } = useUIStore()
  useEffect(() => { if (user) void loadDay(selectedDate) }, [user, selectedDate, loadDay])
  if (!user) return null
  const total = totals()
  const { label } = dayParts(selectedDate)
  return (
    <main className="flex min-h-screen flex-col gap-4 px-5 pb-28 pt-6">
      <header className="flex items-center justify-between">
        <div><h1 className="text-xl font-extrabold">Активность</h1><p className="text-sm text-muted">{label}</p></div>
        <button aria-label="Профиль" onClick={() => navigate('/profile')} className="h-11 w-11 rounded-full bg-ink font-bold text-white">{(user.username?.[0] ?? 'Я').toUpperCase()}</button>
      </header>
      <CalendarStrip />
      {error && <div role="alert" className="rounded-2xl bg-card p-3 text-sm">{error}<button onClick={() => void loadDay(selectedDate)} className="ml-2 min-h-[44px] underline">Повторить</button></div>}
      <button onClick={() => navigate('/')} className="min-h-[44px] rounded-3xl bg-card p-4 text-left text-sm shadow-card">
        Питание · {Math.round(total.calories)} / {user.daily_calories} ккал
        <span className="mt-1 block text-muted">Белки {Math.round(total.protein_g)} / {user.daily_protein_g} г</span>
      </button>
      <TrainingPlan selectedDate={selectedDate} />
      <ActivityCard />
      <ActivityRows />
      {activities.length === 0 && <p className="py-4 text-center text-sm text-muted">За этот день активности пока нет. Добавьте ходьбу, кардио или силовую тренировку.</p>}
      <TabBar />
    </main>
  )
}
