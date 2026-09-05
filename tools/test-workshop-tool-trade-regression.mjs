import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const app = fs.readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');

function extractFunction(name) {
  const re = new RegExp(`(?:^|\\n)function\\s+${name}\\s*\\([^\\n]*\\)\\s*\\{`, 'm');
  const m = re.exec(app);
  assert.ok(m, `${name} definition not found`);
  const start = m.index + (m[0].startsWith('\n') ? 1 : 0);
  const brace = app.indexOf('{', start);
  let depth = 0;
  let quote = null;
  let escape = false;
  for (let i = brace; i < app.length; i += 1) {
    const c = app[i];
    if (quote) {
      if (escape) escape = false;
      else if (c === '\\') escape = true;
      else if (c === quote) quote = null;
      continue;
    }
    if (c === "'" || c === '"' || c === '`') { quote = c; continue; }
    if (c === '{') depth += 1;
    else if (c === '}') {
      depth -= 1;
      if (depth === 0) return app.slice(start, i + 1);
    }
  }
  throw new Error(`${name} end not found`);
}

const source = [
  'workshopToolRepairPrice',
  'createWorkshopToolRecord',
  'buyWorkshopTool',
  'repairWorkshopTool',
].map(extractFunction).join('\n\n');

const plain = (value) => JSON.parse(JSON.stringify(value));

function makeHarness(overrides = {}) {
  const calls = {
    toast: [], feedback: [], spend: [], finance: [], notifications: [],
    save: 0, render: 0, syncLegacy: 0,
  };
  const state = {
    game: { money: 100000, day: 20 },
    tools: { items: {} },
  };
  const WORKSHOP_TOOLS = {
    jewelryBench: { id: 'jewelryBench', name: '彫金机', price: 30000, repairable: true, breakable: true },
    polishingMachine: { id: 'polishingMachine', name: '宝石研磨用平面研磨機', price: 40000, repairable: true, breakable: true },
    handTool: { id: 'handTool', name: 'ヤスリ', price: 10000, repairable: true, breakable: true },
    fixedTool: { id: 'fixedTool', name: '固定設備', price: 5000, repairable: false, breakable: false },
  };
  if (overrides.money != null) state.game.money = overrides.money;
  if (overrides.day != null) state.game.day = overrides.day;
  if (overrides.items) state.tools.items = structuredClone(overrides.items);

  const context = {
    state,
    WORKSHOP_TOOLS,
    workshopToolUnlocked: () => true,
    toolOwned: (toolId) => Boolean(state.tools.items[toolId]),
    canSpendHours: () => true,
    workshopToolFailureDueDay: (_toolId, acquiredDay) => acquiredDay + 100,
    workshopToolRecord: (toolId) => state.tools.items[toolId] || null,
    syncLegacyToolFlags: () => { calls.syncLegacy += 1; },
    startMoneyFeedback: (amount) => calls.feedback.push(amount),
    spendHours: (hours) => calls.spend.push(hours),
    addFinance: (...args) => calls.finance.push(args),
    addNotification: (...args) => calls.notifications.push(args),
    saveGame: () => { calls.save += 1; },
    showToast: (...args) => calls.toast.push(args),
    render: () => { calls.render += 1; },
    gameDateLabel: (day) => `Day ${day}`,
  };
  Object.assign(context, overrides.context || {});
  vm.createContext(context);
  vm.runInContext(`${source}\nglobalThis.__buy = buyWorkshopTool;\nglobalThis.__repair = repairWorkshopTool;\nglobalThis.__repairPrice = workshopToolRepairPrice;`, context);
  return {
    context, state, calls,
    buy: context.__buy,
    repair: context.__repair,
    repairPrice: context.__repairPrice,
  };
}

function assertNoFinancialCommit(h, expectedMoney, expectedItemCount = Object.keys(h.state.tools.items).length) {
  assert.equal(h.state.game.money, expectedMoney);
  assert.equal(h.calls.feedback.length, 0);
  assert.equal(h.calls.spend.length, 0);
  assert.equal(h.calls.finance.length, 0);
  assert.equal(h.calls.notifications.length, 0);
  assert.equal(h.calls.save, 0);
  assert.equal(h.calls.render, 0);
  assert.equal(h.calls.syncLegacy, 0);
  assert.equal(Object.keys(h.state.tools.items).length, expectedItemCount);
}

function testSuccessfulWorkshopToolPurchase() {
  const h = makeHarness();
  h.buy('jewelryBench');
  assert.equal(h.state.game.money, 70000);
  assert.deepEqual(plain(h.state.tools.items.jewelryBench), {
    id: 'jewelryBench', status: 'available', acquiredDay: 20,
    failureDueDay: 120, repairCompleteDay: null,
  });
  assert.deepEqual(h.calls.feedback, [-30000]);
  assert.deepEqual(h.calls.spend, [1]);
  assert.equal(h.calls.syncLegacy, 1);
  assert.deepEqual(h.calls.finance[0], ['g-Lab.で彫金机を購入', 0, 30000]);
  assert.deepEqual(h.calls.notifications[0], ['彫金机を購入しました', '工房でジュエリーを制作できるようになりました。']);
  assert.equal(h.calls.save, 1);
  assert.deepEqual(h.calls.toast.at(-1), ['彫金机を購入しました。', 'info', false]);
  assert.equal(h.calls.render, 1);
}

