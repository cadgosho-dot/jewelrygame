import assert from 'node:assert/strict';
import {
  WHITE_BUNNY_TONKATSU_EVENT_COST,
  WHITE_BUNNY_TONKATSU_EVENT_CHANCE,
  WHITE_BUNNY_TONKATSU_BLACKOUT_MS,
  WHITE_BUNNY_TONKATSU_PAYMENT_FEEDBACK_MS,
  whiteBunnyTonkatsuEventState,
  maybeStartWhiteBunnyTonkatsuEvent,
  renderWhiteBunnyTonkatsuEvent,
  advanceWhiteBunnyTonkatsuEvent,
  eatWhiteBunnyTonkatsuEvent,
} from '../js/events/white-bunny-tonkatsu-event.js';

function makeState(money = 12000, hunger = 2) {
  return {
    game: { money, screen: 'meal' },
    wellbeing: { hunger, mealsEaten: 0, lastMeal: '' },
    daily: { meals: [] },
    events: {},
  };
}

assert.equal(WHITE_BUNNY_TONKATSU_EVENT_COST, 12000);
assert.equal(WHITE_BUNNY_TONKATSU_EVENT_CHANCE, 1 / 30);
assert.equal(WHITE_BUNNY_TONKATSU_BLACKOUT_MS, 1500);
assert.equal(WHITE_BUNNY_TONKATSU_PAYMENT_FEEDBACK_MS, 1200);

assert.equal(maybeStartWhiteBunnyTonkatsuEvent({
  state: makeState(11999),
  random: () => 0,
}), false, '12000円未満では発生しない');

assert.equal(maybeStartWhiteBunnyTonkatsuEvent({
  state: makeState(),
  illnessSuppressed: true,
  random: () => 0,
}), false, '体調不良中は発生しない');

assert.equal(maybeStartWhiteBunnyTonkatsuEvent({
  state: makeState(),
  random: () => 0.5,
}), false, '確率判定に外れた場合は発生しない');

const state = makeState();
let screen = '';
let saves = 0;
assert.equal(maybeStartWhiteBunnyTonkatsuEvent({
  state,
  hungerLevel: () => state.wellbeing.hunger,
  random: () => 0,
  saveGame: () => { saves += 1; },
  setScreen: (next) => { screen = next; },
}), true);
assert.equal(screen, 'whiteBunnyTonkatsuEvent');
assert.equal(whiteBunnyTonkatsuEventState(state).stage, 'intro1');
assert.equal(whiteBunnyTonkatsuEventState(state).triggerCount, 1);
assert.ok(saves > 0);

const playerName = '○○○';
const expected = new Map([
  ['intro1', 'あっ！○○○っ！、、、愛してるぜぇ、久しぶりぃじゃん！、、、'],
  ['intro2', 'ねぇ、ねぇ、アイス食べ過ぎて寒くなってきちゃったよぉ、、、眠くなってきちゃったよぉ、、、、'],
  ['intro3', 'このままだと凍死しちゃうよぉ、、、、'],
  ['quizIntro', 'さぁて、ここでクイズです！！、、、、'],
  ['quizQuestion', '上野と言ったら？、、、、、\n、、、、、'],
  ['quizAnswer', 'そう！そう！、、とんかつだよね！、、行こっ！○○○、、、、、'],
  ['return1', 'くぅぅ、、やっぱ揚げ物の後のアイスは最高ですなぁ、、、、'],
  ['return2', '寒くなったらまた助けてねぇ！　いつもありがとっ○○○！、、、'],
]);

for (const [stage, dialogue] of expected) {
  whiteBunnyTonkatsuEventState(state).stage = stage;
  const html = renderWhiteBunnyTonkatsuEvent({ state, playerName, version: 'test' });
  assert.ok(html.includes(dialogue), `${stage} の登録済みセリフを変更しない`);
}
whiteBunnyTonkatsuEventState(state).stage = 'intro1';
assert.ok(
  renderWhiteBunnyTonkatsuEvent({ state, playerName }).includes('./assets/images/events/white-bunny.png'),
  '登録済みホワイト・バニー画像を使用する',
);

whiteBunnyTonkatsuEventState(state).stage = 'tonkatsu';
const foodHtml = renderWhiteBunnyTonkatsuEvent({ state, playerName });
assert.ok(foodHtml.includes('もぐもぐもぐ'));
assert.ok(foodHtml.includes('./assets/images/events/white-bunny-tonkatsu-food.png'));

let financeOut = 0;
let feedback = 0;
assert.equal(eatWhiteBunnyTonkatsuEvent({
  state,
  saveGame: () => {},
  render: () => {},
  addFinance: (_name, _income, out) => { financeOut += out; },
  startMoneyFeedback: (value) => { feedback += value; },
}), true);
assert.equal(state.game.money, 0);
assert.equal(financeOut, 12000);
assert.equal(feedback, -12000);
assert.equal(whiteBunnyTonkatsuEventState(state).paid, true);
assert.equal(whiteBunnyTonkatsuEventState(state).stage, 'tonkatsuPaid');
assert.ok(renderWhiteBunnyTonkatsuEvent({ state, playerName }).includes('もぐもぐもぐ'), '支払い演出中も食事画面を維持する');

let mealTimeCount = 0;
let finalScreen = '';
let completion = null;
let completionToast = null;
let completionSound = null;
whiteBunnyTonkatsuEventState(state).stage = 'return2';
advanceWhiteBunnyTonkatsuEvent({
  state,
  hungerLevel: () => state.wellbeing.hunger,
  saveGame: () => {},
  render: () => {},
  setScreen: (next) => { finalScreen = next; },
  spendMealTime: () => { mealTimeCount += 1; },
  onMealComplete: (before, after, mealName) => { completion = { before, after, mealName }; },
  showToast: (...args) => { completionToast = args; },
  playSfx: (name) => { completionSound = name; },
});
assert.equal(state.wellbeing.hunger, 7);
assert.equal(state.wellbeing.mealsEaten, 1);
assert.equal(state.daily.meals.length, 1);
assert.equal(state.daily.meals[0].price, 12000);
assert.equal(mealTimeCount, 1);
assert.equal(finalScreen, 'main');
assert.deepEqual(completion, { before: 2, after: 7, mealName: 'ホワイト・バニーととんかつ' });
assert.deepEqual(completionToast, ['ごちそうさまでした', 'meal-complete', false]);
assert.equal(completionSound, 'levelup');
assert.equal(whiteBunnyTonkatsuEventState(state).active, false);
assert.equal(whiteBunnyTonkatsuEventState(state).stage, 'completed');

const retrigger = whiteBunnyTonkatsuEventState(state);
state.game.money = 12000;
retrigger.stage = 'completed';
assert.equal(maybeStartWhiteBunnyTonkatsuEvent({
  state,
  hungerLevel: () => state.wellbeing.hunger,
  random: () => 0,
}), true, '完了後も再発生できる');
assert.equal(whiteBunnyTonkatsuEventState(state).triggerCount, 2);

console.log('WHITE BUNNY TONKATSU EVENT TEST: PASS');
