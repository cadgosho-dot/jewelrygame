#!/usr/bin/env python3
from __future__ import annotations

import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
APP = ROOT / 'js' / 'app.js'
TEST = ROOT / 'tools' / 'test-autopilot-regression.mjs'
CHECK_CURRENT = ROOT / 'scripts' / 'check-current.py'

text = APP.read_text(encoding='utf-8')

def require(needle: str, label: str) -> None:
    if needle not in text:
        raise SystemExit(f'AUTOPILOT PROTECTION: FAIL - {label}')

for name in [
    'autopilotDateValue',
    'autopilotDateDifference',
    'addAutopilotDateDays',
    'ensureAutopilotState',
    'autopilotEat',
    'autopilotCanSpendHours',
    'autopilotPayOutstandingCosts',
    'autopilotBuyTool',
    'autopilotRepairTools',
    'autopilotBuyMetal',
    'autopilotBuyLoose',
    'autopilotCraftJewelry',
    'autopilotDeliverCompletedOrders',
    'autopilotFulfillOrders',
    'autopilotPrepareStore',
    'autopilotDisplayStoredItems',
    'autopilotWholesaleStoredItems',
    'autopilotSellRough',
    'autopilotMineOnce',
    'autopilotCraftStock',
    'runAutopilotDay',
    'processAutopilotIfDue',
]:
    require(f'function {name}(', f'{name} definition')

# Real-date catch-up and first-day baseline.
require("Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]))", 'UTC real-date calculation')
require("if (!autopilot.lastRealDate) {", 'first-enable baseline guard')
require("autopilot.lastRealDate = today;", 'baseline/final real date')
require("const dueDays = autopilotDateDifference(autopilot.lastRealDate, today);", 'due-day calculation')
require("if (dueDays <= 0) return 0;", 'no-due-days guard')

# Safety guards around automatic progression.
require("if (!state?.settings?.autopilotEnabled || autopilotRunning || sleepTransitioning || sessionTakenOver || illnessEventSuppressionActive()) return 0;", 'autopilot safety guard')
require("autopilotRunning = true;", 'running lock set')
require("autopilotRunning = false;", 'running lock release')

# Outstanding costs preserve living cash and reuse the protected target order/apply path.
require("let available = Math.max(0, money - MIN_LIVING_CASH_RESERVE);", 'living cash reserve')
require("for (const target of outstandingPaymentTargets())", 'outstanding target priority reuse')
require("applyOutstandingPayment(target, Math.min(available, target.due), '自動操縦：')", 'outstanding payment helper reuse')
require("state.game.money = Math.max(0, money - paidTotal);", 'outstanding money deduction')

# Automatic meal behavior.
require("if (hungerLevel() > 0) return true;", 'meal only at hunger zero')
require("const meal = MEALS.chinese;", 'current automatic meal')
require("state.game.money -= meal.price;", 'meal payment')
require("spendMealTime();", 'meal time cost')
require("state.daily.meals.push({ id: meal.id, name: meal.name, price: meal.price, recovery: state.wellbeing.hunger - before, autopilot: true });", 'meal history')
require("addFinance(`自動操縦：${meal.name}で食事`, 0, meal.price);", 'meal finance history')

# Tools/materials/crafting remain integrated with existing current rules.
require("state.tools.items[toolId] = createWorkshopToolRecord(toolId);", 'automatic tool purchase')
require("record.repairCompleteDay = state.game.day + 7;", 'automatic repair completion date')
require("state.inventory.metals[metalId] = roundedMetalWeight(owned + quantity);", 'automatic metal purchase')
require("adjustLooseInventory(gemId, shape, 1);", 'automatic loose purchase')
require("if (draft.useLoose !== false) adjustLooseInventory(draft.gem, draft.looseShape, -requirements.requiredLooseQuantity);", 'automatic craft loose consumption')
require("state.inventory.metals[draft.metal] = roundedMetalWeight(requirements.ownedMetalWeight - requirements.requiredMetalWeight);", 'automatic craft metal consumption')
require("autopilot: true,", 'automatic artifact marker')
require("// 自動操縦による制作ではプレイヤーの職人経験値は増えない。", 'no player XP policy')

