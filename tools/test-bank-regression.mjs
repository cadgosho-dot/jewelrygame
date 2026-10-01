import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import {
  BANK_BALANCE_LIMIT,
  BANK_TRANSACTION_STEP,
  accrueBankInterest,
  bankIsOpen,
  bankStepForHold,
  normalizeBankAmount,
  performBankTransaction,
} from '../js/finance/bank-engine.js';
import { createEventStateHelpers, setServices } from '../js/events/event-state-helpers.js';

function makeState({ day = 1, startDate = '2027-11-02', minutes = 9 * 60, money = 1_000_000, balance = 0, lastInterestDay = day, hunger = 7 } = {}) {
  return {
    game:{ day, startDate, minutes, money },
    wellbeing:{ hunger, maxHunger:7 },
    events:{},
    inventory:{},
    bank:{ balance, lastInterestDay },
  };
}

assert.equal(bankIsOpen(8 * 60, { startDate:'2027-11-02', day:1 }), true);
assert.equal(bankIsOpen(16 * 60 + 59, { startDate:'2027-11-02', day:1 }), true);
assert.equal(bankIsOpen(17 * 60, { startDate:'2027-11-02', day:1 }), false);
assert.equal(bankIsOpen(7 * 60 + 59, { startDate:'2027-11-02', day:1 }), false);
assert.equal(bankIsOpen(9 * 60, { startDate:'2027-11-02', day:2 }), false, '文化の日は休業');
assert.equal(bankIsOpen(9 * 60, { startDate:'2027-11-06', day:1 }), false, '土曜日は休業');
assert.equal(bankIsOpen(9 * 60, { startDate:'2027-11-07', day:1 }), false, '日曜日は休業');
assert.equal(bankIsOpen(9 * 60, { startDate:'2027-11-08', day:1 }), true, '平日は営業');
assert.equal(normalizeBankAmount(19_999), BANK_TRANSACTION_STEP);
assert.equal(normalizeBankAmount(9_999), 0);
assert.equal(bankStepForHold(100), 10_000);
assert.equal(bankStepForHold(799), 10_000);
assert.equal(bankStepForHold(800), 100_000);
assert.equal(bankStepForHold(1999), 100_000);
assert.equal(bankStepForHold(2000), 1_000_000);
assert.equal(bankStepForHold(3999), 1_000_000);
assert.equal(bankStepForHold(4000), 10_000_000);

{
  const state = makeState();
  const result = performBankTransaction(state, 'deposit', 100_000, 1);
  assert.equal(result.ok, true);
  assert.equal(state.game.money, 900_000);
  assert.equal(state.bank.balance, 100_000);
}
{
  const state = makeState({ money:100_000, balance:500_000 });
  const result = performBankTransaction(state, 'withdraw', 200_000, 1);
  assert.equal(result.ok, true);
  assert.equal(state.game.money, 300_000);
  assert.equal(state.bank.balance, 300_000);
}
{
  const state = makeState({ money:50_000 });
  const before = structuredClone(state);
  const result = performBankTransaction(state, 'deposit', 100_000, 1);
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'insufficient-cash');
  assert.deepEqual(state, before);
}
{
  const state = makeState({ balance:BANK_BALANCE_LIMIT - 50_000 });
  const result = performBankTransaction(state, 'deposit', 100_000, 1);
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'balance-limit');
}
{
  const state = makeState({ day:61, balance:1_000_000, lastInterestDay:1 });
  const result = accrueBankInterest(state, 61);
  assert.equal(result.periods, 2);
  assert.equal(result.credited, 20_100);
  assert.equal(state.bank.balance, 1_020_100);
}

{
  let saveCount = 0;
  const state = makeState();
  setServices(
    () => true,
    () => { state.game.minutes += 60; },
    () => {},
    () => {},
    () => {},
    () => {},
  );
  const helpers = createEventStateHelpers(
    () => state,
    () => { saveCount += 1; },
    () => {},
    () => {},
    (value) => value,
    {},
  );
  const result = helpers.bankTransaction('deposit', 100_000);
  assert.equal(result.ok, true);
  assert.equal(state.game.money, 900_000);
  assert.equal(state.bank.balance, 100_000);
  assert.equal(state.game.minutes, 10 * 60);
  assert.equal(state.wellbeing.hunger, 6);
  assert.equal(saveCount, 1);

  const beforeFailed = structuredClone(state);
  const failed = helpers.bankTransaction('deposit', 9_999_990_000);
  assert.equal(failed.ok, false);
  assert.equal(state.game.minutes, beforeFailed.game.minutes);
  assert.equal(state.wellbeing.hunger, beforeFailed.wellbeing.hunger);
  assert.equal(state.game.money, beforeFailed.game.money);
  assert.equal(state.bank.balance, beforeFailed.bank.balance);

  state.game.day = 31;
  const snapshot = helpers.bankRuntimeSnapshot();
  assert.equal(snapshot.interest.credited, 1_000);
  assert.equal(snapshot.bank.balance, 101_000);
  assert.equal(saveCount, 2);
}

