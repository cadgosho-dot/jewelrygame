#!/usr/bin/env python3
"""Protect aquarium fish/plant daily mortality settlement without changing gameplay."""
from pathlib import Path
import re
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
APP = (ROOT / 'js/app.js').read_text(encoding='utf-8')
TEST = (ROOT / 'tools/test-aquarium-mortality-regression.mjs').read_text(encoding='utf-8')
CURRENT = (ROOT / 'scripts/check-current.py').read_text(encoding='utf-8')
SYNC = ROOT / '.github/workflows/phase31-sync-v010920.yml'


def section(name):
    matches = list(re.finditer(r'^function ' + re.escape(name) + r'\(', APP, re.M))
    if len(matches) != 1:
        raise AssertionError(f'{name}: expected exactly one declaration')
    start = matches[0].start()
    following = re.search(r'^function |^async function ', APP[matches[0].end():], re.M)
    return APP[start:matches[0].end() + following.start()] if following else APP[start:]


fish = section('processAquariumFishMortality')
plant = section('processAquariumPlantMortality')

checks = {
    'fish guard and one-processing-per-day marker retained': all(token in fish for token in [
        'if (!state || !aquariumUnlocked()) return [];',
        'if (mortality.lastProcessedDay >= currentDay) return [];',
        'mortality.lastProcessedDay = currentDay;',
    ]),
    'fish only evaluates in-tank individual range': all(token in fish for token in [
        'if (!row || row.inTank <= 0 || !Array.isArray(row.individuals) || !row.individuals.length) continue;',
        'const inTankCount = Math.min(Math.max(0, Math.floor(Number(row.inTank) || 0)), row.individuals.length);',
        'const chance = aquariumIndividualDeathChance(def.id, individual, currentDay, tankFactor);',
        'if (Math.random() < chance) deadIndexes.push(index);',
    ]),
    'fish deaths remove individuals and decrement both tank and ownership counts': all(token in fish for token in [
        'for (let index = deadIndexes.length - 1; index >= 0; index -= 1) row.individuals.splice(deadIndexes[index], 1);',
        'row.inTank = Math.max(0, Math.floor(Number(row.inTank) || 0) - count);',
        'row.owned = Math.max(0, Math.floor(Number(row.owned) || 0) - count);',
        'deaths.push({ id: def.id, name: def.name, count });',
    ]),
    'fish death totals and bounded pending notice retained': all(token in fish for token in [
        'mortality.totalDeaths += total;',
        'mortality.pendingNotices.push({',
        'day: currentDay,',
        'deaths,',
        'mortality.pendingNotices = mortality.pendingNotices.slice(-30);',
    ]),
    'fish mortality mutation increments revision and refreshes load': all(token in fish for token in [
        'aquarium.lastSyncRevision += 1;',
        'refreshAquariumLoad(aquarium);',
    ]),
    'plant guard and one-processing-per-day marker retained': all(token in plant for token in [
        'if (!state || !aquariumUnlocked()) return [];',
        'if (mortality.plantLastProcessedDay >= currentDay) return [];',
        'mortality.plantLastProcessedDay = currentDay;',
    ]),
    'plant only evaluates in-tank individual range': all(token in plant for token in [
        'if (!row || row.inTank <= 0 || !Array.isArray(row.individuals) || !row.individuals.length) continue;',
        'const inTankCount = Math.min(Math.max(0, Math.floor(Number(row.inTank) || 0)), row.individuals.length);',
        'const chance = aquariumIndividualPlantDeathChance(def.id, individual, currentDay, tankFactor);',
        'if (Math.random() < chance) deadIndexes.push(index);',
    ]),
    'plant wither removes individuals and decrements both tank and ownership counts': all(token in plant for token in [
        'for (let index = deadIndexes.length - 1; index >= 0; index -= 1) row.individuals.splice(deadIndexes[index], 1);',
        'row.inTank = Math.max(0, Math.floor(Number(row.inTank) || 0) - count);',
        'row.owned = Math.max(0, Math.floor(Number(row.owned) || 0) - count);',
        'withered.push({ id: def.id, name: def.name, count });',
    ]),
    'plant totals and bounded pending notice retained': all(token in plant for token in [
        'mortality.totalWithered += total;',
        'mortality.plantPendingNotices.push({',
        'day: currentDay,',
        'withered,',
        'mortality.plantPendingNotices = mortality.plantPendingNotices.slice(-30);',
        'aquarium.lastSyncRevision += 1;',
    ]),
    'fish/plant handlers return settlement result lists': fish.rstrip().endswith('return deaths;\n}') and plant.rstrip().endswith('return withered;\n}'),
    'test executes current production functions': "names.map(extractFunction).join('\\n')" in TEST and 'vm.runInContext(source, ctx' in TEST,
    'registered in audit or pending formal sync': 'check-aquarium-mortality-regression.py' in CURRENT or (SYNC.is_file() and 'check-aquarium-mortality-regression.py' in SYNC.read_text(encoding='utf-8')),
}

for name in [
    'testLockedAndSameDayGuards',
    'testFishNoDeathStillMarksDay',
    'testFishDeathsUpdateCountsNoticeAndRevision',
    'testPlantNoWitherStillMarksDay',
    'testPlantWitherUpdatesCountsNoticeAndRevision',
]:
    checks[f'regression retained: {name}'] = TEST.count(name) >= 2

for name, ok in checks.items():
    print(f"{'OK' if ok else 'NG'}: {name}")
if not all(checks.values()):
    sys.exit('AQUARIUM MORTALITY PROTECTION: FAIL')

result = subprocess.run(['node', str(ROOT / 'tools/test-aquarium-mortality-regression.mjs')], cwd=ROOT)
if result.returncode:
    sys.exit(result.returncode)
print('AQUARIUM MORTALITY PROTECTION: PASS')
