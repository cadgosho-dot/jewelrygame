import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const app = fs.readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');

function extractFunction(name) {
  const match = new RegExp(`^(?:async\\s+)?function ${name}\\([^\\n]*\\) \\{`, 'm').exec(app);
  assert.ok(match, `${name} definition missing`);
  const start = match.index;
  const brace = start + match[0].length - 1;
  let depth = 0, quote = null, escaped = false, line = false, block = false;
  for (let i = brace; i < app.length; i += 1) {
    const c = app[i], next = app[i + 1];
    if (line) { if (c === '\n') line = false; continue; }
    if (block) { if (c === '*' && next === '/') { block = false; i += 1; } continue; }
    if (quote) {
      if (escaped) escaped = false;
      else if (c === '\\') escaped = true;
      else if (c === quote) quote = null;
      continue;
    }
    if (c === '/' && next === '/') { line = true; i += 1; continue; }
    if (c === '/' && next === '*') { block = true; i += 1; continue; }
    if (c === '"' || c === "'" || c === '`') { quote = c; continue; }
    if (c === '{') depth += 1;
    if (c === '}' && --depth === 0) return app.slice(start, i + 1);
  }
  throw new Error(`${name} closing brace missing`);
}

const source = extractFunction('addFinance');

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

function harness(options = {}) {
  const calls = [];
  let nextId = 0;
  const state = {
    game: { day: options.day ?? 1 },
    finance: structuredClone(options.finance || []),
    daily: {
      income: options.dailyIncome ?? 0,
      expense: options.dailyExpense ?? 0,
    },
  };
  const ctx = {
    state,
    uid: () => {
      nextId += 1;
      const id = `finance-${nextId}`;
      calls.push(['uid', id]);
      return id;
    },
    compactFinanceHistory: (receivedState) => {
      assert.equal(receivedState, state);
      calls.push([
        'compact',
        structuredClone(state.finance),
        state.daily.income,
        state.daily.expense,
      ]);
      if (typeof options.onCompact === 'function') options.onCompact(receivedState);
    },
    console,
  };
  vm.createContext(ctx);
  vm.runInContext(source, ctx, { filename: 'app.js:finance-ledger' });
  return { ctx, state, calls };
}

function compactCalls(h) {
  return h.calls.filter((call) => call[0] === 'compact');
}

function testIncomeEntryRecordsCurrentDayAndDailyIncome() {
  const h = harness({ day: 12, dailyIncome: 3000, dailyExpense: 400 });
  h.ctx.addFinance('店頭販売', 12500, 0);
  assert.equal(h.state.finance.length, 1);
  assert.deepEqual(plain(h.state.finance[0]), {
    id: 'finance-1',
    day: 12,
    label: '店頭販売',
    income: 12500,
    expense: 0,
  });
  assert.equal(h.state.daily.income, 15500);
  assert.equal(h.state.daily.expense, 400);
  assert.equal(compactCalls(h).length, 1);
}

function testExpenseEntryRecordsCurrentDayAndDailyExpense() {
  const existing = [{ id: 'old', day: 4, label: '既存', income: 100, expense: 0 }];
  const h = harness({ day: 5, finance: existing, dailyIncome: 100, dailyExpense: 250 });
  h.ctx.addFinance('材料購入', 0, 1800);
  assert.equal(h.state.finance.length, 2);
  assert.deepEqual(plain(h.state.finance[1]), {
    id: 'finance-1',
    day: 5,
    label: '材料購入',
    income: 0,
    expense: 1800,
  });
  assert.equal(h.state.daily.income, 100);
  assert.equal(h.state.daily.expense, 2050);
  assert.equal(compactCalls(h).length, 1);
}

function testMixedEntryUpdatesBothDailyTotals() {
  const h = harness({ day: 21, dailyIncome: 10, dailyExpense: 20 });
  h.ctx.addFinance('差額調整', 500, 125);
  assert.equal(h.state.finance[0].income, 500);
  assert.equal(h.state.finance[0].expense, 125);
  assert.equal(h.state.daily.income, 510);
  assert.equal(h.state.daily.expense, 145);
}

function testDefaultAmountsAreZeroAndTotalsStayUnchanged() {
  const h = harness({ day: 8, dailyIncome: 700, dailyExpense: 900 });
  h.ctx.addFinance('記録のみ');
  assert.deepEqual(plain(h.state.finance[0]), {
    id: 'finance-1',
    day: 8,
    label: '記録のみ',
    income: 0,
    expense: 0,
  });
  assert.equal(h.state.daily.income, 700);
  assert.equal(h.state.daily.expense, 900);
}

function testCompactionRunsAfterEntryAppendBeforeDailyTotals() {
  const h = harness({ day: 3, dailyIncome: 200, dailyExpense: 300 });
  h.ctx.addFinance('順序確認', 50, 25);
  const compact = compactCalls(h)[0];
  assert.equal(compact[1].length, 1);
  assert.equal(compact[1][0].label, '順序確認');
  assert.equal(compact[2], 200);
  assert.equal(compact[3], 300);
  assert.equal(h.state.daily.income, 250);
  assert.equal(h.state.daily.expense, 325);
}

function testRepeatedEntriesUseDistinctIdsAndAccumulate() {
  const h = harness({ day: 30 });
  h.ctx.addFinance('売上A', 1000, 0);
  h.ctx.addFinance('経費B', 0, 400);
  h.ctx.addFinance('売上C', 250, 0);
  assert.deepEqual(h.state.finance.map((row) => row.id), ['finance-1', 'finance-2', 'finance-3']);
  assert.deepEqual(h.state.finance.map((row) => row.day), [30, 30, 30]);
  assert.equal(h.state.daily.income, 1250);
  assert.equal(h.state.daily.expense, 400);
  assert.equal(compactCalls(h).length, 3);
}

for (const test of [
  testIncomeEntryRecordsCurrentDayAndDailyIncome,
  testExpenseEntryRecordsCurrentDayAndDailyExpense,
  testMixedEntryUpdatesBothDailyTotals,
  testDefaultAmountsAreZeroAndTotalsStayUnchanged,
  testCompactionRunsAfterEntryAppendBeforeDailyTotals,
  testRepeatedEntriesUseDistinctIdsAndAccumulate,
]) {
  test();
  console.log(`OK: ${test.name}`);
}

console.log('FINANCE LEDGER REGRESSION: PASS');
