import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { VERSION, initialState, migrateState } from '../js/game-data.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const app = fs.readFileSync(path.join(root, 'js/app.js'), 'utf8');
const gameData = fs.readFileSync(path.join(root, 'js/game-data.js'), 'utf8');
const styles = fs.readFileSync(path.join(root, 'styles.css'), 'utf8');
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

assert(VERSION === '0.10.462', 'VERSIONが0.10.462ではありません');
assert(sw.includes("const VERSION = '0.10.462'"), 'Service Workerが0.10.462ではありません');
assert(indexHtml.includes('game.html?v=0.10.462'), 'index.htmlのゲーム読込番号が古いままです');
assert(indexHtml.includes('viewport-shell.js?v=0.10.462'), 'viewport-shell読込番号が古いままです');
assert(gameHtml.includes('js/app.js?v=0.10.462'), 'game.htmlのapp.js読込番号が古いままです');
assert(gameHtml.includes('styles.css?v=0.10.462'), 'game.htmlのCSS読込番号が古いままです');
assert(app.includes("./daily-gems.js?v=0.10.462"), '日替わり宝石の読込番号が古いままです');
assert(gameData.includes("versionBefore(legacy.version, '0.10.454')"), '20段階レベル移行基準が変わっています');

const recoveryScreens = [
  'winterColdEvent', 'birthdaySleepEvent', 'westernUnionEvent', 'mermaidEvent', 'tattooWomanAmberEvent',
  'clockTowerDonationEvent', 'cinemaVisitEvent', 'mysteryChineseMealEvent', 'kappaJadeEvent', 'sushiChefEvent',
  'cyclopsEvent', 'ganeshaTuskEvent', 'childhoodFriendEvent', 'touristWoodSwordEvent', 'diamondPolishingLapEvent',
  'hauntingEvent', 'storeTheftEvent', 'alienAbductionEvent', 'alienReturnEvent', 'miningPazupanEvent',
  'okachimachiQuiz', 'robberyReport', 'kaitenzushi',
];
assert(app.includes('const EVENT_SCREEN_RECOVERY_CONFIG = Object.freeze({'), '全イベント共通の復旧設定がありません');
for (const screen of recoveryScreens) assert(app.includes(`${screen}: {`), `復旧設定に${screen}がありません`);
assert(app.includes('function recoverCurrentEventDeadlock({ save = true, notify = true } = {})'), '手動イベント復旧関数がありません');
assert(app.includes('function installEventRecoveryControl()'), 'イベント復旧ボタンの設置処理がありません');
assert((app.match(/event-emergency-recover/g) || []).length >= 5, 'イベント復旧アクションの導線が不足しています');
assert(styles.includes('.event-safety-recovery{'), 'イベント復旧ボタンのCSSがありません');
assert(app.includes('イベントを終了してメインへ戻る'), '描画例外時の復旧ボタンがありません');

assert(app.includes('const IMAGE_PRELOAD_TIMEOUT_MS = 3000;'), '画像読込タイムアウトがありません');
const preloadSource = extractFunction(app, 'preloadImage');
assert(preloadSource.includes('window.setTimeout(() => finish(false), IMAGE_PRELOAD_TIMEOUT_MS)'), '画像がload/errorを返さない場合のタイムアウトがありません');
assert(extractFunction(app, 'preloadMealAssets').includes('Promise.race'), '食事画像の待機上限がありません');
const quizSource = extractFunction(app, 'loadOkachimachiQuizQuestions');
assert(quizSource.includes('AbortController') && quizSource.includes('controller.abort(), 5000'), '御徒町クイズ取得の5秒タイムアウトがありません');
const cinemaSource = extractFunction(app, 'loadCinemaEventVideos');
assert(cinemaSource.includes('AbortController') && cinemaSource.includes('controller.abort(), 5000'), '映画一覧取得の5秒タイムアウトがありません');
assert(app.includes('const missingCinemaVideo = key === \'cinemaVisitEvent\''), '動画未選択の映画イベント状態を復旧できません');

