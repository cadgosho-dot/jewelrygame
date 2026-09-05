#!/usr/bin/env python3
from pathlib import Path
import subprocess

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
apply = function_body("function applyOutstandingPayment(target, amount, prefix = '') {")
phone = function_body('function renderPhoneOutstandingPayments() {')
shop = function_body('function handleShop(e) {')

checks = [
    ('outstandingPaymentTargets definition exists once', APP.count('function outstandingPaymentTargets() {') == 1),
    ('applyOutstandingPayment definition exists once', APP.count("function applyOutstandingPayment(target, amount, prefix = '') {") == 1),
    ('renderPhoneOutstandingPayments definition exists once', APP.count('function renderPhoneOutstandingPayments() {') == 1),
    ('handleShop definition exists once', APP.count('function handleShop(e) {') == 1),
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
    ('finance prefix normalization retained', "const financePrefix = String(prefix || '').trim();" in apply),
    ('workshop debt reduction retained', 'outstanding.workshop = Math.max(0, (Number(outstanding.workshop) || 0) - paid);' in apply),
    ('workshop suspension release only on full payment retained', 'if (outstanding.workshop <= 0) state.workshop.suspended = false;' in apply),
    ('workshop payment finance prefix retained', 'addFinance(`${financePrefix}工房 維持費支払`, 0, paid);' in apply),
    ('branch payment normalization retained', 'const branchNumber = Math.max(1, Math.floor(Number(target.branchNumber) || 1));' in apply),
    ('branch debt reduction retained', 'outstanding.branches[branchNumber] = Math.max(0, (Number(outstanding.branches?.[branchNumber]) || 0) - paid);' in apply),
    ('branch lookup retained', 'const branch = storeBranchByNumber(branchNumber);' in apply),
    ('branch suspension release only on full payment retained', 'if (branch && outstanding.branches[branchNumber] <= 0) branch.suspended = false;' in apply),
    ('branch payment finance prefix retained', 'addFinance(`${financePrefix}${branchLabel(branch ?? { number: branchNumber })} 家賃支払`, 0, paid);' in apply),
    ('paid amount return retained', 'return paid;' in apply),
    ('phone empty state retained', '現在、未払いはありません。' in phone and 'data-action="phone-menu"' in phone),
    ('phone target fallback retained', 'targets.find((target) => target.id === outstandingPaymentTargetId) ?? targets[0]' in phone),
    ('phone target id sync retained', 'outstandingPaymentTargetId = chosen.id;' in phone),
    ('phone draft clamp retained', 'outstandingPaymentDraft = Math.min(Math.max(1, Number(outstandingPaymentDraft) || 1), chosen.amount);' in phone),
    ('phone outstanding total retained', 'const total = outstandingCostTotal();' in phone),
    ('phone available money retained', 'const available = Math.max(0, Math.floor(Number(state.game.money) || 0));' in phone),
    ('phone pay-all availability retained', 'const canPayAll = total > 0 && available >= total;' in phone),
    ('phone pay-all action retained', 'data-action="pay-outstanding-all"' in phone),
    ('phone target selection action retained', 'data-action="select-outstanding-target"' in phone and 'data-outstanding-id="${esc(target.id)}"' in phone),
    ('phone amount input action retained', 'data-action="set-outstanding-amount"' in phone),
    ('phone partial pay action retained', 'data-action="pay-outstanding"' in phone),
    ('shop action target lookup retained', "const target = e.target.closest('[data-action]');" in shop and 'if (!target) return;' in shop),
    ('shop pay-all action retained', "if (action === 'pay-outstanding-all')" in shop),
    ('shop pay-all empty target guard retained', "if (targets.length <= 0) return showToast('現在、未払いはありません。', 'error');" in shop),
    ('shop pay-all total retained', 'const total = targets.reduce((sum, target) => sum + Math.max(0, Number(target.amount) || 0), 0);' in shop),
    ('shop pay-all nonpositive guard retained', "if (total <= 0) return showToast('現在、未払いはありません。', 'error');" in shop),
    ('shop pay-all money guard retained', 'if (state.game.money < total) return showToast(`全額支払いには${formatYen(total)}必要です。`, \'error\');' in shop),
    ('shop pay-all prefix retained', "paidTotal += applyOutstandingPayment(target, target.amount, '一括 ');" in shop),
    ('shop pay-all paid guard retained', "if (paidTotal <= 0) return showToast('未払いを支払えませんでした。', 'error');" in shop),
    ('shop pay-all money deduction retained', 'state.game.money -= paidTotal;' in shop),
    ('shop pay-all feedback retained', 'startMoneyFeedback(-paidTotal);' in shop),
    ('shop pay-all notification retained', "'未払いを全額支払いました'" in shop and '工房維持費・店舗家賃の未払いを解消しました。' in shop),
    ('shop pay-all suspension hint retained', '完済した工房・店舗は利用停止が解除されます。' in shop),
    ('shop pay-all save retained', 'saveGame();' in shop),
    ('shop pay-all sfx retained', "playSfx('purchase');" in shop),
    ('shop pay-all draft reset retained', 'outstandingPaymentDraft = 1;' in shop),
    ('shop target selection action retained', "if (action === 'select-outstanding-target')" in shop),
    ('shop target id selection retained', "outstandingPaymentTargetId = String(target.dataset.outstandingId || '');" in shop),
    ('shop selection draft fifty-thousand cap retained', 'outstandingPaymentDraft = Math.min(50000, Math.max(1, Number(chosen?.amount) || 1));' in shop),
    ('shop partial pay action retained', "if (action === 'pay-outstanding')" in shop),
    ('shop partial latest target retained', 'const latest = outstandingPaymentTargets().find((item) => item.id === outstandingPaymentTargetId) ?? null;' in shop),
    ('shop partial target guard retained', "if (!latest) return showToast('支払い対象を選んでください。', 'error');" in shop),
    ('shop partial amount clamp retained', 'const selected = Math.min(latest.amount, Math.max(1, Math.floor(Number(outstandingPaymentDraft) || 1)));' in shop),
    ('shop partial money guard retained', "if (state.game.money < selected) return showToast('所持金が足りません。', 'error');" in shop),
    ('shop partial money deduction retained', 'state.game.money -= selected;' in shop),
    ('shop partial feedback retained', 'startMoneyFeedback(-selected);' in shop),
    ('shop partial payment application retained', 'const paid = applyOutstandingPayment(latest, selected);' in shop),
    ('shop partial notification retained', '`${latest.label}を支払いました`' in shop and '残り未払いは${formatYen(Math.max(0, latest.amount - paid))}です。' in shop),
    ('shop workshop completion hint retained', '完済すると工房の利用停止が解除されます。' in shop),
    ('shop branch completion hint retained', '完済すると対象店舗の利用停止が解除されます。' in shop),
    ('shop amount input action retained', "if (action === 'set-outstanding-amount')" in shop),
    ('shop amount input normalization retained', 'outstandingPaymentDraft = Math.max(1, Math.floor(Number(target.value) || 1));' in shop),
    ('shop amount label refresh retained', "const label = document.getElementById('outstandingPaymentAmount');" in shop and 'if (label) label.textContent = formatYen(outstandingPaymentDraft);' in shop),
    ('no time cost introduced in payment core', 'spendHours(' not in apply and 'advanceTime(' not in apply),
    ('dynamic harness extracts target function', "extractFunction('outstandingPaymentTargets')" in TEST),
    ('dynamic harness extracts apply function', "extractFunction('applyOutstandingPayment')" in TEST),
    ('dynamic harness extracts phone function', "extractFunction('renderPhoneOutstandingPayments')" in TEST),
    ('dynamic harness extracts handleShop function', "extractFunction('handleShop')" in TEST),
    ('target generation regression case', 'testOutstandingTargetsIncludeOnlyPositiveWorkshopAndBranchDebts' in TEST),
    ('apply prefix regression case', 'testApplyPaymentClampSuspensionReleaseAndPrefix' in TEST),
    ('workshop partial regression case', 'testPartialWorkshopPaymentThroughHandleShop' in TEST),
    ('branch partial regression case', 'testPartialBranchPaymentThroughHandleShop' in TEST),
    ('partial guard regression case', 'testPartialPaymentGuards' in TEST),
    ('selection and amount regression case', 'testSelectionAndAmountDraftActions' in TEST),
    ('pay-all success regression case', 'testPayAllSuccessClearsAllDebtAndSuspensions' in TEST),
    ('pay-all guard regression case', 'testPayAllGuards' in TEST),
    ('phone render regression case', 'testPhoneOutstandingPaymentRenderContract' in TEST),
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
print('未払い固定費支払いの対象生成・スマホ表示・対象/金額選択・一部/一括支払い・所持金・未払い残高・完済時停止解除・収支・通知・保存・効果音・主要ガードを固定しました。')
print('OUTSTANDING PAYMENT PROTECTION: PASS')
