/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Палитра минималистичного health-приложения (светлая тема).
        bg: '#F5F7F4',
        card: '#FFFFFF',
        ink: '#182A23',
        // Редизайн 1f: подписи читаемы (AA 4.6:1); старый серый — только декор.
        muted: '#5F6870',
        faint: '#69736D',
        accent: '#111111',
        protein: '#FF7A59',
        fat: '#FFC24B',
        carbs: '#4F9DDE',
        water: '#3BA7F0',
        steps: '#7C5CFC',
        ring: '#111111',
      },
      borderRadius: {
        xl2: '1.75rem',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
      boxShadow: {
        card: '0 2px 12px rgba(0,0,0,0.04)',
      },
    },
  },
  plugins: [],
}
