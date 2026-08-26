#!/usr/bin/env python3
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read(rel: str) -> str:
    return (ROOT / rel).read_text(encoding='utf-8')


def write(rel: str, text: str) -> None:
    (ROOT / rel).write_text(text, encoding='utf-8')


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f'{label}: expected 1 match, found {count}')
    return text.replace(old, new, 1)


def sub_once(text: str, pattern: str, repl: str, label: str, flags: int = 0) -> str:
    text2, count = re.subn(pattern, repl, text, count=1, flags=flags)
    if count != 1:
        raise RuntimeError(f'{label}: expected 1 regex match, found {count}')
    return text2


core = read('js/game-data-core.js')
core = replace_once(
    core,
    "export const LONG_TERM_HISTORY_LIMITS = Object.freeze({\n  fullClosedOrders: 100,\n  fullSoldJewelry: 200,\n});",
    "export const LONG_TERM_HISTORY_LIMITS = Object.freeze({\n  fullClosedOrders: 20,\n  fullSoldJewelry: 20,\n});\n\nexport const FINANCE_HISTORY_LIMIT = 300;",
    'history limits',
)

new_compaction = r'''export function compactLongTermHistory(state, limits = LONG_TERM_HISTORY_LIMITS) {
  if (!state || typeof state !== 'object' || Array.isArray(state)) {
    return { discardedClosedOrders: 0, discardedSoldJewelry: 0, changed: false };
  }
  const closedLimit = Math.max(0, Math.floor(Number(limits?.fullClosedOrders) || 0));
  const soldLimit = Math.max(0, Math.floor(Number(limits?.fullSoldJewelry) || 0));
  state.history = state.history && typeof state.history === 'object' && !Array.isArray(state.history)
    ? state.history
    : {};
  const archivedClosedBefore = Array.isArray(state.history.closedOrders) ? state.history.closedOrders.length : 0;
  const archivedSoldBefore = Array.isArray(state.history.soldJewelry) ? state.history.soldJewelry.length : 0;

  const orders = Array.isArray(state.orders) ? state.orders : [];
  const activeOrders = [];
  const closedOrders = [];
  orders.forEach((order, index) => {
    const closed = ['完了', '取消', '期限切れ'].includes(order?.status);
    (closed ? closedOrders : activeOrders).push({ value: order, index });
  });
  closedOrders.sort((a, b) => {
    const dayA = Number(a.value?.closedDay ?? a.value?.deliveredDay ?? a.value?.expiredDay ?? a.value?.cancelledDay ?? a.value?.deadlineDay ?? a.value?.acceptedDay ?? 0) || 0;
    const dayB = Number(b.value?.closedDay ?? b.value?.deliveredDay ?? b.value?.expiredDay ?? b.value?.cancelledDay ?? b.value?.deadlineDay ?? b.value?.acceptedDay ?? 0) || 0;
    return dayB - dayA || b.index - a.index;
  });
  const keepClosed = closedOrders.slice(0, closedLimit).map((entry) => entry.value);
  const discardClosed = closedOrders.slice(closedLimit).length;
  state.orders = [
    ...activeOrders.sort((a, b) => a.index - b.index).map((entry) => entry.value),
    ...keepClosed.reverse(),
  ];

  const jewelry = Array.isArray(state.inventory?.jewelry) ? state.inventory.jewelry : [];
  const liveJewelry = [];
  const soldJewelry = [];
  jewelry.forEach((item, index) => {
    (item?.status === 'sold' ? soldJewelry : liveJewelry).push({ value: item, index });
  });
  soldJewelry.sort((a, b) => {
    const dayA = Number(a.value?.soldDay ?? a.value?.removedDay ?? a.value?.stolenDay ?? a.value?.createdDay ?? 0) || 0;
    const dayB = Number(b.value?.soldDay ?? b.value?.removedDay ?? b.value?.stolenDay ?? b.value?.createdDay ?? 0) || 0;
    return dayB - dayA || b.index - a.index;
  });
  const keepSold = soldJewelry.slice(0, soldLimit).map((entry) => entry.value);
  const discardSold = soldJewelry.slice(soldLimit).length;
  if (state.inventory && typeof state.inventory === 'object') {
    state.inventory.jewelry = [
      ...liveJewelry.sort((a, b) => a.index - b.index).map((entry) => entry.value),
      ...keepSold.reverse(),
    ];
  }

  // v0.10.771: 旧版の永久アーカイブは読み込み時・保存時に完全破棄する。
  // 進行に必要な累計値は store / customer / event 側へ既に独立保存されているため、
  // 個別の終了注文・売却済み完成品を永久保持しない。
  state.history.closedOrders = [];
  state.history.soldJewelry = [];

  const discardedClosedOrders = discardClosed + archivedClosedBefore;
  const discardedSoldJewelry = discardSold + archivedSoldBefore;
  return {
    discardedClosedOrders,
    discardedSoldJewelry,
    changed: discardedClosedOrders > 0 || discardedSoldJewelry > 0,
    retainedFullClosedOrders: keepClosed.length,
    retainedFullSoldJewelry: keepSold.length,
    archivedClosedOrders: 0,
    archivedSoldJewelry: 0,
  };
}

function financeDatePartsForDay(state, value) {
  const start = String(state?.game?.startDate || '').trim();
  const match = start.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return { dayKey: '', monthKey: '', yearKey: '' };
  const day = Math.max(1, Math.floor(Number(value) || 1));
  const timestamp = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])) + (day - 1) * 86400000;
  const date = new Date(timestamp);
  const year = String(date.getUTCFullYear()).padStart(4, '0');
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const dateOfMonth = String(date.getUTCDate()).padStart(2, '0');
  return {
    dayKey: `${year}-${month}-${dateOfMonth}`,
    monthKey: `${year}-${month}`,
    yearKey: year,
  };
}

function ensureFinanceSummary(state) {
  const source = state.financeSummary && typeof state.financeSummary === 'object' && !Array.isArray(state.financeSummary)
    ? state.financeSummary
    : {};
  const current = financeDatePartsForDay(state, state?.game?.day);
  const summary = {
    archivedIncome: Math.max(0, Number(source.archivedIncome) || 0),
    archivedExpense: Math.max(0, Number(source.archivedExpense) || 0),
    dayKey: String(source.dayKey || ''),
    dayIncome: Math.max(0, Number(source.dayIncome) || 0),
    dayExpense: Math.max(0, Number(source.dayExpense) || 0),
    monthKey: String(source.monthKey || ''),
    monthIncome: Math.max(0, Number(source.monthIncome) || 0),
    monthExpense: Math.max(0, Number(source.monthExpense) || 0),
    yearKey: String(source.yearKey || ''),
    yearIncome: Math.max(0, Number(source.yearIncome) || 0),
    yearExpense: Math.max(0, Number(source.yearExpense) || 0),
  };
  if (summary.dayKey !== current.dayKey) {
    summary.dayKey = current.dayKey;
    summary.dayIncome = 0;
    summary.dayExpense = 0;
  }
  if (summary.monthKey !== current.monthKey) {
    summary.monthKey = current.monthKey;
    summary.monthIncome = 0;
    summary.monthExpense = 0;
  }
  if (summary.yearKey !== current.yearKey) {
    summary.yearKey = current.yearKey;
    summary.yearIncome = 0;
    summary.yearExpense = 0;
  }
  state.financeSummary = summary;
  return summary;
}

export function compactFinanceHistory(state, limit = FINANCE_HISTORY_LIMIT) {
  if (!state || typeof state !== 'object' || Array.isArray(state)) {
    return { discardedFinanceRows: 0, changed: false };
  }
  const rows = Array.isArray(state.finance) ? state.finance : [];
  const maxRows = Math.max(0, Math.floor(Number(limit) || 0));
  const summary = ensureFinanceSummary(state);
  if (rows.length <= maxRows) {
    state.finance = rows;
    return { discardedFinanceRows: 0, changed: false };
  }

  const cut = rows.length - maxRows;
  const discarded = rows.slice(0, cut);
  for (const row of discarded) {
    const income = Math.max(0, Number(row?.income) || 0);
    const expense = Math.max(0, Number(row?.expense) || 0);
    summary.archivedIncome += income;
    summary.archivedExpense += expense;
    const parts = financeDatePartsForDay(state, row?.day);
    if (parts.dayKey && parts.dayKey === summary.dayKey) {
      summary.dayIncome += income;
      summary.dayExpense += expense;
    }
    if (parts.monthKey && parts.monthKey === summary.monthKey) {
      summary.monthIncome += income;
      summary.monthExpense += expense;
    }
    if (parts.yearKey && parts.yearKey === summary.yearKey) {
      summary.yearIncome += income;
      summary.yearExpense += expense;
    }
  }
  state.finance = rows.slice(cut);
  return { discardedFinanceRows: discarded.length, changed: discarded.length > 0 };
}
'''
core = sub_once(
    core,
    r"export function compactLongTermHistory\(state, limits = LONG_TERM_HISTORY_LIMITS\) \{.*?\n\}\n\nfunction merge\(base, saved\)",
    new_compaction + "\nfunction merge(base, saved)",
    'replace long-term compaction',
    flags=re.S,
)