const eventProgressActions = [
  'birthday-sleep-event-next', 'tattoo-woman-amber-event-next', 'tattoo-woman-amber-event-receive',
  'clock-tower-donation-event-next', 'cinema-visit-event-start', 'cinema-video-start',
  'kappa-jade-event-next', 'kappa-jade-event-receive', 'okachimachi-quiz-next', 'okachimachi-quiz-answer',
];
assert(app.includes('const HUNGER_ALLOWED_ACTIONS = new Set(['), '空腹時にイベント進行を許可する共通一覧がありません');
for (const action of eventProgressActions) assert(app.includes(`'${action}'`), `空腹度0で${action}が遮断されます`);
assert((app.match(/const hungerAllowed = HUNGER_ALLOWED_ACTIONS;/g) || []).length === 2, '画面とモーダルで空腹時許可一覧が共通化されていません');

assert(app.includes('function suppressAllTransientEventsForIllness({ save = false } = {})'), '体調不良時の全イベント停止処理がありません');
assert(app.includes("eventState.stage = 'sick';\n  suppressBirthdaySleepEventForIllness();\n  suppressAllTransientEventsForIllness();"), '体調不良開始時に全イベントを停止していません');
assert(app.includes('const otherEventsSuppressed = suppressAllTransientEventsForIllness();'), '再読込時に体調不良と残留イベントの競合を解消していません');
assert(app.includes('repairLegacyTransientEventDeadlocksV462();'), '旧セーブの横断復旧が呼ばれていません');
assert(gameData.includes('transientEventRecoveryV462Pending'), '旧セーブ用の復旧待ちフラグがありません');
assert(gameData.includes("versionBefore(legacy.version, '0.10.462')"), 'v0.10.462未満だけを対象にした移行判定がありません');

// 3件の既存修正を再確認。
assert(app.includes('function alienHungerEmergency()'), '宇宙空腹時の緊急就寝判定が失われています');
assert(app.includes('data-action="alien-emergency-sleep">空腹のため休む'), '宇宙空腹時の退避ボタンが失われています');
assert(app.includes('function repairIllnessBirthdayDeadlock({ save = false } = {})'), '体調不良＋誕生日の復旧が失われています');
assert(app.includes('function repairChildhoodFriendEventDeadlock({ save = false, force = false } = {})'), 'ラーメン屋イベントの復旧が失われています');
assert(app.includes('Promise.race([assets, wait(2200)])'), 'ラーメン屋画像の個別タイムアウトが失われています');

// 旧版の各イベント途中保存が、v0.10.462で一度だけ復旧対象になることを確認。
const migrationCases = [
  ['birthdaySleepEvent', 'greeting', 'birthdaySleepEvent'],
  ['westernUnionEvent', 'choice', 'westernUnionEvent'],
  ['miningPazupanEvent', 'reward', 'miningPazupanEvent'],
  ['kappaJadeEvent', 'intro2', 'kappaJadeEvent'],
  ['mermaidEvent', 'intro', 'mermaidEvent'],
  ['sushiChefEvent', 'playing', 'kaitenzushi'],
  ['cyclopsEvent', 'reward', 'cyclopsEvent'],
  ['ganeshaTuskEvent', 'farewell', 'ganeshaTuskEvent'],
  ['childhoodFriendEvent', 'eating', 'childhoodFriendEvent'],
  ['hauntingEvent', 'processing', 'hauntingEvent'],
  ['storeTheftEvent', 'pause', 'storeTheftEvent'],
  ['touristWoodSwordEvent', 'route', 'touristWoodSwordEvent'],
  ['diamondPolishingLapEvent', 'outro', 'diamondPolishingLapEvent'],
  ['cinemaVisitEvent', 'invitation', 'cinemaVisitEvent'],
  ['clockTowerDonationEvent', 'intro2', 'clockTowerDonationEvent'],
  ['mysteryChineseMealEvent', 'intro3', 'mysteryChineseMealEvent'],
];
for (const [key, stage, savedScreen] of migrationCases) {
  const saved = initialState();
  saved.version = '0.10.461';
  saved.game.screen = savedScreen;
  saved.events[key] = { ...(saved.events[key] || {}), active: true, stage };
  const migrated = migrateState(saved);
  assert(migrated.game.screen === 'main', `${key}の旧画面がmainへ退避しません`);
  assert(migrated.migrations.transientEventRecoveryV462Pending === true, `${key}が横断復旧対象になりません`);
}

const healthyOldSave = initialState();
healthyOldSave.version = '0.10.461';
const healthyMigrated = migrateState(healthyOldSave);
assert(healthyMigrated.migrations.transientEventRecoveryV462Pending === false, 'イベント途中でない旧保存を不要に復旧対象にしています');

