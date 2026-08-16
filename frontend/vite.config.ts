import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Конфигурация Vite.
// base: '/' — приложение живёт в корне домена, и маршруты вида /profile
// обслуживаются через rewrites в vercel.json. Относительный base ('./')
// ломал бы подгрузку ассетов при перезагрузке на вложенном маршруте.
// Настройки тестов вынесены в vitest.config.ts.
export default defineConfig({
  plugins: [react()],
  base: '/',
  server: {
    host: true,
    port: 5173,
    // Разрешаем хосты туннелей (Cloudflare/localtunnel), иначе Vite 6 их блокирует.
    allowedHosts: ['.trycloudflare.com', '.loca.lt'],
  },
})
