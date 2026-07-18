# -*- coding: utf-8 -*-
"""
Evals точности определения КБЖУ по тексту.
Гоняет кейсы из eval_cases.json через пайплайн и меряет:
  - MAE% — среднюю относительную ошибку калорий;
  - hit-rate — долю попаданий в допуск (tolerance_pct);
  - name accuracy — долю случаев, когда блюдо распознано верно.

Запуск из папки backend:
  python tests/eval_nutrition.py            # пайплайн v2 (RAG)
  python tests/eval_nutrition.py --v1       # старый одношаговый пайплайн
Ансамбль на время evals лучше выключить: AI_ENSEMBLE=0 (меньше rate-limit'ов).
"""
import argparse
import asyncio
import json
import logging
import os
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
logging.disable(logging.WARNING)

CASES_PATH = os.path.join(os.path.dirname(__file__), "eval_cases.json")
SLEEP_BETWEEN = 4  # пауза между запросами — бережём лимиты бесплатных моделей


async def run(pipeline: str):
    if pipeline == "v1":
        from services.openrouter_service import analyze_food_text as analyze
    else:
        from services.nutrition_ai import analyze_text_v2 as analyze

    with open(CASES_PATH, encoding="utf-8") as f:
        cases = json.load(f)

    errors, hits, name_hits, failures = [], 0, 0, 0
    print(f"\n=== Пайплайн: {pipeline} | кейсов: {len(cases)} ===\n")

    for i, case in enumerate(cases, 1):
        desc = case["description"]
        try:
            r = await analyze(desc)
        except Exception as e:  # noqa: BLE001
            print(f"{i:2}. FAIL   {desc[:45]:47} -> {type(e).__name__}")
            failures += 1
            time.sleep(SLEEP_BETWEEN)
            continue

        if "error" in r:
            print(f"{i:2}. NOFOOD {desc[:45]}")
            failures += 1
            time.sleep(SLEEP_BETWEEN)
            continue

        kcal = float(r.get("calories") or 0)
        exp = case["expected_kcal"]
        tol = case["tolerance_pct"]
        err_pct = abs(kcal - exp) / exp * 100
        hit = err_pct <= tol
        blob = (str(r.get("name", "")) + " " + " ".join(map(str, r.get("items", [])))).lower()
        name_ok = case["must_contain"].lower() in blob

        errors.append(err_pct)
        hits += hit
        name_hits += name_ok
        mark = "OK " if hit else "MISS"
        method = r.get("method", "-")
        print(
            f"{i:2}. {mark}  {desc[:45]:47} kcal={kcal:6.0f} (ожид. {exp}±{tol}%) "
            f"err={err_pct:5.1f}% name={'+' if name_ok else '-'} [{method}]"
        )
        time.sleep(SLEEP_BETWEEN)

    n = len(errors)
    print("\n=== ИТОГ ===")
    if n:
        print(f"MAE калорий:     {sum(errors) / n:.1f}%")
        print(f"Попаданий:       {hits}/{n} ({hits / n * 100:.0f}%)")
        print(f"Блюдо распознано: {name_hits}/{n} ({name_hits / n * 100:.0f}%)")
    print(f"Сбоев/отказов:   {failures}/{len(cases)}")


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--v1", action="store_true", help="старый пайплайн")
    args = p.parse_args()
    asyncio.run(run("v1" if args.v1 else "v2"))
