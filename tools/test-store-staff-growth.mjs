import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const source = fs.readFileSync(path.join(root, 'js/game-data.js'), 'utf8');
const moduleUrl = `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
const gameData = await import(moduleUrl);
const { storeStaffGrowthForWorkDays, storeStaffNextGrowthForWorkDays, initialState } = gameData;

const cases = [
  [0, 1, '見習い'], [4, 1, '見習い'],
  [5, 2, '新人'], [14, 2, '新人'],
  [15, 3, '一人前'], [29, 3, '一人前'],
  [30, 4, 'ベテラン'], [59, 4, 'ベテラン'],
  [60, 5, '熟練'], [999, 5, '熟練'],
  [-1, 1, '見習い'], ['abc', 1, '見習い'],
];
for (const [days, expectedLevel, expectedLabel] of cases) {
  const actual = storeStaffGrowthForWorkDays(days);
  if (actual.level !== expectedLevel || actual.label !== expectedLabel) {
    throw new Error(`勤務${days}日の判定が不正です: ${actual.level}/${actual.label}`);
  }
}
const nextCases = [[0, 2], [5, 3], [15, 4], [30, 5], [60, null]];
for (const [days, expected] of nextCases) {
  const next = storeStaffNextGrowthForWorkDays(days);
  if ((next?.level ?? null) !== expected) throw new Error(`勤務${days}日の次レベル判定が不正です`);
}
const initial = initialState();
if (initial.employee.workDays !== 0) throw new Error('初期スタッフ勤務日数が0ではありません');
console.log('店舗スタッフ成長境界テスト: OK（0/5/15/30/60日、異常値補正、初期勤務日数）');
