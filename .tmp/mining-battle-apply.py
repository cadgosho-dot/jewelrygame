from pathlib import Path


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f'{label}: expected 1 occurrence, found {count}')
    return text.replace(old, new, 1)

# 1) 独立モジュール: 正式アセットの配置先だけを定義。画像ファイル自体は別途正式画像を登録する。
module_path = Path('js/events/mining-battle-event.js')
module = module_path.read_text(encoding='utf-8')
module = replace_once(
    module,
    "  Object.freeze({ id: 'mole', name: 'モグラ' }),\n  Object.freeze({ id: 'bat', name: 'コウモリ' }),",
    "  Object.freeze({ id: 'mole', name: 'モグラ', image: 'assets/minigames/mining-battle/mole.png' }),\n  Object.freeze({ id: 'bat', name: 'コウモリ', image: 'assets/minigames/mining-battle/bat.png' }),",
    'enemy asset paths',
)
module_path.write_text(module, encoding='utf-8')

# 2) app.js: 既存レトロ戦闘を共用し、採掘コンテキストだけを最小接続。
app_path = Path('js/app.js')
app = app_path.read_text(encoding='utf-8')

app = replace_once(
    app,
    "import { bindRetroBattleFrameLoader } from './events/retro-battle-frame-loader.js?v=0.10.949';\n",
    "import { bindRetroBattleFrameLoader } from './events/retro-battle-frame-loader.js?v=0.10.949';\nimport { shouldTriggerMiningBattle, createMiningBattleEnemyRotation, buildMiningBattleStartOptions } from './events/mining-battle-event.js?v=0.10.949';\n",
    'mining battle import',
)

app = replace_once(
    app,
    "let retroBattleSession = null;\nlet okachimachiQuizQuestionsPromise = null;",
    "let retroBattleSession = null;\nconst miningBattleEnemyRotation = createMiningBattleEnemyRotation();\nlet okachimachiQuizQuestionsPromise = null;",
    'mining enemy rotation',
)

anchor = """function maybeStartRetroBattleEvent() {
  if (!state || illnessEventSuppressionActive()) return false;
  if (Math.random() >= RETRO_BATTLE_EVENT_CHANCE) return false;
  retroBattleSession = {
    settled: false,
    cleanup: null,
  };
  setScreen('retroBattleEvent', {}, false);
  return true;
}
"""
replacement = anchor + """
function maybeStartMiningBattleEvent() {
  if (!state || illnessEventSuppressionActive()) return false;
  if (!shouldTriggerMiningBattle()) return false;
  const enemy = miningBattleEnemyRotation.next();
  retroBattleSession = {
    settled: false,
    cleanup: null,
    context: 'mining',
    enemy,
  };
  setScreen('retroBattleEvent', {}, false);
  return true;
}

function retroBattleStartOptions(session = retroBattleSession) {
  const playerName = retroBattlePlayerName();
  const inventory = retroBattleInventorySnapshot();
  if (session?.context !== 'mining') return { playerName, inventory };
  return buildMiningBattleStartOptions({
    enemy: session.enemy,
    enemyImage: session.enemy?.image,
    playerName,
    inventory,
    baseOptions: { attackMode: 'mining' },
  });
}
"""
app = replace_once(app, anchor, replacement, 'mining battle session functions')

