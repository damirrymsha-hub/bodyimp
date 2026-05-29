import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Конфигурация Vite. base: './' — чтобы сборка работала на GitHub Pages / поддиректориях.
export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    host: true,
    port: 5173,
    // Разрешаем хосты туннелей (Cloudflare/localtunnel), иначе Vite 6 их блокирует.
    allowedHosts: ['.trycloudflare.com', '.loca.lt'],
  },
})
