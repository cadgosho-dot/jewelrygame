import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { VERSION } from '../js/game-data.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const app = fs.readFileSync(path.join(root, 'js/app.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'styles.css'), 'utf8');
const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
const indexHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const gameHtml = fs.readFileSync(path.join(root, 'game.html'), 'utf8');
const assert = (condition, message) => { if (!condition) throw new Error(message); };

assert(VERSION === '0.10.476', 'VERSIONが0.10.476ではありません');
assert(sw.includes("const VERSION = '0.10.476'"), 'Service Workerが0.10.476ではありません');
assert(sw.includes('./js/daily-gems.js?v=0.10.476'), 'Service Workerの日替わり宝石読込番号が古いままです');
assert(indexHtml.includes('game.html?v=0.10.476'), 'index.htmlの読込番号が古いままです');
assert(gameHtml.includes('styles.css?v=0.10.476'), 'game.htmlのCSS読込番号が古いままです');
assert(gameHtml.includes('js/app.js?v=0.10.476'), 'game.htmlのapp.js読込番号が古いままです');
assert(app.includes("./daily-gems.js?v=0.10.476"), 'app.jsの日替わり宝石読込番号が古いままです');

const polishStart = app.indexOf('function polishRough()');
const polishEnd = app.indexOf('function qualityProbabilities()', polishStart);
assert(polishStart >= 0 && polishEnd > polishStart, 'polishRoughを抽出できません');
const block = app.slice(polishStart, polishEnd);
assert(block.includes('polishing-result-loose-visual'), '完成ルースの独立表示枠がありません');
assert(block.includes('polishing-result-return-button'), '戻るボタンがありません');
assert(block.includes('data-action="polishing-result-return">戻る</button>'), '戻るボタンが原石研磨復帰処理へ接続されていません');
assert(!block.includes('polishing-result-loose-button'), '旧仕様の大きなルースボタンが残っています');
assert(app.includes("case 'polishing-result-return':"), '戻る操作の処理がありません');
assert(app.includes("if (screen !== 'polishing') setScreen('polishing', {}, false);"), '原石研磨画面への復帰保証がありません');

for (const marker of [
  'width:min(170px,38vw,26dvh)',
  'width:min(132px,34vw,20dvh)',
  'width:min(130px,20vw,42dvh)',
  '#modal-layer .modal-backdrop:has(.polishing-result-modal)',
  'place-self:center!important',
  '.polishing-result-return-button',
]) assert(css.includes(marker), `研磨結果CSSが不足しています: ${marker}`);

console.log('v0.10.476 原石研磨完成ルース画面検査: OK');
console.log('- 完成ルースを縮小');
console.log('- ルース下に独立した「戻る」ボタンを追加');
console.log('- 縦画面の結果枠を縦横中央へ配置');
