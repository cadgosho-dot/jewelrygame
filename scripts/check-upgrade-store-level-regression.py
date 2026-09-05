#!/usr/bin/env python3
from pathlib import Path
import hashlib
import subprocess

ROOT = Path(__file__).resolve().parents[1]
APP = (ROOT / 'js/app.js').read_text(encoding='utf-8')
CORE = (ROOT / 'js/game-data-core.js').read_text(encoding='utf-8')
TEST = (ROOT / 'tools/test-upgrade-store-level-regression.mjs').read_text(encoding='utf-8')
CURRENT = (ROOT / 'scripts/check-current.py').read_text(encoding='utf-8')
SYNC = ROOT / '.github/workflows/phase22-sync-v010911.yml'
SYNC_TEXT = SYNC.read_text(encoding='utf-8') if SYNC.exists() else ''
EXPECTED_REQUIREMENTS_SHA256 = '2f6cc2a876ec531904bfd736ce4a6c1fffe1d9fbdbdb99ea3f58511d8f6f51ff'


def function_body(signature):
    start = APP.find(signature)
    if start < 0:
        return ''
    end = APP.find('\nfunction ', start + 1)
    return APP[start:end if end >= 0 else len(APP)]


def requirement_block():
    marker = 'export const STORE_LEVEL_REQUIREMENTS = Object.freeze(['
    start = CORE.find(marker)
    if start < 0:
        return ''
    end_marker = ')));'
    end = CORE.find(end_marker, start)
    if end < 0:
        return ''
    return CORE[start:end + len(end_marker)]


level = function_body('function storeLevel(branch = currentStoreBranch()) {')
rating = function_body('function storeRating(branch = currentStoreBranch()) {')
requirement = function_body('function storeLevelRequirement(level) {')
status = function_body('function storeUpgradeStatus(branch = currentStoreBranch()) {')
sync = function_body('function syncStoreLevel(branch = currentStoreBranch()) {')
upgrade = function_body('function upgradeStoreLevel(branch = currentStoreBranch()) {')
req_block = requirement_block()
req_hash = hashlib.sha256(req_block.encode()).hexdigest() if req_block else ''

