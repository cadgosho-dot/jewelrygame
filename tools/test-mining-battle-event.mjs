import assert from 'node:assert/strict';
import {
  MINING_BATTLE_TRIGGER_DENOMINATOR,
  MINING_BATTLE_ENEMIES,
  MINING_BATTLE_REUSED_ASSETS,
  MINING_PICKAXE_KEYFRAMES,
  MINING_PICKAXE_ANIMATION,
  MINING_BATTLE_REWARD_GEM_ID,
  MINING_BATTLE_REWARD_QUANTITY,
  miningBattleRewardForResult,
  installMiningBattleFrameAssets,
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

assert.equal(MINING_BATTLE_REWARD_GEM_ID, 'diamond');
assert.equal(MINING_BATTLE_REWARD_QUANTITY, 1);
assert.deepEqual(miningBattleRewardForResult('victory'), { gemId: 'diamond', quantity: 1 });
assert.equal(miningBattleRewardForResult('defeat'), null);
assert.equal(miningBattleRewardForResult('escaped'), null);

{
  const appended = [];
  const ids = new Map();
  const doc = {
    head: { appendChild(node) { appended.push(node); ids.set(node.id, node); } },
    createElement() { return { id: '', textContent: '' }; },
    getElementById(id) { return ids.get(id) || null; },
  };
  assert.equal(installMiningBattleFrameAssets(doc), true);
  assert.equal(appended.length, 1);
  assert.match(appended[0].textContent, /\.\.\/mining-battle\/pickaxe\.png/);
  assert.equal(installMiningBattleFrameAssets(doc), true);
  assert.equal(appended.length, 1);
}
