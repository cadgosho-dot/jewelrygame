import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { VERSION, initialState, migrateState } from '../js/game-data.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const app = fs.readFileSync(path.join(root, 'js/app.js'), 'utf8');
const gameData = fs.readFileSync(path.join(root, 'js/game-data.js'), 'utf8');
const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
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

assert(VERSION === '0.10.457', 'VERSIONが0.10.457ではありません');
assert(sw.includes("const VERSION = '0.10.457'"), 'Service Workerが0.10.457ではありません');
assert(gameData.includes("versionBefore(legacy.version, '0.10.454')"), '20段階制の移行基準が0.10.454から変わっています');

const guardedFunctions = [
  'maybeTriggerRobberyEvent', 'maybeStartWinterColdEvent', 'maybeStartWesternUnionEvent',
  'maybeStartMiningPazupanEvent', 'maybeStartKappaJadeEvent', 'maybeStartTattooWomanAmberEvent',
  'maybeStartMermaidEvent', 'maybeStartSushiChefEvent', 'maybeStartCyclopsEvent',
  'maybeStartGaneshaTuskEvent', 'maybeStartHauntingEvent', 'maybeStartChildhoodFriendEvent',
  'maybeStartTouristWoodSwordEvent', 'maybeStartAlienAbductionEvent',
  'maybeStartDiamondPolishingLapEvent', 'maybeStartCinemaVisitEvent',
  'maybeStartClockTowerDonationEvent', 'maybeStartMysteryChineseMealEvent',
  'maybeStartStoreTheftEvent',
];
for (const name of guardedFunctions) {
  const pattern = new RegExp(`(?:async\\s+)?function\\s+${name}\\b[^\\n]*\\{\\n\\s*if \\(illnessEventSuppressionActive\\(\\)\\) return false;`);
  assert(pattern.test(app), `${name}に体調不良ガードがありません`);
}

assert(app.includes("function maybeStartBirthdaySleepEvent() {\n  if (illnessEventSuppressionActive()) {\n    suppressBirthdaySleepEventForIllness({ save: true });\n    return false;"), '誕生日イベントの体調不良ガードが不足しています');
assert(app.includes('function suppressBirthdaySleepEventForIllness({ save = false } = {})'), '誕生日イベント競合の解消関数がありません');
assert(app.includes("eventState.active = false;\n  eventState.stage = 'completed';"), '体調不良中の誕生日イベントを完了扱いにしていません');
assert(app.includes('eventState.lastCompletedYear = Math.max(eventState.lastCompletedYear, completionYear);'), '同じ年の誕生日イベント再発防止がありません');
assert(app.includes("if (screen === 'birthdaySleepEvent') {\n    screen = 'main';"), '誕生日画面からの安全退避がありません');
assert(app.includes("eventState.stage = 'sick';\n  suppressBirthdaySleepEventForIllness();"), '体調不良開始時に誕生日イベントを停止していません');
assert(app.includes('if (illnessEventSuppressionActive()) suppressBirthdaySleepEventForIllness();'), '翌日処理開始時の誕生日イベント停止がありません');
assert(app.includes("console.error('翌日表示復帰エラー', error);"), '翌日表示競合時の復帰処理がありません');
assert(app.includes("showToast('翌日へ進みました。競合したイベント表示は安全にスキップしました。', 'warning')"), '翌日表示復帰時の案内がありません');

for (const screen of [
  'birthdaySleepEvent', 'westernUnionEvent', 'mermaidEvent', 'tattooWomanAmberEvent',
  'clockTowerDonationEvent', 'cinemaVisitEvent', 'mysteryChineseMealEvent', 'kappaJadeEvent',
  'sushiChefEvent', 'cyclopsEvent', 'ganeshaTuskEvent', 'childhoodFriendEvent',
  'touristWoodSwordEvent', 'diamondPolishingLapEvent', 'hauntingEvent', 'storeTheftEvent',
  'alienAbductionEvent', 'alienReturnEvent', 'miningPazupanEvent', 'okachimachiQuiz',
  'robberyReport', 'kaitenzushi',
]) {
  assert(app.includes(`'${screen}'`), `体調不良中の画面遮断対象に${screen}がありません`);
}

