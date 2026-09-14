// 採掘ページ（採掘場を選ぶ前）で発生する戦闘ミニゲーム用の作業途中モジュール。
// 本番へはまだ接続しない。既存の御徒町 RetroBattle UI を再利用し、
// 採掘専用の背景・敵・ツルハシ演出だけを差し替えるための処理をここへ分離する。

export const MINING_BATTLE_EVENT_CHANCE = 1 / 30;
export const MINING_BATTLE_SOURCE = 'mining';
export const MINING_PICKAXE_STRIKE_DURATION_MS = 320;
export const MINING_PICKAXE_IMPACT_RATIO = 0.56;

export const MINING_PICKAXE_STRIKE_KEYFRAMES = Object.freeze([
  Object.freeze({
    offset: 0,
    opacity: 0,
    transform: 'translate(32%, -22%) rotate(42deg) scale(.92)',
  }),
  Object.freeze({
    offset: 0.16,
    opacity: 1,
  }),
  Object.freeze({
    offset: MINING_PICKAXE_IMPACT_RATIO,
    opacity: 1,
    transform: 'translate(-34%, 2%) rotate(-31deg) scale(1)',
  }),
  Object.freeze({
    offset: 1,
    opacity: 0,
    transform: 'translate(-38%, 8%) rotate(-35deg) scale(.98)',
  }),
]);

function unitRandom(random) {
  const value = Number(typeof random === 'function' ? random() : Math.random());
  if (!Number.isFinite(value)) return Math.random();
  if (value <= 0) return 0;
  if (value >= 1) return 0.999999999999;
  return value;
}

export function shouldTriggerMiningBattle({
  random = Math.random,
  chance = MINING_BATTLE_EVENT_CHANCE,
} = {}) {
  const normalizedChance = Math.max(0, Math.min(1, Number(chance) || 0));
  return unitRandom(random) < normalizedChance;
}

export function chooseMiningBattleEnemy(enemies, { random = Math.random } = {}) {
  const candidates = Array.isArray(enemies)
    ? enemies.filter((enemy) => enemy && typeof enemy === 'object' && enemy.image)
    : [];
  if (!candidates.length) return null;
  const index = Math.floor(unitRandom(random) * candidates.length);
  return candidates[Math.min(index, candidates.length - 1)];
}

function requireAssetPath(value, label) {
  const path = String(value || '').trim();
  if (!path) {
    throw new Error(`${label} が未登録です。ユーザー提供画像を登録してから指定してください。`);
  }
  return path;
}

export function createMiningBattleStartOptions({
  playerName,
  inventory,
  backgroundImage,
  enemy,
  pickaxeImage,
  pickaxeSound = null,
} = {}) {
  if (!enemy || typeof enemy !== 'object') {
    throw new Error('採掘戦闘の敵キャラクターが未指定です。');
  }

  return {
    playerName: String(playerName || ''),
    inventory: inventory && typeof inventory === 'object' ? inventory : {},
    source: MINING_BATTLE_SOURCE,
    miningBattle: {
      backgroundImage: requireAssetPath(backgroundImage, '採掘戦闘の背景画像'),
      enemy: {
        id: String(enemy.id || ''),
        name: String(enemy.name || ''),
        image: requireAssetPath(enemy.image, '採掘戦闘の敵画像'),
      },
      attack: {
        kind: 'pickaxe',
        image: requireAssetPath(pickaxeImage, '採掘戦闘のツルハシ画像'),
        sound: pickaxeSound ? String(pickaxeSound) : null,
        durationMs: MINING_PICKAXE_STRIKE_DURATION_MS,
        impactRatio: MINING_PICKAXE_IMPACT_RATIO,
        keyframes: MINING_PICKAXE_STRIKE_KEYFRAMES,
      },
    },
  };
}

export function playMiningPickaxeStrike({
  element,
  playSound,
  onImpact,
  durationMs = MINING_PICKAXE_STRIKE_DURATION_MS,
} = {}) {
  if (!element || typeof element.animate !== 'function') {
    throw new Error('ツルハシ攻撃を表示する要素が見つかりません。');
  }

  const duration = Math.max(1, Number(durationMs) || MINING_PICKAXE_STRIKE_DURATION_MS);
  const impactDelay = Math.round(duration * MINING_PICKAXE_IMPACT_RATIO);
  let impacted = false;

  const impact = () => {
    if (impacted) return;
    impacted = true;
    if (typeof playSound === 'function') playSound();
    if (typeof onImpact === 'function') onImpact();
  };

  const impactTimer = setTimeout(impact, impactDelay);
  const animation = element.animate(MINING_PICKAXE_STRIKE_KEYFRAMES, {
    duration,
    easing: 'ease-out',
    fill: 'both',
  });

  const finish = () => {
    clearTimeout(impactTimer);
    impact();
  };

  if (animation && typeof animation.addEventListener === 'function') {
    animation.addEventListener('finish', finish, { once: true });
    animation.addEventListener('cancel', () => clearTimeout(impactTimer), { once: true });
  }

  return animation;
}
