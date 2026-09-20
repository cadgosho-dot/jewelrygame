// 採掘場所選択前に発生する採掘戦闘イベントの独立ロジック。
// 採掘戦闘の独立ロジック。既存の御徒町戦闘UI・セーブ形式を変更せず、承認済み透明PNGだけを参照する。

export const MINING_BATTLE_TRIGGER_DENOMINATOR = 30;
export const MINING_BATTLE_REWARD_GEM_ID = 'diamond';
export const MINING_BATTLE_REWARD_QUANTITY = 1;
const MINING_BATTLE_VICTORY_REWARD = Object.freeze({
  gemId: MINING_BATTLE_REWARD_GEM_ID,
  quantity: MINING_BATTLE_REWARD_QUANTITY,
});

export const MINING_BATTLE_ENEMIES = Object.freeze([
  Object.freeze({ id: 'mole', name: 'モグラ', image: 'assets/minigames/mining-battle/mole.png' }),
  Object.freeze({ id: 'bat', name: 'コウモリ', image: 'assets/minigames/mining-battle/bat.png' }),
]);

// 携帯確認用HTMLとmain既存アセットの内容一致を確認済みの再利用先。
export const MINING_BATTLE_REUSED_ASSETS = Object.freeze({
  battleFrame: 'assets/minigames/retro-battle/index.html',
  landscapeBackground: 'assets/images/mining.webp',
  portraitBackground: 'assets/images/mining-portrait.webp',
  pickaxe: 'assets/minigames/mining-battle/pickaxe.png',
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


export function miningBattleRewardForResult(result) {
  return String(result || '') === 'victory' ? MINING_BATTLE_VICTORY_REWARD : null;
}

export function installMiningBattleFrameAssets(doc) {
  if (!doc || !doc.head || typeof doc.createElement !== 'function') return false;
  if (doc.getElementById?.('jxj-mining-battle-approved-assets')) return true;
  const style = doc.createElement('style');
  style.id = 'jxj-mining-battle-approved-assets';
  style.textContent = '.mining-pickaxe-fx{background-image:url("../mining-battle/pickaxe.png")!important;}';
  doc.head.appendChild(style);
  return true;
}


export function createMiningBattleRuntime(resolveAssetUrl = (value) => value) {
  const rotation = createMiningBattleEnemyRotation();
  const isSession = (session) => session?.context === 'mining';

  return Object.freeze({
    isSession,
    createSession(random = Math.random) {
      if (!shouldTriggerMiningBattle(random)) return null;
      return { settled: false, cleanup: null, context: 'mining', enemy: rotation.next() };
    },
    startOptions(session, base = {}) {
      if (!isSession(session)) return { ...base };
      return buildMiningBattleStartOptions({
        enemy: session.enemy,
        enemyImage: resolveAssetUrl(session.enemy.image),
        playerName: base.playerName,
        inventory: base.inventory,
        baseOptions: { attackMode: 'mining' },
      });
    },
    prepareFrame(frame, session) {
      if (!isSession(session)) return false;
      const apply = () => {
        try { installMiningBattleFrameAssets(frame.contentDocument); }
        catch (error) { console.warn('[MiningBattle] approved asset style could not be installed', error); }
      };
      frame.addEventListener('load', apply, { once: true });
      try { if (frame.contentDocument?.readyState === 'complete') apply(); } catch (_) {}
      return true;
    },
    applyReward(result, gameState, gems = {}) {
      const reward = miningBattleRewardForResult(result);
      if (!reward || !gems?.[reward.gemId] || !gameState?.inventory) return null;
      const rough = gameState.inventory.rough && typeof gameState.inventory.rough === 'object'
        ? gameState.inventory.rough
        : (gameState.inventory.rough = {});
      rough[reward.gemId] = Math.max(0, Math.floor(Number(rough[reward.gemId]) || 0)) + reward.quantity;
      return reward;
    },
  });
}
