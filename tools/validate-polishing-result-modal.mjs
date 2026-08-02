import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const app = fs.readFileSync(path.join(ROOT, 'js/app.js'), 'utf8');
const css = fs.readFileSync(path.join(ROOT, 'styles.css'), 'utf8');
const errors = [];

const requireText = (text, marker, label) => {
  if (!text.includes(marker)) errors.push(`${label} が見つかりません`);
};

requireText(app, 'hideActions = false', 'モーダル操作欄の非表示オプション');
requireText(app, "${hideActions ? '' : `<div class=\"modal-actions\">", '操作欄の条件付き描画');
requireText(app, 'class="polishing-result-loose-visual"', '完成ルースの独立表示枠');
requireText(app, 'class="secondary-button polishing-result-return-button"', 'ルース下の戻るボタン');
requireText(app, 'data-action="polishing-result-return">戻る</button>', '戻るボタンの表示と動作');
requireText(app, 'hideActions: true', '標準モーダル操作欄の非表示');
requireText(app, "case 'polishing-result-return':", '原石研磨画面へ戻る処理');
requireText(app, "if (screen !== 'polishing') setScreen('polishing', {}, false);", '原石研磨画面への復帰保証');

const polishStart = app.indexOf('function polishRough()');
const polishEnd = app.indexOf('function qualityProbabilities()', polishStart);
const polishBlock = polishStart >= 0 && polishEnd > polishStart ? app.slice(polishStart, polishEnd) : '';
if (!polishBlock) {
  errors.push('原石研磨処理を抽出できません');
} else {
  requireText(polishBlock, 'を${looseShapeLabel(completedShapeId)}へカットしました', '研磨結果タイトル');
  requireText(polishBlock, 'polishing-result-loose-image', '完成ルース画像');
  requireText(polishBlock, 'polishing-result-return-button', '完成ルース下の戻るボタン');
  if (polishBlock.includes('polishing-result-loose-button')) errors.push('旧仕様のルース全体ボタンが残っています');
  if (polishBlock.includes('完成したルースを保管しました。')) errors.push('不要な保管完了文が残っています');
  if (polishBlock.includes("confirm: '閉じる'")) errors.push('不要な閉じるボタンが残っています');
}

requireText(css, '/* v0.10.476 原石研磨完了：ルースを小さくし、戻るボタンを分離。縦画面は枠を画面中央へ固定 */', 'v0.10.476研磨完了画面CSS');
requireText(css, 'width:min(112px,28vw,18dvh)', '通常画面のルース最大サイズ');
requireText(css, 'width:min(88px,28vw,16dvh)', '縦画面のルース最大サイズ');
requireText(css, '/* v0.10.486: 原石研磨完成画面の石と結果枠をさらに縮小 */', 'v0.10.486研磨完了画面CSS');
requireText(css, '.polishing-result-return-button', '戻るボタン専用CSS');
requireText(css, '#modal-layer .modal-backdrop:has(.polishing-result-modal)', '縦画面の中央配置対象');
requireText(css, 'place-items:center!important', '縦画面の縦横中央配置');
requireText(css, 'place-self:center!important', '結果枠自身の中央配置');
requireText(css, '@media (orientation:landscape) and (max-height:620px)', '低い横画面の専用調整');
requireText(css, 'width:min(92px,18vw,34dvh)', '低い横画面のルース最大サイズ');

const viewports = [
  [320, 568], [360, 640], [375, 667], [390, 844], [412, 915], [430, 932],
  [568, 320], [640, 360], [667, 375], [740, 360], [760, 400], [844, 390], [915, 412], [932, 430],
  [691, 1536], [1536, 691],
];
for (const [width, height] of viewports) {
  const portrait = height >= width;
  let imageSize;
  if (portrait && width <= 820) imageSize = Math.min(88, width * 0.28, height * 0.16);
  else if (!portrait && height <= 620) imageSize = Math.min(92, width * 0.18, height * 0.34);
  else imageSize = Math.min(112, width * 0.28, height * 0.18);
  if (imageSize < 72) errors.push(`${width}x${height}: ルース画像が小さすぎます (${imageSize.toFixed(1)}px)`);
  if (portrait && imageSize > 88.1) errors.push(`${width}x${height}: 縦画面のルース画像が指定上限を超えています`);
  if (!portrait && height <= 620 && imageSize > 92.1) errors.push(`${width}x${height}: 低い横画面のルース画像が指定上限を超えています`);
  const portraitCardWidth = Math.min(286, width - 40);
  if (portrait && portraitCardWidth <= 0) errors.push(`${width}x${height}: 結果枠の横幅を確保できません`);
}

if (errors.length) {
  console.error('原石研磨完了画面チェック: NG');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log('原石研磨完了画面チェック: OK');
console.log('完成ルースと結果枠をさらに縮小し、独立した「戻る」ボタンと中央配置を16種類の画面サイズで確認しました。');
