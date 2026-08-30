import fs from 'node:fs';

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const assert = (value, message) => { if (!value) throw new Error(message); };

const app = read('js/app.js');
const data = read('js/game-data.js');
const css = read('styles.css');
const sw = read('sw.js');
const game = read('game.html');
const index = read('index.html');

assert(data.includes("export const VERSION = '0.10.471'"), 'VERSIONが0.10.471ではありません');
assert(sw.includes("const VERSION = '0.10.471'"), 'Service Workerの版が0.10.471ではありません');
assert(game.includes('styles.css?v=0.10.471'), 'game.htmlのCSS版が0.10.471ではありません');
assert(game.includes('js/app.js?v=0.10.471'), 'game.htmlのapp.js版が0.10.471ではありません');
assert(index.includes('game.html?v=0.10.471'), 'index.htmlのgame.html版が0.10.471ではありません');
assert(index.includes('viewport-shell.css?v=0.10.471'), 'index.htmlのviewport-shell.css版が0.10.471ではありません');
assert(index.includes('viewport-shell.js?v=0.10.471'), 'index.htmlのviewport-shell.js版が0.10.471ではありません');
assert(app.includes('./daily-gems.js?v=0.10.471'), 'daily-gems参照版が0.10.471ではありません');

assert(app.includes("const PORTRAIT_TWO_BAR_EXCLUDED_SCREENS = new Set(['main']);"), 'メイン画面だけを2段表示の除外対象にしていません');
assert(app.includes('function usesPortraitTwoBarHeader(screenName)'), '全画面共通の2段ヘッダー判定がありません');
assert(app.includes("return !PORTRAIT_TWO_BAR_EXCLUDED_SCREENS.has(String(screenName || ''));"), '新規画面を自動的に2段対象へ含める判定ではありません');
assert(app.includes("if (usesPortraitTwoBarHeader(screen)) document.body.dataset.headerMode = 'two-bar';"), '画面描画時の全画面2段ヘッダー切替が失われています');
assert(!app.includes('const PORTRAIT_TWO_BAR_SCREENS = new Set(['), '旧来の個別画面登録方式が残っています');

assert(css.includes('@media (orientation:portrait){\n  body[data-header-mode="two-bar"]'), '縦画面2段ヘッダーCSSがありません');
assert(css.includes('grid-template-areas:"status money" "center center"!important'), '上部バー1・2のグリッド構成がありません');
assert(css.includes('body[data-header-mode="two-bar"] .game-header::before'), '上部バー1の独立背景がありません');
assert(css.includes('body[data-header-mode="two-bar"] .game-header::after'), '上部バー2の独立背景がありません');
assert(css.includes('@media (orientation:landscape){\n  body[data-header-mode="two-bar"] .header-secondary-actions'), '横画面維持規則がありません');

const rendererMatch = app.match(/const renderers = \{([\s\S]*?)\n    \};/);
assert(rendererMatch, '登録画面一覧を取得できません');
const screens = [...rendererMatch[1].matchAll(/^\s*([A-Za-z0-9_]+)\s*:/gm)].map((match) => match[1]);
assert(screens.length >= 70, `登録画面が不足しています: ${screens.length}`);
assert(screens.includes('main'), 'メイン画面が登録されていません');

console.log(`v0.10.471 全画面・縦画面2段ヘッダー検査: OK（登録${screens.length}画面、メイン以外${screens.length - 1}画面）`);
