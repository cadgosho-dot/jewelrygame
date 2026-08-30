import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { VERSION } from '../js/game-data.js';
const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'..');
const read=(p)=>fs.readFileSync(path.join(root,p),'utf8');
const app=read('js/app.js');
const css=read('styles.css');
const sw=read('sw.js');
const indexHtml=read('index.html');
const gameHtml=read('game.html');
const assert=(c,m)=>{if(!c) throw new Error(m)};
assert(VERSION==='0.10.479','VERSIONが0.10.479ではありません');
assert(sw.includes("const VERSION = '0.10.479'"),'Service Workerが0.10.479ではありません');
assert(sw.includes('./js/daily-gems.js?v=0.10.479'),'Service Workerの日替わり宝石読込番号が古いままです');
assert(indexHtml.includes('game.html?v=0.10.479'),'index.htmlの読込番号が古いままです');
assert(gameHtml.includes('styles.css?v=0.10.479'),'game.htmlのCSS読込番号が古いままです');
assert(gameHtml.includes('js/app.js?v=0.10.479'),'game.htmlのapp.js読込番号が古いままです');
assert(app.includes("./daily-gems.js?v=0.10.479"),'app.jsの日替わり宝石読込番号が古いままです');
for (const marker of [
  '/* v0.10.479: 地金屋の縦画面で最大購入・売却可能量をカード右上へ移動 */',
  '@media (orientation:portrait), (max-aspect-ratio:1/1)',
  'body[data-screen="supplierMetals"] .metal-trade-heading{',
  'position:relative!important',
  'body[data-screen="supplierMetals"] .metal-limit-price-row .metal-maximum{',
  'position:absolute!important',
  'right:clamp(.4rem,2vw,.7rem)!important',
  'width:min(42%,15rem)!important',
  'body[data-screen="supplierMetals"] .metal-title-status-row .metal-owned-limit{',
  'flex-direction:column!important',
]) assert(css.includes(marker),`地金屋の縦画面配置CSSが不足しています: ${marker}`);
assert(app.includes("現在購入できる最大量"),'最大購入量表示が失われています');
assert(app.includes("現在売却できる最大量"),'最大売却量表示が失われています');
console.log('v0.10.479 地金屋縦画面・最大量右上配置検査: OK');
