import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { VERSION, initialState, migrateState } from '../js/game-data.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const app = fs.readFileSync(path.join(root, 'js/app.js'), 'utf8');
const gameData = fs.readFileSync(path.join(root, 'js/game-data.js'), 'utf8');
const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
const assert = (condition, message) => { if (!condition) throw new Error(message); };

assert(VERSION === '0.10.455', 'VERSIONが0.10.455ではありません');
assert(sw.includes("const VERSION = '0.10.455'"), 'Service Workerが0.10.455ではありません');
assert(gameData.includes("versionBefore(legacy.version, '0.10.454')"), '20段階制の移行基準が0.10.454から変わっています');

const guardedFunctions = [
  'maybeTriggerRobberyEvent', 'maybeStartWinterColdEvent', 'maybeStartWesternUnionEvent',
  'maybeStartMiningPazupanEvent', 'maybeStartKappaJadeEvent', 'maybeStartTattooWomanAmberEvent',
  'maybeStartMermaidEvent', 'maybeStartSushiChefEvent', 'maybeStartCyclopsEvent',
  'maybeStartGaneshaTuskEvent', 'maybeStartHauntingEvent', 'maybeStartChildhoodFriendEvent',
  'maybeStartTouristWoodSwordEvent', 'maybeStartAlienAbductionEvent',
  'maybeStartDiamondPolishingLapEvent', 'maybeStartCinemaVisitEvent',
  'maybeStartClockTowerDonationEvent', 'maybeStartMysteryChineseMealEvent',
  'maybeStartStoreTheftEvent', 'maybeStartBirthdaySleepEvent',
];
for (const name of guardedFunctions) {
  const pattern = new RegExp(`(?:async\\s+)?function\\s+${name}\\b[^\\n]*\\{\\n\\s*if \\(illnessEventSuppressionActive\\(\\)\\) return false;`);
  assert(pattern.test(app), `${name}に体調不良ガードがありません`);
}

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
assert(app.includes("function enterMiningFromOutside() {\n  if (illnessEventSuppressionActive())"), '採掘入口のイベント停止がありません');
assert(app.includes("async function enterOkachimachiFromOutside() {\n  if (illnessEventSuppressionActive())"), '御徒町入口のイベント停止がありません');
assert(app.includes('function clearCustomerVisitsForIllness()') && app.includes('function scheduleCustomerVisit() {\n  if (illnessEventSuppressionActive()) {\n    clearCustomerVisitsForIllness();'), '体調不良中の来客停止がありません');
assert(app.includes('function startCustomerVisit(customerId, branchNumber = state?.store?.branchNumber || 1) {\n  if (illnessEventSuppressionActive()) return false;'), '体調不良中の直接来客開始を遮断していません');
assert(app.includes('sessionTakenOver || illnessEventSuppressionActive()'), '体調不良中の自動操縦停止がありません');
assert(!app.includes('winterColdMorningBriefPending = true;'), '体調不良開始後に朝イベントを予約しています');
assert(app.includes("if (illnessEventSuppressionActive()) {\n    clearMorningBrief();\n    clearCustomerVisitsForIllness();\n    return;\n  }\n  if (maybeStartWinterColdEvent()) return;"), '体調不良中の朝イベント連鎖停止がありません');
assert(app.includes('体調不良のため本日のイベントは発生しません。休むと安全に翌日へ進みます。'), '体調不良専用の就寝案内がありません');

assert(app.includes('let nextDayTransitionPromise = null;'), '翌日処理の多重実行防止がありません');
assert(app.includes('while (sleepTransitioning && Date.now() - waitStartedAt < 5000) await wait(50);'), '就寝処理完了待ちがありません');
assert(app.includes("console.warn('就寝処理のロックを解除して翌日処理を継続します。')"), '進行不能時のロック復旧がありません');
assert(app.includes('const stillSick = illnessEventSuppressionActive();'), '翌日処理で体調不良状態を再判定していません');
assert(app.includes("} else if (stillSick) {\n        clearMorningBrief();\n        goMain();"), '体調不良中に朝イベントを飛ばしてメインへ移動していません');
assert(app.includes('if (!returningFromSpace && !coldStarted && !stillSick) await showMorningBrief();'), '体調不良中に朝のお知らせを出さない条件がありません');

const modern = initialState();
modern.version = '0.10.454';
modern.workshop.level = 17;
modern.workshop.peakLevel = 18;
modern.workshop.paidThroughLevel = 18;
modern.store.rented = true;
modern.store.branches = [{
  id:'branch-1', number:1, name:'保存検査店', rentedDay:1, suspended:false, unpaidRent:0,
  points:999, level:16, peakLevel:19, paidThroughLevel:18, operatingDays:1300,
  totalRevenue:300000000, serviceSuccesses:800, openMinutesToday:300, visitorsToday:2,
  rating:88, salesCount:1700, orderDeliveries:40, displaySuppliesInstalled:0, casesInstalled:0,
  showcases:[], employee:{hired:false, working:true, workDays:0},
}];
const migrated = migrateState(modern);
assert(migrated.workshop.level === 17 && migrated.workshop.peakLevel === 18, 'v0.10.454保存の工房レベルが失われます');
assert(migrated.store.branches[0].level === 16 && migrated.store.branches[0].peakLevel === 19, 'v0.10.454保存の店舗レベルが失われます');

console.log('v0.10.455 専用検査: OK');
console.log(`- 体調不良ガード: ${guardedFunctions.length}種類のイベント抽選`);
console.log('- イベント画面、朝イベント、来客、自動操縦を停止');
console.log('- 「次の日へ」の早押し・処理ロックを安全に待機／復旧');
console.log('- v0.10.454の20段階レベル保存互換を維持');
