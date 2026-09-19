export const WHITE_BUNNY_TONKATSU_SCREEN = 'whiteBunnyTonkatsuEvent';
export const WHITE_BUNNY_TONKATSU_EVENT_COST = 12000;
export const WHITE_BUNNY_TONKATSU_EVENT_CHANCE = 1 / 30;
export const WHITE_BUNNY_TONKATSU_BLACKOUT_MS = 1500;
export const WHITE_BUNNY_TONKATSU_PAYMENT_FEEDBACK_MS = 1200;

export const WHITE_BUNNY_TONKATSU_ACTIVE_STAGES = Object.freeze([
  'intro1',
  'intro2',
  'intro3',
  'quizIntro',
  'quizQuestion',
  'quizAnswer',
  'blackoutToTonkatsu',
  'tonkatsu',
  'tonkatsuPaid',
  'blackoutToIce',
  'return1',
  'return2',
]);

const ACTIVE_STAGE_SET = new Set(WHITE_BUNNY_TONKATSU_ACTIVE_STAGES);
const VALID_STAGE_SET = new Set(['idle', ...WHITE_BUNNY_TONKATSU_ACTIVE_STAGES, 'completed']);
const TONKATSU_AUDIO_STAGES = new Set(['tonkatsu', 'tonkatsuPaid', 'blackoutToIce']);
let transitionTimer = null;

function esc(value = '') {
  return String(value).replace(/[&<>'"]/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
  }[char]));
}

function ensureDailyMeals(state) {
  state.daily = state.daily && typeof state.daily === 'object' && !Array.isArray(state.daily) ? state.daily : {};
  state.daily.meals = Array.isArray(state.daily.meals) ? state.daily.meals : [];
  return state.daily.meals;
}

export function whiteBunnyTonkatsuEventState(state) {
  if (!state || typeof state !== 'object') return null;
  state.events = state.events && typeof state.events === 'object' && !Array.isArray(state.events) ? state.events : {};
  const saved = state.events.whiteBunnyTonkatsuEvent && typeof state.events.whiteBunnyTonkatsuEvent === 'object' && !Array.isArray(state.events.whiteBunnyTonkatsuEvent)
    ? state.events.whiteBunnyTonkatsuEvent
    : {};
  const next = {
    active: Boolean(saved.active),
    stage: VALID_STAGE_SET.has(saved.stage) ? saved.stage : 'idle',
    paid: Boolean(saved.paid),
    mealSettled: Boolean(saved.mealSettled),
    hungerBefore: Math.max(0, Math.min(7, Math.floor(Number(saved.hungerBefore) || 0))),
    hungerAfter: Math.max(0, Math.min(7, Math.floor(Number(saved.hungerAfter) || 0))),
    triggerCount: Math.max(0, Math.floor(Number(saved.triggerCount) || 0)),
  };
  if (!next.active && ACTIVE_STAGE_SET.has(next.stage)) next.stage = 'completed';
  Object.assign(saved, next);
  state.events.whiteBunnyTonkatsuEvent = saved;
  return saved;
}

export function whiteBunnyTonkatsuUsesTonkatsuAudio(state) {
  return TONKATSU_AUDIO_STAGES.has(String(whiteBunnyTonkatsuEventState(state)?.stage || ''));
}

export function maybeStartWhiteBunnyTonkatsuEvent({
  state,
  illnessSuppressed = false,
  hungerLevel = () => 0,
  saveGame = () => {},
  setScreen = () => {},
  playSfx = () => {},
  vibrate = () => {},
  random = Math.random,
} = {}) {
  if (!state || illnessSuppressed) return false;
  const eventState = whiteBunnyTonkatsuEventState(state);
  if (!eventState) return false;
  if (eventState.active) {
    setScreen(WHITE_BUNNY_TONKATSU_SCREEN, { mealId: 'ice' }, false);
    return true;
  }
  if (Math.max(0, Math.floor(Number(state?.game?.money) || 0)) < WHITE_BUNNY_TONKATSU_EVENT_COST) return false;
  if (Number(random()) >= WHITE_BUNNY_TONKATSU_EVENT_CHANCE) return false;

  eventState.active = true;
  eventState.stage = 'intro1';
  eventState.paid = false;
  eventState.mealSettled = false;
  eventState.hungerBefore = Math.max(0, Math.min(7, Math.floor(Number(hungerLevel()) || 0)));
  eventState.hungerAfter = eventState.hungerBefore;
  eventState.triggerCount += 1;
  if (state.game) state.game.screen = WHITE_BUNNY_TONKATSU_SCREEN;
  saveGame();
  playSfx('select', { gain: 0.62, rate: 1.02 });
  vibrate([18, 18, 34]);
  setScreen(WHITE_BUNNY_TONKATSU_SCREEN, { mealId: 'ice' }, false);
  return true;
}

