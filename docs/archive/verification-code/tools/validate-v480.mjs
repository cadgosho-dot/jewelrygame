import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  VERSION,
  DEFAULT_BIRTHDAY,
  initialState,
  migrateState,
  isBirthdayOnDate,
} from '../js/game-data.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const app = fs.readFileSync(path.join(root, 'js/app.js'), 'utf8');
const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
const gameHtml = fs.readFileSync(path.join(root, 'game.html'), 'utf8');
const indexHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(VERSION === '0.10.480', `VERSIONが0.10.480ではありません: ${VERSION}`);
assert(DEFAULT_BIRTHDAY === '04-01', `誕生日の既定値が4月1日ではありません: ${DEFAULT_BIRTHDAY}`);
const fresh = initialState();
assert(fresh.settings.birthday === '04-01', '新規ゲームの誕生日初期値が4月1日ではありません');
assert(fresh.migrations.birthdayDefaultAprilV480 === true, '新規ゲームに誕生日移行済み印がありません');
assert(isBirthdayOnDate('04-01', new Date(2027, 3, 1, 12)), '4月1日の誕生日判定に失敗しました');
assert(!isBirthdayOnDate('04-01', new Date(2027, 0, 1, 12)), '1月1日を4月1日の誕生日と誤判定しています');

function oldSave(birthday, marker = false) {
  const saved = initialState();
  saved.version = '0.10.479';
  saved.settings.birthday = birthday;
  saved.migrations = { ...saved.migrations };
  delete saved.migrations.birthdayDefaultAprilV480;
  if (marker) saved.migrations.birthdayDefaultAprilV480 = true;
  return saved;
}

const janFirst = oldSave('01-01');
janFirst.game.screen = 'birthdaySleepEvent';
janFirst.events.birthdaySleepEvent = {
  active: true,
  stage: 'greeting',
  eventYear: 2027,
  lastCompletedYear: 2027,
};
const migratedJanFirst = migrateState(janFirst);
assert(migratedJanFirst.settings.birthday === '04-01', '既存の1月1日設定が4月1日へ移行されません');
assert(migratedJanFirst.migrations.birthdayDefaultAprilV480 === true, '既存保存に移行済み印が付きません');
assert(migratedJanFirst.events.birthdaySleepEvent.active === false, '旧1月1日の進行中誕生日イベントが解除されません');
assert(migratedJanFirst.events.birthdaySleepEvent.stage === 'idle', '誕生日イベントが新しい4月1日用に待機状態へ戻りません');
assert(migratedJanFirst.events.birthdaySleepEvent.lastCompletedYear === 0, '旧1月1日の完了年が残り、4月1日のイベントを妨げます');
assert(migratedJanFirst.game.screen === 'main', '旧誕生日画面からメイン画面へ戻りません');

const yearFormat = migrateState(oldSave('2026-01-01'));
assert(yearFormat.settings.birthday === '04-01', '年付き旧1月1日設定が4月1日へ移行されません');

const otherBirthday = migrateState(oldSave('12-24'));
assert(otherBirthday.settings.birthday === '12-24', '1月1日以外の誕生日を変更しています');

const manualJanFirst = migrateState(oldSave('01-01', true));
assert(manualJanFirst.settings.birthday === '01-01', '移行後に手動設定された1月1日を再度変更しています');

const blankBirthday = migrateState(oldSave(''));
assert(blankBirthday.settings.birthday === '', '誕生日未設定の既存プレイヤーを強制変更しています');

assert(app.includes('birthday-default-v0.10.480'), 'タイトル設定側の一度限り移行がありません');
assert(app.includes("if (settings.birthday === '01-01') settings.birthday = DEFAULT_BIRTHDAY;"), 'タイトル設定側の1月1日→4月1日移行がありません');
assert(app.includes(': { month: 4, day: 1 };'), '誕生日選択欄のフォールバックが4月1日ではありません');
assert(app.includes("./daily-gems.js?v=0.10.480"), 'app.jsのキャッシュ更新番号が古いです');
assert(sw.includes("const VERSION = '0.10.480'"), 'サービスワーカーのVERSIONが古いです');
assert(gameHtml.includes('v=0.10.480') && indexHtml.includes('v=0.10.480'), 'HTMLのキャッシュ更新番号が古いです');

console.log('v0.10.480 誕生日既定値・既存1月1日移行検査: OK');
console.log('- 新規ゲームの誕生日初期値は4月1日');
console.log('- 既存の1月1日だけを一度限り4月1日へ移行');
console.log('- 1月1日以外、未設定、移行後の手動1月1日は維持');
console.log('- 旧1月1日の誕生日イベント状態を解除し、4月1日の発生を妨げない');
