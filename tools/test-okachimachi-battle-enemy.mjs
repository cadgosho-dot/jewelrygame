import assert from 'node:assert/strict';
import {
  OKACHIMACHI_BATTLE_ENEMY_CHANCE,
  buildOkachimachiBattleStartOptions,
} from '../js/events/okachimachi-battle-enemy.js';

const imageUrl = 'https://game.example/assets/minigames/retro-battle/enemy-mincho.png';
const base = { playerName: '川原', inventory: { pazupan: 1 } };

assert.equal(OKACHIMACHI_BATTLE_ENEMY_CHANCE, 1 / 5);
assert.deepEqual(
  buildOkachimachiBattleStartOptions(base, { random: () => 0.19, imageUrl }),
  { ...base, enemyName: '明朝体', enemyImage: imageUrl },
  '明朝体を選んだ場合は名前と透過PNGだけを上書きする',
);
assert.deepEqual(
  buildOkachimachiBattleStartOptions(base, { random: () => 0.2, imageUrl }),
  base,
  '残りの抽選では既存の敵選出へ任せる',
);
let randomCalled = false;
assert.deepEqual(
  buildOkachimachiBattleStartOptions(
    { ...base, attackMode: 'mining' },
    { random: () => { randomCalled = true; return 0; }, imageUrl },
  ),
  { ...base, attackMode: 'mining' },
  '採掘戦闘では敵選出を変えない',
);
assert.equal(randomCalled, false);
assert.deepEqual(
  buildOkachimachiBattleStartOptions(
    { ...base, enemyName: '既存指定', enemyImage: 'existing.png' },
    { random: () => 0, imageUrl },
  ),
  { ...base, enemyName: '既存指定', enemyImage: 'existing.png' },
  '明示済みの敵指定を上書きしない',
);
console.log('OKACHIMACHI BATTLE ENEMY: PASS');
