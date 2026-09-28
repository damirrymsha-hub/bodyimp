// Проверяем реальные зависимости entry, а не только размер одного файла.
import { readFileSync, statSync } from 'node:fs'
const manifest = JSON.parse(readFileSync('dist/.vite/manifest.json', 'utf8'))
function closure(key, files = new Set()) {
  const chunk = manifest[key]
  if (!chunk) throw new Error(`Чанк не найден: ${key}`)
  if (files.has(chunk.file)) return files
  files.add(chunk.file)
  for (const dependency of chunk.imports || []) closure(dependency, files)
  return files
}
const total = (files) => [...files].reduce((sum, file) => sum + statSync(`dist/${file}`).size, 0)
const entry = total(closure('index.html'))
const homeKey = Object.keys(manifest).find((key) => manifest[key].name === 'Home')
const diary = total(closure(homeKey, closure('index.html')))
console.log(JSON.stringify({ entry_bytes: entry, diary_bytes: diary, budget_bytes: 250000 }))
if (entry > 250000) throw new Error('Стартовый JS превышает 250 КБ')
for (const key of ['src/pages/Activity.tsx', 'src/pages/Progress.tsx', 'src/pages/Diagnostics.tsx', 'src/components/BarcodeTab.tsx']) {
  if (!manifest[key]?.isDynamicEntry) throw new Error(`Нет ленивого чанка: ${key}`)
}
