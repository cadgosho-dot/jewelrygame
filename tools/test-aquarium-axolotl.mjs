import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { AQUARIUM_CONFIG, AQUARIUM_INITIAL_STATE, createInitialAquariumState, normalizeAquariumState, SAVE_SCHEMA_VERSION, VERSION } from '../js/game-data.js';
import '../js/aquarium/axolotl.js';
const app = fs.readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
function extractFunction(name) {
  const re = new RegExp(`(?:^|\\n)function\\s+${name}\\s*\\([^\\n]*\\)\\s*\\{`, 'm');
  const match = re.exec(app);
  assert.ok(match, `${name} definition not found`);
  const start = match.index + (match[0].startsWith('\n') ? 1 : 0);
  const brace = match.index + match[0].lastIndexOf('{');
  let depth = 0;
  let quote = null;
  let escape = false;
  let lineComment = false;
  let blockComment = false;
  for (let i = brace; i < app.length; i += 1) {
    const c = app[i];
    const next = app[i + 1] || '';
    if (lineComment) {
      if (c === '\n') lineComment = false;
      continue;
    }
    if (blockComment) {
      if (c === '*' && next === '/') { blockComment = false; i += 1; }
      continue;
    }
    if (quote) {
      if (escape) escape = false;
      else if (c === '\\') escape = true;
      else if (c === quote) quote = null;
      continue;
    }
    if (c === '/' && next === '/') { lineComment = true; i += 1; continue; }
    if (c === '/' && next === '*') { blockComment = true; i += 1; continue; }
    if (c === "'" || c === '"' || c === '`') { quote = c; continue; }
    if (c === '{') depth += 1;
    else if (c === '}') {
      depth -= 1;
      if (depth === 0) return app.slice(start, i + 1);
    }
  }
  throw new Error(`${name} end not found`);
}