checks = [
    ('storeLevel definition exists once', APP.count('function storeLevel(branch = currentStoreBranch()) {') == 1),
    ('storeRating definition exists once', APP.count('function storeRating(branch = currentStoreBranch()) {') == 1),
    ('storeLevelRequirement definition exists once', APP.count('function storeLevelRequirement(level) {') == 1),
    ('storeUpgradeStatus definition exists once', APP.count('function storeUpgradeStatus(branch = currentStoreBranch()) {') == 1),
    ('syncStoreLevel definition exists once', APP.count('function syncStoreLevel(branch = currentStoreBranch()) {') == 1),
    ('upgradeStoreLevel definition exists once', APP.count('function upgradeStoreLevel(branch = currentStoreBranch()) {') == 1),
    ('exact store level requirement table retained', req_hash == EXPECTED_REQUIREMENTS_SHA256),
    ('store level clamps 1 through 20', 'Math.max(1, Math.min(20, Math.floor(Number(value) || 1)))' in level),
    ('store rating clamps 0 through 100', 'Math.max(0, Math.min(100, Number.isFinite(numeric) ? Math.round(numeric) : 50))' in rating),
    ('requirement table lookup retained', 'STORE_LEVEL_REQUIREMENTS.find((entry) => Number(entry.level) === Number(level)) || null' in requirement),
    ('status reads current level', 'const current = storeLevel(branch);' in status),
    ('level 20 has no next requirement', 'current >= 20 ? null : storeLevelRequirement(current + 1)' in status),
    ('missing branch/max-level completion shape retained', 'if (!branch || !requirement) return { current, requirement, complete: current >= 20, conditions: [] };' in status),
    ('operating days source retained', 'Math.max(0, Number(branch.operatingDays) || 0)' in status),
    ('sales count source retained', 'Math.max(0, Number(branch.salesCount) || 0)' in status),
    ('revenue source retained', 'Math.max(0, Number(branch.totalRevenue) || 0)' in status),
    ('service success source retained', 'Math.max(0, Number(branch.serviceSuccesses) || 0)' in status),
    ('conditions met mapping retained', 'met: condition.current >= condition.target' in status),
    ('already paid level check retained', 'Math.max(1, Number(branch.paidThroughLevel) || 1) >= requirement.level' in status),
    ('prepaid zero cost retained', 'const cost = alreadyPaid ? 0 : requirement.cost;' in status),
    ('status all-condition gate retained', 'conditions.every((condition) => condition.met)' in status),
    ('status money gate retained', 'state.game.money >= cost' in status),
    ('status store operating gate retained', 'storeBranchOperating(branch)' in status),
    ('sync normalizes branch level retained', 'branch.level = storeLevel(branch);' in sync),
    ('sync preserves peak level retained', 'branch.peakLevel = Math.max(branch.level, Math.floor(Number(branch.peakLevel) || branch.level));' in sync),
    ('sync normalizes rating retained', 'branch.rating = storeRating(branch);' in sync),
    ('sync mirrors level retained', 'state.store.level = branch.level;' in sync),
    ('sync mirrors rating retained', 'state.store.rating = branch.rating;' in sync),
    ('upgrade status lookup retained', 'const status = storeUpgradeStatus(branch);' in upgrade),
    ('max/missing branch toast retained', "if (!branch || !status.requirement) return showToast('店舗は最大レベルです。');" in upgrade),
    ('incomplete exact error toast retained', "if (!status.complete) return showToast('店舗改装の条件を満たしていません。', 'error');" in upgrade),
    ('positive cost branch retained', 'if (status.cost > 0) {' in upgrade),
    ('money deduction retained', 'state.game.money -= status.cost;' in upgrade),
    ('money feedback retained', 'startMoneyFeedback(-status.cost);' in upgrade),
    ('finance record retained', 'addFinance(`${storeBranchLabel(branch.number)}を店舗レベル${status.requirement.level}へ改装`, 0, status.cost);' in upgrade),
    ('paid through level update retained', 'branch.paidThroughLevel = Math.max(Number(branch.paidThroughLevel) || 1, status.requirement.level);' in upgrade),
    ('branch level update retained', 'branch.level = status.requirement.level;' in upgrade),
    ('peak level update retained', 'branch.peakLevel = Math.max(Number(branch.peakLevel) || 1, branch.level);' in upgrade),
    ('sync call retained', 'syncStoreLevel(branch);' in upgrade),
    ('level-up notification retained', "addNotification('店舗レベルが上がりました', `${storeBranchLabel(branch.number)}が店舗レベル${branch.level}になりました。`);" in upgrade),
    ('save retained', 'saveGame();' in upgrade),
    ('completion toast retained', "showToast(`店舗レベル${branch.level}になりました。`, 'info', false);" in upgrade),
    ('render retained', 'render();' in upgrade),
    ('no time cost retained', all(token not in upgrade for token in ('spendHours(', 'spendMinutes(', 'advanceTime(', 'canSpendHours(', 'canSpendMinutes('))),
    ('dynamic harness protects requirement hash', EXPECTED_REQUIREMENTS_SHA256 in TEST),
    ('dynamic harness extracts store level', "extractFunction('storeLevel')" in TEST),
    ('dynamic harness extracts store rating', "extractFunction('storeRating')" in TEST),
    ('dynamic harness extracts requirement lookup', "extractFunction('storeLevelRequirement')" in TEST),
    ('dynamic harness extracts upgrade status', "extractFunction('storeUpgradeStatus')" in TEST),
    ('dynamic harness extracts sync store level', "extractFunction('syncStoreLevel')" in TEST),
    ('dynamic harness extracts upgrade store level', "extractFunction('upgradeStoreLevel')" in TEST),
    ('exact requirement table regression case', 'testExactRequirementTableIsProtected' in TEST),
    ('level clamp regression case', 'testStoreLevelClampAndRequirementLookup' in TEST),
    ('exact threshold regression case', 'testExactLevelTwoThresholdIsEligible' in TEST),
    ('all gates regression case', 'testEachUpgradeGateBlocksLevelUp' in TEST),
    ('successful upgrade regression case', 'testSuccessfulPaidUpgradeProtectsMoneyLevelAndPersistence' in TEST),
    ('prepaid compatibility regression case', 'testAlreadyPaidCompatibilityPathDoesNotChargeAgain' in TEST),
    ('max/missing branch regression case', 'testMaximumLevelAndMissingBranchDoNotMutate' in TEST),
    ('current audit registration or sync registration', 'check-upgrade-store-level-regression.py' in CURRENT or 'check-upgrade-store-level-regression.py' in SYNC_TEXT),
]

failed = []
for label, ok in checks:
    print(('OK' if ok else 'NG') + ': ' + label)
    if not ok:
        failed.append(label)
if failed:
    raise SystemExit('UPGRADE STORE LEVEL PROTECTION: FAIL')

proc = subprocess.run(['node', str(ROOT / 'tools/test-upgrade-store-level-regression.mjs')], cwd=ROOT, text=True)
if proc.returncode:
    raise SystemExit(proc.returncode)
print('店舗レベルアップのLv.1〜20条件・営業日数・販売数・累計売上・接客成功数・所持金・店舗稼働判定・支払済み互換・改装費・支店/表示レベル同期・最高レベル・収支・通知・保存・時間非消費を固定しました。')
print('UPGRADE STORE LEVEL PROTECTION: PASS')
