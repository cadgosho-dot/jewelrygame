import assert from 'node:assert/strict';
import fs from 'node:fs';

const app = fs.readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
const mining = fs.readFileSync(new URL('../js/events/mining-battle-event.js', import.meta.url), 'utf8');
const battle = fs.readFileSync(new URL('../assets/minigames/retro-battle/index.html', import.meta.url), 'utf8');

assert.match(app, /function maybeStartMiningBattleEvent\(\)/);
assert.match(app, /if \(maybeStartMiningBattleEvent\(\)\) return;/);
assert.match(app, /createMiningBattleRuntime/);
assert.match(app, /miningBattleRuntime\.createSession\(\)/);
assert.match(app, /miningBattleRuntime\.applyReward\(result, state, GEMS\)/);
assert.match(app, /setScreen\('mining', \{\}, false\)/);
assert.match(app, /Math\.random\(\) >= RETRO_BATTLE_EVENT_CHANCE/);
assert.match(app, /addFinance\('御徒町・戦闘ミニゲーム勝利'/);
assert.match(app, /ダイヤモンド原石を手に入れました/);

assert.match(mining, /context: 'mining'/);
assert.match(mining, /baseOptions: \{ attackMode: 'mining' \}/);
assert.match(mining, /resolveAssetUrl\(session\.enemy\.image\)/);
assert.match(mining, /installMiningBattleFrameAssets\(frame\.contentDocument\)/);
assert.match(mining, /rough\[reward\.gemId\].*\+ reward\.quantity/);

assert.match(battle, /body\.mining-battle-mode \.bg-photo/);
assert.match(battle, /\.\.\/\.\.\/images\/mining\.webp/);
assert.match(battle, /\.\.\/\.\.\/images\/mining-portrait\.webp/);
assert.match(battle, /\.\.\/mining-battle\/pickaxe\.png/);
assert.match(battle, /\.\.\/\.\.\/audio\/sfx-dig\.ogg/);
assert.match(battle, /startOptions\.attackMode === "mining"/);
assert.match(battle, /duration:320,easing:"ease-out",fill:"both"/);
assert.match(battle, /playSfx\("attack"\)/);
assert.match(battle, /startOptions\.attackMode !== "mining"/);

console.log('mining battle integration tests: ok');
