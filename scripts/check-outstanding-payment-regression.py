#!/usr/bin/env python3
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
APP = (ROOT / 'js/app.js').read_text(encoding='utf-8')
TEST = (ROOT / 'tools/test-outstanding-payment-regression.mjs').read_text(encoding='utf-8')
CURRENT = (ROOT / 'scripts/check-current.py').read_text(encoding='utf-8')
SYNC = ROOT / '.github/workflows/phase18-sync-v010907.yml'
SYNC_TEXT = SYNC.read_text(encoding='utf-8') if SYNC.exists() else ''


def function_body(signature):
    start = APP.find(signature)
    if start < 0:
        return ''
    end = APP.find('\nfunction ', start + 1)
    return APP[start:end if end >= 0 else len(APP)]


targets = function_body('function outstandingPaymentTargets() {')
apply = function_body('function applyOutstandingPayment(target, amount) {')
render = function_body('function renderOutstandingPayments() {')

checks = [
    ('outstandingPaymentTargets definition exists once', APP.count('function outstandingPaymentTargets() {') == 1),
    ('applyOutstandingPayment definition exists once', APP.count('function applyOutstandingPayment(target, amount) {') == 1),
    ('renderOutstandingPayments definition exists once', APP.count('function renderOutstandingPayments() {') == 1),
    ('outstanding store lookup retained', 'const outstanding = ensureOutstandingCosts();' in targets),
    ('workshop debt positive-only target retained', 'if ((Number(outstanding.workshop) || 0) > 0)' in targets),
    ('workshop target identity retained', "id: 'workshop'" in targets and "type: 'workshop'" in targets and "label: '工房 維持費'" in targets),
    ('workshop target amount floor retained', 'amount: Math.floor(Number(outstanding.workshop) || 0)' in targets),
    ('branch render source retained', 'storeBranchesForRender().forEach((branch) => {' in targets),
    ('branch number normalization retained', 'const branchNumber = Math.max(1, Math.floor(Number(branch?.number) || 1));' in targets),
    ('branch debt lookup retained', 'const amount = Math.floor(Number(outstanding.branches?.[branchNumber]) || 0);' in targets),
    ('branch positive-only target retained', 'if (amount > 0)' in targets),
    ('branch target identity retained', 'id: `branch-${branchNumber}`' in targets and "type: 'branch'" in targets),
    ('branch rent label retained', 'label: `${branchLabel(branch)} 家賃`' in targets),
    ('target list return retained', 'return targets;' in targets),
    ('apply due normalization retained', 'const due = Math.max(0, Math.floor(Number(target?.amount) || 0));' in apply),
    ('apply paid clamp retained', 'const paid = Math.min(due, Math.max(0, Math.floor(Number(amount) || 0)));' in apply),
    ('zero payment guard retained', 'if (paid <= 0) return 0;' in apply),
    ('apply outstanding lookup retained', 'const outstanding = ensureOutstandingCosts();' in apply),
    ('workshop debt reduction retained', 'outstanding.workshop = Math.max(0, (Number(outstanding.workshop) || 0) - paid);' in apply),
    ('workshop suspension release only on full payment retained', 'if (outstanding.workshop <= 0) state.workshop.suspended = false;' in apply),
    ('workshop payment finance retained', "addFinance('工房 維持費支払', 0, paid);" in apply),
    ('branch payment normalization retained', 'const branchNumber = Math.max(1, Math.floor(Number(target.branchNumber) || 1));' in apply),
    ('branch debt reduction retained', 'outstanding.branches[branchNumber] = Math.max(0, (Number(outstanding.branches?.[branchNumber]) || 0) - paid);' in apply),
    ('branch lookup retained', 'const branch = storeBranchByNumber(branchNumber);' in apply),
    ('branch suspension release only on full payment retained', 'if (branch && outstanding.branches[branchNumber] <= 0) branch.suspended = false;' in apply),
    ('branch payment finance retained', 'addFinance(`${branchLabel(branch ?? { number: branchNumber })} 家賃支払`, 0, paid);' in apply),
    ('paid amount return retained', 'return paid;' in apply),
    ('empty outstanding modal retained', '現在、未払いはありません。' in render),
    ('preferred target fallback retained', 'targets.find((target) => target.id === outstandingPaymentTargetId) ?? targets[0]' in render),
    ('initial draft clamp retained', 'outstandingPaymentDraft = Math.min(Math.max(1, Number(outstandingPaymentDraft) || 1), prioritize.amount);' in render),
    ('current target re-resolution retained', 'currentTargets.find((item) => item.id === outstandingPaymentTargetId) ?? currentTargets[0] ?? null' in render),
    ('current money display retained', 'const available = Math.max(0, Math.floor(Number(state.game.money) || 0));' in render),
    ('selection target id retained', "outstandingPaymentTargetId = button.dataset.targetId || '';" in render),
    ('selection draft fifty-thousand cap retained', 'outstandingPaymentDraft = Math.min(50000, Math.max(1, Number(next?.amount) || 1));' in render),
    ('payment latest target re-resolution retained', 'const latest = outstandingPaymentTargets().find((item) => item.id === outstandingPaymentTargetId) ?? null;' in render),
    ('payment amount clamp retained', 'const selected = Math.min(latest.amount, Math.max(1, Math.floor(Number(amount) || 1)));' in render),
    ('insufficient money guard retained', "if (state.game.money < selected)" in render and "showToast('所持金が足りません。', 'error');" in render),
    ('money deduction retained', 'state.game.money -= selected;' in render),
    ('money feedback retained', 'startMoneyFeedback(-selected);' in render),
    ('outstanding payment application retained', 'const paid = applyOutstandingPayment(latest, selected);' in render),
    ('payment notification retained', '`${latest.label}を支払いました`' in render and '残り未払いは${formatYen(Math.max(0, latest.amount - paid))}です。' in render),
    ('workshop completion hint retained', '完済すると工房の利用停止が解除されます。' in render),
    ('store completion hint retained', '完済すると対象店舗の利用停止が解除されます。' in render),
    ('successful payment save retained', 'saveGame();' in render),
    ('purchase sound retained', "playSfx('purchase');" in render),
    ('modal rerender retained', 'render();' in render),
    ('partial payment button retained', "document.getElementById('payOutstandingPartial')?.addEventListener('click', () => pay(outstandingPaymentDraft));" in render),
    ('full payment button retained', "document.getElementById('payOutstandingAll')?.addEventListener('click', () => pay(target.amount));" in render),
    ('no time cost introduced', 'spendHours(' not in render and 'advanceTime(' not in render and 'spendHours(' not in apply and 'advanceTime(' not in apply),
    ('dynamic harness extracts target function', "extractFunction('outstandingPaymentTargets')" in TEST),
    ('dynamic harness extracts apply function', "extractFunction('applyOutstandingPayment')" in TEST),
    ('dynamic harness extracts render function', "extractFunction('renderOutstandingPayments')" in TEST),
    ('target generation regression case', 'testOutstandingTargetsIncludeOnlyPositiveWorkshopAndBranchDebts' in TEST),
    ('workshop partial payment regression case', 'testWorkshopPartialPaymentProtectsMoneyDebtAccountingAndSuspension' in TEST),
    ('workshop full payment regression case', 'testWorkshopFullPaymentClearsSuspension' in TEST),
    ('branch payment regression case', 'testBranchPartialAndFullPayment' in TEST),
    ('insufficient money regression case', 'testInsufficientMoneyDoesNotMutateDebtOrSave' in TEST),
    ('selection draft cap regression case', 'testSelectionResetsDraftWithFiftyThousandCap' in TEST),
    ('empty outstanding regression case', 'testNoOutstandingShowsNoDebtModalWithoutMutation' in TEST),
    ('apply clamp regression case', 'testApplyPaymentClampsToDueAndRejectsZero' in TEST),
    ('current audit registration or sync registration', 'check-outstanding-payment-regression.py' in CURRENT or 'check-outstanding-payment-regression.py' in SYNC_TEXT),
]

failed = []
for label, ok in checks:
    print(('OK' if ok else 'NG') + ': ' + label)
    if not ok:
        failed.append(label)
if failed:
    raise SystemExit('OUTSTANDING PAYMENT PROTECTION: FAIL')

proc = subprocess.run(['node', str(ROOT / 'tools/test-outstanding-payment-regression.mjs')], cwd=ROOT, text=True)
if proc.returncode:
    raise SystemExit(proc.returncode)
print('未払い固定費支払いの対象生成・一部/全額支払い・所持金・未払い残高・完済時停止解除・収支・通知・保存・効果音・主要ガードを固定しました。')
print('OUTSTANDING PAYMENT PROTECTION: PASS')
