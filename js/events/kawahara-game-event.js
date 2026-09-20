const EVENT_KEY = 'kawaharaGameEvent';
export const KAWAHARA_GAME_EVENT_SCREEN = 'kawaharaGameEvent';
export const KAWAHARA_GAME_EVENT_FIRST_ELIGIBLE_DAY = 300;
export const KAWAHARA_GAME_EVENT_CHANCE = 0.05;
export const KAWAHARA_GAME_EVENT_IMAGE = './assets/images/events/kawahara-game-event.png';

export const KAWAHARA_GAME_EVENT_ACTIVE_STAGES = Object.freeze([
  'intro1', 'intro2', 'intro3', 'intro4', 'intro5', 'intro6',
]);

export const KAWAHARA_GAME_EVENT_DIALOGUES = Object.freeze({
  intro1: 'いらっしゃいませ、、、、、',
  intro2: 'あ、、○○○さん、、こんにちは、、、、',
  intro3: 'そうだ、、最近自分ゲーム作ってるんですよ、、、○○○さんにもやってほしいな、、、、、',
  intro4: 'ここ御徒町を舞台にして、この現実と同じように宝石買って、ジュエリー作って、売るとこまでやれるんです、、、、',
  intro5: 'また進捗あったら共有しますね！、、、',
  intro6: 'いつもありがとうございます、、、、',
});

const STYLE_ID = 'jxj-kawahara-game-event-style';

