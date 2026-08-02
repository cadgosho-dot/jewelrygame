import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const source = fs.readFileSync(path.join(root, 'js/game-data.js'), 'utf8');
const moduleUrl = `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
const gameData = await import(moduleUrl);
const {
  WORKSHOP_STAFF_GROWTH_LEVELS,
  workshopStaffGrowthForWorkDays,
  workshopStaffNextGrowthForWorkDays,
  initialState,
} = gameData;

const cases = [
  [0, 1, '見習い職人', 25000, 0.55], [479, 1, '見習い職人', 25000, 0.55],
  [480, 2, '若手職人', 30000, 0.70], [959, 2, '若手職人', 30000, 0.70],
  [960, 3, '一人前職人', 40000, 0.85], [1439, 3, '一人前職人', 40000, 0.85],
  [1440, 4, '熟練職人', 55000, 1.00], [2399, 4, '熟練職人', 55000, 1.00],
  [2400, 5, '匠', 75000, 1.20], [9999, 5, '匠', 75000, 1.20],
  [-1, 1, '見習い職人', 25000, 0.55], ['abc', 1, '見習い職人', 25000, 0.55],
];
for (const [days, expectedLevel, expectedLabel, expectedWage, expectedSpeed] of cases) {
  const actual = workshopStaffGrowthForWorkDays(days);
  if (actual.level !== expectedLevel || actual.label !== expectedLabel || actual.dailyWage !== expectedWage || actual.speedMultiplier !== expectedSpeed) {
    throw new Error(`勤務${days}日の判定が不正です: ${actual.level}/${actual.label}/${actual.dailyWage}/${actual.speedMultiplier}`);
  }
}
const nextCases = [[0, 2], [480, 3], [960, 4], [1440, 5], [2400, null]];
for (const [days, expected] of nextCases) {
  const next = workshopStaffNextGrowthForWorkDays(days);
  if ((next?.level ?? null) !== expected) throw new Error(`勤務${days}日の次レベル判定が不正です`);
}
for (let index = 1; index < WORKSHOP_STAFF_GROWTH_LEVELS.length; index += 1) {
  const previous = WORKSHOP_STAFF_GROWTH_LEVELS[index - 1];
  const current = WORKSHOP_STAFF_GROWTH_LEVELS[index];
  if (current.dailyWage <= previous.dailyWage) throw new Error('成長後の日当が上がっていません');
  if (current.speedMultiplier <= previous.speedMultiplier) throw new Error('成長後の制作速度が上がっていません');
  if ((current.goodChance + current.premiumChance) < (previous.goodChance + previous.premiumChance)) throw new Error('成長後の品質確率が下がっています');
}
const initial = initialState();
if (initial.workshopStaff.hired !== false || initial.workshopStaff.workDays !== 0 || initial.workshopStaff.evolutionStage !== 1) throw new Error('職人スタッフの初期状態が不正です');
if (initial.workshopStaff.workMinutesBank !== 0 || initial.workshopStaff.workedMinutesToday !== 0) throw new Error('職人スタッフの日次作業状態が0ではありません');
console.log('職人スタッフ成長境界テスト: OK（0/480/960/1,440/2,400実働日、約10年、日当・速度・品質上昇）');
