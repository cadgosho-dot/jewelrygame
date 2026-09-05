#!/usr/bin/env python3
from pathlib import Path
import hashlib
import subprocess

ROOT = Path(__file__).resolve().parents[1]
APP = (ROOT / 'js/app.js').read_text(encoding='utf-8')
CORE = (ROOT / 'js/game-data-core.js').read_text(encoding='utf-8')
TEST = (ROOT / 'tools/test-expand-workshop-regression.mjs').read_text(encoding='utf-8')
CURRENT = (ROOT / 'scripts/check-current.py').read_text(encoding='utf-8')
SYNC = ROOT / '.github/workflows/phase21-sync-v010910.yml'
SYNC_TEXT = SYNC.read_text(encoding='utf-8') if SYNC.exists() else ''
EXPECTED_REQUIREMENTS_SHA256 = '97a772f0963dfd6a6401113a12f8ac6994660ded0396ec872c1f83ffb03ccec0'


def function_body(signature):
    start = APP.find(signature)
    if start < 0:
        return ''
    end = APP.find('\nfunction ', start + 1)
    return APP[start:end if end >= 0 else len(APP)]


def requirement_block():
    marker = 'export const WORKSHOP_LEVEL_REQUIREMENTS = Object.freeze(['
    start = CORE.find(marker)
    if start < 0:
        return ''
    end_marker = '\n]);'
    end = CORE.find(end_marker, start)
    if end < 0:
        return ''
    return CORE[start:end + len(end_marker)]


level = function_body('function workshopLevel() {')
requirement = function_body('function workshopLevelRequirement(level = workshopLevel() + 1) {')
cumulative = function_body('function cumulativeWorkshopRequiredTools(level = workshopLevel() + 1) {')
status = function_body('function workshopUpgradeStatus() {')
expand = function_body('function expandWorkshop() {')
req_block = requirement_block()
req_hash = hashlib.sha256(req_block.encode()).hexdigest() if req_block else ''