old_finish = """function finishRetroBattleEvent(detail, session = retroBattleSession) {
  if (!session || session !== retroBattleSession || session.settled) return false;
  const result = String(detail?.result || '');
  if (!['victory', 'defeat', 'escaped'].includes(result)) return false;
  session.settled = true;
  if (typeof session.cleanup === 'function') session.cleanup();
  syncRetroBattleInventoryFromResult(detail?.inventory);

  const baseMoney = Math.max(0, Math.floor(Number(state?.game?.money) || 0));
  const amount = retroBattleMoneyChange(baseMoney);
  if (result === 'victory') {
    state.game.money = baseMoney + amount;
    if (amount > 0) addFinance('御徒町・戦闘ミニゲーム勝利', amount, 0);
    if (amount !== 0) startMoneyFeedback(amount, 1600);
  } else if (result === 'defeat') {
    state.game.money = Math.max(0, baseMoney - amount);
    if (amount > 0) addFinance('御徒町・戦闘ミニゲーム敗北', 0, amount);
    if (amount !== 0) startMoneyFeedback(-amount, 1600);
    state.wellbeing.hunger = 0;
    state.game.minutes = DAY_END_MINUTES;
  }

  saveGame();
  retroBattleSession = null;
  if (result === 'defeat') goMain();
  else setScreen('okachimachi', {}, false);
  return true;
}
"""
new_finish = """function finishRetroBattleEvent(detail, session = retroBattleSession) {
  if (!session || session !== retroBattleSession || session.settled) return false;
  const result = String(detail?.result || '');
  if (!['victory', 'defeat', 'escaped'].includes(result)) return false;
  session.settled = true;
  if (typeof session.cleanup === 'function') session.cleanup();
  syncRetroBattleInventoryFromResult(detail?.inventory);

  if (session.context === 'mining') {
    saveGame();
    retroBattleSession = null;
    setScreen('mining', {}, false);
    return true;
  }

  const baseMoney = Math.max(0, Math.floor(Number(state?.game?.money) || 0));
  const amount = retroBattleMoneyChange(baseMoney);
  if (result === 'victory') {
    state.game.money = baseMoney + amount;
    if (amount > 0) addFinance('御徒町・戦闘ミニゲーム勝利', amount, 0);
    if (amount !== 0) startMoneyFeedback(amount, 1600);
  } else if (result === 'defeat') {
    state.game.money = Math.max(0, baseMoney - amount);
    if (amount > 0) addFinance('御徒町・戦闘ミニゲーム敗北', 0, amount);
    if (amount !== 0) startMoneyFeedback(-amount, 1600);
    state.wellbeing.hunger = 0;
    state.game.minutes = DAY_END_MINUTES;
  }

  saveGame();
  retroBattleSession = null;
  if (result === 'defeat') goMain();
  else setScreen('okachimachi', {}, false);
  return true;
}
"""
app = replace_once(app, old_finish, new_finish, 'mining battle finish route')

old_fail = """function failRetroBattleEventLoad(error) {
  console.error('[RetroBattle] load failed', error);
  const session = retroBattleSession;
  if (typeof session?.cleanup === 'function') session.cleanup();
  retroBattleSession = null;
  showToast('戦闘ミニゲームを読み込めませんでした。通常の御徒町へ戻ります。', 'error');
  setScreen('okachimachi', {}, false);
}
"""
new_fail = """function failRetroBattleEventLoad(error) {
  console.error('[RetroBattle] load failed', error);
  const session = retroBattleSession;
  if (typeof session?.cleanup === 'function') session.cleanup();
  const miningBattle = session?.context === 'mining';
  retroBattleSession = null;
  if (miningBattle) {
    showToast('採掘戦闘ミニゲームを読み込めませんでした。採掘へ戻ります。', 'error');
    setScreen('mining', {}, false);
    return;
  }
  showToast('戦闘ミニゲームを読み込めませんでした。通常の御徒町へ戻ります。', 'error');
  setScreen('okachimachi', {}, false);
}
"""
app = replace_once(app, old_fail, new_fail, 'mining battle load failure route')

app = replace_once(
    app,
    """    startOptions: () => ({
      playerName: retroBattlePlayerName(),
      inventory: retroBattleInventorySnapshot(),
    }),
""",
    """    startOptions: () => retroBattleStartOptions(session),
""",
    'retro battle start options',
)

old_render = """function renderRetroBattleEvent() {
  if (!retroBattleSession || retroBattleSession.settled) {
    queueMicrotask(() => setScreen('okachimachi', {}, false));
    return renderOkachimachi();
  }
  queueMicrotask(bindRetroBattleFrame);
  return `<main class=\"retro-battle-event-host\" style=\"position:fixed;inset:0;z-index:1200;overflow:hidden;background:#000;\">
    <iframe data-retro-battle-frame src=\"${RETRO_BATTLE_DOCUMENT_URL}?v=${VERSION}\" title=\"御徒町 戦闘ミニゲーム\" allow=\"autoplay\" style=\"display:block;width:100%;height:100%;border:0;background:#000;visibility:hidden;\"></iframe>
  </main>`;
}
"""
new_render = """function renderRetroBattleEvent() {
  const miningBattle = retroBattleSession?.context === 'mining';
  if (!retroBattleSession || retroBattleSession.settled) {
    queueMicrotask(() => setScreen(miningBattle ? 'mining' : 'okachimachi', {}, false));
    return miningBattle ? renderMining() : renderOkachimachi();
  }
  queueMicrotask(bindRetroBattleFrame);
  return `<main class=\"retro-battle-event-host\" style=\"position:fixed;inset:0;z-index:1200;overflow:hidden;background:#000;\">
    <iframe data-retro-battle-frame src=\"${RETRO_BATTLE_DOCUMENT_URL}?v=${VERSION}\" title=\"${miningBattle ? '採掘 戦闘ミニゲーム' : '御徒町 戦闘ミニゲーム'}\" allow=\"autoplay\" style=\"display:block;width:100%;height:100%;border:0;background:#000;visibility:hidden;\"></iframe>
  </main>`;
}
"""
app = replace_once(app, old_render, new_render, 'retro battle mining render route')

