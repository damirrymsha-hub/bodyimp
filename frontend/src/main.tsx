import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
// ВАЖНО: перехват подписи Telegram должен произойти ДО монтирования роутера,
// поэтому модуль импортируется первым (он читает адресную строку при загрузке).
import './lib/initData'
import App from './App'
import './index.css'
import { initTelegram } from './lib/telegram'

// Инициализируем Telegram WebApp до рендера.
initTelegram()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {/*
      BrowserRouter, а не HashRouter: Telegram передаёт подпись в hash-фрагменте
      (#tgWebAppData=...), и HashRouter затирал её при первом же рендере — после
      перезагрузки WebView подпись исчезала и сервер отвечал 401.
      Маршруты на статике работают благодаря rewrites в vercel.json.
    */}
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)
