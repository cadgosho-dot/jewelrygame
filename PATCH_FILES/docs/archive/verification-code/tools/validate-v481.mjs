import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { VERSION, DEFAULT_BIRTHDAY, initialState, migrateState } from '../js/game-data.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const app = fs.readFileSync(path.join(root, 'js/app.js'), 'utf8');
const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
const indexHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const gameHtml = fs.readFileSync(path.join(root, 'game.html'), 'utf8');
const assert = (condition, message) => { if (!condition) throw new Error(message); };

function extractFunction(source, name) {
  const match = new RegExp(`function\\s+${name}\\s*\\([^)]*\\)\\s*\\{`).exec(source);
  if (!match) throw new Error(`${name}が見つかりません`);
  const bodyStart = match.index + match[0].lastIndexOf('{');
  let depth = 0;
  let quote = '';
  let escaped = false;
  for (let i = bodyStart; i < source.length; i += 1) {
    const ch = source[i];
    if (quote) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === quote) quote = '';
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') { quote = ch; continue; }
    if (ch === '{') depth += 1;
    if (ch === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(match.index, i + 1);
    }
  }
  throw new Error(`${name}の終端が見つかりません`);
}

assert(VERSION === '0.10.481', `VERSIONが0.10.481ではありません: ${VERSION}`);
assert(DEFAULT_BIRTHDAY === '04-01', '誕生日の既定値が4月1日ではありません');
assert(sw.includes("const VERSION = '0.10.481'"), 'Service WorkerのVERSIONが古いです');
assert(indexHtml.includes('game.html?v=0.10.481'), 'index.htmlの読込番号が古いです');
assert(gameHtml.includes('js/app.js?v=0.10.481'), 'game.htmlの読込番号が古いです');
assert(app.includes("./daily-gems.js?v=0.10.481"), 'daily-gemsの読込番号が古いです');
assert(initialState().migrations.illnessPaymentBirthdayOverlapV481 === true, '新規データにv481移行済み印がありません');
assert(initialState().migrations.illnessPaymentBirthdayOverlapV481PaymentPending === false, '新規データの支払い再確認待ちがfalseではありません');

function stoppedSave({
  startDate = '2027-01-01', day = 1, minutes = 540, hunger = 0,
  transitionPhase = 'morningPending', toDay = 1, birthdayActive = true,
  birthdayStage = 'greeting', birthdayCompletedYear = 2027, illness = true,
} = {}) {
  const saved = initialState();
  saved.version = '0.10.480';
  saved.game.startDate = startDate;
  saved.game.day = day;
  saved.game.minutes = minutes;
  saved.game.screen = birthdayActive ? 'birthdaySleepEvent' : 'main';
  saved.game.dayTransition = {
    phase: transitionPhase,
    fromDay: transitionPhase === 'settling' ? Math.max(1, day - 1) : 0,
    toDay,
    startedDateKey: '',
    morningDateKey: transitionPhase === 'morningPending' ? startDate : '',
    overlapRecoveryCount: 0,
  };
  saved.settings.birthday = '04-01';
  saved.wellbeing.hunger = hunger;
  saved.events.winterColdEvent = {
    active: illness,
    stage: illness ? 'sick' : 'idle',
    seasonKey: '2026-2027',
    lastCompletedSeason: '',
    lastCheckedDate: startDate,
    startDay: day,
    daysCompleted: illness ? 1 : 0,
    totalTriggered: illness ? 1 : 0,
    recoveryNoticePending: false,
  };
  saved.events.birthdaySleepEvent = {
    active: birthdayActive,
    stage: birthdayStage,
    eventYear: birthdayCompletedYear,
    lastCompletedYear: birthdayCompletedYear,
  };
  saved.migrations = { ...saved.migrations, birthdayDefaultAprilV480: true };
  delete saved.migrations.illnessPaymentBirthdayOverlapV481;
  return saved;
}

// 1月1日＋月初支払い日＋体調不良＋旧誕生日イベント＋朝処理中。
{
  const saved = stoppedSave();
  saved.business.lastProcessedMonth = '2026-12';
  const migrated = migrateState(saved);
  assert(migrated.migrations.illnessPaymentBirthdayOverlapV481 === true, 'v481移行済み印が付きません');
  assert(migrated.game.screen === 'main', '停止画面からメインへ戻りません');
  assert(migrated.game.dayTransition.phase === 'idle', 'morningPendingが解除されません');
  assert(migrated.game.minutes === 540, '翌朝9時へ正規化されません');
  assert(migrated.wellbeing.hunger === 7, '翌朝の空腹度が7へ戻りません');
  assert(migrated.events.winterColdEvent.active && migrated.events.winterColdEvent.stage === 'sick', '療養状態が維持されません');
  assert(!migrated.events.birthdaySleepEvent.active && migrated.events.birthdaySleepEvent.stage === 'idle', '旧誕生日イベントが待機状態へ戻りません');
  assert(migrated.events.birthdaySleepEvent.lastCompletedYear === 0, '旧1月1日の完了年が4月1日を妨げます');
  assert(migrated.business.lastProcessedMonth === '2026-12', '固定費の処理済みキーを変更しています');
  assert(migrated.migrations.illnessPaymentBirthdayOverlapV481PaymentPending === true, '翌朝の支払い再確認待ちが保存されません');
}

