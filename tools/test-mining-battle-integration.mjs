import assert from 'node:assert/strict';
import fs from 'node:fs';

const app = fs.readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
const battle = fs.readFileSync(new URL('../assets/minigames/retro-battle/index.html', import.meta.url), 'utf8');

assert.match(app, /function maybeStartMiningBattleEvent\(\)/);
assert.match(app, /if \(maybeStartMiningBattleEvent\(\)\) return;/);
assert.match(app, /context: 'mining'/);
assert.match(app, /baseOptions: \{ attackMode: 'mining' \}/);
assert.match(app, /if \(session\.context === 'mining'\)/);
assert.match(app, /setScreen\('mining', \{\}, false\)/);
assert.match(app, /Math\.random\(\) >= RETRO_BATTLE_EVENT_CHANCE/);
assert.match(app, /addFinance\('御徒町・戦闘ミニゲーム勝利'/);

assert.match(battle, /body\.mining-battle-mode \.bg-photo/);
assert.match(battle, /\.\.\/\.\.\/images\/mining\.webp/);
assert.match(battle, /\.\.\/\.\.\/images\/mining-portrait\.webp/);
assert.match(battle, /\.\.\/mining-battle\/pickaxe\.png/);
assert.match(battle, /\.\.\/\.\.\/audio\/sfx-dig\.ogg/);
assert.match(battle, /startOptions\.attackMode === \"mining\"/);
assert.match(battle, /duration:320,easing:\"ease-out\",fill:\"both\"/);
assert.match(battle, /playSfx\(\"attack\"\)/);
assert.match(battle, /startOptions\.attackMode !== \"mining\"/);

console.log('mining battle integration tests: ok');

assert.match(app, /miningBattleRewardForResult\(result\)/);
assert.match(app, /state\.inventory\.rough\[reward\.gemId\].*\+ reward\.quantity/);
assert.match(app, /ダイヤモンド原石を手に入れました/);
assert.match(app, /new URL\(session\.enemy\.image, document\.baseURI\)\.href/);
assert.match(app, /installMiningBattleFrameAssets\(frame\.contentDocument\)/);
