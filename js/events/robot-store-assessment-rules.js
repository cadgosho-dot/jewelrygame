import { GEMS, looseShapeIdsForGem } from '../game-data-core.js?v=0.10.964';

export const ROBOT_STORE_ASSESSMENT_EVENT_KEY = 'robotStoreAssessment';
export const ROBOT_STORE_ASSESSMENT_TRIGGER_CHANCE = 1 / 30;
export const ROBOT_STORE_ASSESSMENT_HIGH_RATIO = 0.8;
export const ROBOT_STORE_ASSESSMENT_STANDARD_RATIO = 0.5;

export const ROBOT_STORE_ASSESSMENT_DIALOGUE = Object.freeze({
  intro: '店舗データの収集を開始します。……評価対象を認識しました。',
  showcase: Object.freeze({
    good: 'ショーケース確認。商品が十分に並んでいます。選択肢は良好です。',
    bad: 'ショーケース確認。空きが目立ちます。……空間を販売しているのでしょうか。',
  }),
  looseKinds: Object.freeze({
    good: 'ルース在庫確認。種類は豊富です。比較して選べる状態です。',
    bad: 'ルース在庫確認。種類が偏っています。追加収集を推奨します。',
  }),
  looseCuts: Object.freeze({
    good: 'カット構成確認。複数のカットが揃っています。展示に変化があります。',
    bad: 'カット構成確認。同じカットが続いています。バリエーション不足です。',
  }),
  calculating: '総合評価を算出中……。',
  closing: '評価データを保存しました。次回も確認します。',
});

const clamp01 = (value) => Math.max(0, Math.min(1, Number(value) || 0));

function levelForRatio(value) {
  const ratio = clamp01(value);
  if (ratio >= ROBOT_STORE_ASSESSMENT_HIGH_RATIO) return 'high';
  if (ratio >= ROBOT_STORE_ASSESSMENT_STANDARD_RATIO) return 'standard';
  return 'low';
}

function selectedBranch(snapshot, branchId) {
  const branches = Array.isArray(snapshot?.store?.branches) ? snapshot.store.branches : [];
  return branches.find((branch) => String(branch?.id || '') === String(branchId || '')) || null;
}

function tradeableGemIds() {
  return Object.entries(GEMS)
    .filter(([, gem]) => !gem?.eventOnly && !gem?.noLooseShopTrade)
    .map(([gemId]) => gemId);
}

function looseInventoryMetrics(snapshot) {
  const loose = snapshot?.inventory?.loose;
  const inventory = loose && typeof loose === 'object' && !Array.isArray(loose) ? loose : {};
  const gemIds = tradeableGemIds();

  const possibleCuts = new Set();
  const ownedGemIds = new Set();
  const ownedCuts = new Set();

  for (const gemId of gemIds) {
    const shapes = looseShapeIdsForGem(gemId);
    shapes.forEach((shapeId) => possibleCuts.add(shapeId));

    const owned = inventory?.[gemId];
    if (!owned || typeof owned !== 'object' || Array.isArray(owned)) continue;

    for (const shapeId of shapes) {
      if (Math.max(0, Number(owned[shapeId]) || 0) <= 0) continue;
      ownedGemIds.add(gemId);
      ownedCuts.add(shapeId);
    }
  }

  const gemRatio = gemIds.length ? ownedGemIds.size / gemIds.length : 0;
  const cutRatio = possibleCuts.size ? ownedCuts.size / possibleCuts.size : 0;

  return Object.freeze({
    possibleGemCount:gemIds.length,
    ownedGemCount:ownedGemIds.size,
    possibleCutCount:possibleCuts.size,
    ownedCutCount:ownedCuts.size,
    gemRatio:clamp01(gemRatio),
    cutRatio:clamp01(cutRatio),
  });
}

function showcaseMetrics(branch) {
  const showcases = Array.isArray(branch?.showcases) ? branch.showcases : [];
  let totalSlots = 0;
  let filledSlots = 0;

  for (const showcase of showcases) {
    const slots = Array.isArray(showcase?.slots) ? showcase.slots : [];
    totalSlots += slots.length;
    filledSlots += slots.filter((slot) => Boolean(slot?.jewelryId)).length;
  }

  return Object.freeze({
    totalSlots,
    filledSlots,
    ratio:clamp01(totalSlots ? filledSlots / totalSlots : 0),
  });
}

export function assessRobotStore(snapshot, branchId) {
  const branch = selectedBranch(snapshot, branchId);
  if (!branch) {
    return Object.freeze({
      branch:null,
      showcase:Object.freeze({ totalSlots:0, filledSlots:0, ratio:0, level:'low' }),
      looseKinds:Object.freeze({ possibleCount:0, ownedCount:0, ratio:0, level:'low' }),
      looseCuts:Object.freeze({ possibleCount:0, ownedCount:0, ratio:0, level:'low' }),
      overallLevel:'low',
      overallRatio:0,
    });
  }

  const showcase = showcaseMetrics(branch);
  const loose = looseInventoryMetrics(snapshot);
  const showcaseLevel = levelForRatio(showcase.ratio);
  const looseKindLevel = levelForRatio(loose.gemRatio);
  const looseCutLevel = levelForRatio(loose.cutRatio);
  const overallRatio = clamp01((showcase.ratio + loose.gemRatio + loose.cutRatio) / 3);

  return Object.freeze({
    branch,
    showcase:Object.freeze({ ...showcase, level:showcaseLevel }),
    looseKinds:Object.freeze({
      possibleCount:loose.possibleGemCount,
      ownedCount:loose.ownedGemCount,
      ratio:loose.gemRatio,
      level:looseKindLevel,
    }),
    looseCuts:Object.freeze({
      possibleCount:loose.possibleCutCount,
      ownedCount:loose.ownedCutCount,
      ratio:loose.cutRatio,
      level:looseCutLevel,
    }),
    overallLevel:levelForRatio(overallRatio),
    overallRatio,
  });
}

function registeredLine(pair, level) {
  return level === 'low' ? pair.bad : pair.good;
}

export function buildRobotStoreAssessmentDialogue(snapshot, branchId) {
  const assessment = assessRobotStore(snapshot, branchId);
  if (!assessment.branch) return { assessment, lines:[] };

  const d = ROBOT_STORE_ASSESSMENT_DIALOGUE;
  return {
    assessment,
    lines:[
      d.intro,
      registeredLine(d.showcase, assessment.showcase.level),
      registeredLine(d.looseKinds, assessment.looseKinds.level),
      registeredLine(d.looseCuts, assessment.looseCuts.level),
      d.calculating,
      d.closing,
    ],
  };
}
