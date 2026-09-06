#!/usr/bin/env python3
"""Protect customer visit start/scheduling behavior without changing gameplay."""
from pathlib import Path
import re
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
APP = (ROOT / 'js/app.js').read_text(encoding='utf-8')
TEST = (ROOT / 'tools/test-customer-visit-regression.mjs').read_text(encoding='utf-8')
CURRENT = (ROOT / 'scripts/check-current.py').read_text(encoding='utf-8')
SYNC = ROOT / '.github/workflows/phase37-sync-v010926.yml'


def section(name):
    matches = list(re.finditer(r'^(?:async\s+)?function ' + re.escape(name) + r'\(', APP, re.M))
    if len(matches) != 1:
        raise AssertionError(f'{name}: expected exactly one declaration')
    start = matches[0].start()
    following = re.search(r'^(?:async\s+)?function ', APP[matches[0].end():], re.M)
    return APP[start:matches[0].end() + following.start()] if following else APP[start:]


start = section('startCustomerVisit')
clear = section('clearCustomerVisitsForIllness')
schedule = section('scheduleCustomerVisit')

checks = {
    'startCustomerVisit definition exists once': APP.count('function startCustomerVisit(') == 1,
    'clearCustomerVisitsForIllness definition exists once': APP.count('function clearCustomerVisitsForIllness(') == 1,
    'scheduleCustomerVisit definition exists once': APP.count('function scheduleCustomerVisit(') == 1,
    'illness blocks visit start': "if (illnessEventSuppressionActive()) return false;" in start,
    'visit start resolves customer and branch': all(token in start for token in [
        'const customer = state.customers?.[customerId];',
        'const branch = storeBranchByNumber(branchNumber);',
        'if (!customer || !storeBranchOperating(branch)) return false;',
    ]),
    'visit start marks customer and counts branch visitor': all(token in start for token in [
        'customer.visiting = true;',
        'branch.visitorsToday = Math.max(0, Number(branch.visitorsToday) || 0) + 1;',
        'customer.visitingBranchNumber = Math.max(1, Math.min(3, Math.floor(Number(branch.number) || 1)));',
    ]),
    'visit request snapshot and signature retained': all(token in start for token in [
        'customer.activeRequest = customerVisitRequest(customerId, customer.visitingBranchNumber);',
        'customer.lastRequestSignature = customerRequestSignature(customer.activeRequest);',
    ]),
    'proposal state resets at visit start': all(token in start for token in [
        'customer.wishesHeard = false;',
        'customer.proposedItemIds = [];',
        'return true;',
    ]),
    'illness clear resets all transient customer visit fields': all(token in clear for token in [
        'Object.values(state?.customers || {}).forEach((customer) => {',
        'customer.visiting = false;',
        'customer.visitingBranchNumber = null;',
        'customer.activeRequest = null;',
        'customer.wishesHeard = false;',
        'customer.proposedItemIds = [];',
    ]),
    'schedule illness suppression delegates to clear': all(token in schedule for token in [
        'if (illnessEventSuppressionActive()) {',
        'clearCustomerVisitsForIllness();',
        'return;',
    ]),
    'pearl human guaranteed customer route retained': all(token in schedule for token in [
        'if (pearlHumanEffectActive()) {',
        'schedulePearlHumanGuaranteedCustomer({ preserveExistingToday: false });',
        'return;',
    ]),
    'white bunny pending visit and sales branch retained': all(token in schedule for token in [
        'const whiteBunnyEvent = whiteBunnyIceEventState();',
        'const hasPendingWhiteBunnyVisit = Boolean(whiteBunnyEvent.pendingCustomerVisit);',
        'const visitBranch = salesStoreBranch();',
    ]),
    'closed/unready store clears customer visits': all(token in schedule for token in [
        'if (!visitBranch || !storeBusinessOpen() || (!hasCraftedJewelry() && !hasPendingWhiteBunnyVisit)) {',
        'customer.visiting = false;',
        'customer.visitingBranchNumber = null;',
        'customer.activeRequest = null;',
        'customer.wishesHeard = false;',
        'customer.proposedItemIds = [];',
    ]),
    'existing visitor prevents duplicate scheduling': 'if (Object.values(state.customers).some((customer) => customer.visiting)) return;' in schedule,
    'special-only customers excluded from normal draw': 'const normalCustomerIds = customerIds.filter((id) => !CUSTOMERS[id]?.specialOnly);' in schedule,
    'first visit and cooldown eligibility retained': all(token in schedule for token in [
        'if (!customer.met) return state.game.day >= 2;',
        'return state.game.day - (customer.lastVisitDay || 0) >= CUSTOMER_REPEAT_COOLDOWN_DAYS;',
    ]),
    'white bunny special visit bypass retained': all(token in schedule for token in [
        "const customerId = 'brownBunny';",
        'startCustomerVisit(customerId, visitBranch.number)',
        'whiteBunnyEvent.pendingCustomerVisit = false;',
        "addNotification('ブラウンバニーが来店しています'",
        "'special'",
    ]),
    'staff and branch visit chance modifiers retained': all(token in schedule for token in [
        'const visitEmployee = activeStoreStaff(visitBranch);',
        'const employeeBonus = storeStaffCustomerVisitBonus(visitEmployee);',
        'const profileBonus = Number(visitBranch.number) === 2 ? 0.03 : Number(visitBranch.number) === 3 ? 0.05 : 0;',
        'const baseChance = hasMetCustomer ? CUSTOMER_REGULAR_VISIT_CHANCE : CUSTOMER_FIRST_VISIT_CHANCE;',
        'baseChance + 0.10 + employeeBonus + profileBonus',
        '(baseChance * 0.55) + (profileBonus * 0.5)',
        'Math.random() >= clamp(staffingVisitChance, 0, 0.90)',
    ]),
    'normal visit draw starts customer and notifies': all(token in schedule for token in [
        'const customerId = randomFrom(eligibleCustomers);',
        'if (!customerId || !startCustomerVisit(customerId, visitBranch.number)) return;',
        "addNotification('お客様が来店しています'",
    ]),
    'test executes current production functions': all(token in TEST for token in [
        "extractFunction('startCustomerVisit')",
        "extractFunction('clearCustomerVisitsForIllness')",
        "extractFunction('scheduleCustomerVisit')",
        "vm.runInContext(source, ctx",
    ]),
    'registered in audit or pending formal sync': 'check-customer-visit-regression.py' in CURRENT or (SYNC.is_file() and 'check-customer-visit-regression.py' in SYNC.read_text(encoding='utf-8')),
}

for name in [
    'testStartCustomerVisitInitializesVisitState',
    'testStartCustomerVisitRejectsIllnessAndInvalidBranch',
    'testIllnessScheduleClearsExistingVisits',
    'testPearlHumanScheduleDelegatesAndStops',
    'testClosedOrUnreadyStoreClearsVisits',
    'testExistingVisitorPreventsDuplicateScheduling',
    'testPendingWhiteBunnyVisitBypassesCraftRequirement',
    'testRegularScheduleUsesEligibleNormalCustomerAndStaffChance',
]:
    checks[f'regression retained: {name}'] = TEST.count(name) >= 2

for name, ok in checks.items():
    print(f"{'OK' if ok else 'NG'}: {name}")
if not all(checks.values()):
    sys.exit('CUSTOMER VISIT PROTECTION: FAIL')

result = subprocess.run(['node', str(ROOT / 'tools/test-customer-visit-regression.mjs')], cwd=ROOT)
if result.returncode:
    sys.exit(result.returncode)
print('CUSTOMER VISIT PROTECTION: PASS')
