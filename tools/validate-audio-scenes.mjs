import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  AUDIO_SCENE_DEFINITIONS,
  AUDIO_SCENE_KEYS,
  SCREEN_AUDIO_SCENES,
  DYNAMIC_AUDIO_SCREENS,
  resolveAudioScene,
  audioSceneAuditFiles,
} from '../js/audio-scene-map.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const appSource = fs.readFileSync(path.join(root, 'js/app.js'), 'utf8');
const rendererMatch = appSource.match(/const renderers = \{([\s\S]*?)\n    \};/);
if (!rendererMatch) throw new Error('renderers一覧を取得できません。');
const rendererScreens = [...rendererMatch[1].matchAll(/^\s*([A-Za-z0-9_]+)\s*:/gm)].map((match) => match[1]);
const declaredScreens = new Set([...Object.keys(SCREEN_AUDIO_SCENES), ...DYNAMIC_AUDIO_SCREENS]);
const missingScreens = rendererScreens.filter((screen) => !declaredScreens.has(screen));
const extraScreens = [...declaredScreens].filter((screen) => !rendererScreens.includes(screen));
if (missingScreens.length) throw new Error(`音割り当て未登録画面: ${missingScreens.join(', ')}`);
if (extraScreens.length) throw new Error(`存在しない画面の音割り当て: ${extraScreens.join(', ')}`);

for (const screen of rendererScreens) {
  const contexts = screen === 'meal'
    ? [{ mealId: '' }, { mealId: 'convenience' }, { mealId: 'soba' }, { mealId: 'ramen' }, { mealId: 'hamburger' }, { mealId: 'indian' }, { mealId: 'korean' }, { mealId: 'chinese' }, { mealId: 'kebab' }]
    : screen === 'cinemaVisitEvent'
      ? [{ cinemaStage: 'invitation' }, { cinemaStage: 'playing' }]
      : screen === 'okachimachiQuiz'
        ? [{ quizStage: 'intro1' }, { quizStage: 'question' }]
        : [{}];
  for (const context of contexts) {
    const key = resolveAudioScene(screen, context);
    if (!AUDIO_SCENE_DEFINITIONS[key]) throw new Error(`${screen} が未定義の音場 ${key} を参照しています。`);
  }
}

if (resolveAudioScene('phone') !== 'main') throw new Error('スマートフォンはメイン画面と同じ音場でなければなりません。');

const mealSceneKeys = ['meal', 'meal-convenience', 'meal-soba', 'meal-ramen', 'meal-hamburger', 'meal-indian', 'meal-korean', 'meal-chinese', 'meal-kebab'];
for (const key of mealSceneKeys) {
  const scene = AUDIO_SCENE_DEFINITIONS[key];
  if (!scene.ambient?.url?.includes(`amb-${key}.ogg`)) throw new Error(`${key} の専用環境音が設定されていません。`);
  const layerNames = new Set(scene.supplemental.map((layer) => layer.name));
  if (!layerNames.has('street') || !layerNames.has('weather')) throw new Error(`${key} は専用環境音＋街音＋天気音の構成が必要です。`);
}
const kaitenLayers = new Set(AUDIO_SCENE_DEFINITIONS.kaitenzushi.supplemental.map((layer) => layer.name));
if (!kaitenLayers.has('street') || !kaitenLayers.has('weather')) throw new Error('回転寿司は居酒屋環境音＋街音＋天気音が必要です。');
for (const [key, scene] of Object.entries(AUDIO_SCENE_DEFINITIONS)) {
  if (!Number.isFinite(scene.bgmScale) || !Number.isFinite(scene.ambientScale)) throw new Error(`${key} の音量係数が未定義です。`);
}
if (resolveAudioScene('cinemaVisitEvent', { cinemaStage: 'playing' }) !== 'silent') throw new Error('映画上映中はゲーム音を停止する必要があります。');
if (resolveAudioScene('craft') !== 'craft' || AUDIO_SCENE_DEFINITIONS.craft.bgm !== AUDIO_SCENE_DEFINITIONS.workshop.bgm) throw new Error('制作画面は工房BGMを共有し、制作環境音へ切り替える必要があります。');
if (resolveAudioScene('polishing') !== 'polishing' || AUDIO_SCENE_DEFINITIONS.polishing.bgm !== AUDIO_SCENE_DEFINITIONS.workshop.bgm) throw new Error('研磨画面は工房BGMを共有し、研磨環境音へ切り替える必要があります。');

const missingFiles = [];
for (const relativeUrl of audioSceneAuditFiles()) {
  const relativePath = relativeUrl.replace(/^\.\//, '');
  if (!fs.existsSync(path.join(root, relativePath))) missingFiles.push(relativeUrl);
}
if (missingFiles.length) throw new Error(`音源ファイル不足: ${missingFiles.join(', ')}`);

const swSource = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
if (!swSource.includes("'./js/audio-scene-map.js'")) throw new Error('audio-scene-map.js がPWAキャッシュ対象にありません。');
const missingCacheFiles = audioSceneAuditFiles().filter((file) => !swSource.includes(`'${file}'`));
if (missingCacheFiles.length) throw new Error(`PWAキャッシュ未登録の音源: ${missingCacheFiles.join(', ')}`);
if (swSource.includes("'./assets/audio/bgm-phone.ogg'") || swSource.includes("'./assets/audio/amb-phone.ogg'")) throw new Error('未使用のスマートフォン専用音源がPWAキャッシュへ戻っています。');

const missingScaleScenes = AUDIO_SCENE_KEYS.filter((key) => !AUDIO_SCENE_DEFINITIONS[key]);
if (missingScaleScenes.length) throw new Error(`音場定義不足: ${missingScaleScenes.join(', ')}`);

console.log(`音場定義 ${AUDIO_SCENE_KEYS.length}件、画面割り当て ${rendererScreens.length}件、音源 ${audioSceneAuditFiles().length}件: OK`);
console.log('スマートフォン=メイン、食事4層、映画上映=無音、工房BGM共有、回転寿司4層: OK');