function testPolishingMachinePurchaseNotification() {
  const h = makeHarness();
  h.buy('polishingMachine');
  assert.equal(h.state.game.money, 60000);
  assert.deepEqual(h.calls.notifications[0], ['宝石研磨用平面研磨機を購入しました', '工房で原石をルースへ研磨できるようになりました。']);
}

function testWorkshopToolPurchaseGuardRails() {
  {
    const h = makeHarness();
    h.buy('missing');
    assertNoFinancialCommit(h, 100000, 0);
    assert.equal(h.calls.toast.at(-1)?.[0], '現在は購入できません。');
  }
  {
    const h = makeHarness({ context: { workshopToolUnlocked: () => false } });
    h.buy('handTool');
    assertNoFinancialCommit(h, 100000, 0);
    assert.equal(h.calls.toast.at(-1)?.[0], '現在は購入できません。');
  }
  {
    const h = makeHarness({ items: { handTool: { id: 'handTool', status: 'available' } } });
    h.buy('handTool');
    assertNoFinancialCommit(h, 100000, 1);
    assert.equal(h.calls.toast.at(-1)?.[0], 'ヤスリはすでに所持しています。');
  }
  {
    const h = makeHarness({ money: 9999 });
    h.buy('handTool');
    assertNoFinancialCommit(h, 9999, 0);
    assert.equal(h.calls.toast.at(-1)?.[0], 'ヤスリを購入する所持金が足りません。');
  }
  {
    const h = makeHarness({ context: { canSpendHours: () => false } });
    h.buy('handTool');
    assertNoFinancialCommit(h, 100000, 0);
    assert.equal(h.calls.toast.at(-1)?.[0], '今日は購入手続きをする時間がありません。');
  }
}

function testWorkshopToolRepairPriceRule() {
  const h = makeHarness();
  assert.equal(h.repairPrice('handTool'), 6000);
  h.context.WORKSHOP_TOOLS.handTool.price = 12500;
  assert.equal(h.repairPrice('handTool'), 8000);
  h.context.WORKSHOP_TOOLS.handTool.price = 500;
  assert.equal(h.repairPrice('handTool'), 1000);
}

function testSuccessfulWorkshopToolRepair() {
  const h = makeHarness({
    items: { handTool: { id: 'handTool', status: 'unusable', acquiredDay: 5, failureDueDay: 20, repairCompleteDay: null } },
  });
  h.repair('handTool');
  assert.equal(h.state.game.money, 94000);
  assert.deepEqual(h.calls.feedback, [-6000]);
  assert.deepEqual(h.calls.spend, [1]);
  assert.equal(h.state.tools.items.handTool.status, 'repairing');
  assert.equal(h.state.tools.items.handTool.repairCompleteDay, 27);
  assert.equal(h.state.tools.items.handTool.failureDueDay, null);
  assert.deepEqual(h.calls.finance[0], ['g-Lab.へヤスリの修理を依頼', 0, 6000]);
  assert.deepEqual(h.calls.notifications[0], ['ヤスリを修理へ出しました', 'Day 27に修理が完了する予定です。']);
  assert.equal(h.calls.save, 1);
  assert.deepEqual(h.calls.toast.at(-1), ['ヤスリを修理へ出しました。', 'info', false]);
  assert.equal(h.calls.render, 1);
}

function testWorkshopToolRepairGuardRails() {
  {
    const h = makeHarness();
    h.repair('handTool');
    assertNoFinancialCommit(h, 100000, 0);
    assert.equal(h.calls.toast.at(-1)?.[0], '修理を依頼できる状態ではありません。');
  }
  {
    const h = makeHarness({ items: { fixedTool: { id: 'fixedTool', status: 'unusable' } } });
    h.repair('fixedTool');
    assertNoFinancialCommit(h, 100000, 1);
    assert.equal(h.calls.toast.at(-1)?.[0], '修理を依頼できる状態ではありません。');
  }
  {
    const h = makeHarness({ items: { handTool: { id: 'handTool', status: 'repairing' } } });
    h.repair('handTool');
    assertNoFinancialCommit(h, 100000, 1);
    assert.equal(h.calls.toast.at(-1)?.[0], '修理を依頼できる状態ではありません。');
  }
  {
    const h = makeHarness({ money: 5999, items: { handTool: { id: 'handTool', status: 'unusable' } } });
    h.repair('handTool');
    assertNoFinancialCommit(h, 5999, 1);
    assert.equal(h.calls.toast.at(-1)?.[0], '修理費が足りません。');
  }
  {
    const h = makeHarness({ items: { handTool: { id: 'handTool', status: 'unusable' } }, context: { canSpendHours: () => false } });
    h.repair('handTool');
    assertNoFinancialCommit(h, 100000, 1);
    assert.equal(h.calls.toast.at(-1)?.[0], '今日は修理を依頼する時間がありません。');
  }
}

testSuccessfulWorkshopToolPurchase();
testPolishingMachinePurchaseNotification();
testWorkshopToolPurchaseGuardRails();
testWorkshopToolRepairPriceRule();
testSuccessfulWorkshopToolRepair();
testWorkshopToolRepairGuardRails();

console.log('WORKSHOP TOOL TRADE REGRESSION: PASS');
console.log('buyWorkshopTool()/repairWorkshopTool() current behavior protected: unlock/ownership, money, 1h cost, tool record, legacy flags, repair price, 7-day repair, finance, notifications, save, feedback, toast, render.');
