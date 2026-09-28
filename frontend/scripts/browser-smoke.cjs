// Локальная проверка реальной сборки: все API-ответы синтетические, прод не меняется.
const { chromium } = require(process.env.BODYIMP_PLAYWRIGHT_PATH || 'playwright')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const output = process.env.BODYIMP_TEST_OUTPUT || 'test-artifacts'

async function main() {
  fs.mkdirSync(output, { recursive: true })
  const browser = await chromium.launch({ headless: true, executablePath: process.env.BODYIMP_BROWSER_PATH || undefined })
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' })
    const entries = []
    const errors = []
    const page = await context.newPage()
    page.on('pageerror', (e) => errors.push(e.message))
    await context.addInitScript(() => {
      localStorage.setItem('bodyimp_jwt', 'local-smoke-token')
      localStorage.setItem('bodyimp_tid', '99000001')
    })
    await context.route('**/*', async (route) => {
      const url = new URL(route.request().url())
      if (url.origin !== 'http://127.0.0.1:4173') return route.abort()
      if (!url.pathname.startsWith('/api/')) return route.continue()
      const path = url.pathname
      let data = []
      if (path.startsWith('/api/users/')) data = { id: 1, telegram_id: 99000001, username: 'test', age: 25, gender: 'male', height_cm: 180, weight_kg: 80, goal: 'maintain', activity_level: 'moderate', daily_calories: 2300, daily_protein_g: 140, daily_fat_g: 70, daily_carbs_g: 280 }
      else if (path.includes('/streak/')) data = { streak: 3 }
      else if (path.includes('/weekly/')) data = { days: [], avg_calories: 1800 }
      else if (path.includes('/water/')) data = { date: '2026-09-28', total_ml: 0 }
      else if (path === '/api/food/add') {
        data = { ...route.request().postDataJSON(), id: entries.length + 1, created_at: new Date().toISOString() }
        entries.push(data)
      } else if (path.includes('/food/today/')) data = entries.filter((e) => e.date === url.searchParams.get('date'))
      else if (path === '/api/food-search/') data = [{ id: 1, name: 'Яблоко', category: 'Фрукты', calories_per_100g: 52, protein_per_100g: 0.3, fat_per_100g: 0.2, carbs_per_100g: 14, portion_type: 'piece', piece_weight_g: 180, default_amount: 1 }]
      else if (path.startsWith('/api/analyze/')) data = { success: true, data: { name: 'Омлет', calories: 300, protein_g: 20, fat_g: 15, carbs_g: 10, confidence: 'high', portion_g: 200 } }
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(data) })
    })
    await page.goto('http://127.0.0.1:4173/')
    await page.getByRole('button', { name: 'Фото', exact: true }).waitFor({ timeout: 10000 }).catch(async (error) => {
      console.error('Runtime errors:', errors, 'Screen:', await page.locator('body').innerText())
      await page.screenshot({ path: `${output}/failure.png`, fullPage: true })
      throw error
    })
    for (const width of [320, 390, 1024]) {
      await page.setViewportSize({ width, height: 844 })
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'No horizontal overflow at ' + width)
    }
    await page.setViewportSize({ width: 390, height: 844 })
    await page.screenshot({ path: `${output}/nutrition-mobile.png`, fullPage: true })
    await page.getByRole('button', { name: 'Ещё', exact: true }).click()
    await page.getByRole('dialog').waitFor()
    await page.screenshot({ path: `${output}/food-menu-mobile.png`, fullPage: true })
    await page.getByRole('button', { name: /Быстрый поиск/ }).click()
    await page.getByRole('button', { name: 'Добавить: Яблоко', exact: true }).click()
    await page.getByRole('dialog', { name: 'Количество продукта' }).waitFor()
    await page.setViewportSize({ width: 320, height: 640 })
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    await page.getByLabel('Количество, штук').fill('2')
    assert.ok(await page.getByRole('button', { name: 'Добавить · 187 ккал' }).isEnabled())
    await page.keyboard.press('Escape')
    await page.getByRole('dialog', { name: 'Количество продукта' }).waitFor({ state: 'detached' })
    assert.equal(await page.getByRole('dialog').count(), 1)
    await page.setViewportSize({ width: 390, height: 844 })
    await page.keyboard.press('Tab')
    assert.ok(await page.evaluate(() => !!document.activeElement.closest('[role=dialog]')))
    await page.keyboard.press('Escape')
    await page.getByRole('dialog').waitFor({ state: 'detached' })
    assert.equal(await page.evaluate(() => document.activeElement.textContent.trim()), 'Ещё')
    await page.getByRole('button', { name: 'Предыдущая неделя', exact: true }).click()
    assert.equal(await page.getByRole('button', { name: 'Сегодня', exact: true }).isEnabled(), true)
    await page.getByRole('button', { name: 'Сегодня', exact: true }).click()
    await page.getByRole('button', { name: 'Текст', exact: true }).click()
    await page.getByRole('button', { name: 'Завтрак', exact: true }).click()
    await page.locator('textarea').fill('Два яйца и кусок хлеба')
    await page.getByRole('button', { name: 'Определить КБЖУ', exact: true }).click()
    await page.getByRole('button', { name: 'Добавить', exact: true }).click()
    await page.getByRole('button', { name: 'Фото', exact: true }).waitFor()
    assert.equal(entries[0].meal_type, 'breakfast')
    assert.equal(entries[0].source, 'text')
    await page.getByRole('button', { name: 'Фото', exact: true }).click()
    await page.getByRole('button', { name: 'Обед', exact: true }).click()
    await page.locator('input[type=file]').setInputFiles({ name: 'food.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Zl1sAAAAASUVORK5CYII=', 'base64') })
    await page.getByRole('button', { name: 'Добавить', exact: true }).click()
    await page.getByRole('button', { name: 'Фото', exact: true }).waitFor()
    assert.equal(entries[1].meal_type, 'lunch')
    assert.equal(entries[1].source, 'photo')
    await page.getByRole('button', { name: 'Активность', exact: true }).click()
    await page.getByRole('heading', { name: 'Активность' }).waitFor()
    await page.screenshot({ path: `${output}/activity-mobile.png`, fullPage: true })
    await page.getByRole('button', { name: 'Профиль', exact: true }).click()
    await page.getByRole('heading', { name: 'Профиль', exact: true }).waitFor()
    await page.screenshot({ path: `${output}/profile-mobile.png`, fullPage: true })
    await page.getByRole('button', { name: /Мой прогресс/ }).click()
    await page.getByRole('heading', { name: 'Прогресс' }).waitFor()
    assert.equal(await page.locator('nav button').count(), 2)
    assert.deepEqual(errors, [])
    console.log('PASS: 320/390/1024px, calendar buttons, nested dialogs/focus/Escape, portion calculation, text/photo meal selection, profile/progress, no runtime errors')
    await context.close()
  } finally { await browser.close() }
}
main().catch((error) => { console.error(error); process.exitCode = 1 })