function backgroundMarkup(tonkatsu = false, version = '') {
  const suffix = version ? `?v=${encodeURIComponent(version)}` : '';
  if (tonkatsu) {
    return `<picture class="white-bunny-tonkatsu-background" aria-hidden="true">
      <source media="(orientation: portrait)" srcset="./assets/images/events/white-bunny-tonkatsu-shop-portrait.jpg${suffix}">
      <img src="./assets/images/events/white-bunny-tonkatsu-shop-landscape.jpg${suffix}" alt="" draggable="false">
    </picture>`;
  }
  return `<picture class="white-bunny-tonkatsu-background" aria-hidden="true">
    <source media="(orientation: portrait)" srcset="./assets/images/meal-ice-portrait.webp${suffix}">
    <img src="./assets/images/meal-ice.webp${suffix}" alt="" draggable="false">
  </picture>`;
}

function dialogueMarkup(text, version = '') {
  const suffix = version ? `?v=${encodeURIComponent(version)}` : '';
  return `<section class="white-bunny-tonkatsu-event-stage" aria-live="polite">
    ${backgroundMarkup(false, version)}
    <div class="white-bunny-tonkatsu-character-area" aria-hidden="true">
      <img class="white-bunny-tonkatsu-character" src="./assets/images/events/white-bunny.png${suffix}" alt="" draggable="false">
    </div>
    <button type="button" class="white-bunny-tonkatsu-dialogue" data-action="white-bunny-tonkatsu-next">
      <small class="white-bunny-tonkatsu-name">ホワイト・バニー</small>
      <strong>${text}</strong>
      <span class="white-bunny-tonkatsu-tap">タップして進む</span>
    </button>
  </section>`;
}

export function renderWhiteBunnyTonkatsuEvent({ state, playerName = 'あなた', version = '' } = {}) {
  const eventState = whiteBunnyTonkatsuEventState(state);
  if (!eventState?.active) return '<main class="main-screen white-bunny-tonkatsu-event-screen"></main>';
  const name = esc(String(playerName || 'あなた').trim() || 'あなた');
  const lines = {
    intro1: `あっ！${name}っ！、、、愛してるぜぇ、久しぶりぃじゃん！、、、`,
    intro2: 'ねぇ、ねぇ、アイス食べ過ぎて寒くなってきちゃったよぉ、、、眠くなってきちゃったよぉ、、、、',
    intro3: 'このままだと凍死しちゃうよぉ、、、、',
    quizIntro: 'さぁて、ここでクイズです！！、、、、',
    quizQuestion: '上野と言ったら？、、、、、\n、、、、、',
    quizAnswer: `そう！そう！、、とんかつだよね！、、行こっ！${name}、、、、、`,
    return1: 'くぅぅ、、やっぱ揚げ物の後のアイスは最高ですなぁ、、、、',
    return2: `寒くなったらまた助けてねぇ！　いつもありがとっ${name}！、、、`,
  };

  if (eventState.stage === 'blackoutToTonkatsu' || eventState.stage === 'blackoutToIce') {
    return '<main class="white-bunny-tonkatsu-blackout" aria-label="移動中"></main>';
  }

  if (eventState.stage === 'tonkatsu' || eventState.stage === 'tonkatsuPaid') {
    const suffix = version ? `?v=${encodeURIComponent(version)}` : '';
    return `<main class="main-screen white-bunny-tonkatsu-event-screen">
      <section class="white-bunny-tonkatsu-event-stage white-bunny-tonkatsu-food-stage" aria-live="polite">
        ${backgroundMarkup(true, version)}
        <div class="white-bunny-tonkatsu-food-center" aria-hidden="true">
          <div class="white-bunny-tonkatsu-food-frame">
            <img src="./assets/images/events/white-bunny-tonkatsu-food.png${suffix}" alt="とんかつ" draggable="false">
          </div>
        </div>
        <button type="button" class="white-bunny-tonkatsu-mogu" ${eventState.stage === 'tonkatsu' ? 'data-action="white-bunny-tonkatsu-eat"' : 'aria-disabled="true"'}>もぐもぐもぐ</button>
      </section>
    </main>`;
  }

  const line = lines[eventState.stage] || '';
  return `<main class="main-screen white-bunny-tonkatsu-event-screen">${dialogueMarkup(line, version)}</main>`;
}

