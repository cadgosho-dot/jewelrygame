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

assert(VERSION === '0.10.477', 'VERSIONが0.10.477ではありません');
assert(sw.includes("const VERSION = '0.10.477'"), 'Service Workerが0.10.477ではありません');
assert(sw.includes('./js/daily-gems.js?v=0.10.477'), 'Service Workerの日替わり宝石読込番号が古いままです');
assert(indexHtml.includes('game.html?v=0.10.477'), 'index.htmlの読込番号が古いままです');
assert(gameHtml.includes('styles.css?v=0.10.477'), 'game.htmlのCSS読込番号が古いままです');
assert(gameHtml.includes('js/app.js?v=0.10.477'), 'game.htmlのapp.js読込番号が古いままです');
assert(app.includes("./daily-gems.js?v=0.10.477"), 'app.jsの日替わり宝石読込番号が古いままです');

assert(app.includes('>イベント終了</button>'), 'イベント終了ボタンの表示がありません');
assert(app.includes('aria-label="イベントを終了して画面を復旧する"'), 'イベント終了ボタンの説明がありません');
assert(!app.includes('>進まない場合は復旧</button>'), '旧表示の復旧ボタンが残っています');
assert(app.includes('data-action="event-emergency-recover"'), 'イベント終了処理への接続がありません');

for (const marker of [
  '.event-safety-recovery{',
  'top:calc(max(4px,env(safe-area-inset-top)) + 2px)',
  'right:calc(max(4px,env(safe-area-inset-right)) + 2px)',
  'bottom:auto',
  'min-height:28px',
  'font-size:clamp(.58rem,1.45vw,.70rem)',
  'opacity:.74',
]) assert(css.includes(marker), `イベント終了ボタンCSSが不足しています: ${marker}`);

const cssStart = css.indexOf('.event-safety-recovery{');
const cssEnd = css.indexOf('}', cssStart);
const baseBlock = css.slice(cssStart, cssEnd);
assert(!baseBlock.includes('bottom:calc('), 'イベント終了ボタンが右下配置のままです');
assert(!baseBlock.includes('min-height:42px'), 'イベント終了ボタンが大きいままです');

console.log('v0.10.477 イベント終了ボタン検査: OK');
console.log('- 表記を「イベント終了」に変更');
console.log('- 右上端へ小型表示');
console.log('- 縦横画面でセーフエリアを考慮');
console.log('- 従来の安全終了処理を維持');
