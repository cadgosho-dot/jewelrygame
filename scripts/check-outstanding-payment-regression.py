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
total = function_body('function totalOutstandingBusinessCost() {')
target = function_body("function outstandingPaymentTarget(kind, id = '') {")
apply = function_body("function applyOutstandingPayment(target, requestedAmount, prefix = '') {")
pay_item = function_body("function payOutstandingBusinessCostItem(kind, id = '') {")
pay_all = function_body('function payOutstandingBusinessCosts() {')

checks = [
    ('outstandingPaymentTargets definition exists once', APP.count('function outstandingPaymentTargets() {') == 1),
    ('totalOutstandingBusinessCost definition exists once', APP.count('function totalOutstandingBusinessCost() {') == 1),
    ('outstandingPaymentTarget definition exists once', APP.count("function outstandingPaymentTarget(kind, id = '') {") == 1),
    ('applyOutstandingPayment definition exists once', APP.count("function applyOutstandingPayment(target, requestedAmount, prefix = '') {") == 1),
    ('payOutstandingBusinessCostItem definition exists once', APP.count("function payOutstandingBusinessCostItem(kind, id = '') {") == 1),
    ('payOutstandingBusinessCosts definition exists once', APP.count('function payOutstandingBusinessCosts() {') == 1),
    ('contracted branches source retained', 'const branches = contractedStoreBranches();' in targets),
    ('current branch priority retained', 'const currentNumber = Math.max(1, Number(state?.store?.branchNumber) || 1);' in targets),
    ('current branch sort retained', 'const leftCurrent = Number(left.number) === currentNumber ? 0 : 1;' in targets and 'const rightCurrent = Number(right.number) === currentNumber ? 0 : 1;' in targets),
    ('branch number tie-break retained', 'return leftCurrent - rightCurrent || Number(left.number) - Number(right.number);' in targets),
    ('workshop due retained first', 'const workshopDue = Math.max(0, Number(state.business?.workshopUnpaid) || 0);' in targets and "kind: 'workshop'" in targets),
    ('store rent target retained', "kind: 'store-rent'" in targets and 'unpaidRent' in targets and '`${storeBranchDisplayName(branch)} 家賃`' in targets),
    ('store wage target retained', "kind: 'store-wage'" in targets and 'employee.wageUnpaid' in targets and '`${storeBranchDisplayName(branch)} ${employee.name}さんの給与`' in targets),
    ('workshop wage target retained', "kind: 'workshop-wage'" in targets and "label: '職人スタッフの給与'" in targets),
    ('home rent target retained last', 'const homeDue = Math.max(0, Number(state.business?.homeRentUnpaid) || 0);' in targets and "kind: 'home'" in targets and "label: '自宅家賃'" in targets),
    ('target list return retained', 'return targets;' in targets),
    ('total outstanding reducer retained', 'return outstandingPaymentTargets().reduce((sum, target) => sum + target.due, 0);' in total),
    ('target lookup kind/id retained', "target.kind === String(kind || '')" in target and "String(target.id || '') === String(id || '')" in target and '|| null;' in target),
    ('apply null guard retained', 'if (!target) return 0;' in apply),
    ('apply requested amount clamp retained', 'const amount = Math.max(0, Math.min(Math.floor(Number(requestedAmount) || 0), Math.floor(Number(target.due) || 0)));' in apply),
    ('apply zero guard retained', 'if (!amount) return 0;' in apply),
    ('home rent reduction retained', "if (target.kind === 'home')" in apply and 'state.business.homeRentUnpaid = Math.max(0, Number(state.business.homeRentUnpaid) || 0) - amount;' in apply),
    ('workshop reduction retained', "target.kind === 'workshop'" in apply and 'state.business.workshopUnpaid = Math.max(0, Number(state.business.workshopUnpaid) || 0) - amount;' in apply),
    ('workshop suspension release retained', 'state.business.workshopUnpaid = 0;' in apply and 'state.business.workshopSuspended = false;' in apply),
    ('store rent branch lookup retained', "target.kind === 'store-rent'" in apply and 'String(entry.id) === String(target.id)' in apply),
    ('missing store rent branch guard retained', 'if (!branch) return 0;' in apply),
    ('store rent reduction retained', 'branch.unpaidRent = Math.max(0, Number(branch.unpaidRent) || 0) - amount;' in apply),
    ('store suspension release retained', 'branch.unpaidRent = 0;' in apply and 'branch.suspended = false;' in apply),
    ('store wage reduction retained', "target.kind === 'store-wage'" in apply and 'employee.wageUnpaid = Math.max(0, Number(employee.wageUnpaid) || 0) - amount;' in apply),
    ('workshop wage reduction retained', "target.kind === 'workshop-wage'" in apply and 'staff.wageUnpaid = Math.max(0, Number(staff.wageUnpaid) || 0) - amount;' in apply),
    ('unknown kind guard retained', '} else return 0;' in apply),
    ('payment finance prefix retained', 'addFinance(`${prefix}${target.label}を支払い`, 0, amount);' in apply),
    ('apply paid amount return retained', 'return amount;' in apply),
    ('individual target lookup retained', 'const target = outstandingPaymentTarget(kind, id);' in pay_item),
    ('individual already-resolved guard retained', "if (!target) return showToast('この未払いはすでに解消されています。');" in pay_item),
    ('individual available cash retained', 'const available = Math.max(0, Math.floor(Number(state.game.money) || 0));' in pay_item),
    ('individual no-cash guard retained', "if (!available) return showToast('支払いに使える所持金がありません。', 'error');" in pay_item),
    ('individual pays min cash/due retained', 'const paid = applyOutstandingPayment(target, Math.min(available, target.due));' in pay_item),
    ('individual money deduction retained', 'state.game.money = Math.max(0, available - paid);' in pay_item),
    ('individual feedback retained', 'if (paid) startMoneyFeedback(-paid);' in pay_item),
    ('individual save retained', 'saveGame();' in pay_item),
    ('individual remaining lookup retained', "const remaining = outstandingPaymentTarget(kind, id)?.due || 0;" in pay_item),
    ('individual partial/full toast retained', '`${yen(paid)}を支払いました。残り${yen(remaining)}です。`' in pay_item and '`${target.label}を完済しました。`' in pay_item),
    ('individual render retained', 'render();' in pay_item),
    ('batch total lookup retained', 'const total = totalOutstandingBusinessCost();' in pay_all),
    ('batch no-debt guard retained', "if (!total) return showToast('未払いはありません。');" in pay_all),
    ('batch money normalization retained', 'const money = Math.max(0, Math.floor(Number(state.game.money) || 0));' in pay_all),
    ('batch living cash reserve retained', 'let available = Math.max(0, money - MIN_LIVING_CASH_RESERVE);' in pay_all),
    ('batch reserve guard retained', '一括支払いでは生活費${yen(MIN_LIVING_CASH_RESERVE)}を残します。個別支払いを利用してください。' in pay_all),
    ('batch priority loop retained', 'for (const target of outstandingPaymentTargets()) {' in pay_all and 'if (!available) break;' in pay_all),
    ('batch partial target payment retained', 'const paid = applyOutstandingPayment(target, Math.min(available, target.due));' in pay_all),
    ('batch available decrement retained', 'available -= paid;' in pay_all and 'paidTotal += paid;' in pay_all),
    ('batch money deduction retained', 'state.game.money = Math.max(0, money - paidTotal);' in pay_all),
    ('batch feedback retained', 'if (paidTotal) startMoneyFeedback(-paidTotal);' in pay_all),
    ('batch save retained', 'saveGame();' in pay_all),
    ('batch remaining lookup retained', 'const remaining = totalOutstandingBusinessCost();' in pay_all),
    ('batch partial/full toast retained', '`${yen(paidTotal)}を優先順で支払いました。未払い残高は${yen(remaining)}です。`' in pay_all and "'未払いをすべて支払いました。'" in pay_all),
    ('batch render retained', 'render();' in pay_all),
    ('finance UI item payment action retained', 'data-action=\"pay-outstanding-item\"' in APP and 'data-kind=\"${esc(target.kind)}\"' in APP and 'data-id=\"${esc(target.id)}\"' in APP),
    ('finance UI batch payment action retained', 'data-action=\"pay-outstanding-costs\"' in APP),
    ('finance UI priority explanation retained', '支払順：工房維持費 → 選択中店舗 → その他店舗 → スタッフ給与 → 自宅家賃' in APP),
    ('global action routes item payment retained', "case 'pay-outstanding-item': payOutstandingBusinessCostItem(button.dataset.kind, button.dataset.id || ''); break;" in APP),
    ('global action routes batch payment retained', "case 'pay-outstanding-costs': payOutstandingBusinessCosts(); break;" in APP),
    ('no time cost introduced in payment core', all('spendHours(' not in body and 'advanceTime(' not in body for body in (apply, pay_item, pay_all))),
    ('dynamic harness extracts targets', "extractFunction('outstandingPaymentTargets')" in TEST),
    ('dynamic harness extracts total', "extractFunction('totalOutstandingBusinessCost')" in TEST),
    ('dynamic harness extracts target lookup', "extractFunction('outstandingPaymentTarget')" in TEST),
    ('dynamic harness extracts apply', "extractFunction('applyOutstandingPayment')" in TEST),
    ('dynamic harness extracts item payment', "extractFunction('payOutstandingBusinessCostItem')" in TEST),
    ('dynamic harness extracts batch payment', "extractFunction('payOutstandingBusinessCosts')" in TEST),
    ('priority/all-kind regression case', 'testOutstandingTargetsProtectPriorityAndAllCostKinds' in TEST),
    ('apply-kind regression case', 'testApplyOutstandingPaymentProtectsKindsClampUnlockAndPrefix' in TEST),
    ('individual partial regression case', 'testIndividualPaymentCanUseAllCashAndKeepsPartialDebt' in TEST),
    ('individual guard/full regression case', 'testIndividualPaymentFullSettlementAndGuards' in TEST),
    ('batch reserve/priority regression case', 'testBatchPaymentProtectsPriorityAndLivingCashReserve' in TEST),
    ('batch full/guard regression case', 'testBatchPaymentFullSettlementAndGuards' in TEST),
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
print('未払い固定費支払いの優先順・工房/店舗家賃/店舗給与/職人給与/自宅家賃・個別/まとめ払い・生活費留保・所持金・未払い残高・完済時停止解除・収支・保存・通知を固定しました。')
print('OUTSTANDING PAYMENT PROTECTION: PASS')
