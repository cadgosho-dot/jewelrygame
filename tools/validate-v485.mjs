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

assert(VERSION === '0.10.485', `VERSIONが0.10.485ではありません: ${VERSION}`);
assert(DEFAULT_BIRTHDAY === '04-01', '誕生日の既定値が4月1日ではありません');
assert(sw.includes("const VERSION = '0.10.485'"), 'Service WorkerのVERSIONが古いです');
assert(indexHtml.includes('game.html?v=0.10.485'), 'index.htmlの読込番号が古いです');
assert(gameHtml.includes('js/app.js?v=0.10.485'), 'game.htmlの読込番号が古いです');
assert(app.includes("./daily-gems.js?v=0.10.485"), 'daily-gemsの読込番号が古いです');
const stylesV485 = fs.readFileSync(path.join(root, 'styles.css'), 'utf8');
assert(stylesV485.includes('v0.10.485: 縦画面の上部バー1を大型文字・縦中央・低余白へ調整'), '上部バー1のv0.10.485スタイルがありません');
assert(stylesV485.includes('--jwj-two-bar-info-height:clamp(46px'), '上部バー1の高さ圧縮指定がありません');
assert(stylesV485.includes('font-size:clamp(12px,3.55vw,14.5px)!important'), '上部バー1の文字拡大指定がありません');
assert(stylesV485.includes('justify-content:center!important'), '上部バー1の縦中央指定がありません');

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

// v0.10.485: 12月23日〜1月3日は体調不良イベントを発生させない。
{
  const context = { Date };
  vm.createContext(context);
  vm.runInContext(extractFunction(app, 'winterColdBlackoutDate'), context);
  assert(context.winterColdBlackoutDate(new Date(2026, 11, 22, 12)) === false, '12月22日が停止期間に含まれています');
  assert(context.winterColdBlackoutDate(new Date(2026, 11, 23, 12)) === true, '12月23日が停止期間に含まれていません');
  assert(context.winterColdBlackoutDate(new Date(2026, 11, 31, 12)) === true, '12月31日が停止期間に含まれていません');
  assert(context.winterColdBlackoutDate(new Date(2027, 0, 1, 12)) === true, '1月1日が停止期間に含まれていません');
  assert(context.winterColdBlackoutDate(new Date(2027, 0, 3, 12)) === true, '1月3日が停止期間に含まれていません');
  assert(context.winterColdBlackoutDate(new Date(2027, 0, 4, 12)) === false, '1月4日が停止期間に含まれています');
}

function coldBlackoutRuntime(date, { active = false, stage = 'idle' } = {}) {
  let saveCalls = 0;
  let effectCalls = 0;
  let setScreenCalls = 0;
  const cold = {
    active,
    stage,
    seasonKey: '2026-2027',
    lastCompletedSeason: '',
    lastCheckedDate: '',
    startDay: 88,
    daysCompleted: stage === 'sick' ? 1 : 0,
    totalTriggered: active ? 1 : 0,
    recoveryNoticePending: true,
  };
  const context = {
    Date,
    state: { game: { screen: stage === 'idle' ? 'main' : 'winterColdEvent' }, events: { winterColdEvent: cold } },
    screen: stage === 'idle' ? 'main' : 'winterColdEvent',
    screenData: { stale: true },
    navigation: [{ screen: 'main' }],
    winterColdMorningBriefPending: true,
    sleepCurtainEl: { classList: { remove() {} } },
    gameDate: () => date,
    dateKey: (value) => `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`,
    winterColdEventState: () => cold,
    scheduleWinterColdTextEffect: () => { effectCalls += 1; },
    saveGame: () => { saveCalls += 1; return Promise.resolve(); },
    isAlienAbducted: () => false,
    illnessEventSuppressionActive: () => cold.active && cold.stage === 'sick',
    resumeWinterColdEvent: () => false,
    DAY_START_MINUTES: 540,
    winterColdSeasonKey: () => '2026-2027',
    winterColdRemainingDays: () => 30,
    setScreen() { setScreenCalls += 1; },
    playSfx() {},
    setTimeout() {},
    vibrate() {},
    console,
  };
  context.state.game.minutes = 540;
  vm.createContext(context);
  vm.runInContext([
    extractFunction(app, 'winterColdBlackoutDate'),
    extractFunction(app, 'cancelWinterColdDuringBlackout'),
    extractFunction(app, 'maybeStartWinterColdEvent'),
  ].join('\n'), context);
  return { context, cold, stats: () => ({ saveCalls, effectCalls, setScreenCalls }) };
}

