#!/usr/bin/env python3
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
app = (ROOT / 'js/app.js').read_text(encoding='utf-8')
prob = (ROOT / 'EVENT_PROBABILITY_LIST.md').read_text(encoding='utf-8')
checks = {
    'おやつ大好きが35回に1回': 'const OYATSU_DAISUKI_EVENT_CHANCE = 1 / 35;' in app,
    '熱帯魚死亡倍率が50%': 'const AQUARIUM_FISH_MORTALITY_RATE_MULTIPLIER = 0.5;' in app,
    '最終死亡抽選へ倍率適用': 'return clamp((baseRisk + acclimationRisk) * vulnerability * Math.max(0.2, Number(tankFactor) || 1), 0, 0.45) * AQUARIUM_FISH_MORTALITY_RATE_MULTIPLIER;' in app,
    '旧おやつ4%が残っていない': 'const OYATSU_DAISUKI_EVENT_CHANCE = 0.04;' not in app,
    '確率資料が約1/35': '| おやつ大好き | **2.86%** | 約1/35 |' in prob,
}
failed = [name for name, ok in checks.items() if not ok]
if failed:
    print('AQUARIUM MORTALITY / OYATSU RATE: FAIL')
    for name in failed:
        print(f'- {name}')
    sys.exit(1)
print('AQUARIUM MORTALITY / OYATSU RATE: PASS')
