// Конфигурация модульных тестов (jsdom — нужен для localStorage и location).
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.ts'],
  },
})