app = replace_once(
    app,
    """  if (resumeKappaJadeEvent()) return;
  if (resumeMiningPazupanEvent()) return;
  if (maybeStartMiningPazupanEvent()) return;
  setScreen('mining', {});
""",
    """  if (resumeKappaJadeEvent()) return;
  if (resumeMiningPazupanEvent()) return;
  if (maybeStartMiningPazupanEvent()) return;
  if (maybeStartMiningBattleEvent()) return;
  setScreen('mining', {});
""",
    'mining entry trigger',
)

app_path.write_text(app, encoding='utf-8')

# 3) 既存レトロ戦闘HTML: 通常戦闘は変更せず、attackMode=mining の時だけ承認済み採掘演出へ切替。
retro_path = Path('assets/minigames/retro-battle/index.html')
retro = retro_path.read_text(encoding='utf-8')

runtime_css = r'''<style id="mining-battle-runtime-style">
body.mining-battle-mode .bg-photo{
  background-image:linear-gradient(rgba(10,18,32,.20),rgba(10,18,32,.12)),url("../../images/mining.webp")!important;
}
.mining-pickaxe-fx{
  position:absolute;width:clamp(150px,30vw,310px);height:clamp(150px,30vw,310px);
  background-image:url("../../images/equipment/basic-pickaxe.png");background-repeat:no-repeat;
  background-position:center;background-size:contain;transform-origin:50% 88%;
  pointer-events:none;z-index:14;opacity:0;
}
@media (orientation:portrait){
  body.mining-battle-mode .bg-photo{
    background-image:linear-gradient(rgba(10,18,32,.20),rgba(10,18,32,.12)),url("../../images/mining-portrait.webp")!important;
  }
  .mining-pickaxe-fx{width:clamp(145px,46vw,270px);height:clamp(145px,46vw,270px)}
}
</style>
'''
if 'id="mining-battle-runtime-style"' not in retro:
    retro = replace_once(retro, '</head>', runtime_css + '</head>', 'mining battle runtime css')

retro = replace_once(
    retro,
    """  function wait(ms){ return new Promise(r=>setTimeout(r,ms)); }

  // ===== 激しめ戦闘BGM / 効果音 =====
""",
    """  function wait(ms){ return new Promise(r=>setTimeout(r,ms)); }

  let miningDigBuffer = null;
  function applyBattleMode(){
    document.body.classList.toggle('mining-battle-mode', startOptions.attackMode === 'mining');
  }
  async function prepareMiningDig(){
    if(miningDigBuffer || !audioCtx) return;
    try{
      const response = await fetch('../../audio/sfx-dig.ogg');
      if(!response.ok) return;
      const bytes = await response.arrayBuffer();
      miningDigBuffer = await audioCtx.decodeAudioData(bytes);
    }catch(e){}
  }
  function playMiningDig(){
    if(muted || !audioCtx || !miningDigBuffer || !sfxGain) return;
    const sound = audioCtx.createBufferSource();
    sound.buffer = miningDigBuffer;
    sound.connect(sfxGain);
    sound.start();
  }

  // ===== 激しめ戦闘BGM / 効果音 =====
""",
    'mining battle audio helpers',
)

retro = replace_once(
    retro,
    """    if(kind === \"attack\"){
      const slash = addFxEl(\"slash-fx\",x,y,360);
      slash.style.transform = \"translate(-50%,-50%) rotate(-30deg)\";
      burstParticles(x,y,26,[\"#fff\",\"#ffe36a\",\"#ff7f37\"]);
    }
""",
    """    if(kind === \"attack\"){
      if(startOptions.attackMode !== \"mining\"){
        const slash = addFxEl(\"slash-fx\",x,y,360);
        slash.style.transform = \"translate(-50%,-50%) rotate(-30deg)\";
      }
      burstParticles(x,y,26,[\"#fff\",\"#ffe36a\",\"#ff7f37\"]);
    }
""",
    'disable slash only for mining attack',
)

