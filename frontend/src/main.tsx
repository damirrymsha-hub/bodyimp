import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App'
import './index.css'
import { initTelegram } from './lib/telegram'

// Инициализируем Telegram WebApp до рендера.
initTelegram()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {/* HashRouter — чтобы маршрутизация работала на статике (Pages/Netlify) */}
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>,
)