const catalogSource = app.slice(app.indexOf('const TROPICAL_FISH_SHOP_PRODUCTS ='), app.indexOf('const GLAB_VISIT_VIDEO_EVENT_CHANCE'));
const mortalitySource = app.slice(app.indexOf('const AQUARIUM_FISH_MORTALITY ='), app.indexOf('function aquariumFishMortalityProfile'));
const initial = createInitialAquariumState({unlocked:true});
initial.fish.neon_tetra = {owned:2,inTank:2,juveniles:0,individuals:[]};
const legacy = structuredClone(initial);
delete legacy.fish.axolotl;
const migrated = normalizeAquariumState(legacy);
assert.equal(migrated.fish.axolotl.owned,0);
assert.equal(migrated.fish.neon_tetra.inTank,2);
assert.equal(migrated.schemaVersion,2);
assert.equal(migrated.dataVersion,5);
assert.equal(SAVE_SCHEMA_VERSION,1);
const calls={saves:[],finance:[],errors:[]};
const context={
 AQUARIUM_CONFIG, createInitialAquariumState, normalizeAquariumState, VERSION,
 state:{game:{money:90000,day:420},aquarium:migrated},
 screenData:{tropicalCategory:'fish',tropicalModal:{category:'fish',id:'axolotl',qty:1}},
 addFinance:(...args)=>calls.finance.push(args), addNotification:()=>{},
 saveGame:()=>calls.saves.push(JSON.stringify(context.state)),
 startMoneyFeedback:()=>{},playSfx:()=>{},vibrate:()=>{},render:()=>{},
 showToast:(...args)=>calls.errors.push(args), JxjAxolotl:globalThis.JxjAxolotl,
 structuredClone,Math,Date,Number,
 tropicalFishShopEventAccessAllowed:()=>true,
 TROPICAL_SHOP_CATEGORIES:['fish','plant','display'],
 esc:s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;'),
 yen:n=>'¥'+Number(n).toLocaleString('ja-JP'),
 shell:(title,body,options)=>'<main class="'+options.contentClass+'">'+body+'</main>',
};
vm.createContext(context);
const functions=['tropicalShopProducts','tropicalShopFindProduct','tropicalShopMaxQuantity','purchaseTropicalShopItem','aquariumState','aquariumFishDefinition','aquariumFishLoad','aquariumPlantTotal','refreshAquariumLoad','aquariumFishMortalityProfile','randomAquariumFishLifespanTarget','createAquariumFishIndividual','ensureAquariumFishIndividuals','addAquariumFishIndividuals','renderTropicalFishShop'];
vm.runInContext(catalogSource+mortalitySource+functions.map(extractFunction).join('\n'),context);
const product=context.tropicalShopFindProduct('fish','axolotl');
assert.equal(product.price,30000);
assert.equal(product.image,'fish-axolotl.png');
assert.equal(context.tropicalShopMaxQuantity(product),3);
context.purchaseTropicalShopItem();
assert.equal(context.state.game.money,60000);
assert.equal(context.state.aquarium.fish.axolotl.owned,1);
assert.equal(context.state.aquarium.fish.axolotl.inTank,1);
assert.equal(context.state.aquarium.fish.axolotl.individuals.length,1);
assert.equal(context.state.aquarium.fish.axolotl.individuals[0].acquiredDay,420);
assert.equal(context.state.aquarium.fishLoad.current,8);
assert.equal(calls.saves.length,1);
assert.deepEqual(calls.finance[0],['熱帯魚屋 ウーパールーパー',0,30000]);
const restored=normalizeAquariumState(JSON.parse(calls.saves[0]).aquarium);
assert.deepEqual(restored.fish.axolotl,JSON.parse(JSON.stringify(context.state.aquarium.fish.axolotl)));
assert.equal(restored.fish.neon_tetra.inTank,2);
context.state.game.money=29999;
context.screenData.tropicalModal={category:'fish',id:'axolotl',qty:1};
assert.equal(context.tropicalShopMaxQuantity(product),0);
context.purchaseTropicalShopItem();
assert.equal(context.state.game.money,29999);
assert.equal(context.state.aquarium.fish.axolotl.owned,1);
assert.equal(calls.saves.length,1);
context.state.game.money=999999;
context.state.aquarium.fish.axolotl.owned=4;
context.state.aquarium.fish.axolotl.inTank=4;
assert.equal(context.tropicalShopMaxQuantity(product),0);
context.state.aquarium.fish.axolotl.owned=1;
context.state.aquarium.fish.axolotl.inTank=1;
context.state.aquarium.fish.neon_tetra.inTank=30;
assert.equal(context.tropicalShopMaxQuantity(product),0);
context.state.aquarium.fish.neon_tetra.inTank=2;
const html=context.renderTropicalFishShop();
assert.ok(html.includes(globalThis.JxjAxolotl.description));
assert.ok(html.includes('fish-axolotl.png'));
assert.ok(html.includes('¥30,000'));
const sprite={x:40,phase:2,dir:-1,el:{style:{}}};
for(const t of [0,1000,60000,3600000]){
 globalThis.JxjAxolotl.updatePose(sprite,t,()=>71);
 assert.equal(sprite.x,40);
 assert.ok(Math.abs(parseFloat(sprite.el.style.top)-83.25)<=0.00301);
}
const jsonConfig=JSON.parse(fs.readFileSync(new URL('../assets/minigames/aquarium/aquarium_config.json',import.meta.url),'utf8'));
assert.deepEqual(jsonConfig.fish.find(r=>r.id==='axolotl'),AQUARIUM_CONFIG.fish.find(r=>r.id==='axolotl'));
assert.equal(AQUARIUM_INITIAL_STATE.fish.axolotl.inTank,0);
if(process.env.JXJ_AXOLOTL_QA_HTML){
 fs.writeFileSync(process.env.JXJ_AXOLOTL_QA_HTML, '<!doctype html><html data-device-class="phone" data-orientation="portrait"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><base href="/jewelrygame/"><link rel="stylesheet" href="styles.css"></head><body data-screen="tropicalFishShop">'+html+'</body></html>');
}
console.log('AXOLOTL: PASS — catalog, real purchase, money/capacity, legacy migration, save/reload, stationary floor pose.');
