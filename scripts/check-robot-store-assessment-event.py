#!/usr/bin/env python3
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[1]
BOOT = (ROOT / 'js/event-bootstrap.js').read_text(encoding='utf-8')
EVENT = (ROOT / 'js/events/robot-store-assessment-event.js').read_text(encoding='utf-8')
RULES = (ROOT / 'js/events/robot-store-assessment-rules.js').read_text(encoding='utf-8')
ASSET = ROOT / 'assets/images/events/store-assessment-robot.png'

registered_lines = [
    '店舗データの収集を開始します。……評価対象を認識しました。',
    'ショーケース確認。商品が十分に並んでいます。選択肢は良好です。',
    'ショーケース確認。空きが目立ちます。……空間を販売しているのでしょうか。',
    'ルース在庫確認。種類は豊富です。比較して選べる状態です。',
    'ルース在庫確認。種類が偏っています。追加収集を推奨します。',
    'カット構成確認。複数のカットが揃っています。展示に変化があります。',
    'カット構成確認。同じカットが続いています。バリエーション不足です。',
    '総合評価を算出中……。',
    '評価データを保存しました。次回も確認します。',
]

checks = [
    ('event bootstrap import registered', "import './events/robot-store-assessment-event.js?v=0.10.964';" in BOOT),
    ('store branch tap is the only trigger action', "action !== 'open-store-branch'" in EVENT and "triggerAction:'open-store-branch'" in EVENT),
    ('selected branch id is used', 'buildRobotStoreAssessmentDialogue(stateSnapshot, branchId)' in EVENT),
    ('about once per thirty in-game days', 'ROBOT_STORE_ASSESSMENT_TRIGGER_CHANCE = 1 / 30' in RULES),
    ('same in-game day does not reroll by repeated tapping', 'Number(current.lastRollDay) === day' in EVENT),
    ('normal event UI classes retained', 'visit-character-event kappa-jade-event' in EVENT and 'event-dialogue-card visit-event-dialogue glass-panel' in EVENT),
    ('normal event recovery button retained', 'event-safety-recovery' in EVENT),
    ('approved character asset path retained', 'assets/images/events/store-assessment-robot.png' in EVENT),
    ('character asset exists', ASSET.exists()),
    ('showcase fullness is evaluated', 'filledSlots' in RULES and 'totalSlots' in RULES),
    ('loose variety is evaluated from owned inventory', 'ownedGemIds' in RULES and 'possibleGemCount' in RULES),
    ('loose cut variety is evaluated from owned inventory', 'ownedCuts' in RULES and 'possibleCutCount' in RULES),
    ('high and standard thresholds retained', 'ROBOT_STORE_ASSESSMENT_HIGH_RATIO = 0.8' in RULES and 'ROBOT_STORE_ASSESSMENT_STANDARD_RATIO = 0.5' in RULES),
    ('registered dialogue preserved', all(line in RULES for line in registered_lines)),
    ('robot resume does not cascade into another store assessment', 'OWN_RESUME_KEY' in EVENT and 'anotherEventResume' in EVENT),
]

failed = []
for label, ok in checks:
    print(('OK' if ok else 'NG') + ': ' + label)
    if not ok:
        failed.append(label)

if failed:
    raise SystemExit('ROBOT STORE ASSESSMENT PROTECTION: FAIL')

proc = subprocess.run(['node', str(ROOT / 'tools/test-robot-store-assessment-event.mjs')], cwd=ROOT)
if proc.returncode:
    raise SystemExit(proc.returncode)

print('ロボット店舗評価イベントの発生条件・評価軸・通常イベントUI・登録済みセリフを固定しました。')
print('ROBOT STORE ASSESSMENT PROTECTION: PASS')