# Completed orders use the current delivery accounting path semantics.
require("order.status = '完了';", 'automatic order completion')
require("item.soldChannel = 'order-autopilot';", 'automatic order sale channel')
require("state.store.deliveredOrderCount = Math.max(0, Math.floor(Number(state.store.deliveredOrderCount) || 0)) + 1;", 'delivered order count')
require("addStoreProgress({ branchNumber: order.branchNumber, rating: 1, orderDelivery: true });", 'store progress on delivery')
require("consumeStoreCase(branch);", 'case consumption on delivery')

# Store preparation/display/wholesale remain current behavior.
require("branchShowcases(branch).push({ id: `showcase-auto-${Date.now()}-${state.game.day}`, slots: [null, null, null, null, null] });", 'automatic showcase install')
require("const quantity = 10;", 'automatic case batch size')
require("item.status = 'displayed';", 'automatic display status')
require("sellingPrice: normalizeSellingPrice(item.recommendedPrice)", 'automatic display price')
require("removeJewelry(item.id, { price: offer, channel: 'jewelryShop-autopilot' });", 'automatic wholesale channel')

# Rough sales/mining retain current time and probability rules.
require("state.inventory.rough[gemId] = 0;", 'automatic rough bulk sale')
require("spendHours(1);", 'rough sale time cost')
require("if (Math.random() < 0.4) {", 'automatic mining 40 percent find branch')
require("entry.id !== 'diamond' || toolOwned('diamondPolishingLap')", 'diamond mining tool gate')
require("state.miningProgress.successfulFinds += 1;", 'automatic mining progress')
require("state.miningMisses = Math.max(0, Number(state.miningMisses) || 0) + 1;", 'automatic mining miss count')

# Whole-day priority and loop safety cap.
priority = [
    'autopilotPayOutstandingCosts(summary);',
    'autopilotDeliverCompletedOrders(summary);',
    'autopilotRepairTools(summary);',
    "if (!toolOwned('jewelryBench')) autopilotBuyTool('jewelryBench', summary, 2000);",
    'autopilotFulfillOrders(summary);',
    'autopilotPrepareStore(summary);',
    'autopilotDisplayStoredItems(summary);',
    'autopilotWholesaleStoredItems(summary);',
    'autopilotSellRough(summary);',
]
positions = [text.find(item, text.find('function runAutopilotDay(')) for item in priority]
if any(pos < 0 for pos in positions) or positions != sorted(positions):
    raise SystemExit('AUTOPILOT PROTECTION: FAIL - day priority order')
require("while (safety < 12 && canSpendHours(1))", 'day loop safety cap')
require("if (state.game.minutes === beforeMinutes && state.game.money === beforeMoney && afterJewelry === beforeJewelry) break;", 'day no-progress break')

# Catch-up must settle exactly one game day per real due day and save final state.
require("for (let index = 0; index < dueDays; index += 1) {", 'due-day loop')
require("const daySummary = runAutopilotDay();", 'daily autopilot call')
require("settleDay({ showResult: false, save: false });", 'daily settlement integration')
require("autopilot.totalDays += 1;", 'total-day count')
require("autopilot.lastSummary = {", 'last summary persistence')
require("addNotification('自動操縦が完了しました', body, 'info');", 'completion notification')
require("state.game.screen = 'main';", 'return to main')
require("await saveGame();", 'final save')
require("addNotification('自動操縦を中断しました', '処理中にエラーが発生したため、その時点までの状態を保存しました。', 'warning');", 'error partial-state notice')

# The dynamic regression must stay registered either in check-current or in the one-shot formal sync before merge.
current = CHECK_CURRENT.read_text(encoding='utf-8')
formal_sync = ROOT / '.github' / 'workflows' / 'phase28-sync-v010917.yml'
if 'check-autopilot-regression.py' not in current and not formal_sync.exists():
    raise SystemExit('AUTOPILOT PROTECTION: FAIL - check-current/formal-sync registration missing')

if not TEST.is_file():
    raise SystemExit('AUTOPILOT PROTECTION: FAIL - dynamic test missing')
proc = subprocess.run(['node', str(TEST)], cwd=ROOT, text=True, capture_output=True)
if proc.stdout:
    print(proc.stdout, end='')
if proc.stderr:
    print(proc.stderr, end='', file=sys.stderr)
if proc.returncode != 0:
    raise SystemExit(proc.returncode)

print('AUTOPILOT PROTECTION: PASS')
