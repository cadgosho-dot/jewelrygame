#!/usr/bin/env python3
# Validate bounded long-term history and finance pruning for v0.10.771.
from __future__ import annotations
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
NODE = r'''
import { initialState, migrateState, compactLongTermHistory, compactFinanceHistory, LONG_TERM_HISTORY_LIMITS, FINANCE_HISTORY_LIMIT } from './js/game-data-core.js';

const state = initialState();
state.game.startDate = '2026-01-01';
state.game.day = 10000;
state.store.salesCount = 10000;
state.store.totalRevenue = 123456789;
state.store.totalProfit = 45678901;
state.store.deliveredOrderCount = 5000;
const beforeTotals = JSON.stringify({
  salesCount: state.store.salesCount,
  totalRevenue: state.store.totalRevenue,
  totalProfit: state.store.totalProfit,
  deliveredOrderCount: state.store.deliveredOrderCount,
});

const activeOrder = {
  id: 'active-order', customerId: 'customer-1', customerName: '現役', item: 'ring', gem: 'diamond',
  looseShape: 'round', metal: 'silver', design: 'simple', difficulty: 'basic', requiredArtisanLevel: 1,
  requiredTools: ['jewelryBench'], price: 50000, estimatedCost: 20000, estimatedProfit: 30000,
  acceptedDay: 9999, deadlineDay: 10006, branchNumber: 1, status: '受注', jewelryId: null,
};
state.orders.push(activeOrder);
for (let i = 1; i <= 5000; i += 1) {
  state.orders.push({
    id: `closed-${i}`, customerId: 'customer-1', customerName: `顧客${i}`, customerProfile: 'x'.repeat(120),
    customerTraits: 'y'.repeat(120), customerProfileDetails: { purpose: 'z'.repeat(180), preference: 'q'.repeat(180) },
    item: 'ring', gem: 'diamond', looseShape: 'round', metal: 'silver', design: 'simple', difficulty: 'basic',
    requiredArtisanLevel: 1, requiredTools: ['jewelryBench'], desiredConditions: 'd'.repeat(180),
    price: 50000+i, estimatedCost: 20000, estimatedProfit: 30000+i, acceptedDay: i, deadlineDay: i+7,
    branchNumber: 1, status: '完了', closedDay: i+6, deliveredDay: i+6, jewelryId: `sold-${i}`,
  });
}
state.history.closedOrders = Array.from({ length: 4900 }, (_, i) => ({ id: `legacy-closed-${i}`, status: '完了', closedDay: i + 1 }));

const liveJewelry = {
  id: 'live-jewelry', item: 'ring', gem: 'diamond', useLoose: true, looseShape: 'round', metal: 'silver',
  design: 'simple', finish: 'mirror', quality: 'standard', name: '現役ジュエリー', cost: 20000,
  recommendedPrice: 50000, status: 'stored', createdDay: 9999,
};
state.inventory.jewelry.push(liveJewelry);
for (let i = 1; i <= 10000; i += 1) {
  state.inventory.jewelry.push({
    id: `sold-${i}`, item: 'ring', gem: 'diamond', useLoose: true, looseShape: 'round', metal: 'silver',
    design: 'simple', finish: 'mirror', quality: 'standard', name: `販売品${i}`, cost: 20000,
    recommendedPrice: 50000, status: 'sold', createdDay: i, soldDay: i, soldPrice: 50000+i,
    craftsmanshipTags: Array(12).fill('tag-with-long-name'), craftsmanshipKnowledge: Array(12).fill('knowledge-with-long-name'),
    extraLargeUnusedPayload: 'p'.repeat(300),
  });
}
state.history.soldJewelry = Array.from({ length: 9800 }, (_, i) => ({ id: `legacy-sold-${i}`, status: 'sold', soldDay: i + 1 }));

let expectedIncome = 0;
let expectedExpense = 0;
for (let i = 1; i <= 10000; i += 1) {
  const income = i % 3 === 0 ? 1000 + i : 0;
  const expense = i % 3 === 0 ? 0 : 100 + (i % 100);
  expectedIncome += income;
  expectedExpense += expense;
  state.finance.push({ id: `f-${i}`, day: i, label: `収支${i}`, income, expense });
}

const beforeBytes = Buffer.byteLength(JSON.stringify(state));
const historyResult = compactLongTermHistory(state);
const financeResult = compactFinanceHistory(state);
const afterBytes = Buffer.byteLength(JSON.stringify(state));
const keptFinanceIncome = state.finance.reduce((sum, row) => sum + Number(row.income || 0), 0);
const keptFinanceExpense = state.finance.reduce((sum, row) => sum + Number(row.expense || 0), 0);
const afterTotals = JSON.stringify({
  salesCount: state.store.salesCount,
  totalRevenue: state.store.totalRevenue,
  totalProfit: state.store.totalProfit,
  deliveredOrderCount: state.store.deliveredOrderCount,
});
const roundTrip = migrateState(structuredClone(state));
const roundTripBytes = Buffer.byteLength(JSON.stringify(roundTrip));
const checks = {
  activeOrderKept: state.orders.some((row) => row.id === 'active-order' && row.status === '受注'),
  liveJewelryKept: state.inventory.jewelry.some((row) => row.id === 'live-jewelry' && row.status === 'stored'),
  closedBounded: state.orders.filter((row) => ['完了','取消','期限切れ'].includes(row.status)).length <= LONG_TERM_HISTORY_LIMITS.fullClosedOrders,
  soldBounded: state.inventory.jewelry.filter((row) => row.status === 'sold').length <= LONG_TERM_HISTORY_LIMITS.fullSoldJewelry,
  oldClosedArchiveRemoved: Array.isArray(state.history.closedOrders) && state.history.closedOrders.length === 0,
  oldSoldArchiveRemoved: Array.isArray(state.history.soldJewelry) && state.history.soldJewelry.length === 0,
  totalsUnchanged: beforeTotals === afterTotals,
  financeBounded: state.finance.length <= FINANCE_HISTORY_LIMIT,
  financeIncomePreserved: Math.round(Number(state.financeSummary.archivedIncome) + keptFinanceIncome) === expectedIncome,
  financeExpensePreserved: Math.round(Number(state.financeSummary.archivedExpense) + keptFinanceExpense) === expectedExpense,
  materiallySmaller: afterBytes < beforeBytes * 0.12,
  roundTripActiveOrderKept: roundTrip.orders.some((row) => row.id === 'active-order' && row.status === '受注'),
  roundTripLiveJewelryKept: roundTrip.inventory.jewelry.some((row) => row.id === 'live-jewelry' && row.status === 'stored'),
  roundTripClosedBounded: roundTrip.orders.filter((row) => ['完了','取消','期限切れ'].includes(row.status)).length <= LONG_TERM_HISTORY_LIMITS.fullClosedOrders,
  roundTripSoldBounded: roundTrip.inventory.jewelry.filter((row) => row.status === 'sold').length <= LONG_TERM_HISTORY_LIMITS.fullSoldJewelry,
  roundTripHistoryEmpty: roundTrip.history.closedOrders.length === 0 && roundTrip.history.soldJewelry.length === 0,
  roundTripFinanceBounded: roundTrip.finance.length <= FINANCE_HISTORY_LIMIT,
  roundTripStillSmall: roundTripBytes < beforeBytes * 0.15,
};
console.log(JSON.stringify({ historyResult, financeResult, beforeBytes, afterBytes, roundTripBytes, checks }));
if (Object.values(checks).some((value) => !value)) process.exit(1);
'''
proc = subprocess.run(
    ['node', '--experimental-default-type=module', '--input-type=module', '-e', NODE],
    cwd=ROOT, text=True, capture_output=True, timeout=90,
)
if proc.returncode != 0:
    print('BOUNDED SAVE HISTORY: FAIL')
    if proc.stdout: print(proc.stdout.strip())
    if proc.stderr: print(proc.stderr.strip())
    sys.exit(1)
try:
    result = json.loads(proc.stdout.strip().splitlines()[-1])
except Exception as exc:
    print(f'BOUNDED SAVE HISTORY: FAIL\n- 結果JSONを読めません: {exc}')
    sys.exit(1)
print('BOUNDED SAVE HISTORY: PASS')
print(f"整理前 {result['beforeBytes']:,} bytes -> 整理後 {result['afterBytes']:,} bytes -> 再読込後 {result['roundTripBytes']:,} bytes")
print(f"破棄した終了注文 {result['historyResult']['discardedClosedOrders']:,}件 / 売却済み {result['historyResult']['discardedSoldJewelry']:,}件 / 収支明細 {result['financeResult']['discardedFinanceRows']:,}件")
