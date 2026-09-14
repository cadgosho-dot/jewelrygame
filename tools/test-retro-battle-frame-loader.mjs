import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../js/events/retro-battle-frame-loader.js', import.meta.url), 'utf8');
const moduleUrl = `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
const {
  bindRetroBattleFrameLoader,
  RETRO_BATTLE_API_READY_TIMEOUT_MS,
  RETRO_BATTLE_API_READY_POLL_MS,
} = await import(moduleUrl);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

class FakeTarget {
  constructor() { this.listeners = new Map(); }
  addEventListener(type, listener, options = {}) {
    const rows = this.listeners.get(type) || [];
    rows.push({ listener, once: Boolean(options?.once) });
    this.listeners.set(type, rows);
  }
  removeEventListener(type, listener) {
    const rows = this.listeners.get(type) || [];
    this.listeners.set(type, rows.filter((row) => row.listener !== listener));
  }
  dispatch(type, detail) {
    const rows = [...(this.listeners.get(type) || [])];
    for (const row of rows) {
      row.listener({ type, detail });
      if (row.once) this.removeEventListener(type, row.listener);
    }
  }
}

class FakeFrame extends FakeTarget {
  constructor(pathname = '/jewelrygame/assets/minigames/retro-battle/index.html') {
    super();
    this.style = { visibility: 'hidden' };
    this.contentWindow = new FakeTarget();
    this.contentWindow.location = { pathname };
    this.contentDocument = { readyState: 'complete' };
  }
}

assert.equal(RETRO_BATTLE_API_READY_TIMEOUT_MS, 10000);
assert.equal(RETRO_BATTLE_API_READY_POLL_MS, 100);

{
  const frame = new FakeFrame('/initial-document');
  let startCount = 0;
  let startPayload = null;
  let inventoryDetail = null;
  let endDetail = null;
  let errorCount = 0;

  const cleanup = bindRetroBattleFrameLoader({
    frame,
    isActive: () => true,
    startOptions: () => ({ playerName: 'テスト', inventory: { pazupan: 1 } }),
    onInventoryChange: (detail) => { inventoryDetail = detail; },
    onEnd: (detail) => { endDetail = detail; },
    onError: () => { errorCount += 1; },
    timeoutMs: 150,
    pollMs: 10,
  });

  await sleep(10);
  assert.equal(startCount, 0, '一時documentでは開始しない');
  frame.contentWindow.location.pathname = '/jewelrygame/assets/minigames/retro-battle/index.html';
  frame.dispatch('load');
  setTimeout(() => {
    frame.contentWindow.RetroBattle = {
      start(payload) {
        startCount += 1;
        startPayload = payload;
      },
    };
  }, 20);

  await sleep(80);
  assert.equal(startCount, 1, 'API準備後に一度だけ開始する');
  assert.deepEqual(startPayload, { playerName: 'テスト', inventory: { pazupan: 1 } });
  assert.equal(frame.style.visibility, 'visible');
  frame.dispatch('load');
  await sleep(15);
  assert.equal(startCount, 1, '再loadでも二重開始しない');

  frame.contentWindow.dispatch('retroBattleInventoryChange', { itemKey: 'pazupan', delta: -1 });
  frame.contentWindow.dispatch('retroBattleEnd', { result: 'victory' });
  assert.deepEqual(inventoryDetail, { itemKey: 'pazupan', delta: -1 });
  assert.deepEqual(endDetail, { result: 'victory' });
  assert.equal(errorCount, 0);
  cleanup();
}

{
  const frame = new FakeFrame();
  let errorCount = 0;
  bindRetroBattleFrameLoader({
    frame,
    isActive: () => true,
    startOptions: () => ({}),
    onInventoryChange: () => {},
    onEnd: () => {},
    onError: () => { errorCount += 1; },
    timeoutMs: 30,
    pollMs: 5,
  });
  await sleep(80);
  assert.equal(errorCount, 1, 'APIが準備されなければ上限後に一度だけ失敗する');
}

{
  const frame = new FakeFrame();
  let errorCount = 0;
  let active = true;
  bindRetroBattleFrameLoader({
    frame,
    isActive: () => active,
    startOptions: () => ({}),
    onInventoryChange: () => {},
    onEnd: () => {},
    onError: () => { errorCount += 1; },
    timeoutMs: 50,
    pollMs: 5,
  });
  active = false;
  await sleep(30);
  assert.equal(errorCount, 0, 'イベント離脱時はエラー扱いにしない');
}

console.log('RETRO BATTLE FRAME LOADER REGRESSION: PASS');
