#!/usr/bin/env python3
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
APP = (ROOT / 'js/app.js').read_text(encoding='utf-8')
BOOT = (ROOT / 'js/event-bootstrap.js').read_text(encoding='utf-8')
EVENT = (ROOT / 'js/events/bulldog-store-assessment-event.js').read_text(encoding='utf-8')
RULES = (ROOT / 'js/events/bulldog-store-assessment-rules.js').read_text(encoding='utf-8')
ASSET = ROOT / 'assets/images/events/bulldog-store-assessment.png'

checks = [
    ('store snapshot exposed to standalone event', 'store:state.store' in APP or 'store: state.store' in APP),
    ('event bootstrap import registered', "import './events/bulldog-store-assessment-event.js?v=" in BOOT),
    ('event bootstrap contains no escaped newline artifact', '\\\\nimport ' not in BOOT),
    ('store branch tap is the only trigger action', "action !== 'open-store-branch'" in EVENT and "triggerAction:'open-store-branch'" in EVENT),
    ('selected branch id is used', 'buildBulldogStoreAssessmentDialogue(stateSnapshot, branchId)' in EVENT),
    ('about once per thirty in-game days', 'BULLDOG_STORE_ASSESSMENT_TRIGGER_CHANCE = 1 / 30' in RULES),
    ('same in-game day does not reroll by repeated tapping', 'Number(current.lastRollDay) === day' in EVENT),
    ('normal event UI classes retained', 'visit-character-event kappa-jade-event' in EVENT and 'event-dialogue-card visit-event-dialogue glass-panel' in EVENT),
    ('normal event recovery button retained', 'event-safety-recovery' in EVENT),
    ('approved character asset path retained', "assets/images/events/bulldog-store-assessment.png" in EVENT),
    ('character asset exists', ASSET.exists()),
    ('good-majority output is 2 good plus 1 bad', 'const desiredGood = goodMajority ? 2 : 1;' in RULES and 'const desiredBad = goodMajority ? 1 : 2;' in RULES),
    ('tie follows bad-majority output', 'Number(assessment.goodCount) > Number(assessment.badCount)' in RULES),
    ('registered dialogue variants retained', 'ショーケースの余白を売るつもりかい？' in RULES and '次に来た時も同じ品揃えだったら' in RULES),
]

failed = []
for label, ok in checks:
    print(('OK' if ok else 'NG') + ': ' + label)
    if not ok:
        failed.append(label)

if failed:
    raise SystemExit('BULLDOG STORE ASSESSMENT PROTECTION: FAIL')

proc = subprocess.run(['node', str(ROOT / 'tools/test-bulldog-store-assessment-event.mjs')], cwd=ROOT)
if proc.returncode:
    raise SystemExit(proc.returncode)

print('ブルドッグ夫人の店舗選択時発生・選択店舗限定評価・コメント比率・通常イベントUI・登録済みセリフを固定しました。')
print('BULLDOG STORE ASSESSMENT PROTECTION: PASS')