core = replace_once(
    core,
    "    notifications: [],\n    finance: [],\n    daily:",
    "    notifications: [],\n    finance: [],\n    financeSummary: {\n      archivedIncome: 0, archivedExpense: 0,\n      dayKey: '', dayIncome: 0, dayExpense: 0,\n      monthKey: '', monthIncome: 0, monthExpense: 0,\n      yearKey: '', yearIncome: 0, yearExpense: 0,\n    },\n    daily:",
    'initial finance summary',
)
core = replace_once(
    core,
    "? state.finance.slice(-2000).map((row, index) => ({",
    "? state.finance.map((row, index) => ({",
    'remove legacy finance pre-truncation',
)
core = replace_once(
    core,
    "  // v0.10.769: 現役データはそのまま、古い完了注文と売却済み完成品だけを軽量履歴へ退避する。\n  compactLongTermHistory(state);\n\n  return state;",
    "  // v0.10.771: 進行中データを保護しつつ、古い終了履歴と収支明細を自動整理する。\n  compactLongTermHistory(state);\n  compactFinanceHistory(state);\n\n  return state;",
    'migration compaction',
)
write('js/game-data-core.js', core)

app = read('js/app.js')
app = replace_once(
    app,
    "FINISHES, QUALITIES, compactLongTermHistory,\n",
    "FINISHES, QUALITIES, compactLongTermHistory, compactFinanceHistory,\n",
    'app compactFinanceHistory import',
)
app = replace_once(
    app,
    "  // v0.10.769: 保存直前に古い完了注文・売却済み完成品を軽量履歴へ退避する。\n  // saveRevisionを余分に増やさず、現役注文・現役商品には触れない。\n  compactLongTermHistory(state);",
    "  // v0.10.771: 保存前に不要な終了履歴と古い収支明細を整理し、セーブサイズを一定範囲に保つ。\n  // 進行中注文・未販売商品・累計値には触れない。\n  compactLongTermHistory(state);\n  compactFinanceHistory(state);",
    'save compaction',
)
app = replace_once(
    app,
    "  // v0.10.770: 診断は複製データだけを圧縮し、実ゲームのstateやsaveRevisionを変更しない。\n  compactLongTermHistory(snapshot);",
    "  // v0.10.771: 内部診断も実セーブと同じ整理後サイズを測る。実stateは変更しない。\n  compactLongTermHistory(snapshot);\n  compactFinanceHistory(snapshot);",
    'diagnostic compaction',
)
app = replace_once(
    app,
    "function addFinance(label, income = 0, expense = 0) {\n  state.finance.push({ id: uid(), day: state.game.day, label, income, expense });\n  state.finance = state.finance.slice(-2000);\n  state.daily.income += income;\n  state.daily.expense += expense;\n}",
    "function addFinance(label, income = 0, expense = 0) {\n  state.finance.push({ id: uid(), day: state.game.day, label, income, expense });\n  compactFinanceHistory(state);\n  state.daily.income += income;\n  state.daily.expense += expense;\n}",
    'addFinance cap',
)
finance_rows = """function financePeriodRows(period = state?.game?.financePeriod) {
  const resolved = validFinancePeriod(period);
  const current = gameDate();
  return (state?.finance || []).filter((row) => {
    if (resolved === 'cumulative') return true;
    const rowDate = gameDateForDay(row.day);
    if (resolved === 'today') return Number(row.day) === Number(state.game.day);
    if (resolved === 'month') {
      return rowDate.getFullYear() === current.getFullYear() && rowDate.getMonth() === current.getMonth();
    }
    return rowDate.getFullYear() === current.getFullYear();
  });
}
"""
finance_rows_new = finance_rows + """
function financePeriodTotals(period = state?.game?.financePeriod, rows = financePeriodRows(period)) {
  const resolved = validFinancePeriod(period);
  const summary = state?.financeSummary && typeof state.financeSummary === 'object' ? state.financeSummary : {};
  const currentKey = dateKey(gameDate());
  let income = rows.reduce((sum, row) => sum + Number(row.income || 0), 0);
  let expense = rows.reduce((sum, row) => sum + Number(row.expense || 0), 0);
  if (resolved === 'cumulative') {
    income += Math.max(0, Number(summary.archivedIncome) || 0);
    expense += Math.max(0, Number(summary.archivedExpense) || 0);
  } else if (resolved === 'today' && String(summary.dayKey || '') === currentKey) {
    income += Math.max(0, Number(summary.dayIncome) || 0);
    expense += Math.max(0, Number(summary.dayExpense) || 0);
  } else if (resolved === 'month' && String(summary.monthKey || '') === currentKey.slice(0, 7)) {
    income += Math.max(0, Number(summary.monthIncome) || 0);
    expense += Math.max(0, Number(summary.monthExpense) || 0);
  } else if (resolved === 'year' && String(summary.yearKey || '') === currentKey.slice(0, 4)) {
    income += Math.max(0, Number(summary.yearIncome) || 0);
    expense += Math.max(0, Number(summary.yearExpense) || 0);
  }
  return { income, expense };
}
"""
app = replace_once(app, finance_rows, finance_rows_new, 'finance totals helper')
app = replace_once(
    app,
    "    const rows = financePeriodRows(period);\n    const income = rows.reduce((sum, row) => sum + Number(row.income || 0), 0);\n    const expense = rows.reduce((sum, row) => sum + Number(row.expense || 0), 0);\n    const balance = income - expense;",
    "    const rows = financePeriodRows(period);\n    const { income, expense } = financePeriodTotals(period, rows);\n    const balance = income - expense;",
    'finance render totals',
)
settings_block = """    ${!titleMode ? `<section class="home-install-setting save-diagnostics-setting">
      <div><strong>セーブ容量診断</strong><small>現在のJSON容量・クラウドチャンク数・長期履歴件数を確認します。診断だけでは保存データを変更しません。</small></div>
      <button type="button" class="secondary-button full-button" data-action="save-diagnostics">セーブ容量を確認する</button>
    </section>` : ''}
"""
app = replace_once(app, settings_block, '', 'hide save diagnostics from settings')
app = replace_once(
    app,
    "    case 'save-diagnostics':\n      await showSaveDiagnostics();\n      break;\n",
    '',
    'remove save diagnostics action',
)
write('js/app.js', app)