// 旧誕生日が完了扱いだけ残った停止データも4月1日を塞がない。
{
  const saved = stoppedSave({ transitionPhase: 'idle', birthdayActive: false, birthdayStage: 'completed' });
  const migrated = migrateState(saved);
  assert(migrated.events.birthdaySleepEvent.stage === 'idle', '1月1日の古い完了状態を解除できません');
  assert(migrated.events.birthdaySleepEvent.lastCompletedYear === 0, '古い完了年を解除できません');
}

// 日付が進む前に中断した場合は、日付・時刻・空腹度を変更しない。
{
  const saved = stoppedSave({ day: 10, startDate: '2027-01-01', minutes: 1140, hunger: 0, transitionPhase: 'settling', toDay: 11 });
  const migrated = migrateState(saved);
  assert(migrated.game.day === 10, '日付進行前の保存を翌日に進めています');
  assert(migrated.game.minutes === 1140, '日付進行前の時刻を変更しています');
  assert(migrated.wellbeing.hunger === 0, '日付進行前の空腹度を変更しています');
  assert(migrated.game.dayTransition.phase === 'idle', '日付進行前のロックを解除できません');
}

// 正常な療養中データは変更しない。
{
  const saved = stoppedSave({ startDate: '2027-01-02', transitionPhase: 'idle', birthdayActive: false, birthdayStage: 'idle', birthdayCompletedYear: 0, hunger: 3 });
  const migrated = migrateState(saved);
  assert(migrated.wellbeing.hunger === 3, '正常な療養中の空腹度を変更しています');
  assert(migrated.events.winterColdEvent.stage === 'sick', '正常な療養状態を変更しています');
}

// 祝日・支払日だけで体調不良ではないデータは変更しない。
{
  const saved = stoppedSave({ illness: false, birthdayActive: false, birthdayStage: 'idle', birthdayCompletedYear: 0, transitionPhase: 'idle', hunger: 0 });
  const migrated = migrateState(saved);
  assert(migrated.wellbeing.hunger === 0, '体調不良でないデータを誤復旧しています');
}

for (const marker of [
  'function resetStaleBirthdayEventForIllness',
  'function reconcileMorningPaymentsIdempotently',
  'function repairIllnessPaymentBirthdayOverlapV481',
  'repairIllnessPaymentBirthdayOverlapV481({ save: true });',
  'completeMorningTransition({ save: true });',
  'state.migrations.illnessPaymentBirthdayOverlapV481 = true;',
]) assert(app.includes(marker), `実装マーカーが不足しています: ${marker}`);
assert((app.match(/repairIllnessPaymentBirthdayOverlapV481/g) || []).length >= 7, '読み込み・描画・翌日処理への接続が不足しています');

function runtimeContext({ phase = 'morningPending', day = 1, toDay = 1, minutes = 540, hunger = 0, birthdayActive = true, birthdayStage = 'greeting', lastCompletedYear = 2027, paymentPending = false } = {}) {
  let monthlyCalls = 0;
  let homeCalls = 0;
  let saves = 0;
  const transition = { phase, fromDay: phase === 'settling' ? Math.max(1, day - 1) : 0, toDay, startedDateKey: '', morningDateKey: '', overlapRecoveryCount: 0 };
  const birthday = { active: birthdayActive, stage: birthdayStage, eventYear: 2027, lastCompletedYear };
  const state = {
    game: { day, minutes, screen: birthdayActive ? 'birthdaySleepEvent' : 'main', dayTransition: transition },
    wellbeing: { hunger, maxHunger: 7 },
    settings: { birthday: '04-01' },
    events: {
      winterColdEvent: { active: true, stage: 'sick', daysCompleted: 1 },
      birthdaySleepEvent: birthday,
    },
    migrations: { illnessPaymentBirthdayOverlapV481PaymentPending: paymentPending },
  };
  const context = {
    state,
    screen: state.game.screen,
    screenData: { x: 1 },
    navigation: [{}],
    sleepTransitioning: false,
    DAY_START_MINUTES: 540,
    DEFAULT_BIRTHDAY: '04-01',
    ILLNESS_SUPPRESSED_EVENT_SCREENS: new Set(['birthdaySleepEvent']),
    illnessEventSuppressionActive: () => true,
    dayTransitionState: () => transition,
    birthdaySleepEventState: () => birthday,
    gameDate: () => new Date(2027, 0, 1, 12),
    birthdayMatchesDate: () => false,
    configuredBirthday: () => '04-01',
    clearTransientEventRuntime() {},
    suppressAllTransientEventsForIllness() { return 1; },
    processMonthlyFixedCosts() { monthlyCalls += 1; },
    processHomeRent() { homeCalls += 1; },
    completeMorningTransition() {
      transition.phase = 'idle'; transition.fromDay = 0; transition.toDay = 0; transition.startedDateKey = ''; transition.morningDateKey = '';
      return true;
    },
    saveGame() { saves += 1; return Promise.resolve(); },
    console,
  };
  vm.createContext(context);
  vm.runInContext([
    extractFunction(app, 'resetStaleBirthdayEventForIllness'),
    extractFunction(app, 'reconcileMorningPaymentsIdempotently'),
    extractFunction(app, 'repairIllnessPaymentBirthdayOverlapV481'),
  ].join('\n'), context);
  return { context, stats: () => ({ monthlyCalls, homeCalls, saves }) };
}