checks = [
    ('workshopLevel definition exists once', APP.count('function workshopLevel() {') == 1),
    ('workshopLevelRequirement definition exists once', APP.count('function workshopLevelRequirement(level = workshopLevel() + 1) {') == 1),
    ('cumulativeWorkshopRequiredTools definition exists once', APP.count('function cumulativeWorkshopRequiredTools(level = workshopLevel() + 1) {') == 1),
    ('workshopUpgradeStatus definition exists once', APP.count('function workshopUpgradeStatus() {') == 1),
    ('expandWorkshop definition exists once', APP.count('function expandWorkshop() {') == 1),
    ('exact workshop requirement table retained', req_hash == EXPECTED_REQUIREMENTS_SHA256),
    ('workshop level clamps 1 through 20', 'Math.max(1, Math.min(20, Math.floor(Number(state?.workshop?.level) || 1)))' in level),
    ('requirement table lookup retained', 'WORKSHOP_LEVEL_REQUIREMENTS.find((entry) => Number(entry.level) === Number(level)) || null' in requirement),
    ('cumulative required tool set retained', 'const required = new Set();' in cumulative),
    ('required tools accumulate only through level 8', 'entry.level <= Math.min(8, level)' in cumulative),
    ('required tools are unioned retained', '(entry.requiredTools || []).forEach((id) => required.add(id))' in cumulative),
    ('status reads current level', 'const current = workshopLevel();' in status),
    ('level 20 has no next requirement', 'current >= 20 ? null : workshopLevelRequirement(current + 1)' in status),
    ('no requirement completion shape retained', 'return { current, requirement: null, complete: true, conditions: [], cost: 0 }' in status),
    ('missing usable tools calculation retained', 'cumulativeWorkshopRequiredTools(requirement.level).filter((id) => !toolUsable(id))' in status),
    ('active hours source retained', 'Math.max(0, Number(state?.workshop?.activeHours) || 0)' in status),
    ('quality points source retained', 'const quality = workshopQualityPoints();' in status),
    ('already paid level check retained', 'Math.max(1, Number(state?.workshop?.paidThroughLevel) || 1) >= requirement.level' in status),
    ('prepaid zero cost retained', 'const cost = alreadyPaid ? 0 : requirement.cost;' in status),
    ('hours condition retained', "{ id: 'hours', label: '累計工房稼働実績'" in status and 'met: activeHours >= requirement.hours' in status),
    ('quality condition retained', "{ id: 'quality', label: '工房評価'" in status and 'met: quality >= requirement.quality' in status),
    ('tools condition retained', "{ id: 'tools', label: '必須工具・設備'" in status and 'met: missingTools.length === 0' in status),
    ('status all-condition gate retained', 'conditions.every((condition) => condition.met)' in status),
    ('status money gate retained', 'state.game.money >= cost' in status),
    ('status workshop operating gate retained', 'workshopOperating()' in status),
    ('expand status lookup retained', 'const status = workshopUpgradeStatus();' in expand),
    ('max-level close modal retained', 'if (!status.requirement) return closeModal();' in expand),
    ('incomplete exact error toast retained', "if (!status.complete) return showToast('工房拡張の条件を満たしていません。', 'error');" in expand),
    ('successful expansion closes modal retained', 'closeModal();' in expand),
    ('positive cost branch retained', 'if (status.cost > 0) {' in expand),
    ('money deduction retained', 'state.game.money -= status.cost;' in expand),
    ('money feedback retained', 'startMoneyFeedback(-status.cost);' in expand),
    ('finance record retained', 'addFinance(`工房をレベル${status.requirement.level}へ拡張`, 0, status.cost);' in expand),
    ('paid through level update retained', 'state.workshop.paidThroughLevel = Math.max(Number(state.workshop.paidThroughLevel) || 1, status.requirement.level);' in expand),
    ('workshop level update retained', 'state.workshop.level = status.requirement.level;' in expand),
    ('peak level update retained', 'state.workshop.peakLevel = Math.max(Number(state.workshop.peakLevel) || 1, state.workshop.level);' in expand),
    ('level-up notification retained', "addNotification('工房レベルが上がりました', `工房レベル${state.workshop.level}になりました。`);" in expand),
    ('save retained', 'saveGame();' in expand),
    ('completion toast retained', "showToast(`工房レベル${state.workshop.level}になりました。`, 'info', false);" in expand),
    ('render retained', 'render();' in expand),
    ('no time cost retained', all(token not in expand for token in ('spendHours(', 'spendMinutes(', 'advanceTime(', 'canSpendHours(', 'canSpendMinutes('))),
    ('dynamic harness protects requirement hash', EXPECTED_REQUIREMENTS_SHA256 in TEST),
    ('dynamic harness extracts workshop level', "extractFunction('workshopLevel')" in TEST),
    ('dynamic harness extracts requirement lookup', "extractFunction('workshopLevelRequirement')" in TEST),
    ('dynamic harness extracts cumulative tools', "extractFunction('cumulativeWorkshopRequiredTools')" in TEST),
    ('dynamic harness extracts upgrade status', "extractFunction('workshopUpgradeStatus')" in TEST),
    ('dynamic harness extracts expand workshop', "extractFunction('expandWorkshop')" in TEST),
    ('exact requirement table regression case', 'testExactRequirementTableIsProtected' in TEST),
    ('level clamp regression case', 'testWorkshopLevelClampAndRequirementLookup' in TEST),
    ('cumulative tools regression case', 'testCumulativeToolsRemainRequiredThroughHigherLevels' in TEST),
    ('exact threshold regression case', 'testExactLevelTwoThresholdIsEligible' in TEST),
    ('all gates regression case', 'testEachUpgradeGateBlocksExpansion' in TEST),
    ('higher-level cumulative tools regression case', 'testHigherLevelStillRequiresCumulativeTools' in TEST),
    ('successful expansion regression case', 'testSuccessfulPaidExpansionProtectsMoneyLevelAndPersistence' in TEST),
    ('prepaid compatibility regression case', 'testAlreadyPaidCompatibilityPathDoesNotChargeAgain' in TEST),
    ('max-level regression case', 'testLevelTwentyClosesModalWithoutMutation' in TEST),
    ('current audit registration or sync registration', 'check-expand-workshop-regression.py' in CURRENT or 'check-expand-workshop-regression.py' in SYNC_TEXT),
]

failed = []
for label, ok in checks:
    print(('OK' if ok else 'NG') + ': ' + label)
    if not ok:
        failed.append(label)
if failed:
    raise SystemExit('EXPAND WORKSHOP PROTECTION: FAIL')

proc = subprocess.run(['node', str(ROOT / 'tools/test-expand-workshop-regression.mjs')], cwd=ROOT, text=True)
if proc.returncode:
    raise SystemExit(proc.returncode)
print('工房拡張のレベル1〜20条件・累積必須工具・稼働時間・評価・所持金・稼働中判定・支払済み互換・拡張費・レベル/最高レベル・収支・通知・保存・時間非消費を固定しました。')
print('EXPAND WORKSHOP PROTECTION: PASS')
