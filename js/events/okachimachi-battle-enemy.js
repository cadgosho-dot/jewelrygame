export const OKACHIMACHI_BATTLE_ENEMY_CHANCE = 1 / 5;
export const OKACHIMACHI_BATTLE_ENEMY_NAME = '明朝体';
export const OKACHIMACHI_BATTLE_ENEMY_IMAGE_PATH = 'assets/minigames/retro-battle/enemy-mincho.png';

export function buildOkachimachiBattleStartOptions(baseOptions = {}, {
  random = Math.random,
  imageUrl,
} = {}) {
  if (!baseOptions || typeof baseOptions !== 'object' || Array.isArray(baseOptions)) {
    throw new TypeError('御徒町戦闘の開始オプションが不正です');
  }

  const unchangedOptions = { ...baseOptions };
  if (
    baseOptions.attackMode === 'mining'
    || Object.prototype.hasOwnProperty.call(baseOptions, 'enemyName')
    || Object.prototype.hasOwnProperty.call(baseOptions, 'enemyImage')
  ) {
    return unchangedOptions;
  }

  const value = Number(random());
  if (!Number.isFinite(value) || value < 0 || value >= 1) {
    throw new RangeError('御徒町戦闘の乱数は0以上1未満である必要があります');
  }
  if (value >= OKACHIMACHI_BATTLE_ENEMY_CHANCE) return unchangedOptions;
  if (typeof imageUrl !== 'string' || !imageUrl) {
    throw new TypeError('明朝体の敵画像URLが必要です');
  }

  return {
    ...baseOptions,
    enemyName: OKACHIMACHI_BATTLE_ENEMY_NAME,
    enemyImage: imageUrl,
  };
}
