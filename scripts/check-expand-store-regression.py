#!/usr/bin/env python3
from pathlib import Path
import re
import subprocess

ROOT = Path(__file__).resolve().parents[1]
APP = (ROOT / 'js/app.js').read_text(encoding='utf-8')
TEST = (ROOT / 'tools/test-expand-store-regression.mjs').read_text(encoding='utf-8')
CURRENT = (ROOT / 'scripts/check-current.py').read_text(encoding='utf-8')
SYNC = ROOT / '.github/workflows/phase20-sync-v010909.yml'
SYNC_TEXT = SYNC.read_text(encoding='utf-8') if SYNC.exists() else ''


def function_body(signature):
    start = APP.find(signature)
    if start < 0:
        return ''
    end = APP.find('\nfunction ', start + 1)
    return APP[start:end if end >= 0 else len(APP)]


conditions = function_body('function storeExpansionConditions(branch = currentStoreBranch()) {')
eligible = function_body('function expansionEligible() {')
expand = function_body('function expandStore() {')

requirements_match = re.search(
    r"const STORE_EXPANSION_REQUIREMENTS = Object\.freeze\(\{\s*"
    r"salesCount:\s*20,\s*"
    r"totalRevenue:\s*500000,\s*"
    r"orderDeliveries:\s*3,\s*"
    r"storePoints:\s*30,\s*"
    r"storeRating:\s*55,\s*"
    r"money:\s*300000,\s*"
    r"cost:\s*300000,\s*"
    r"\}\);",
    APP,
    re.S,
)

checks = [
    ('storeExpansionConditions definition exists once', APP.count('function storeExpansionConditions(branch = currentStoreBranch()) {') == 1),
    ('expansionEligible definition exists once', APP.count('function expansionEligible() {') == 1),
    ('expandStore definition exists once', APP.count('function expandStore() {') == 1),
    ('exact expansion requirements retained', requirements_match is not None),
    ('sales count source retained', 'state.store.salesCount' in conditions),
    ('total revenue source retained', 'state.store.totalRevenue' in conditions),
    ('order deliveries source retained', 'branch?.orderDeliveries' in conditions),
    ('store points source retained', 'branch?.points' in conditions),
    ('store rating source retained', 'storeRating(branch)' in conditions),
    ('money source retained', 'state.game.money' in conditions),
    ('sales threshold retained', 'salesCount >= STORE_EXPANSION_REQUIREMENTS.salesCount' in conditions),
    ('order delivery threshold retained', 'orderDeliveries >= STORE_EXPANSION_REQUIREMENTS.orderDeliveries' in conditions),
    ('revenue threshold retained', 'totalRevenue >= STORE_EXPANSION_REQUIREMENTS.totalRevenue' in conditions),
    ('store points threshold retained', 'storePoints >= STORE_EXPANSION_REQUIREMENTS.storePoints' in conditions),
    ('rating threshold retained', 'rating >= STORE_EXPANSION_REQUIREMENTS.storeRating' in conditions),
    ('money threshold retained', 'money >= STORE_EXPANSION_REQUIREMENTS.money' in conditions),
    ('eligibility first branch guard retained', 'Number(currentStoreBranch()?.number) === 1' in eligible),
    ('eligibility rented guard retained', 'state.store.rented' in eligible),
    ('eligibility not-expanded guard retained', '!state.store.expanded' in eligible),
    ('eligibility all conditions retained', 'storeExpansionConditions().every((condition) => condition.met)' in eligible),
    ('expand first branch guard retained', 'Number(currentStoreBranch()?.number) !== 1 || !expansionEligible()' in expand),
    ('expansion cost lookup retained', 'const cost = STORE_EXPANSION_REQUIREMENTS.cost;' in expand),
    ('money deduction retained', 'state.game.money -= cost;' in expand),
    ('money feedback retained', 'startMoneyFeedback(-cost);' in expand),
    ('expanded flag retained', 'state.store.expanded = true;' in expand),
    ('installed showcase sync retained', 'state.store.showcaseCount = installedShowcaseCount();' in expand),
    ('finished jewelry capacity sync retained', 'syncFinishedJewelryCapacity();' in expand),
    ('finance record retained', "addFinance('店舗を拡大', 0, cost);" in expand),
    ('notification retained', "addNotification('店舗を拡大しました', 'ショーケースを最大3台まで設置でき、店舗スタッフを1人雇えるようになりました。');" in expand),
    ('save retained', 'saveGame();' in expand),
    ('toast retained', "showToast('店舗を拡大しました。', 'info', false);" in expand),
    ('render retained', 'render();' in expand),
    ('no time cost retained', all(token not in expand for token in ('spendHours(', 'spendMinutes(', 'advanceTime(', 'canSpendHours(', 'canSpendMinutes('))),
    ('dynamic harness extracts conditions', "extractFunction('storeExpansionConditions')" in TEST),
    ('dynamic harness extracts eligibility', "extractFunction('expansionEligible')" in TEST),
    ('dynamic harness extracts expandStore', "extractFunction('expandStore')" in TEST),
    ('exact threshold regression case', 'testExactThresholdConditionsAreEligible' in TEST),
    ('successful expansion regression case', 'testSuccessfulExpansionProtectsMoneyStateAccountingAndFeedback' in TEST),
    ('each threshold guard regression case', 'testEachRequirementBelowThresholdBlocksExpansion' in TEST),
    ('branch/rental/already expanded regression case', 'testBranchRentalAndAlreadyExpandedGuards' in TEST),
    ('double-charge regression case', 'testSecondExpansionCannotChargeTwice' in TEST),
    ('current audit registration or sync registration', 'check-expand-store-regression.py' in CURRENT or 'check-expand-store-regression.py' in SYNC_TEXT),
]

failed = []
for label, ok in checks:
    print(('OK' if ok else 'NG') + ': ' + label)
    if not ok:
        failed.append(label)
if failed:
    raise SystemExit('EXPAND STORE PROTECTION: FAIL')

proc = subprocess.run(['node', str(ROOT / 'tools/test-expand-store-regression.mjs')], cwd=ROOT, text=True)
if proc.returncode:
    raise SystemExit(proc.returncode)
print('店舗拡大の6条件・拡張費・所持金・拡張状態・ショーケース数・完成品容量同期・収支・通知・保存・二重課金防止・時間非消費を固定しました。')
print('EXPAND STORE PROTECTION: PASS')