{
  const state = makeState({ day:2, startDate:'2027-11-02', minutes:9 * 60 });
  setServices(() => true, () => { state.game.minutes += 60; }, () => {}, () => {}, () => {}, () => {});
  const helpers = createEventStateHelpers(() => state, () => {}, () => {}, () => {}, (value) => value, {});
  const snapshot = helpers.bankRuntimeSnapshot();
  assert.equal(snapshot.open, false, '祝日は銀行画面も閉じる');
  const transaction = helpers.bankTransaction('deposit', 100_000);
  assert.equal(transaction.ok, false);
  assert.equal(transaction.reason, 'closed');
}

// 銀行上部バーは御徒町の共通ヘッダー構造をそのまま使う。
const bankUiSource = readFileSync(new URL('../js/finance/bank-ui.js', import.meta.url), 'utf8');
assert.doesNotMatch(bankUiSource, /8:00〜(?:16|17):00/);
assert.doesNotMatch(bankUiSource, /jxj-bank-hours/);
assert.match(bankUiSource, /cloneNode\(true\)/);
assert.match(bankUiSource, /data-bank-main/);
assert.match(bankUiSource, /facility-closed/);
assert.match(bankUiSource, /休業日/);
assert.match(bankUiSource, /const HOLD_REPEAT_MS = 160;/);
assert.match(bankUiSource, /screen\.classList\.add\('screen-shell'\)/, '銀行画面も他店舗と同じ screen-shell 構造を使う');
assert.match(bankUiSource, /content\.className = 'screen-content jxj-bank-content'/, '銀行本文も共通 screen-content を使う');
assert.doesNotMatch(bankUiSource, /removeAttribute\('data-action'\)/, '共通ヘッダーの data-action を剥がさない');
assert.match(bankUiSource, /header\.querySelector\('\.header-help-button'\)\?\.remove\(\)/, '銀行ではヘルプボタンだけを除外する');
assert.doesNotMatch(bankUiSource, /#\$\{BANK_SCREEN_ID\}>\.game-header\s*\{/, '銀行専用のヘッダー位置上書きを持たない');
assert.match(bankUiSource, /@media \(orientation:landscape\)\{[\s\S]*?\.jxj-bank-menu\{grid-template-columns:repeat\(3,minmax\(0,1fr\)\);/, '横画面は3つの銀行メニューボタンを横並びにする');
assert.match(bankUiSource, /\.jxj-bank-content\{[\s\S]{0,260}?padding-inline:clamp\(12px,2vw,24px\);/, '本文は共通ヘッダー余白を潰さず左右余白だけ設定する');
assert.doesNotMatch(bankUiSource, /@media \(orientation:landscape\) and \(max-height:650px\)\{[\s\S]{0,260}?\.jxj-bank-content\{padding:10px 18px;\}/, '横画面で共通ヘッダー余白をpadding shorthandで上書きしない');

assert.equal(
  existsSync(new URL('../js/finance/bank-portrait-header-fix.js', import.meta.url)),
  false,
  '銀行専用の縦画面ヘッダー補正ファイルを残さない',
);

const eventHelperSource = readFileSync(new URL('../js/events/event-state-helpers.js', import.meta.url), 'utf8');
assert.doesNotMatch(eventHelperSource, /bank-portrait-header-fix\.js/, '銀行専用ヘッダー補正を読み込まない');
assert.match(eventHelperSource, /startDate/);
assert.match(eventHelperSource, /bankIsOpen\(state\.game\.minutes, \{ startDate:state\.game\.startDate, day \}\)/);

const expectedBankAssets = [
  {
    name:'landscape',
    relativePath:'../assets/images/backgrounds/bank-okachimachi-landscape.jpg',
    size:397148,
    sha256:'b3d305d85a5b8c80869cf15059527af805eba09ee571bba1b7496e8c1cf59a2b',
  },
  {
    name:'portrait',
    relativePath:'../assets/images/backgrounds/bank-okachimachi-portrait.jpg',
    size:476320,
    sha256:'8d4ef397962eba026238d7f3d8c7083fea93ffb052b3dc0d16d320e1cf91a6d3',
  },
];
for (const expected of expectedBankAssets) {
  const file = readFileSync(new URL(expected.relativePath, import.meta.url));
  const sha256 = createHash('sha256').update(file).digest('hex');
  assert.equal(file.length, expected.size, `${expected.name} bank background size changed`);
  assert.equal(sha256, expected.sha256, `${expected.name} bank background bytes changed`);
  console.log(`BANK ASSET ${expected.name}: size=${file.length} sha256=${sha256}`);
}

console.log('BANK REGRESSION: PASS');