export function installKawaharaGameEventStyles() {
  if (typeof document === 'undefined' || document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
body[data-screen="kawaharaGameEvent"]{
  overflow:hidden;
}
body[data-screen="kawaharaGameEvent"] .kawahara-game-event-screen{
  overflow:hidden;
}
body[data-screen="kawaharaGameEvent"] .kawahara-game-event{
  min-height:var(--jwj-layout-height,100dvh);
  height:var(--jwj-layout-height,100dvh);
  background:radial-gradient(circle at 50% 28%,rgba(52,106,86,.12),rgba(10,19,19,.02) 48%,rgba(4,7,10,.10) 76%);
}
body[data-screen="kawaharaGameEvent"] .kawahara-game-event .visit-event-dialogue>small{
  color:#c9c4b8!important;
}
body[data-screen="kawaharaGameEvent"] .kawahara-character{
  filter:drop-shadow(0 24px 38px rgba(0,0,0,.88));
}
body[data-screen="kawaharaGameEvent"] .kawahara-game-event.is-eerie-intro::after{
  content:"";
  position:absolute;
  inset:0;
  z-index:30;
  pointer-events:none;
  background:#000;
  animation:kawahara-game-blackout .88s ease-out both;
}
body[data-screen="kawaharaGameEvent"] .kawahara-game-event.is-eerie-intro .kawahara-character{
  animation:kawahara-game-character-arrival .78s ease-out both;
}
body[data-screen="kawaharaGameEvent"] .kawahara-game-event::selection{
  background:transparent;
}
@keyframes kawahara-game-blackout{
  0%{opacity:1}
  28%{opacity:.94}
  44%{opacity:.18}
  52%{opacity:.42}
  66%{opacity:.08}
  100%{opacity:0}
}
@keyframes kawahara-game-character-arrival{
  0%{opacity:0;filter:brightness(.28) drop-shadow(0 24px 38px rgba(0,0,0,.88));transform:translateY(4px)}
  30%{opacity:.84;transform:translate(-1px,1px)}
  42%{transform:translate(1px,-1px)}
  55%{opacity:.72;filter:brightness(.72) drop-shadow(0 24px 38px rgba(0,0,0,.88))}
  100%{opacity:1;filter:brightness(1) drop-shadow(0 24px 38px rgba(0,0,0,.88));transform:translate(0,0)}
}
@media (prefers-reduced-motion:reduce){
  body[data-screen="kawaharaGameEvent"] .kawahara-game-event.is-eerie-intro::after,
  body[data-screen="kawaharaGameEvent"] .kawahara-game-event.is-eerie-intro .kawahara-character{
    animation-duration:.01ms!important;
    animation-iteration-count:1!important;
  }
}
`;
  document.head.appendChild(style);
}

function normalizedState(gameState) {
  if (!gameState) return null;
  gameState.events = gameState.events && typeof gameState.events === 'object' && !Array.isArray(gameState.events)
    ? gameState.events
    : {};
  const saved = gameState.events[EVENT_KEY] && typeof gameState.events[EVENT_KEY] === 'object' && !Array.isArray(gameState.events[EVENT_KEY])
    ? gameState.events[EVENT_KEY]
    : {};
  const totalTriggered = Math.max(0, Math.floor(Number(saved.totalTriggered) || 0));
  const active = Boolean(saved.active);
  const completed = Boolean(saved.completed)
    || saved.stage === 'completed'
    || (!active && totalTriggered > 0);
  const stage = active && KAWAHARA_GAME_EVENT_ACTIVE_STAGES.includes(saved.stage)
    ? saved.stage
    : (completed ? 'completed' : 'idle');
  Object.assign(saved, {
    active: active && !completed,
    completed,
    stage,
    lastTriggeredDay: Math.max(0, Math.floor(Number(saved.lastTriggeredDay) || 0)),
    totalTriggered,
  });
  if (saved.completed) {
    saved.active = false;
    saved.stage = 'completed';
  }
  gameState.events[EVENT_KEY] = saved;
  return saved;
}

export function createKawaharaGameEventController({
  getState,
  saveGame,
  setScreen,
  render,
  renderFallback,
  playSfx,
  escapeHtml,
  version,
  isSuppressed,
} = {}) {
  installKawaharaGameEventStyles();

  const esc = typeof escapeHtml === 'function'
    ? escapeHtml
    : (value) => String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

  const stateRecord = () => normalizedState(typeof getState === 'function' ? getState() : null);

  function resume() {
    const eventState = stateRecord();
    if (!eventState?.active || !KAWAHARA_GAME_EVENT_ACTIVE_STAGES.includes(eventState.stage)) return false;
    setScreen?.(KAWAHARA_GAME_EVENT_SCREEN, {}, false);
    return true;
  }

  function maybeStart() {
    if (typeof isSuppressed === 'function' && isSuppressed()) return false;
    const gameState = typeof getState === 'function' ? getState() : null;
    const eventState = stateRecord();
    if (!gameState || !eventState) return false;
    if (eventState.active) return resume();
    if (eventState.completed || eventState.totalTriggered > 0) return false;
    const day = Math.max(1, Math.floor(Number(gameState?.game?.day) || 1));
    if (day < KAWAHARA_GAME_EVENT_FIRST_ELIGIBLE_DAY) return false;
    if (Math.random() >= KAWAHARA_GAME_EVENT_CHANCE) return false;

    eventState.active = true;
    eventState.completed = false;
    eventState.stage = 'intro1';
    eventState.lastTriggeredDay = day;
    eventState.totalTriggered = 1;
    saveGame?.();
    setScreen?.(KAWAHARA_GAME_EVENT_SCREEN, {}, false);
    return true;
  }

  function advance() {
    const eventState = stateRecord();
    if (!eventState?.active) {
      setScreen?.('glab', {}, false);
      return false;
    }
    const index = KAWAHARA_GAME_EVENT_ACTIVE_STAGES.indexOf(eventState.stage);
    if (index < 0) {
      eventState.active = false;
      eventState.completed = true;
      eventState.stage = 'completed';
      saveGame?.();
      setScreen?.('glab', {}, false);
      return false;
    }

    playSfx?.('select', { gain: 0.82 });

    if (index >= KAWAHARA_GAME_EVENT_ACTIVE_STAGES.length - 1) {
      eventState.active = false;
      eventState.completed = true;
      eventState.stage = 'completed';
      saveGame?.();
      setScreen?.('glab', {}, false);
      return true;
    }

    eventState.stage = KAWAHARA_GAME_EVENT_ACTIVE_STAGES[index + 1];
    saveGame?.();
    render?.();
    return true;
  }

  function renderScreen() {
    const eventState = stateRecord();
    if (!eventState?.active) {
      queueMicrotask(() => setScreen?.('glab', {}, false));
      return typeof renderFallback === 'function' ? renderFallback() : '';
    }
    const dialogue = KAWAHARA_GAME_EVENT_DIALOGUES[eventState.stage] || KAWAHARA_GAME_EVENT_DIALOGUES.intro1;
    const buildVersion = typeof version === 'function' ? String(version() || '') : String(version || '');
    const versionSuffix = buildVersion ? `?v=${encodeURIComponent(buildVersion)}` : '';
    const eerieClass = eventState.stage === 'intro1' ? ' is-eerie-intro' : '';
    return `
      <main class="main-screen kawahara-game-event-screen">
        <section class="visit-character-event kawahara-game-event${eerieClass}" aria-live="polite">
          <div class="visit-character-area" aria-hidden="true">
            <img class="visit-character kawahara-character" src="${KAWAHARA_GAME_EVENT_IMAGE}${versionSuffix}" alt="" draggable="false">
          </div>
          <button type="button" class="event-dialogue-card visit-event-dialogue glass-panel" data-action="kawahara-game-event-next" aria-label="タップして会話を進める">
            <small>カワハラ</small>
            <strong>${esc(dialogue)}</strong>
            <span>タップして進む</span>
          </button>
        </section>
      </main>`;
  }

  return Object.freeze({
    state: stateRecord,
    resume,
    maybeStart,
    advance,
    renderScreen,
  });
}