check_history = r'''#!/usr/bin/env python3
"""Validate bounded long-term history and finance pruning for v0.10.771."""
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
'''
write('scripts/check-long-term-history.py', check_history)

check_diag = r'''#!/usr/bin/env python3
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
app = (ROOT / 'js/app.js').read_text(encoding='utf-8')
firebase = (ROOT / 'js/firebase-service.js').read_text(encoding='utf-8')

checks = [
    ('Firebaseに読み取り専用診断APIが残っている', 'export async function getCloudSaveDiagnostics(uid)' in firebase),
    ('診断APIは現行saveMetaを読む', 'metadata = await readCurrentCloudMetadata(uid);' in firebase),
    ('内部診断はstateの複製を使う', 'const snapshot = structuredClone(state || {});' in app),
    ('内部診断は終了履歴を整理する', 'compactLongTermHistory(snapshot);' in app),
    ('内部診断は収支履歴も整理する', 'compactFinanceHistory(snapshot);' in app),
    ('設定画面に容量診断ボタンを出さない', 'data-action="save-diagnostics"' not in app and 'セーブ容量を確認する' not in app),
    ('プレイヤー操作から容量診断を開けない', "case 'save-diagnostics':" not in app),
]

failed = [label for label, ok in checks if not ok]
for label, ok in checks:
    print(('OK' if ok else 'NG') + ': ' + label)
if failed:
    print('\nSAVE DIAGNOSTICS INTERNAL POLICY: FAIL')
    sys.exit(1)
print('\nSAVE DIAGNOSTICS INTERNAL POLICY: PASS')
'''
write('scripts/check-save-diagnostics.py', check_diag)

current = read('scripts/check-current.py')
current = replace_once(current, "('長期履歴圧縮',", "('長期履歴自動整理',", 'current audit label')
current = replace_once(current, "('セーブ容量診断',", "('セーブ容量診断（内部）',", 'diagnostic audit label')
write('scripts/check-current.py', current)

print('v0.10.771 bounded-save patch applied')
