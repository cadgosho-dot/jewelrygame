import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const appPath = path.join(root, 'js', 'app.js');
const gameDataPath = path.join(root, 'js', 'game-data.js');
const app = fs.readFileSync(appPath, 'utf8');
const gameData = await import(`${pathToFileURL(gameDataPath).href}?test=${Date.now()}`);

const errors = [];
const requireText = (text, marker, label) => {
  if (!text.includes(marker)) errors.push(`${label} が見つかりません`);
};

if (gameData.DAY_START_MINUTES !== 9 * 60) errors.push(`開始時刻が9:00ではありません: ${gameData.DAY_START_MINUTES}`);
if (gameData.DAY_END_MINUTES !== 22 * 60) errors.push(`終了時刻が22:00ではありません: ${gameData.DAY_END_MINUTES}`);
if (gameData.MEAL_DURATION_MINUTES !== 60) errors.push(`食事時間が60分ではありません: ${gameData.MEAL_DURATION_MINUTES}`);

const canSpend = (start, duration) => start + duration <= gameData.DAY_END_MINUTES;
if (!canSpend(21 * 60, 60)) errors.push('21:00から1時間の行動が許可されません');
if (canSpend(21 * 60 + 1, 60)) errors.push('21:01から1時間の行動が22:00を超えて許可されます');
if (!canSpend(21 * 60 + 30, 30)) errors.push('21:30から30分の行動が許可されません');
if (canSpend(21 * 60 + 30, 60)) errors.push('21:30から1時間の食事が許可されます');
if (canSpend(22 * 60, 1)) errors.push('22:00以降の行動が許可されます');

requireText(app, 'function canSpendMealTime()', '食事時間の事前判定');
requireText(app, 'function spendMealTime()', '食事時間の共通消費');
requireText(app, "if (!canSpendMealTime()) return showToast(mealTimeUnavailableMessage(), 'error');", '通常食事・回転寿司の開始前判定');
requireText(app, 'if (plates > 0) spendMealTime();', '回転寿司の時間消費');
requireText(app, 'function finishChildhoodFriendMeal', '幼なじみ食事イベント');
requireText(app, 'function finishMysteryChineseMealEvent', '謎の中華料理イベント');
requireText(app, 'function autopilotEat(summary)', '自動操縦の食事');
requireText(app, 'if (!canSpendMinutes(MEAL_DURATION_MINUTES + actionMinutes)) return false;', '自動操縦の食事込み残り時間判定');
requireText(app, '食事には1時間かかります。', '食事画面の案内');
requireText(app, "actionLimit: '22:00まで'", 'AI相談ルールの終了時刻');

const mealPushPositions = [...app.matchAll(/state\.daily\.meals\.push\(/g)].map((m) => m.index);
if (mealPushPositions.length < 5) errors.push(`食事記録箇所が想定より少ないです: ${mealPushPositions.length}`);
for (const position of mealPushPositions) {
  const nearby = app.slice(Math.max(0, position - 900), position);
  if (!nearby.includes('spendMealTime()') && !nearby.includes('autopilotEat(summary)')) {
    errors.push(`食事記録の前に1時間経過処理を確認できません（位置 ${position}）`);
  }
}

if (app.includes("actionLimit: '21:00まで'") || app.includes('21:00を超える行動')) {
  errors.push('旧21:00終了ルールがapp.jsに残っています');
}

if (errors.length) {
  console.error('時間・食事ルール検査: NG');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log('時間・食事ルール検査: OK');
console.log('- 1日の活動時間: 9:00〜22:00');
console.log('- 21:00開始の1時間行動: 可');
console.log('- 22:00を超える行動: 不可');
console.log('- 通常食事・食事イベント・回転寿司・自動操縦の食事: 1時間');
