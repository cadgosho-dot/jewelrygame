// 採掘場所選択前に発生する採掘戦闘イベントの独立ロジック。
// 本体へ接続するまで副作用を持たせず、既存の御徒町戦闘UI・セーブ形式を変更しない。

export const MINING_BATTLE_TRIGGER_DENOMINATOR = 30;

export const MINING_BATTLE_ENEMIES = Object.freeze([
  Object.freeze({ id: 'mole', name: 'モグラ', image: 'assets/minigames/mining-battle/mole.png' }),
  Object.freeze({ id: 'bat', name: 'コウモリ', image: 'assets/minigames/mining-battle/bat.png' }),
]);

// 携帯確認用HTMLとmain既存アセットの内容一致を確認済みの再利用先。
export const MINING_BATTLE_REUSED_ASSETS = Object.freeze({
  battleFrame: 'assets/minigames/retro-battle/index.html',
  landscapeBackground: 'assets/images/mining.webp',
  portraitBackground: 'assets/images/mining-portrait.webp',
  pickaxe: 'assets/images/equipment/basic-pickaxe.png',
  attackSfx: 'assets/audio/sfx-dig.ogg',
});

// 採掘で岩を壊す時と同じツルハシ動作。
export const MINING_PICKAXE_KEYFRAMES = Object.freeze([
  Object.freeze({ offset: 0, opacity: 0, transform: 'translate(32%,-22%) rotate(42deg) scale(.92)' }),
  Object.freeze({ offset: 0.16, opacity: 1 }),
  Object.freeze({ offset: 0.56, opacity: 1, transform: 'translate(-34%,2%) rotate(-31deg) scale(1)' }),
  Object.freeze({ offset: 1, opacity: 0, transform: 'translate(-38%,8%) rotate(-35deg) scale(.98)' }),
]);

export const MINING_PICKAXE_ANIMATION = Object.freeze({
  duration: 320,
  easing: 'ease-out',
  fill: 'both',
});

export function shouldTriggerMiningBattle(random = Math.random) {
  const value = Number(random());
  if (!Number.isFinite(value) || value < 0 || value >= 1) {
    throw new RangeError('採掘戦闘の乱数は0以上1未満である必要があります');
  }
  return Math.floor(value * MINING_BATTLE_TRIGGER_DENOMINATOR) === 0;
}

export function createMiningBattleEnemyRotation(startIndex = 0) {
  let index = Number.isInteger(startIndex) ? startIndex : 0;
  index = ((index % MINING_BATTLE_ENEMIES.length) + MINING_BATTLE_ENEMIES.length) % MINING_BATTLE_ENEMIES.length;

  return Object.freeze({
    peek() {
      return MINING_BATTLE_ENEMIES[index];
    },
    next() {
      const enemy = MINING_BATTLE_ENEMIES[index];
      index = (index + 1) % MINING_BATTLE_ENEMIES.length;
      return enemy;
    },
    index() {
      return index;
    },
  });
}

export function buildMiningBattleStartOptions({
  enemy,
  enemyImage,
  playerName,
  inventory,
  baseOptions = {},
} = {}) {
  if (!enemy || !MINING_BATTLE_ENEMIES.some((row) => row.id === enemy.id)) {
    throw new TypeError('採掘戦闘の敵指定が不正です');
  }
  if (typeof enemyImage !== 'string' || !enemyImage) {
    throw new TypeError('承認済みの敵画像が必要です');
  }

  return {
    ...baseOptions,
    playerName,
    inventory,
    enemyName: enemy.name,
    enemyImage,
  };
}