old_attack = """  async function playerAttack(kind){
    if(locked) return;
    await ensureAudio();
    locked = true; setButtons(true); state.turn++;

    if(kind === \"attack\"){
      say(`${config.playerName}の こうげき！`);
      playSfx(\"attack\");
      await wait(250);
      const {x,y}=enemyCenter();
      const slash = addFxEl(\"slash-fx\",x,y,360);
      slash.style.transform = \"translate(-50%,-50%) rotate(-30deg)\";
      burstParticles(x,y,18,[\"#fff\",\"#ffe36a\",\"#ff8a38\"]);
      await wait(120);
      const dmg = rnd(config.attackMin, config.attackMax);
      state.enemyHp -= dmg;
      impactEnemy(\"attack\");
      damagePop(dmg,\"-\");
      game.classList.add(\"flash\");
      await wait(300);
      game.classList.remove(\"flash\");
      say(`${currentEnemy.name}に ${dmg}の ダメージ！`);
    }
"""
new_attack = """  async function playerAttack(kind){
    if(locked) return;
    await ensureAudio();
    locked = true; setButtons(true);
    if(kind === \"attack\" && startOptions.attackMode === \"mining\") await prepareMiningDig();
    state.turn++;

    if(kind === \"attack\"){
      if(startOptions.attackMode === \"mining\"){
        say(`${config.playerName}の こうげき！`);
        await wait(250);
        const {x,y}=enemyCenter();
        const pickaxe = addFxEl(\"mining-pickaxe-fx\",x,y,420);
        pickaxe.style.left = `${x - pickaxe.offsetWidth * .5}px`;
        pickaxe.style.top = `${y - pickaxe.offsetHeight * .20}px`;
        pickaxe.animate([
          {offset:0,opacity:0,transform:\"translate(32%,-22%) rotate(42deg) scale(.92)\"},
          {offset:.16,opacity:1},
          {offset:.56,opacity:1,transform:\"translate(-34%,2%) rotate(-31deg) scale(1)\"},
          {offset:1,opacity:0,transform:\"translate(-38%,8%) rotate(-35deg) scale(.98)\"}
        ],{duration:320,easing:\"ease-out\",fill:\"both\"});
        await wait(180);
        playMiningDig();
        burstParticles(x,y,18,[\"#fff\",\"#ffe36a\",\"#ff8a38\"]);
        const dmg = rnd(config.attackMin, config.attackMax);
        state.enemyHp -= dmg;
        impactEnemy(\"attack\");
        damagePop(dmg,\"-\");
        game.classList.add(\"flash\");
        await wait(240);
        game.classList.remove(\"flash\");
        say(`${currentEnemy.name}に ${dmg}の ダメージ！`);
      }else{
        say(`${config.playerName}の こうげき！`);
        playSfx(\"attack\");
        await wait(250);
        const {x,y}=enemyCenter();
        const slash = addFxEl(\"slash-fx\",x,y,360);
        slash.style.transform = \"translate(-50%,-50%) rotate(-30deg)\";
        burstParticles(x,y,18,[\"#fff\",\"#ffe36a\",\"#ff8a38\"]);
        await wait(120);
        const dmg = rnd(config.attackMin, config.attackMax);
        state.enemyHp -= dmg;
        impactEnemy(\"attack\");
        damagePop(dmg,\"-\");
        game.classList.add(\"flash\");
        await wait(300);
        game.classList.remove(\"flash\");
        say(`${currentEnemy.name}に ${dmg}の ダメージ！`);
      }
    }
"""
retro = replace_once(retro, old_attack, new_attack, 'conditional mining pickaxe attack')

retro = replace_once(
    retro,
    """    start(options = {}){ startOptions = {...options}; config = {...DEFAULTS, ...options}; resetState(); },
""",
    """    start(options = {}){ startOptions = {...options}; config = {...DEFAULTS, ...options}; applyBattleMode(); resetState(); },
""",
    'apply mining battle mode at start',
)

retro_path.write_text(retro, encoding='utf-8')

# 4) 構造回帰テスト。巨大HTMLを実行せず、通常戦闘経路を残したまま採掘分岐が存在することを固定。
integration = r'''import assert from 'node:assert/strict';
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
assert.match(battle, /\.\.\/\.\.\/images\/equipment\/basic-pickaxe\.png/);
assert.match(battle, /\.\.\/\.\.\/audio\/sfx-dig\.ogg/);
assert.match(battle, /startOptions\.attackMode === \"mining\"/);
assert.match(battle, /duration:320,easing:\"ease-out\",fill:\"both\"/);
assert.match(battle, /playSfx\(\"attack\"\)/);
assert.match(battle, /startOptions\.attackMode !== \"mining\"/);

console.log('mining battle integration tests: ok');
'''
Path('tools/test-mining-battle-integration.mjs').write_text(integration, encoding='utf-8')

print('mining battle patch applied')
