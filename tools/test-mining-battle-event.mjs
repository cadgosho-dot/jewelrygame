import assert from 'node:assert/strict';
import {
  MINING_BATTLE_TRIGGER_DENOMINATOR,
  MINING_BATTLE_ENEMIES,
  MINING_BATTLE_REUSED_ASSETS,
  MINING_PICKAXE_KEYFRAMES,
  MINING_PICKAXE_ANIMATION,
  shouldTriggerMiningBattle,
  createMiningBattleEnemyRotation,
  buildMiningBattleStartOptions,
} from '../js/events/mining-battle-event.js';

assert.equal(MINING_BATTLE_TRIGGER_DENOMINATOR, 30);
assert.deepEqual(MINING_BATTLE_ENEMIES.map((enemy) => enemy.name), ['モグラ', 'コウモリ']);
assert.equal(shouldTriggerMiningBattle(() => 0), true);
assert.equal(shouldTriggerMiningBattle(() => (1 / 30) - Number.EPSILON), true);
assert.equal(shouldTriggerMiningBattle(() => 1 / 30), false);
assert.equal(shouldTriggerMiningBattle(() => 0.999999), false);

const rotation = createMiningBattleEnemyRotation();
assert.equal(rotation.next().id, 'mole');
assert.equal(rotation.next().id, 'bat');
assert.equal(rotation.next().id, 'mole');

assert.equal(MINING_BATTLE_REUSED_ASSETS.battleFrame, 'assets/minigames/retro-battle/index.html');
assert.equal(MINING_BATTLE_REUSED_ASSETS.landscapeBackground, 'assets/images/mining.webp');
assert.equal(MINING_BATTLE_REUSED_ASSETS.portraitBackground, 'assets/images/mining-portrait.webp');
assert.equal(MINING_BATTLE_REUSED_ASSETS.pickaxe, 'assets/minigames/mining-battle/pickaxe.png');
assert.equal(MINING_BATTLE_REUSED_ASSETS.attackSfx, 'assets/audio/sfx-dig.ogg');
assert.equal(MINING_PICKAXE_ANIMATION.duration, 320);
assert.equal(MINING_PICKAXE_ANIMATION.easing, 'ease-out');
assert.deepEqual(MINING_PICKAXE_KEYFRAMES.map((frame) => frame.offset), [0, 0.16, 0.56, 1]);

const options = buildMiningBattleStartOptions({
  enemy: MINING_BATTLE_ENEMIES[0],
  enemyImage: 'assets/minigames/mining-battle/mole.png',
  playerName: 'テスト',
  inventory: { pazupan: 1 },
});
assert.equal(options.enemyName, 'モグラ');
assert.equal(options.enemyImage, 'assets/minigames/mining-battle/mole.png');
assert.equal(options.playerName, 'テスト');
assert.deepEqual(options.inventory, { pazupan: 1 });

assert.throws(
  () => buildMiningBattleStartOptions({ enemy: MINING_BATTLE_ENEMIES[0], enemyImage: '' }),
  /承認済みの敵画像が必要です/,
);

console.log('mining battle event tests: ok');
