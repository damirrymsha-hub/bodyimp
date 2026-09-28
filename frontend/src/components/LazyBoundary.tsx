import { Component, type ReactNode } from 'react'

// После обновления приложения старый WebView может запросить удалённый чанк.
// Ошибка сети должна оставлять понятный выход, а не белый экран.
export default class LazyBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() {
    if (this.state.failed) return (
      <div role="alert" className="flex min-h-[180px] flex-col items-center justify-center gap-4 p-6 text-center">
        <p>Не удалось открыть экран. Проверьте соединение и обновите приложение.</p>
        <button className="min-h-[44px] rounded-2xl bg-ink px-6 text-white" onClick={() => window.location.reload()}>Обновить</button>
      </div>
    )
    return this.props.children
  }
}
