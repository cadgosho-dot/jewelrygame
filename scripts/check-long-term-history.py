#!/usr/bin/env python3
"""Validate v0.10.769 long-term order/jewelry history compaction."""
from __future__ import annotations
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
NODE = r'''
import { initialState, migrateState, compactLongTermHistory, LONG_TERM_HISTORY_LIMITS } from './js/game-data-core.js';

const state = initialState();
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
const beforeBytes = Buffer.byteLength(JSON.stringify(state));
const result = compactLongTermHistory(state);
const afterBytes = Buffer.byteLength(JSON.stringify(state));
state.version = '0.10.769';
const roundTrip = migrateState(structuredClone(state));
const roundTripBytes = Buffer.byteLength(JSON.stringify(roundTrip));
const afterTotals = JSON.stringify({
  salesCount: state.store.salesCount,
  totalRevenue: state.store.totalRevenue,
  totalProfit: state.store.totalProfit,
  deliveredOrderCount: state.store.deliveredOrderCount,
});
const checks = {
  activeOrderKept: state.orders.some((row) => row.id === 'active-order' && row.status === '受注'),
  liveJewelryKept: state.inventory.jewelry.some((row) => row.id === 'live-jewelry' && row.status === 'stored'),
  fullClosedBounded: state.orders.filter((row) => ['完了','取消','期限切れ'].includes(row.status)).length <= LONG_TERM_HISTORY_LIMITS.fullClosedOrders,
  fullSoldBounded: state.inventory.jewelry.filter((row) => row.status === 'sold').length <= LONG_TERM_HISTORY_LIMITS.fullSoldJewelry,
  allClosedPreserved: state.history.closedOrders.length + state.orders.filter((row) => ['完了','取消','期限切れ'].includes(row.status)).length === 5000,
  allSoldPreserved: state.history.soldJewelry.length + state.inventory.jewelry.filter((row) => row.status === 'sold').length === 10000,
  totalsUnchanged: beforeTotals === afterTotals,
  materiallySmaller: afterBytes < beforeBytes * 0.55,
  archivedOrdersLightweight: state.history.closedOrders.every((row) => !('customerProfileDetails' in row) && !('desiredConditions' in row)),
  archivedJewelryLightweight: state.history.soldJewelry.every((row) => !('craftsmanshipTags' in row) && !('craftsmanshipKnowledge' in row) && !('extraLargeUnusedPayload' in row)),
  roundTripActiveOrderKept: roundTrip.orders.some((row) => row.id === 'active-order' && row.status === '受注'),
  roundTripLiveJewelryKept: roundTrip.inventory.jewelry.some((row) => row.id === 'live-jewelry' && row.status === 'stored'),
  roundTripClosedCount: roundTrip.history.closedOrders.length + roundTrip.orders.filter((row) => ['完了','取消','期限切れ'].includes(row.status)).length === 5000,
  roundTripSoldCount: roundTrip.history.soldJewelry.length + roundTrip.inventory.jewelry.filter((row) => row.status === 'sold').length === 10000,
  roundTripStillCompact: roundTripBytes < beforeBytes * 0.60,
};
console.log(JSON.stringify({ result, beforeBytes, afterBytes, roundTripBytes, checks }));
if (Object.values(checks).some((value) => !value)) process.exit(1);
'''
proc = subprocess.run(
    ['node', '--experimental-default-type=module', '--input-type=module', '-e', NODE],
    cwd=ROOT, text=True, capture_output=True, timeout=90,
)
if proc.returncode != 0:
    print('LONG-TERM HISTORY: FAIL')
    if proc.stdout: print(proc.stdout.strip())
    if proc.stderr: print(proc.stderr.strip())
    sys.exit(1)
try:
    result = json.loads(proc.stdout.strip().splitlines()[-1])
except Exception as exc:
    print(f'LONG-TERM HISTORY: FAIL\n- 結果JSONを読めません: {exc}')
    sys.exit(1)
print('LONG-TERM HISTORY: PASS')
print(f"圧縮前 {result['beforeBytes']:,} bytes -> 圧縮後 {result['afterBytes']:,} bytes -> 再読込後 {result['roundTripBytes']:,} bytes")
print(f"完了注文アーカイブ {result['result']['archivedClosedOrders']:,}件 / 売却済みアーカイブ {result['result']['archivedSoldJewelry']:,}件")