const spaceSave = initialState();
spaceSave.version = '0.10.461';
spaceSave.events.alienAbductionEvent = { active: true, stage: 'abducted', daysSlept: 1, lastCheckedDay: 10, totalTrips: 1, chipGrantedThisTrip: false };
const spaceMigrated = migrateState(spaceSave);
assert(spaceMigrated.migrations.transientEventRecoveryV462Pending === false, '正常な宇宙滞在を旧セーブ復旧で終了しようとしています');
assert(spaceMigrated.events.alienAbductionEvent.active === true && spaceMigrated.events.alienAbductionEvent.stage === 'abducted', '正常な宇宙滞在が失われます');

const sickSave = initialState();
sickSave.version = '0.10.461';
sickSave.events.winterColdEvent = { active: true, stage: 'sick', daysCompleted: 1, seasonKey: '2026-2027' };
const sickMigrated = migrateState(sickSave);
assert(sickMigrated.migrations.transientEventRecoveryV462Pending === false, '正常な療養中セーブを不要に横断復旧しています');
assert(sickMigrated.events.winterColdEvent.active === true && sickMigrated.events.winterColdEvent.stage === 'sick', '療養中の進行が失われます');

// アプリ側の共通完了処理をVMで確認。
const functionNames = ['eventRecord', 'recoverPaidChildhoodFriendMeal', 'completeTransientEventSafely', 'suppressAllTransientEventsForIllness'];
const context = {
  state: {
    game: { day: 40, screen: 'cinemaVisitEvent' },
    wellbeing: { hunger: 1, maxHunger: 7 },
    events: {
      westernUnionEvent: { active: true, stage: 'choice' },
      childhoodFriendEvent: { active: true, stage: 'eating', mealPaid: true, mealCompleted: false, hungerBefore: 1 },
      alienAbductionEvent: { active: true, stage: 'abducted' },
      cinemaVisitEvent: { active: true, stage: 'invitation', selectedVideo: '' },
      robbery: { pendingReport: { id: 'test' } },
    },
  },
  screen: 'cinemaVisitEvent', screenData: {}, navigation: [{}],
  MEALS: { ramen: { recovery: 3 } },
  EVENT_ACTIVE_STAGE_MAP: {
    westernUnionEvent: new Set(['choice']), childhoodFriendEvent: new Set(['eating']),
    alienAbductionEvent: new Set(['abducted', 'returnPending']), cinemaVisitEvent: new Set(['invitation', 'playing']),
  },
  TRANSIENT_EVENT_KEYS: ['westernUnionEvent', 'childhoodFriendEvent', 'alienAbductionEvent', 'cinemaVisitEvent'],
  ILLNESS_SUPPRESSED_EVENT_SCREENS: new Set(['cinemaVisitEvent']),
  illnessEventSuppressionActive: () => true,
  clearChildhoodFriendMealWatchdog: () => {},
  okachimachiQuizSession: null, kaitenzushiSession: null, mealTransitioning: false, storeTheftSequenceRunning: false,
  saveGame: () => Promise.resolve(), gameDate: () => new Date(2026, 6, 31),
};
vm.createContext(context);
vm.runInContext(`${functionNames.map((name) => extractFunction(app, name)).join('\n')}\nthis.count = suppressAllTransientEventsForIllness();`, context);
assert(context.count >= 4, '体調不良時に残留イベントをまとめて終了できません');
for (const key of ['westernUnionEvent', 'childhoodFriendEvent', 'alienAbductionEvent', 'cinemaVisitEvent']) {
  assert(context.state.events[key].active === false && context.state.events[key].stage === 'completed', `体調不良時に${key}が残ります`);
}
assert(context.state.wellbeing.hunger === 4 && context.state.events.childhoodFriendEvent.mealCompleted === true, '支払い済みラーメンの回復を維持できません');
assert(context.state.events.robbery.pendingReport === null, '体調不良中に強盗報告が残ります');
assert(context.screen === 'main' && context.state.game.screen === 'main', '体調不良中のイベント画面からメインへ戻れません');

console.log('v0.10.462 横断デッドロック検査: OK');
console.log(`- 共通復旧対象画面: ${recoveryScreens.length}`);
console.log(`- 旧版途中保存の移行ケース: ${migrationCases.length}`);
console.log('- 画像・クイズ・映画一覧に待機上限を設定');
console.log('- 宇宙空腹、体調不良＋誕生日、ラーメン屋の3件を再確認');
console.log('- 正常な宇宙滞在と療養中の保存は維持');