// 停止期間中は抽選値が0でも新規発生しない。
{
  const { context, cold, stats } = coldBlackoutRuntime(new Date(2026, 11, 23, 12));
  assert(context.maybeStartWinterColdEvent(0) === false, '12月23日に体調不良イベントが発生します');
  assert(cold.active === false && cold.totalTriggered === 0, '停止期間中に発生回数が増えています');
  assert(stats().setScreenCalls === 0, '12月23日にイベント画面へ遷移しています');
}
{
  const { context, cold, stats } = coldBlackoutRuntime(new Date(2027, 0, 3, 12));
  assert(context.maybeStartWinterColdEvent(0) === false, '1月3日に体調不良イベントが発生します');
  assert(cold.active === false, '1月3日に体調不良状態になっています');
  assert(stats().setScreenCalls === 0, '1月3日にイベント画面へ遷移しています');
}

// 旧保存や12月22日開始分が停止期間へ持ち越された場合も、その場で解除する。
{
  const { context, cold, stats } = coldBlackoutRuntime(new Date(2027, 0, 1, 12), { active: true, stage: 'sick' });
  assert(context.cancelWinterColdDuringBlackout({ save: true }) === true, '停止期間中の既存体調不良を解除できません');
  assert(cold.active === false && cold.stage === 'idle', '停止期間中に体調不良状態が残ります');
  assert(cold.daysCompleted === 0 && cold.startDay === 0, '停止期間中の療養進行が残ります');
  assert(cold.lastCompletedSeason === '', '停止期間による解除を季節完了扱いにしています');
  assert(context.screen === 'main' && context.state.game.screen === 'main', '体調不良画面からメインへ戻りません');
  assert(stats().saveCalls === 1 && stats().effectCalls === 1, '解除後の保存または表示復旧が実行されません');
}

// 期間外は既存の抽選処理を維持する。
{
  const { context, cold, stats } = coldBlackoutRuntime(new Date(2027, 0, 4, 12));
  assert(context.maybeStartWinterColdEvent(0) === true, '1月4日に通常抽選が再開しません');
  assert(cold.active === true && cold.stage === 'intro' && cold.totalTriggered === 1, '期間外の体調不良イベント発生処理が壊れています');
  assert(stats().setScreenCalls === 1, '1月4日にイベント画面へ遷移しません');
}

assert(app.includes('cancelWinterColdDuringBlackout();\n  repairIllnessBirthdayDeadlock();'), '翌日処理開始時の停止期間解除がありません');
assert(app.includes('const cancelledForBlackout = cancelWinterColdDuringBlackout();'), '翌朝の日付確定後に停止期間を再確認していません');

console.log('v0.10.485 年末年始の体調不良停止期間検査: OK');
console.log('- 12月23日〜1月3日を両端含みで抽選対象外');
console.log('- 停止期間へ持ち越された既存のintro／sick状態も自動解除');
console.log('- 1月4日以降は通常の冬季抽選を再開');
console.log('- v0.10.481の1月1日・支払い・誕生日重複停止復旧を維持');


// v0.10.485: user-provided tool image implementation.
const toolImagesV485 = [
  'piercing-saw.png','nipper.png','electronic-scale.png','wood-block.png','dividers.png','milgrain-tool.png',
  'rolling-mill.png','file.png','pliers.png','torch.png','hammer.png','magnifier.png','bench-peg.png','graver.png',
  'engraving-block.png','stamps.png','rotary-tool.png','buffer.png','ultrasonic-cleaner.png',
];
const gameDataTextV485 = fs.readFileSync(path.join(root, 'js/game-data.js'), 'utf8');
for (const filename of toolImagesV485) {
  const assetPath = path.join(root, 'assets/images/tools', filename);
  assert(fs.existsSync(assetPath), `工具画像がありません: ${filename}`);
  const bytes = fs.readFileSync(assetPath);
  assert(bytes.length > 32, `工具画像が空です: ${filename}`);
  assert(bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])), `PNGではありません: ${filename}`);
  const width = bytes.readUInt32BE(16);
  const height = bytes.readUInt32BE(20);
  const bitDepth = bytes[24];
  const colorType = bytes[25];
  assert(width > 0 && height > 0, `画像寸法が不正です: ${filename}`);
  assert(bitDepth === 8 && colorType === 6, `RGBA PNGではありません: ${filename}`);
  assert(sw.includes(`./assets/images/tools/${filename}`), `Service Worker参照がありません: ${filename}`);
  assert(gameDataTextV485.includes(`./assets/images/tools/${filename}`), `データ参照がありません: ${filename}`);
}
console.log(`v0.10.485 validation passed: ${toolImagesV485.length} tool images implemented including buffer.png.`);
