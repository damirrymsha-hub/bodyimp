// Галерея реальных SVG из сборки; сеть только localhost, рабочие аккаунты не используются.
const { chromium } = require(process.env.BODYIMP_PLAYWRIGHT_PATH || 'playwright')
const fs = require('node:fs')
const assert = require('node:assert/strict')
async function main() {
  const out = process.env.BODYIMP_TEST_OUTPUT || 'test-artifacts'
  fs.mkdirSync(out, { recursive: true })
  const exercises = [...fs.readFileSync('../backend/data/training_exercises.py', 'utf8').matchAll(/^    \("([a-z_]+)", "([^"]+)", "([^"]+)"/gm)].map(m => ({ id: m[1], name: m[2], pattern: m[3], muscles: '', sets: 2, rep_min: 10, rep_max: 20, rir_target: 3, rest_s: 120, cues: [] }))
  const browser = await chromium.launch({ executablePath: process.env.BODYIMP_BROWSER_PATH || undefined })
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
    const errors = []; page.on('pageerror', e => errors.push(e.message))
    await page.addInitScript(() => { localStorage.setItem('bodyimp_jwt', 'local-smoke-token'); localStorage.setItem('bodyimp_tid', '99000001') })
    const today = new Date().toLocaleDateString('sv-SE')
    await page.route('**/*', async route => {
      const u = new URL(route.request().url())
      if (u.origin !== 'http://127.0.0.1:4173') return route.abort()
      if (!u.pathname.startsWith('/api/')) return route.continue()
      let data = []
      if (u.pathname.startsWith('/api/users/')) data = { id: 1, telegram_id: 99000001, username: 'test', age: 25, daily_calories: 2000, daily_protein_g: 120 }
      if (u.pathname === '/api/training/week') data = { start: today, profile: { goal: 'health', weekdays: [0], session_minutes: 60 }, notes: [], days: [{ date: today, program_id: 1, plan: { title: 'Проверка иллюстраций', exercises, estimated_minutes: 60, warmup_minutes: 5, cardio_minutes: 0 } }] }
      if (u.pathname.includes('/water/')) data = { total_ml: 0 }
      await route.fulfill({ contentType: 'application/json', body: JSON.stringify(data) })
    })
    await page.goto('http://127.0.0.1:4173/activity')
    const gallery = [[], []]
    for (const e of exercises) {
      await page.getByRole('button', { name: `Как выполнять: ${e.name}`, exact: true }).click()
      const dialog = page.getByRole('dialog', { name: e.name, exact: true })
      await dialog.waitFor()
      for (const phase of [0, 1]) {
        await dialog.getByRole('button', { name: phase ? '2. Движение' : '1. Исходное', exact: true }).click()
        const svg = await dialog.locator('svg[role=img]').evaluate(el => el.outerHTML)
        gallery[phase].push(`<article><h3>${e.name}</h3>${svg}</article>`)
      }
      await page.keyboard.press('Escape')
    }
    assert.deepEqual(errors, [])
    await page.setViewportSize({ width: 1120, height: 800 })
    for (const phase of [0, 1]) {
      await page.setContent(`<html><meta charset="utf-8"><style>body{margin:12px;background:#f5f7f4;font:14px sans-serif;display:grid;grid-template-columns:repeat(4,1fr);gap:8px}article{background:white;padding:8px;border-radius:12px}h3{height:36px;font-size:13px}svg{width:240px;height:240px}</style>${gallery[phase].join('')}</html>`)
      await page.screenshot({ path: `${out}/exercise-gallery-${phase}.png`, fullPage: true })
    }
    console.log(`PASS: ${exercises.length} instructions, 52 SVG phases, no runtime errors`)
  } finally { await browser.close() }
}
main().catch(e => { console.error(e); process.exitCode = 1 })