assert(app.includes('ILLNESS_SUPPRESSED_EVENT_SCREENS.has(target)'), 'setScreenのイベント画面遮断がありません');
assert(app.includes('ILLNESS_SUPPRESSED_EVENT_SCREENS.has(screen)'), '再読込時のイベント画面遮断がありません');
assert(app.includes('function clearCustomerVisitsForIllness()'), '体調不良中の来客消去処理がありません');
assert(app.includes('sessionTakenOver || illnessEventSuppressionActive()'), '体調不良中の自動操縦停止がありません');
assert(!app.includes('winterColdMorningBriefPending = true;'), '体調不良開始後に朝イベントを予約しています');

const suppressFunction = extractFunction(app, 'suppressBirthdaySleepEventForIllness');
function runSuppressionCase({ active, stage, eventYear, lastCompletedYear, birthdayToday }) {
  const context = {
    state: {
      game: { screen: 'birthdaySleepEvent' },
      events: { birthdaySleepEvent: { active, stage, eventYear, lastCompletedYear } },
    },
    screen: 'birthdaySleepEvent',
    screenData: { stale: true },
    navigation: [{ screen: 'sleep' }],
    winterColdTextActive: () => true,
    gameDate: () => new Date(2026, 11, 24, 12, 0, 0, 0),
    birthdayMatchesDate: () => birthdayToday,
    saveGame: () => Promise.resolve(),
  };
  context.birthdaySleepEventState = () => context.state.events.birthdaySleepEvent;
  vm.createContext(context);
  vm.runInContext(`${suppressFunction}; this.result = suppressBirthdaySleepEventForIllness();`, context);
  return context;
}

const activeConflict = runSuppressionCase({ active: true, stage: 'greeting', eventYear: 2026, lastCompletedYear: 0, birthdayToday: true });
assert(activeConflict.result === true, '発生済み誕生日イベントを停止できません');
assert(activeConflict.state.events.birthdaySleepEvent.active === false, '誕生日イベントactiveが残っています');
assert(activeConflict.state.events.birthdaySleepEvent.stage === 'completed', '誕生日イベントが完了扱いになりません');
assert(activeConflict.state.events.birthdaySleepEvent.lastCompletedYear === 2026, '誕生日イベントが同年に再発します');
assert(activeConflict.screen === 'main' && activeConflict.state.game.screen === 'main', '誕生日画面からメインへ退避できません');

const pendingBirthday = runSuppressionCase({ active: false, stage: 'idle', eventYear: 0, lastCompletedYear: 0, birthdayToday: true });
assert(pendingBirthday.result === true && pendingBirthday.state.events.birthdaySleepEvent.lastCompletedYear === 2026, '体調不良当日の未発生誕生日イベントをスキップできません');

const unrelatedDay = runSuppressionCase({ active: false, stage: 'completed', eventYear: 2025, lastCompletedYear: 2025, birthdayToday: false });
assert(unrelatedDay.result === false && unrelatedDay.state.events.birthdaySleepEvent.lastCompletedYear === 2025, '誕生日でない日に履歴を誤更新しています');

const modern = initialState();
modern.version = '0.10.456';
modern.workshop.level = 17;
modern.workshop.peakLevel = 18;
modern.workshop.paidThroughLevel = 18;
modern.events.birthdaySleepEvent = { active: true, stage: 'greeting', eventYear: 2026, lastCompletedYear: 0 };
const migrated = migrateState(modern);
assert(migrated.workshop.level === 17 && migrated.workshop.peakLevel === 18, 'v0.10.456保存の工房レベルが失われます');
assert(migrated.events.birthdaySleepEvent.active === true, '既存保存の誕生日イベント状態を移行時に破壊しています');

console.log('v0.10.457 専用検査: OK');
console.log(`- 体調不良ガード: ${guardedFunctions.length + 1}種類のイベント抽選`);
console.log('- 体調不良と誕生日イベントの同時状態を完了扱いへ安全に解消');
console.log('- 競合が残っても「次の日へ」からメイン画面へ復帰');
console.log('- v0.10.456保存データ互換を維持');
