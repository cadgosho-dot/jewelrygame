import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  VERSION,
  ARTISAN_LEVEL_XP,
  ARTISAN_LEVEL_TITLES,
  WORKSHOP_LEVEL_REQUIREMENTS,
  STORE_LEVEL_REQUIREMENTS,
  WORKSHOP_STAFF_GROWTH_LEVELS,
  initialState,
  migrateState,
} from '../js/game-data.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const app = fs.readFileSync(path.join(root, 'js/app.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'styles.css'), 'utf8');
const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
const assert = (condition, message) => { if (!condition) throw new Error(message); };

assert(VERSION === '0.10.454', 'VERSIONが0.10.454ではありません');
assert(ARTISAN_LEVEL_XP.length === 20, '職人レベルが20段階ではありません');
assert(ARTISAN_LEVEL_XP.at(-1) === 50000, '職人Lv.20の必要経験値が50,000ではありません');
assert(ARTISAN_LEVEL_TITLES.length === 21 && ARTISAN_LEVEL_TITLES[20] === 'マイスター', '職人肩書きが20段階に対応していません');
assert(app.includes("if (level <= 3) return 1;") && app.includes("if (level <= 19) return 5;") && app.includes('return 6;'), '同時受注数が20段階仕様ではありません');
for (const [id, level] of [['basic',1],['general',4],['complex',8],['high',12],['special',16]]) {
  assert(app.includes(`${id}:`) && app.includes(`artisanLevel: ${level}`), `注文難易度${id}の必要職人レベルが不正です`);
}
assert(app.includes("return { basic: 4, general: 6, complex: 8, high: 12, special: 15 }"), '制作難易度別の職人経験値が不正です');
assert(app.includes('addArtisanXp(1);'), '原石研磨経験値+1が見つかりません');

assert(WORKSHOP_LEVEL_REQUIREMENTS.length === 20, '工房レベルが20段階ではありません');
assert(WORKSHOP_LEVEL_REQUIREMENTS.at(-1).hours === 4500 && WORKSHOP_LEVEL_REQUIREMENTS.at(-1).quality === 66 && WORKSHOP_LEVEL_REQUIREMENTS.at(-1).cost === 14000000, '工房Lv.20条件が不正です');
assert(WORKSHOP_LEVEL_REQUIREMENTS.slice(8).every((entry) => entry.requiredTools.length === 0), '工房Lv.9以降に新しい必須設備があります');
const level8Tools = new Set(WORKSHOP_LEVEL_REQUIREMENTS[7].requiredTools);
for (const id of ['jewelryBench','benchPeg','piercingSaw','file','pliers','nipper','hammer','torch','graver','dividers','rotaryTool','buffer','ultrasonicCleaner','electronicScale','magnifier','engravingBlock','stamps','milgrainTool','polishingMachine','rollingMill','computer','cadSoftware','printer3d']) {
  assert(level8Tools.has(id), `工房Lv.8までの必須設備に${id}がありません`);
}

assert(STORE_LEVEL_REQUIREMENTS.length === 20, '店舗レベルが20段階ではありません');
const store20 = STORE_LEVEL_REQUIREMENTS.at(-1);
assert(store20.operatingDays === 2400 && store20.sales === 3500 && store20.revenue === 650000000 && store20.serviceSuccesses === 1500 && store20.cost === 17000000, '店舗Lv.20条件が不正です');
assert(app.includes('branch.operatingDays') && app.includes('branch.totalRevenue') && app.includes('branch.serviceSuccesses'), '店舗別実績が実装されていません');
assert(app.includes("data-action=\"upgrade-store-level\""), '店舗改装ボタンがありません');

assert(WORKSHOP_STAFF_GROWTH_LEVELS.map((entry) => entry.minWorkDays).join(',') === '0,480,960,1440,2400', '職人スタッフが約10年成長ではありません');
assert(app.includes('職人レベル15以上') && app.includes('工房レベル15以上'), '職人スタッフ解放条件の新レベル換算が不正です');
assert(app.includes('契約金・紹介料はありません'), '職人スタッフの契約金なし表示がありません');
assert(app.includes('evolutionStage'), '職人スタッフ画像進化段階の状態がありません');

assert(app.includes('function applyArtisanLevelPenalty') && app.includes('function applyWorkshopLevelPenalty') && app.includes('function applyStoreLevelPenalty'), 'レベル低下用の共通基盤が不足しています');
assert(app.includes('peakLevel') && app.includes('paidThroughLevel'), '過去最高レベルまたは再昇格支払済み情報がありません');

