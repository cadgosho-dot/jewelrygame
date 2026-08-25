import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const moduleUrl = `${pathToFileURL(path.join(root, 'js/game-data.js')).href}?test=${Date.now()}`;
const gameData = await import(moduleUrl);
const {
  WORKSHOP_STAFF_GROWTH_LEVELS,
  workshopStaffGrowthForWorkDays,
  workshopStaffNextGrowthForWorkDays,
  initialState,
} = gameData;

const cases = [
  [0, 1, '見習い職人', 10000, 0.55], [59, 1, '見習い職人', 10000, 0.55],
  [60, 2, '若手職人', 15000, 0.70], [179, 2, '若手職人', 15000, 0.70],
  [180, 3, '一人前職人', 22000, 0.85], [359, 3, '一人前職人', 22000, 0.85],
  [360, 4, '熟練職人', 32000, 1.00], [719, 4, '熟練職人', 32000, 1.00],
  [720, 5, '匠', 45000, 1.20], [9999, 5, '匠', 45000, 1.20],
  [-1, 1, '見習い職人', 10000, 0.55], ['abc', 1, '見習い職人', 10000, 0.55],
];
for (const [days, expectedLevel, expectedLabel, expectedWage, expectedSpeed] of cases) {
  const actual = workshopStaffGrowthForWorkDays(days);
  if (actual.level !== expectedLevel || actual.label !== expectedLabel || actual.dailyWage !== expectedWage || actual.speedMultiplier !== expectedSpeed) {
    throw new Error(`勤務${days}日の判定が不正です: ${actual.level}/${actual.label}/${actual.dailyWage}/${actual.speedMultiplier}`);
  }
}
const nextCases = [[0, 2], [60, 3], [180, 4], [360, 5], [720, null]];
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
console.log('職人スタッフ成長境界テスト: OK（0/60/180/360/720実働日、日当・速度・品質上昇）');
