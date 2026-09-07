#!/usr/bin/env python3
"""Protect artisan progression and level correction helpers without changing gameplay."""
from pathlib import Path
import re
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
APP = (ROOT / 'js/app.js').read_text(encoding='utf-8')
TEST = (ROOT / 'tools/test-artisan-progression-regression.mjs').read_text(encoding='utf-8')
CURRENT = (ROOT / 'scripts/check-current.py').read_text(encoding='utf-8')
SYNC = ROOT / '.github/workflows/phase42-sync-v010931.yml'


def section(name):
    matches = list(re.finditer(r'^(?:async\s+)?function ' + re.escape(name) + r'\(', APP, re.M))
    if len(matches) != 1:
        raise AssertionError(f'{name}: expected exactly one declaration')
    start = matches[0].start()
    following = re.search(r'^(?:async\s+)?function ', APP[matches[0].end():], re.M)
    return APP[start:matches[0].end() + following.start()] if following else APP[start:]


level_for_xp = section('artisanLevelForXp')
add_xp = section('addArtisanXp')
apply_penalty = section('applyArtisanLevelPenalty')
recover_penalty = section('recoverArtisanLevelPenalty')

checks = {
    'artisanLevelForXp definition exists once': APP.count('function artisanLevelForXp(') == 1,
    'addArtisanXp definition exists once': APP.count('function addArtisanXp(') == 1,
    'applyArtisanLevelPenalty definition exists once': APP.count('function applyArtisanLevelPenalty(') == 1,
    'recoverArtisanLevelPenalty definition exists once': APP.count('function recoverArtisanLevelPenalty(') == 1,
    'artisan base level retained': 'const base = artisanBaseLevelForXp(xp);' in level_for_xp,
    'artisan penalty normalization retained': 'Math.max(0, Math.floor(Number(state?.artisan?.levelPenalty) || 0))' in level_for_xp,
    'artisan level clamp retained': 'return Math.max(1, Math.min(20, base - penalty));' in level_for_xp,
    'xp gain normalization retained': 'const gain = Math.max(0, Math.floor(Number(amount) || 0));' in add_xp,
    'zero xp gain guard retained': 'if (!gain) return;' in add_xp,
    'previous artisan level retained': 'const previousLevel = Math.max(1, Number(state.artisan.level) || 1);' in add_xp,
    'xp accumulation retained': 'state.artisan.xp = Math.max(0, Math.floor(Number(state.artisan.xp) || 0)) + gain;' in add_xp,
    'level recalculation after xp retained': 'state.artisan.level = artisanLevelForXp(state.artisan.xp);' in add_xp,
    'peak level monotonic update retained': 'state.artisan.peakLevel = Math.max(Number(state.artisan.peakLevel) || 1, state.artisan.level);' in add_xp,
    'level-up notification guard retained': 'if (state.artisan.level > previousLevel)' in add_xp,
    'level-up notification retained': "addNotification('職人レベルが上がりました'" in add_xp and 'artisanTitle(state.artisan.level)' in add_xp,
    'polish xp call retained': 'addArtisanXp(1);' in APP,
    'craft xp call retained': 'addArtisanXp(xp);' in APP,
    'penalty amount clamp retained': 'Math.max(1, Math.min(2, Math.floor(Number(levels) || 1)))' in apply_penalty,
    'penalty accumulation retained': 'state.artisan.levelPenalty = Math.max(0, Math.floor(Number(state.artisan.levelPenalty) || 0)) + amount;' in apply_penalty,
    'penalty level recalculation retained': 'state.artisan.level = artisanLevelForXp(state.artisan.xp);' in apply_penalty,
    'penalty notification retained': "addNotification('職人レベルが低下しました'" in apply_penalty and "'warning'" in apply_penalty,
    'penalty returns level retained': 'return state.artisan.level;' in apply_penalty,
    'recovery amount clamp retained': 'Math.max(1, Math.min(2, Math.floor(Number(levels) || 1)))' in recover_penalty,
    'recovery floor zero retained': 'state.artisan.levelPenalty = Math.max(0, Math.floor(Number(state.artisan.levelPenalty) || 0) - amount);' in recover_penalty,
    'recovery level recalculation retained': 'state.artisan.level = artisanLevelForXp(state.artisan.xp);' in recover_penalty,
    'recovery peak update retained': 'state.artisan.peakLevel = Math.max(Number(state.artisan.peakLevel) || 1, state.artisan.level);' in recover_penalty,
    'recovery notification retained': "addNotification('職人レベルが回復しました'" in recover_penalty and "'success'" in recover_penalty,
    'recovery returns level retained': 'return state.artisan.level;' in recover_penalty,
    'dynamic test extracts production helpers': all(token in TEST for token in [
        "extractFunction('artisanLevelForXp')",
        "extractFunction('addArtisanXp')",
        "extractFunction('applyArtisanLevelPenalty')",
        "extractFunction('recoverArtisanLevelPenalty')",
        'vm.runInContext(source, ctx',
    ]),
    'registered in audit or pending formal sync': 'check-artisan-progression-regression.py' in CURRENT or (SYNC.is_file() and 'check-artisan-progression-regression.py' in SYNC.read_text(encoding='utf-8')),
}

for name in [
    'testArtisanLevelForXpAppliesPenaltyAndClamps',
    'testAddArtisanXpIgnoresInvalidOrNonPositiveGain',
    'testAddArtisanXpNormalizesAndAccumulatesXp',
    'testAddArtisanXpRecalculatesLevelAndPeakLevel',
    'testAddArtisanXpNotifiesOnlyOnLevelIncrease',
    'testApplyArtisanLevelPenaltyClampsAmountAndNotifiesOnDrop',
    'testApplyArtisanLevelPenaltyUsesMinimumOne',
    'testRecoverArtisanLevelPenaltyFloorsAtZeroUpdatesPeakAndNotifies',
    'testPenaltyAndRecoveryDoNotNotifyWithoutLevelChange',
]:
    checks[f'regression retained: {name}'] = TEST.count(name) >= 2

for name, ok in checks.items():
    print(f"{'OK' if ok else 'NG'}: {name}")
if not all(checks.values()):
    sys.exit('ARTISAN PROGRESSION PROTECTION: FAIL')

result = subprocess.run(['node', str(ROOT / 'tools/test-artisan-progression-regression.mjs')], cwd=ROOT)
if result.returncode:
    sys.exit(result.returncode)
print('ARTISAN PROGRESSION PROTECTION: PASS')
