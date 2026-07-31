import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { VERSION } from '../js/game-data.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');
const app = read('js/app.js');
const sw = read('sw.js');
const indexHtml = read('index.html');
const gameHtml = read('game.html');
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

assert(VERSION === '0.10.464', 'VERSIONが0.10.464ではありません');
assert(sw.includes("const VERSION = '0.10.464'"), 'Service Workerが0.10.464ではありません');
assert(indexHtml.includes('game.html?v=0.10.464'), 'index.htmlのゲーム読込番号が古いままです');
assert(indexHtml.includes('viewport-shell.js?v=0.10.464'), 'viewport-shell.jsの読込番号が古いままです');
assert(gameHtml.includes('styles.css?v=0.10.464'), 'styles.cssの読込番号が古いままです');
assert(gameHtml.includes('js/app.js?v=0.10.464'), 'app.jsの読込番号が古いままです');
assert(app.includes("./daily-gems.js?v=0.10.464"), 'daily-gems.jsの読込番号が古いままです');

const looseVisual = extractFunction(app, 'looseVisual');
assert(looseVisual.includes('looseDisplayLabel(id, resolvedShape, { suffix: true })'), 'ルース表示名が関数引数idを使用していません');
assert(!looseVisual.includes('looseDisplayLabel(gemId,'), '未定義のgemId参照が残っています');
assert(app.includes("renderLooseShop('rough')"), '原石売却画面からルース屋共通画面への接続が失われています');
assert(app.includes('jewelryLooseSetVisual(item.item, item.gem, item.looseShape'), 'ジュエリーショップのルース表示が失われています');
assert(app.includes("branchShowcases(branch).map((showcase, showcaseIndex) => renderShowcaseUnit"), '店舗ショーケース描画が失われています');
assert(app.includes("const workshopStatus = workshopUpgradeStatus();"), '工房画面のレベル状態取得が失われています');

// 直近の停止復旧を維持する。
assert(app.includes('function repairAlienSpaceDeadlockV463'), '宇宙停止セーブの復旧が失われています');
assert(app.includes('function repairIllnessBirthdayDeadlock'), '体調不良＋誕生日の復旧が失われています');
assert(app.includes('function repairChildhoodFriendEventDeadlock'), 'ラーメンイベントの復旧が失われています');
assert(app.includes('function repairLegacyTransientEventDeadlocksV462'), '旧イベント停止セーブの横断復旧が失われています');

console.log('v0.10.464 ルース表示・全画面復旧検査: OK');
console.log('- 未定義gemId参照を除去');
console.log('- ルース屋、ジュエリーショップ、店舗ショーケース、工房の共通ルース表示を維持');
console.log('- 宇宙、体調不良＋誕生日、ラーメンイベントの復旧を維持');