export function scheduleWhiteBunnyTonkatsuTransition({ state, saveGame = () => {}, render = () => {} } = {}) {
  const eventState = whiteBunnyTonkatsuEventState(state);
  if (!eventState?.active || !['blackoutToTonkatsu', 'tonkatsuPaid', 'blackoutToIce'].includes(eventState.stage)) {
    if (transitionTimer) clearTimeout(transitionTimer);
    transitionTimer = null;
    return false;
  }
  if (transitionTimer) clearTimeout(transitionTimer);
  const expectedStage = eventState.stage;
  const delay = expectedStage === 'tonkatsuPaid' ? WHITE_BUNNY_TONKATSU_PAYMENT_FEEDBACK_MS : WHITE_BUNNY_TONKATSU_BLACKOUT_MS;
  transitionTimer = setTimeout(() => {
    transitionTimer = null;
    const current = whiteBunnyTonkatsuEventState(state);
    if (!current?.active || current.stage !== expectedStage) return;
    current.stage = expectedStage === 'blackoutToTonkatsu' ? 'tonkatsu' : expectedStage === 'tonkatsuPaid' ? 'blackoutToIce' : 'return1';
    saveGame();
    render();
  }, delay);
  return true;
}

export function advanceWhiteBunnyTonkatsuEvent({
  state,
  hungerLevel = () => 0,
  saveGame = () => {},
  render = () => {},
  setScreen = () => {},
  playSfx = () => {},
  spendMealTime = () => {},
  showToast = () => {},
  onMealComplete = () => {},
} = {}) {
  const eventState = whiteBunnyTonkatsuEventState(state);
  if (!eventState?.active) {
    setScreen('meal', {}, false);
    return false;
  }

  const nextStages = {
    intro1: 'intro2',
    intro2: 'intro3',
    intro3: 'quizIntro',
    quizIntro: 'quizQuestion',
    quizQuestion: 'quizAnswer',
    quizAnswer: 'blackoutToTonkatsu',
    return1: 'return2',
  };
  const next = nextStages[eventState.stage];
  if (next) {
    eventState.stage = next;
    saveGame();
    if (next === 'quizIntro') playSfx('quiz-intro', { gain: 0.82 });
    else if (next === 'quizQuestion') playSfx('quiz-question', { gain: 0.82 });
    else if (next === 'quizAnswer') playSfx('quiz-correct', { gain: 0.88 });
    else playSfx('select', { gain: 0.52 });
    render();
    return true;
  }

  if (eventState.stage !== 'return2') return false;
  const before = Math.max(0, Math.min(7, Math.floor(Number(hungerLevel()) || 0)));
  if (!eventState.mealSettled) {
    spendMealTime();
    state.wellbeing = state.wellbeing && typeof state.wellbeing === 'object' && !Array.isArray(state.wellbeing) ? state.wellbeing : {};
    state.wellbeing.hunger = 7;
    state.wellbeing.lastMeal = 'whiteBunnyTonkatsuEvent';
    state.wellbeing.mealsEaten = Math.max(0, Math.floor(Number(state.wellbeing.mealsEaten) || 0)) + 1;
    ensureDailyMeals(state).push({
      id: 'whiteBunnyTonkatsuEvent',
      name: 'ホワイト・バニーととんかつ',
      price: eventState.paid ? WHITE_BUNNY_TONKATSU_EVENT_COST : 0,
      recovery: Math.max(0, 7 - before),
    });
    eventState.mealSettled = true;
  } else if (state.wellbeing) {
    state.wellbeing.hunger = 7;
  }
  eventState.hungerAfter = 7;
  eventState.active = false;
  eventState.stage = 'completed';
  saveGame();
  onMealComplete(before, 7, 'ホワイト・バニーととんかつ');
  playSfx('levelup');
  setScreen('main', {}, false);
  showToast('ごちそうさまでした', 'meal-complete', false);
  return true;
}

export function eatWhiteBunnyTonkatsuEvent({
  state,
  saveGame = () => {},
  render = () => {},
  addFinance = () => {},
  startMoneyFeedback = () => {},
  playSfx = () => {},
  showToast = () => {},
} = {}) {
  const eventState = whiteBunnyTonkatsuEventState(state);
  if (!eventState?.active || eventState.stage !== 'tonkatsu') return false;
  if (!eventState.paid) {
    const money = Math.max(0, Math.floor(Number(state?.game?.money) || 0));
    if (money < WHITE_BUNNY_TONKATSU_EVENT_COST) {
      showToast('とんかつ代の所持金が足りません。', 'error');
      return false;
    }
    state.game.money = money - WHITE_BUNNY_TONKATSU_EVENT_COST;
    addFinance('ホワイト・バニーととんかつ', 0, WHITE_BUNNY_TONKATSU_EVENT_COST);
    eventState.paid = true;
    startMoneyFeedback(-WHITE_BUNNY_TONKATSU_EVENT_COST, 1200);
  }
  eventState.stage = 'tonkatsuPaid';
  saveGame();
  setTimeout(() => {
    const current = whiteBunnyTonkatsuEventState(state);
    if (current?.active && current.stage === 'tonkatsuPaid') playSfx('eat');
  }, 420);
  render();
  return true;
}