const current = initialState();
current.version = '0.10.454';
current.workshop.level = 17;
current.workshop.peakLevel = 18;
current.workshop.paidThroughLevel = 18;
current.workshop.activeHours = 3000;
current.store.rented = true;
current.store.name = '保存検査店';
current.store.branches = [{
  id:'branch-1', number:1, name:'保存検査店', rentedDay:1, suspended:false, unpaidRent:0,
  points:999, level:16, peakLevel:19, paidThroughLevel:18, operatingDays:1300,
  totalRevenue:300000000, serviceSuccesses:800, openMinutesToday:300, visitorsToday:2,
  rating:88, salesCount:1700, orderDeliveries:40, displaySuppliesInstalled:0, casesInstalled:0,
  showcases:[], employee:{hired:false, working:true, workDays:0},
}];
const migrated = migrateState(current);
assert(migrated.workshop.level === 17 && migrated.workshop.peakLevel === 18, '再読込で工房Lv.11以上が失われます');
const migratedBranch = migrated.store.branches[0];
assert(migratedBranch.level === 16 && migratedBranch.peakLevel === 19, '再読込で店舗Lv.11以上が失われます');
assert(migratedBranch.operatingDays === 1300 && migratedBranch.totalRevenue === 300000000 && migratedBranch.serviceSuccesses === 800, '再読込で店舗別実績が失われます');

const modernWithoutBranches = initialState();
modernWithoutBranches.version = '0.10.454';
modernWithoutBranches.store.rented = true;
modernWithoutBranches.store.name = '旧形式保存店';
modernWithoutBranches.store.level = 16;
modernWithoutBranches.store.peakLevel = 18;
modernWithoutBranches.store.paidThroughLevel = 17;
modernWithoutBranches.store.operatingDays = 1230;
modernWithoutBranches.store.salesCount = 1650;
modernWithoutBranches.store.totalRevenue = 260000000;
modernWithoutBranches.store.serviceSuccesses = 760;
modernWithoutBranches.store.branches = [];
const modernWithoutBranchesMigrated = migrateState(modernWithoutBranches);
const createdModernBranch = modernWithoutBranchesMigrated.store.branches[0];
assert(createdModernBranch?.level === 16, 'v0.10.454の店舗別データがない保存で店舗Lv.11以上が失われます');
assert(createdModernBranch?.peakLevel === 18 && createdModernBranch?.paidThroughLevel === 17, '店舗別データがない保存で最高レベル・支払済み段階が失われます');
assert(createdModernBranch?.operatingDays === 1230 && createdModernBranch?.totalRevenue === 260000000 && createdModernBranch?.serviceSuccesses === 760, '店舗別データがない保存で店舗実績が失われます');

for (const title of ['真珠が形成される仕組み','天然真珠・養殖真珠・模造品','テリ','巻きと真珠層','表面状態','色とオリエント','鑑別と処理の確認','穴あけ・芯立て・接着','糸組みと金具','洗浄・着用・保管']) {
  assert(app.includes(title), `パール詳細に「${title}」がありません`);
}
assert(app.includes("${isPearl ? '' : `<section class=\"loose-knowledge-card\"><div><h2>カットについて</h2>"), 'パールのルース詳細でカット欄を隠す条件がありません');
assert(app.includes("if (screenData.gemId === 'pearl' || screenData.looseShape === 'pearl')"), 'パールからカット詳細へ直接入る経路が遮断されていません');
assert(!app.includes('パールにはカット選択はありません'), 'パール画面に不要なカット説明が残っています');

assert(app.includes("contentEl.style.setProperty('padding-top', '0px', 'important')"), '縦画面の旧固定余白を強制解除していません');
assert(app.includes('headerRect.bottom + desiredGap - contentRect.top'), '上部バーの実測に基づく余白計算がありません');
assert(app.includes("contentEl.style.setProperty('padding-top', `${offset}px`, 'important')"), '縦画面の本文余白を全画面へ強制適用していません');
assert(css.includes('v0.10.454: 縦画面の全画面共通ヘッダー重なり・過剰余白防止'), '縦画面のCSS保護規則がありません');
assert(sw.includes("const VERSION = '0.10.454'"), 'Service Workerのキャッシュ版が不正です');

console.log('v0.10.454 専用検査: OK');
console.log('- 職人・工房・店舗: 各20段階');
console.log('- 職人スタッフ: 2,400実働日で匠、厳格解放、契約金なし');
console.log('- レベル低下基盤、再昇格費用保護、Lv.11以上の保存互換');
console.log('- パール詳細強化、カット表示なし');
console.log('- 縦画面本文位置: 上部バー実測・過剰余白防止');