// 実行時復旧：支払いは冪等関数を1回だけ確認し、誕生日と朝ロックを解除。
{
  const { context, stats } = runtimeContext();
  assert(context.repairIllnessPaymentBirthdayOverlapV481({ save: true }) === true, '実行時の重複停止を復旧できません');
  assert(context.screen === 'main' && context.state.game.screen === 'main', '実行時復旧後にメインへ戻りません');
  assert(context.state.wellbeing.hunger === 7, '実行時復旧後の空腹度が7ではありません');
  assert(context.state.game.dayTransition.phase === 'idle', '実行時復旧後に朝ロックが残ります');
  assert(context.state.events.birthdaySleepEvent.stage === 'idle' && context.state.events.birthdaySleepEvent.lastCompletedYear === 0, '4月1日を妨げる誕生日状態が残ります');
  assert(context.state.migrations.illnessPaymentBirthdayOverlapV481PaymentPending === false, '支払い再確認待ちが解除されません');
  assert(stats().monthlyCalls === 1 && stats().homeCalls === 1, '支払いの冪等確認回数が不正です');
  assert(context.repairIllnessPaymentBirthdayOverlapV481({ save: true }) === false, '復旧処理が二重実行されます');
  assert(stats().monthlyCalls === 1 && stats().homeCalls === 1, '再実行で支払い処理を呼び出しています');
}


// 移行時に日付境界だけ先に解除した保存も、支払い再確認待ちから一度だけ整合させる。
{
  const { context, stats } = runtimeContext({ phase: 'idle', birthdayActive: false, birthdayStage: 'idle', lastCompletedYear: 0, paymentPending: true });
  context.screen = 'main';
  context.state.game.screen = 'main';
  assert(context.repairIllnessPaymentBirthdayOverlapV481({ save: true }) === true, '支払い再確認待ちの復旧に失敗しました');
  assert(stats().monthlyCalls === 1 && stats().homeCalls === 1, '支払い再確認待ちで冪等処理を呼べません');
  assert(context.state.migrations.illnessPaymentBirthdayOverlapV481PaymentPending === false, '支払い再確認待ちが残ります');
  assert(context.repairIllnessPaymentBirthdayOverlapV481() === false, '支払い再確認待ちを二重処理しています');
  assert(stats().monthlyCalls === 1 && stats().homeCalls === 1, '支払い再確認を二重実行しています');
}

// 日付進行前の実行時復旧では支払い・空腹回復を行わない。
{
  const { context, stats } = runtimeContext({ phase: 'settling', day: 10, toDay: 11, minutes: 1140, hunger: 0 });
  assert(context.repairIllnessPaymentBirthdayOverlapV481() === true, '日付進行前の実行時復旧に失敗しました');
  assert(context.state.game.minutes === 1140 && context.state.wellbeing.hunger === 0, '日付進行前の状態を変更しています');
  assert(stats().monthlyCalls === 0 && stats().homeCalls === 0, '日付進行前に支払いを再確認しています');
}

console.log('v0.10.481 1月1日・体調不良・支払い・誕生日重複停止検査: OK');
console.log('- v0.10.480で停止した既存セーブを移行時に自動復旧');
console.log('- morningPending／settlingを日付進行前後で判別');
console.log('- 月初固定費と自宅家賃は処理済みキーを使う冪等確認');
console.log('- 旧1月1日の完了年を解除し、4月1日の誕生日を維持');
