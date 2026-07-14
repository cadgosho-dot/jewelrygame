import {
  VERSION, SAVE_KEY, STORE_LEASE_COST, POLISHING_MACHINE_PRICE, POLISHING_HOURS, METALS, GEMS, ITEMS, DESIGNS, FINISHES, QUALITIES,
  PRICE_MODES, MINING_LOCATIONS, CUSTOMERS, initialState, migrateState,
  recommendedPrice, productionCost, productionHours, itemName, roundThousand, roughSalePrice,
  clock, nextWeather,
} from './game-data.js';
import { configureAudio, unlockAudio, applyAudioSettings, switchAudio, playSfx, vibrate } from './audio.js';
import {
  initializeFirebase, observeAuth, googleLogin, emailLogin, emailSignup, logout,
  loadState, saveState, deleteGameData, claimSession, watchSession, heartbeat, firebaseErrorMessage,
} from './firebase-service.js';

const root = document.querySelector('#root');
const toastEl = document.querySelector('#toast');
const modalEl = document.querySelector('#modal-layer');

let state = null;
let screen = 'loading';
let screenData = {};
let navigation = [];
let craftDraft = null;
let completionId = null;
let selectedMining = 'river';
let selectedPolishing = 'garnet';
let phoneTab = 'orders';
let titleSettings = loadTitleSettings();
let currentUser = null;
let cloudSave = null;
let authReady = false;
let saveQueue = Promise.resolve();
let sessionId = globalThis.crypto?.randomUUID?.() || `session-${Date.now()}-${Math.random().toString(36).slice(2)}`;
let stopSessionWatch = null;
let heartbeatTimer = null;
let sessionTakenOver = false;

configureAudio(() => state?.settings || titleSettings);
document.addEventListener('pointerdown', unlockAudio, { once: true });


function uid() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function loadTitleSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(`${SAVE_KEY}-settings`) || 'null');
    return { ...initialState().settings, ...(saved || {}) };
  } catch (_) {
    return initialState().settings;
  }
}

function localSaveKey() {
  return currentUser?.uid ? `${SAVE_KEY}-${currentUser.uid}` : SAVE_KEY;
}

function freshStartFlagKey() {
  return currentUser?.uid ? `${SAVE_KEY}-fresh-start-${currentUser.uid}` : `${SAVE_KEY}-fresh-start`;
}

function freshStartRequested() {
  return localStorage.getItem(freshStartFlagKey()) === '1';
}

function hasSave() {
  return Boolean(cloudSave || localStorage.getItem(localSaveKey()));
}

function loadGame() {
  try {
    const raw = cloudSave || JSON.parse(localStorage.getItem(localSaveKey()) || 'null');
    return raw ? migrateState(raw) : null;
  } catch (_) {
    return null;
  }
}

function saveLocalBackup() {
  if (!state || !currentUser) return;
  state.updatedAt = new Date().toISOString();
  localStorage.setItem(localSaveKey(), JSON.stringify(state));
  localStorage.setItem(`${SAVE_KEY}-settings`, JSON.stringify(state.settings));
  cloudSave = structuredClone(state);
}

function saveGame(message = false) {
  if (!state || !currentUser || sessionTakenOver) return;
  saveLocalBackup();
  const snapshot = structuredClone(state);
  const userId = currentUser.uid;
  saveQueue = saveQueue
    .catch(() => {})
    .then(() => saveState(userId, snapshot))
    .catch((error) => {
      console.error(error);
      showToast('クラウド保存に失敗しました。通信を確認してください。', 'error');
    });
  if (message) showToast('保存しました。');
}

function esc(value = '') {
  return String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
}

function yen(value) {
  return `¥${Math.round(Number(value) || 0).toLocaleString('ja-JP')}`;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Number(value) || 0));
}

function roughVisual(id, className = 'gem-thumb', alt = '') {
  const gem = GEMS[id];
  if (!gem) return '';
  return `<img class="${className}" src="./assets/images/gems/${gem.id}.png" alt="${esc(alt || `${gem.name}原石`)}">`;
}

function looseVisual(id, className = 'loose-inline', alt = '') {
  const gem = GEMS[id];
  if (!gem) return '';
  return `<span class="${className}" style="--gem:${gem.hue}" role="img" aria-label="${esc(alt || `${gem.name}ルース`)}">◆</span>`;
}

function showToast(message, type = 'info') {
  toastEl.textContent = message;
  toastEl.dataset.type = type;
  toastEl.classList.add('show');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toastEl.classList.remove('show'), 2100);
  playSfx(type === 'error' ? 'error' : 'select');
}

function showModal({ title = '', body = '', confirm = '決定', cancel = 'キャンセル', danger = false, hideCancel = false, action = '', className = '' }) {
  modalEl.innerHTML = `
    <div class="modal-backdrop">
      <section class="modal-card ${esc(className)}" role="dialog" aria-modal="true">
        ${title ? `<h2>${esc(title)}</h2>` : ''}
        <div class="modal-body">${body}</div>
        <div class="modal-actions">
          ${hideCancel ? '' : `<button class="secondary-button" data-action="modal-close">${esc(cancel)}</button>`}
          <button class="${danger ? 'danger-button' : 'primary-button'}" data-action="${esc(action)}">${esc(confirm)}</button>
        </div>
      </section>
    </div>`;
  modalEl.classList.remove('hidden');
}

function closeModal() {
  modalEl.classList.add('hidden');
  modalEl.innerHTML = '';
}

function addNotification(title, body, type = 'info') {
  state.notifications.unshift({ id: uid(), title, body, type, day: state.game.day, unread: true });
  state.notifications = state.notifications.slice(0, 80);
}

function addFinance(label, income = 0, expense = 0) {
  state.finance.push({ id: uid(), day: state.game.day, label, income, expense });
  state.finance = state.finance.slice(-50);
  state.daily.income += income;
  state.daily.expense += expense;
}

function canSpendHours(hours) {
  return state.game.minutes + hours * 60 <= 22 * 60;
}

function hasCraftedJewelry() {
  return Boolean(state && (state.artisan.xp > 0 || state.inventory.jewelry.length > 0 || state.store.salesCount > 0));
}

function canServeCustomers() {
  return Boolean(state?.store?.rented && hasCraftedJewelry());
}

function spendHours(hours) {
  state.game.minutes = Math.min(22 * 60, state.game.minutes + hours * 60);
}

function weatherIcon(label) {
  return label === '雨' ? '☂' : label === '曇り' ? '☁' : '☀';
}

function backgroundFor(target) {
  const map = {
    loading: 'main', login: 'main', title: 'main', main: 'main', mining: 'mining', miningResult: 'mining', workshop: 'workshop',
    craft: 'workshop', polishing: 'workshop', completion: 'workshop', inventory: 'workshop', glab: 'glab', okachimachi: 'okachimachi', supplier: 'okachimachi', realEstate: 'okachimachi',
    store: 'store', customer: 'store', orders: 'store', expansion: 'store', employee: 'store',
    phone: 'phone', settings: 'main', settingsTitle: 'main', dayResult: 'sleep',
  };
  return map[target] || 'main';
}

function audioFor(target) {
  const bg = backgroundFor(target);
  if (bg === 'phone') return 'main';
  if (bg === 'okachimachi') return 'okachimachi';
  return bg;
}

function setScreen(target, data = {}, push = true) {
  if (push && screen !== target) navigation.push({ screen, data: screenData });
  screen = target;
  screenData = data;
  if (state) state.game.screen = target;
  render();
}

function goBack() {
  const previous = navigation.pop();
  if (previous) {
    screen = previous.screen;
    screenData = previous.data || {};
    if (state) state.game.screen = screen;
    render();
    return;
  }
  setScreen(state ? 'main' : 'title', {}, false);
}

function goMain() {
  navigation = [];
  setScreen('main', {}, false);
}

function header(title, { back = true, main = true, help = '' } = {}) {
  const isMainMenu = !title && !back && !main;
  return `
    <header class="game-header ${isMainMenu ? 'main-header' : ''}">
      <div class="status-left" aria-label="時間、天気、日数">
        <div class="status-top-line">
          <span class="header-time">${clock(state.game.minutes)}</span>
          <span class="header-weather">${weatherIcon(state.game.weather)} ${esc(state.game.weather)}</span>
        </div>
        ${isMainMenu ? `<span class="header-day">${state.game.day}日目</span>` : ''}
      </div>
      <div class="header-center">
        ${back ? '<button class="icon-button" data-action="back" aria-label="戻る">←</button>' : ''}
        ${title ? `<div class="header-title"><strong>${esc(title)}</strong></div>` : ''}
      </div>
      <div class="header-right">
        <div class="header-actions">
          ${help ? `<button class="icon-button" data-action="help" data-help="${esc(help)}" aria-label="説明">?</button>` : ''}
          ${main ? '<button class="small-button" data-action="main">メイン画面</button>' : ''}
        </div>
        <span class="header-money" aria-label="所持金">${yen(state.game.money)}</span>
      </div>
    </header>`;
}

function shell(title, body, options = {}) {
  return `<main class="screen-shell">${header(title, options)}<section class="screen-content">${body}</section></main>`;
}

function render() {
  document.body.dataset.screen = screen;
  document.body.dataset.textSize = state?.settings?.textSize || titleSettings.textSize || 'normal';
  document.documentElement.style.setProperty('--screen-bg', `url('./assets/images/${backgroundFor(screen)}.webp?v=${VERSION}')`);
  if (state) {
    const hour = Math.floor(state.game.minutes / 60);
    document.body.dataset.timeperiod = hour < 11 ? 'morning' : hour < 17 ? 'day' : hour < 20 ? 'evening' : 'night';
  }
  switchAudio(audioFor(screen));

  const renderers = {
    loading: renderLoading,
    login: renderLogin,
    title: renderTitle,
    settingsTitle: () => renderSettings(true),
    main: renderMain,
    mining: renderMining,
    miningResult: renderMiningResult,
    okachimachi: renderOkachimachi,
    supplier: renderSupplier,
    realEstate: renderRealEstate,
    workshop: renderWorkshop,
    craft: renderCraft,
    polishing: renderPolishing,
    completion: renderCompletion,
    inventory: renderInventory,
    glab: renderGlab,
    store: renderStore,
    customer: renderCustomer,
    orders: renderOrders,
    expansion: renderExpansion,
    employee: renderEmployee,
    phone: renderPhone,
    settings: () => renderSettings(false),
    dayResult: renderDayResult,
  };
  root.innerHTML = (renderers[screen] || renderMain)();
  applyAudioSettings();
}

function renderLoading() {
  return `<main class="title-screen"><section class="title-actions glass-panel login-panel"><div class="loading-spinner" aria-hidden="true"></div><p>読み込んでいます…</p></section></main>`;
}

function renderLogin() {
  return `
    <main class="title-screen">
      <section class="title-actions glass-panel login-panel">
        <button class="primary-button large-button" data-action="google-login">Googleでログイン</button>
        <div class="login-separator"><span>または</span></div>
        <label class="login-field"><span>メールアドレス</span><input id="login-email" type="email" autocomplete="email" inputmode="email"></label>
        <label class="login-field"><span>パスワード</span><input id="login-password" type="password" autocomplete="current-password" minlength="6"></label>
        <button class="secondary-button full-button" data-action="email-login">メールでログイン</button>
        <button class="text-button" data-action="email-signup">新規アカウントを作成</button>
        <small>セーブデータはログインしたアカウントへ自動保存されます。</small>
      </section>
    </main>`;
}

function renderTitle() {
  const label = freshStartRequested() ? 'はじめから' : 'スタート';
  return `
    <main class="title-screen">
      <section class="title-actions glass-panel start-only-panel">
        <button class="primary-button large-button start-button" data-action="start">${label}</button>
      </section>
    </main>`;
}

function renderMain() {
  const unread = state.notifications.filter((note) => note.unread).length;
  const visiting = canServeCustomers()
    ? Object.entries(state.customers).filter(([, customer]) => customer.visiting).map(([id]) => CUSTOMERS[id]?.name)
    : [];
  const storeButton = state.store.rented
    ? `<button data-action="nav" data-screen="store"><span>▣</span><strong>店舗</strong>${visiting.length ? '<i></i>' : ''}</button>`
    : '<button type="button" disabled aria-disabled="true" title="御徒町の不動産屋で店舗を借りると利用できます"><span>▣</span><strong>店舗</strong><small>未契約</small></button>';
  return `
    <main class="main-screen">
      ${header('', { back: false, main: false })}
      <section class="main-spacer" aria-hidden="true"></section>
      ${visiting.length ? `<div class="floating-notice"><strong>お客様が来店しています。</strong><span>${esc(visiting.join('、'))}</span></div>` : ''}
      <nav class="main-menu" aria-label="行動">
        <button data-action="nav" data-screen="mining"><span>⛏</span><strong>採掘</strong></button>
        <button data-action="nav" data-screen="workshop"><span>⚒</span><strong>工房</strong></button>
        ${storeButton}
        <button data-action="nav" data-screen="glab"><span>◆</span><strong>g-Lab.</strong></button>
        <button data-action="nav" data-screen="okachimachi"><span>♢</span><strong>御徒町</strong></button>
        <button data-action="nav" data-screen="phone"><span>▯</span><strong>スマートフォン</strong>${unread ? `<em>${unread}</em>` : ''}</button>
        <button data-action="sleep"><span>☾</span><strong>寝る</strong></button>
      </nav>
    </main>`;
}

function renderMining() {
  const location = MINING_LOCATIONS[selectedMining];
  const remaining = Math.floor((22 * 60 - state.game.minutes) / 60);
  return shell('採掘', `
    <div class="split-layout">
      <section class="scene-space"></section>
      <section class="action-panel glass-panel">
        <div class="choice-grid three">
          ${Object.values(MINING_LOCATIONS).map((place) => `
            <button class="choice-card ${place.id === selectedMining ? 'selected' : ''}" data-action="select-mining" data-id="${place.id}">
              <strong>${esc(place.name)}</strong><small>${place.hours}時間</small>
            </button>`).join('')}
        </div>
        <article class="summary-card">
          <h2>${esc(location.name)}</h2>
          <p>${esc(location.description)}</p>
          <div class="tag-row">${location.gems.map((entry) => `<span>${esc(GEMS[entry.id].name)}</span>`).join('')}</div>
          <small>残り時間：${remaining}時間</small>
        </article>
        <button class="primary-button full-button" data-action="mine" ${canSpendHours(location.hours) ? '' : 'disabled'}>採掘する</button>
        ${canSpendHours(location.hours) ? '' : '<p class="error-text">今日は採掘する時間がありません。</p>'}
      </section>
    </div>`, { help: '採掘場所を選び、「採掘する」を押すと原石を入手できます。' });
}

function renderMiningResult() {
  const result = screenData.result;
  return shell('採掘結果', `
    <section class="center-card glass-panel result-card">
      <div class="gem-symbol">${result ? roughVisual(result.gem, 'gem-result-image') : '<span class="gem-empty-dot">·</span>'}</div>
      ${result ? `
        <h1>${esc(GEMS[result.gem].name)}の原石を見つけました。</h1>
        <p>入手数：${result.qty}個</p>` : `
        <h1>今回は原石が見つかりませんでした。</h1>
        <p>次の採掘では見つかりやすくなります。</p>`}
      <div class="button-stack">
        <button class="primary-button" data-action="mine-again">もう一度採掘する</button>
        <button class="secondary-button" data-action="main">メイン画面へ戻る</button>
      </div>
    </section>`, { main: false });
}

function renderGlab() {
  const machineOwned = state.tools.polishingMachine;
  const canBuyMachine = state.game.money >= POLISHING_MACHINE_PRICE && canSpendHours(1);
  return shell('g-Lab.', `
    <div class="split-layout">
      <section class="scene-space"></section>
      <section class="action-panel glass-panel">
        <article class="summary-card">
          <h2>g-Lab.</h2>
          <p>工房設備や制作に関する道具を購入できます。</p>
        </article>
        <article class="summary-card">
          <h2>原石研磨機</h2>
          <p>工房で原石を研磨し、ジュエリー制作に使えるルースへ加工できます。</p>
          ${machineOwned
            ? `<p class="success-text">購入済みです。${state.tools.polishingMachineDay || 1}日目から使用できます。</p>`
            : `<div class="result-stats"><span>価格：${yen(POLISHING_MACHINE_PRICE)}</span><span>購入手続き：1時間</span></div>
               <button class="primary-button full-button" data-action="buy-polishing-machine" ${canBuyMachine ? '' : 'disabled'}>研磨機を購入する</button>
               ${state.game.money >= POLISHING_MACHINE_PRICE ? '' : `<p class="error-text">所持金が${yen(POLISHING_MACHINE_PRICE - state.game.money)}足りません。</p>`}
               ${canSpendHours(1) ? '' : '<p class="error-text">今日は購入手続きをする時間がありません。</p>'}`}
        </article>
        <div class="button-stack">
          <button class="primary-button full-button" data-action="nav" data-screen="workshop">工房へ</button>
          <button class="secondary-button full-button" data-action="nav" data-screen="inventory">材料・完成品を見る</button>
          <button class="secondary-button full-button" data-action="glab-info">g-Lab.について</button>
        </div>
      </section>
    </div>`, { help: 'g-Lab.では原石研磨機などの工房設備を購入できます。' });
}

function renderOkachimachi() {
  return shell('御徒町', `
    <div class="split-layout">
      <section class="scene-space"></section>
      <section class="action-panel glass-panel">
        <article class="summary-card">
          <h2>御徒町</h2>
          <p>地金・ルースの購入、原石の売却、店舗を借りるための不動産屋を利用できます。</p>
        </article>
        <div class="button-stack">
          <button class="primary-button full-button" data-action="nav" data-screen="supplier">素材屋</button>
          <button class="secondary-button full-button" data-action="nav" data-screen="realEstate">不動産屋</button>
        </div>
        ${state.store.rented ? '<p class="small-note">店舗は契約済みです。不動産屋で契約状況を確認できます。</p>' : '<p class="small-note">店舗を利用するには、不動産屋で店舗を借りてください。</p>'}
      </section>
    </div>`, { help: '御徒町では、地金・ルースの購入、原石の売却、店舗の賃貸契約ができます。' });
}

function renderSupplier() {
  const requestedTab = screenData.tab || 'metals';
  const tab = ['metals', 'loose', 'rough'].includes(requestedTab) ? requestedTab : 'metals';
  const products = tab === 'metals' ? Object.values(METALS) : Object.values(GEMS);
  const isSellingRough = tab === 'rough';
  return shell('素材屋', `
    <div class="split-layout">
      <section class="scene-space"></section>
      <section class="action-panel glass-panel">
        <div class="tab-row supplier-tabs">
          <button class="${tab === 'metals' ? 'active' : ''}" data-action="supplier-tab" data-tab="metals">地金を買う</button>
          <button class="${tab === 'loose' ? 'active' : ''}" data-action="supplier-tab" data-tab="loose">ルースを買う</button>
          <button class="${tab === 'rough' ? 'active' : ''}" data-action="supplier-tab" data-tab="rough">原石を売る</button>
        </div>
        <div class="product-list">
          ${products.map((product) => {
            if (isSellingRough) {
              const owned = state.inventory.rough[product.id];
              const price = roughSalePrice(product.id);
              const disabled = owned < 1 || !canSpendHours(1);
              return `<article class="product-row">
                <div class="product-main">
                  ${roughVisual(product.id, 'gem-inline')}
                  <div><strong>${esc(product.name)}原石</strong><small>所持：${owned}個</small></div>
                </div>
                <strong>${yen(price)}</strong>
                <button class="primary-button" data-action="sell-rough" data-id="${product.id}" ${disabled ? 'disabled' : ''}>1個売る</button>
              </article>`;
            }
            const kind = tab === 'metals' ? 'metal' : 'loose';
            const owned = kind === 'metal' ? state.inventory.metals[product.id] : state.inventory.loose[product.id];
            const disabled = state.game.money < product.price || !canSpendHours(1);
            return `<article class="product-row">
              <div class="product-main">
                ${kind === 'loose' ? looseVisual(product.id, 'loose-inline') : '<span class="material-chip">地金</span>'}
                <div><strong>${esc(product.name)}${kind === 'loose' ? 'ルース' : ''}</strong><small>所持：${owned}個</small></div>
              </div>
              <strong>${yen(product.price)}</strong>
              <button class="primary-button" data-action="purchase" data-kind="${kind}" data-id="${product.id}" ${disabled ? 'disabled' : ''}>購入する</button>
            </article>`;
          }).join('')}
        </div>
        <p class="small-note">購入・売却は1回につき1個で、手続きに1時間かかります。原石を購入できる場所はありません。</p>
      </section>
    </div>`, { help: '素材屋では地金とルースを購入できます。採掘した原石を売却できるのも素材屋だけです。' });
}

function renderRealEstate() {
  if (state.store.rented) {
    return shell('不動産屋', `
      <section class="center-card glass-panel expansion-card">
        <h1>小さな店舗を契約中です。</h1>
        <p>${state.store.rentedDay || 1}日目から店舗を利用しています。</p>
        <div class="stat-grid">
          <div><small>ショーケース</small><strong>${state.store.showcaseCount}枠</strong></div>
          <div><small>完成品保管</small><strong>${state.inventory.capacity}点</strong></div>
        </div>
        <button class="primary-button full-button" data-action="nav" data-screen="store">店舗へ行く</button>
      </section>`, { help: '御徒町の不動産屋で、契約済みの店舗情報を確認できます。' });
  }
  const affordable = state.game.money >= STORE_LEASE_COST;
  const hasTime = canSpendHours(1);
  return shell('不動産屋', `
    <section class="center-card glass-panel expansion-card">
      <h1>店舗を借りる</h1>
      <p>最初は店舗を持っていません。商品を販売したり、お客様を接客したりするには店舗の契約が必要です。</p>
      <article class="summary-card">
        <h2>小さな店舗</h2>
        <p>ショーケース3枠・完成品保管10点の小さな店舗です。</p>
        <div class="result-stats">
          <span>契約費：${yen(STORE_LEASE_COST)}</span>
          <span>手続き：1時間</span>
        </div>
      </article>
      <button class="primary-button full-button" data-action="rent-store" ${affordable && hasTime ? '' : 'disabled'}>この店舗を借りる</button>
      ${affordable ? '' : `<p class="error-text">契約費が${yen(STORE_LEASE_COST - state.game.money)}足りません。</p>`}
      ${hasTime ? '' : '<p class="error-text">今日は契約手続きをする時間がありません。</p>'}
      <p class="small-note">この基本版では、契約時に費用を支払い、その後の毎日の家賃は発生しません。</p>
    </section>`, { help: '御徒町の不動産屋で店舗を契約すると、ショーケースへの陳列とお客様の接客が利用できます。' });
}

function renderWorkshop() {
  const roughTotal = Object.values(state.inventory.rough).reduce((a, b) => a + b, 0);
  const looseTotal = Object.values(state.inventory.loose).reduce((a, b) => a + b, 0);
  const metalTotal = Object.values(state.inventory.metals).reduce((a, b) => a + b, 0);
  const stored = state.inventory.jewelry.filter((item) => item.status !== 'sold').length;
  return shell('工房', `
    <div class="split-layout">
      <section class="scene-space"></section>
      <section class="action-panel glass-panel">
        <div class="stat-grid">
          <div><small>原石</small><strong>${roughTotal}個</strong></div>
          <div><small>ルース</small><strong>${looseTotal}個</strong></div>
          <div><small>地金</small><strong>${metalTotal}個</strong></div>
          <div><small>完成品</small><strong>${stored}/${state.inventory.capacity}</strong></div>
        </div>
        <div class="button-stack">
          <button class="primary-button large-button" data-action="open-craft">ジュエリーを作る</button>
          <button class="secondary-button large-button" data-action="nav" data-screen="polishing" ${state.tools.polishingMachine ? '' : 'disabled'}>原石を研磨する</button>
          ${state.tools.polishingMachine ? '' : '<button class="secondary-button large-button" data-action="nav" data-screen="glab">g-Lab.で研磨機を見る</button>'}
          <button class="secondary-button large-button" data-action="nav" data-screen="inventory">材料・完成品を見る</button>
        </div>
        ${state.tools.polishingMachine ? '' : '<p class="small-note">原石研磨には、g-Lab.で購入できる研磨機が必要です。</p>'}
      </section>
    </div>`, { help: 'ルースと地金でジュエリーを制作できます。研磨機があれば原石をルースへ加工できます。' });
}

function renderPolishing() {
  if (!state.tools.polishingMachine) {
    return shell('原石研磨', `
      <section class="center-card glass-panel">
        <h1>研磨機がありません。</h1>
        <p>原石をルースへ加工するには、g-Lab.で原石研磨機を購入してください。</p>
        <button class="primary-button full-button" data-action="nav" data-screen="glab">g-Lab.へ行く</button>
      </section>`, { help: '原石研磨機はg-Lab.で購入できます。' });
  }
  if (!GEMS[selectedPolishing]) selectedPolishing = Object.keys(GEMS)[0];
  const roughOwned = state.inventory.rough[selectedPolishing] || 0;
  const canPolish = roughOwned > 0 && canSpendHours(POLISHING_HOURS);
  return shell('原石研磨', `
    <section class="wide-panel glass-panel">
      <div class="choice-grid many polishing-grid">
        ${Object.values(GEMS).map((gem) => `<button class="choice-card ${selectedPolishing === gem.id ? 'selected' : ''}" data-action="select-polishing" data-id="${gem.id}">
          <span class="choice-visual">${roughVisual(gem.id, 'choice-gem')}</span>
          <strong>${esc(gem.name)}</strong><small>原石 ${state.inventory.rough[gem.id]}個</small>
        </button>`).join('')}
      </div>
      <article class="summary-card polishing-summary">
        <div>${roughVisual(selectedPolishing, 'polishing-rough')}</div>
        <div class="polishing-arrow">→</div>
        <div>${looseVisual(selectedPolishing, 'polishing-loose')}</div>
        <div class="polishing-copy">
          <h2>${esc(GEMS[selectedPolishing].name)}原石を研磨</h2>
          <p>原石1個から、同種のルース1個を作ります。</p>
          <div class="result-stats"><span>加工時間：${POLISHING_HOURS}時間</span><span>ルース所持：${state.inventory.loose[selectedPolishing]}個</span></div>
        </div>
      </article>
      <button class="primary-button full-button" data-action="polish-rough" ${canPolish ? '' : 'disabled'}>原石を1個研磨する</button>
      ${roughOwned > 0 ? '' : '<p class="error-text">選択した原石を持っていません。</p>'}
      ${canSpendHours(POLISHING_HOURS) ? '' : '<p class="error-text">今日は研磨する時間がありません。</p>'}
    </section>`, { help: '原石1個を消費し、ジュエリー制作に使えるルース1個へ加工します。' });
}

function defaultDraft(orderId = null) {
  const order = orderId ? state.orders.find((entry) => entry.id === orderId) : null;
  return {
    orderId,
    item: order?.item || 'ring',
    gem: order?.gem || firstOwned(state.inventory.loose, 'amethyst'),
    metal: order?.metal || firstOwned(state.inventory.metals, 'silver'),
    design: order?.design || 'simple',
    finish: 'mirror',
  };
}

function firstOwned(collection, fallback) {
  return Object.keys(collection).find((key) => collection[key] > 0) || fallback;
}

function craftChoice(label, group, entries, current, locked = false) {
  return `<fieldset class="craft-field"><legend>${esc(label)}</legend><div class="choice-grid ${Object.keys(entries).length > 3 ? 'many' : 'three'}">
    ${Object.values(entries).map((entry) => {
      const owned = group === 'gem' ? state.inventory.loose[entry.id] : group === 'metal' ? state.inventory.metals[entry.id] : null;
      return `<button type="button" class="choice-card ${current === entry.id ? 'selected' : ''}" data-action="craft-choice" data-group="${group}" data-id="${entry.id}" ${locked && current !== entry.id ? 'disabled' : ''}>
        ${group === 'gem' ? `<span class="choice-visual">${looseVisual(entry.id, 'choice-loose')}</span>` : ''}
        <strong>${esc(entry.name)}</strong>${owned !== null ? `<small>所持 ${owned}</small>` : ''}
      </button>`;
    }).join('')}
  </div></fieldset>`;
}

function renderCraft() {
  const orderId = screenData.orderId || null;
  if (!craftDraft || craftDraft.orderId !== orderId) craftDraft = defaultDraft(orderId);
  const locked = Boolean(orderId);
  const order = locked ? state.orders.find((entry) => entry.id === orderId) : null;
  const hours = productionHours(craftDraft, state.employee);
  const cost = productionCost(craftDraft);
  const quality = expectedQuality();
  const price = recommendedPrice({ ...craftDraft, quality });
  const enoughGem = state.inventory.loose[craftDraft.gem] > 0;
  const enoughMetal = state.inventory.metals[craftDraft.metal] > 0;
  const capacityOk = state.inventory.jewelry.filter((item) => item.status !== 'sold').length < state.inventory.capacity;
  const canCraft = enoughGem && enoughMetal && capacityOk && canSpendHours(hours);

  return shell(order ? '注文の商品を作る' : 'ジュエリーを作る', `
    <div class="craft-layout">
      <section class="preview-panel glass-panel">
        <div class="jewelry-preview metal-${craftDraft.metal}" style="--gem:${GEMS[craftDraft.gem].hue}">
          <span class="preview-item">${ITEMS[craftDraft.item].symbol}</span><i>◆</i>
        </div>
        <h2>${esc(itemName(craftDraft))}</h2>
        ${order ? `<span class="order-badge">${esc(order.customerName)}さんの注文品</span>` : ''}
        <dl class="preview-details">
          <div><dt>制作時間</dt><dd>${hours}時間</dd></div>
          <div><dt>原価</dt><dd>${yen(cost)}</dd></div>
          <div><dt>品質予想</dt><dd>${esc(QUALITIES[quality].name)}</dd></div>
          <div><dt>推奨価格</dt><dd>${yen(price)}</dd></div>
        </dl>
      </section>
      <section class="craft-options glass-panel">
        ${craftChoice('アイテム', 'item', ITEMS, craftDraft.item, locked)}
        ${craftChoice('ルース', 'gem', GEMS, craftDraft.gem, locked)}
        ${craftChoice('地金', 'metal', METALS, craftDraft.metal, locked)}
        ${craftChoice('デザイン', 'design', DESIGNS, craftDraft.design, locked)}
        ${craftChoice('仕上げ', 'finish', FINISHES, craftDraft.finish, false)}
        <div class="validation-list">
          ${enoughGem ? '' : `<p>・${esc(GEMS[craftDraft.gem].name)}のルースを持っていません。</p>`}
          ${enoughMetal ? '' : `<p>・${esc(METALS[craftDraft.metal].name)}を持っていません。</p>`}
          ${capacityOk ? '' : '<p>・完成品の保管場所に空きがありません。</p>'}
          ${canSpendHours(hours) ? '' : '<p>・今日は制作する時間がありません。</p>'}
        </div>
        <button class="primary-button full-button" data-action="confirm-craft" ${canCraft ? '' : 'disabled'}>制作する</button>
        ${!enoughGem && state.tools.polishingMachine && state.inventory.rough[craftDraft.gem] > 0 ? '<button class="secondary-button full-button" data-action="nav" data-screen="polishing">原石を研磨する</button>' : ''}
        ${!enoughGem ? '<button class="secondary-button full-button" data-action="nav" data-screen="supplier" data-tab="loose">素材屋でルースを見る</button>' : ''}
        ${!enoughMetal ? '<button class="secondary-button full-button" data-action="nav" data-screen="supplier" data-tab="metals">素材屋で地金を見る</button>' : ''}
      </section>
    </div>`, { help: '上から項目を選び、「制作する」を押します。専門的な技術操作や失敗はありません。' });
}

function renderCompletion() {
  const jewelry = state.inventory.jewelry.find((item) => item.id === completionId);
  if (!jewelry) return shell('完成', '<p>完成品が見つかりません。</p>');
  return shell('完成', `
    <section class="center-card glass-panel result-card">
      <div class="jewelry-preview large metal-${jewelry.metal}" style="--gem:${GEMS[jewelry.gem].hue}">
        <span class="preview-item">${ITEMS[jewelry.item].symbol}</span><i>◆</i>
      </div>
      <h1>${esc(jewelry.name)}が完成しました。</h1>
      <div class="result-stats">
        <span>品質：${esc(QUALITIES[jewelry.quality].name)}</span>
        <span>推奨価格：${yen(jewelry.recommendedPrice)}</span>
        <span>経験値：＋${jewelry.xp}</span>
      </div>
      <div class="button-stack">
        ${jewelry.status === 'order' ? `<button class="primary-button" data-action="nav" data-screen="orders">注文を見る</button>` : state.store.rented ? `<button class="primary-button" data-action="place-from-completion" data-id="${jewelry.id}">店舗に並べる</button>` : '<button class="primary-button" data-action="nav" data-screen="okachimachi">御徒町へ</button>'}
        <button class="secondary-button" data-action="nav" data-screen="inventory">保管する</button>
        <button class="secondary-button" data-action="open-craft">もう一度作る</button>
        <button class="text-button" data-action="nav" data-screen="workshop">工房へ戻る</button>
      </div>
    </section>`, { main: true });
}

function renderInventory() {
  const tab = screenData.tab || 'finished';
  return shell(tab === 'finished' ? '完成品' : '材料', `
    <section class="wide-panel glass-panel">
      <div class="tab-row">
        <button class="${tab === 'finished' ? 'active' : ''}" data-action="inventory-tab" data-tab="finished">完成品</button>
        <button class="${tab === 'materials' ? 'active' : ''}" data-action="inventory-tab" data-tab="materials">材料</button>
      </div>
      ${tab === 'materials' ? renderMaterials() : renderFinishedItems()}
    </section>`, { help: '完成品と、所持している原石・ルース・地金を確認できます。' });
}

function renderMaterials() {
  return `<div class="materials-grid materials-grid-three">
    <section><h2>原石</h2>${Object.values(GEMS).map((gem) => `<div class="material-row"><span class="material-name">${roughVisual(gem.id, 'gem-inline')}<span>${esc(gem.name)}</span></span><strong>${state.inventory.rough[gem.id]}個</strong></div>`).join('')}</section>
    <section><h2>ルース</h2>${Object.values(GEMS).map((gem) => `<div class="material-row"><span class="material-name">${looseVisual(gem.id, 'loose-mini')}<span>${esc(gem.name)}</span></span><strong>${state.inventory.loose[gem.id]}個</strong></div>`).join('')}</section>
    <section><h2>地金</h2>${Object.values(METALS).map((metal) => `<div class="material-row"><span>${esc(metal.name)}</span><strong>${state.inventory.metals[metal.id]}個</strong></div>`).join('')}</section>
  </div>`;
}

function renderFinishedItems() {
  const items = state.inventory.jewelry.filter((item) => item.status !== 'sold');
  if (!items.length) return '<div class="empty-state"><strong>完成品はありません。</strong><p>工房でジュエリーを作ると、ここに表示されます。</p></div>';
  return `<div class="jewelry-grid">${items.map((item) => {
    const status = item.status === 'displayed' ? '陳列中' : item.status === 'order' ? '注文品' : '保管中';
    return `<article class="jewelry-card">
      <div class="small-jewelry metal-${item.metal}" style="--gem:${GEMS[item.gem].hue}"><span>${ITEMS[item.item].symbol}</span><i>◆</i></div>
      <div><h3>${esc(item.name)}</h3><p>${esc(QUALITIES[item.quality].name)}・${yen(item.recommendedPrice)}</p><small>状態：${status}</small></div>
      ${item.status === 'stored' ? state.store.rented ? `<button class="primary-button" data-action="place-item" data-id="${item.id}">店舗に並べる</button>` : '<button class="secondary-button" data-action="nav" data-screen="okachimachi">御徒町へ</button>' : ''}
    </article>`;
  }).join('')}</div>`;
}

function renderStore() {
  if (!state.store.rented) {
    return shell('店舗', '<div class="empty-state"><strong>まだ店舗を借りていません。</strong><p>御徒町の不動産屋で店舗を契約すると利用できます。</p><button class="primary-button" data-action="nav" data-screen="okachimachi">御徒町へ</button></div>');
  }
  const activeVisitors = canServeCustomers() ? Object.keys(CUSTOMERS).filter((id) => state.customers[id].visiting) : [];
  const canExpand = expansionEligible();
  const available = state.inventory.jewelry.filter((item) => item.status === 'stored');
  return shell('店舗', `
    <div class="store-layout">
      <section class="store-scene"></section>
      <section class="store-panel glass-panel">
        <div class="store-summary">
          <div><small>店舗評価</small><strong>★ ${state.store.rating.toFixed(1)}</strong></div>
          <div><small>累計販売</small><strong>${state.store.salesCount}点</strong></div>
          <div><small>累計売上</small><strong>${yen(state.store.totalRevenue)}</strong></div>
        </div>
        ${hasCraftedJewelry() ? '' : '<section class="visitor-box"><h2>接客はまだ利用できません。</h2><p>まず工房でジュエリーを1点制作してください。制作後からお客様が来店するようになります。</p><button class="secondary-button" data-action="nav" data-screen="workshop">工房へ</button></section>'}
        ${activeVisitors.length ? `<section class="visitor-box"><h2>お客様が来店しています。</h2>${activeVisitors.map((id) => `<div><strong>${esc(CUSTOMERS[id].name)}</strong><button class="primary-button" data-action="customer" data-id="${id}">接客する</button><button class="text-button" data-action="ignore-customer" data-id="${id}">今回は対応しない</button></div>`).join('')}</section>` : ''}
        <h2>ショーケース</h2>
        <div class="showcase-grid">${state.store.showcases.map((slot, index) => renderShowcaseSlot(slot, index)).join('')}</div>
        ${available.length ? `<details class="available-items"><summary>商品を並べる</summary><div class="compact-list">${available.map((item) => `<button data-action="place-item" data-id="${item.id}"><span>${esc(item.name)}</span><small>${yen(item.recommendedPrice)}</small></button>`).join('')}</div></details>` : ''}
        <div class="button-grid">
          <button class="secondary-button" data-action="nav" data-screen="inventory">完成品を見る</button>
          <button class="secondary-button" data-action="nav" data-screen="orders">注文を見る</button>
          <button class="secondary-button" data-action="nav" data-screen="expansion">店舗情報</button>
          ${state.store.expanded ? '<button class="secondary-button" data-action="nav" data-screen="employee">店員</button>' : ''}
        </div>
        ${canExpand ? '<p class="success-text">店舗を拡張できます。</p>' : ''}
      </section>
    </div>`, { help: '完成品をショーケースに並べて寝ると、一般のお客様への販売判定が行われます。' });
}

function renderShowcaseSlot(slot, index) {
  if (!slot) return `<article class="showcase-slot empty"><strong>${index + 1}</strong><span>空き</span></article>`;
  const item = state.inventory.jewelry.find((entry) => entry.id === slot.jewelryId);
  if (!item) return `<article class="showcase-slot empty"><strong>${index + 1}</strong><span>空き</span></article>`;
  const price = roundThousand(item.recommendedPrice * PRICE_MODES[slot.priceMode].multiplier);
  return `<article class="showcase-slot">
    <div class="slot-number">${index + 1}</div>
    <div class="small-jewelry metal-${item.metal}" style="--gem:${GEMS[item.gem].hue}"><span>${ITEMS[item.item].symbol}</span><i>◆</i></div>
    <div class="slot-details"><strong>${esc(item.name)}</strong><small>${yen(price)}</small>
      <select data-action="price-mode" data-slot="${index}">
        ${Object.values(PRICE_MODES).map((mode) => `<option value="${mode.id}" ${slot.priceMode === mode.id ? 'selected' : ''}>${esc(mode.name)}</option>`).join('')}
      </select>
      <button class="text-button" data-action="remove-showcase" data-slot="${index}">商品を下げる</button>
    </div>
  </article>`;
}

function renderCustomer() {
  if (!state.store.rented) return shell('お客様', '<div class="empty-state"><strong>店舗を借りてから接客できます。</strong><p>御徒町の不動産屋で契約してください。</p><button class="primary-button" data-action="nav" data-screen="okachimachi">御徒町へ</button></div>');
  if (!hasCraftedJewelry()) return shell('お客様', '<div class="empty-state"><strong>まだ接客できません。</strong><p>工房でジュエリーを1点制作すると接客が解放されます。</p><button class="primary-button" data-action="nav" data-screen="workshop">工房へ</button></div>');
  const customerId = screenData.customerId;
  const customer = CUSTOMERS[customerId];
  const customerState = state.customers[customerId];
  if (!customer || !customerState?.visiting) return shell('お客様', '<div class="empty-state"><strong>現在、接客中のお客様はいません。</strong></div>');
  const candidates = state.inventory.jewelry
    .filter((item) => item.status === 'stored' || item.status === 'displayed')
    .map((item) => ({ item, score: matchScore(item, customer.request) }))
    .sort((a, b) => b.score - a.score);
  const activeOrders = state.orders.filter((order) => !['完了', '取消'].includes(order.status)).length;
  const orderLimit = state.store.expanded ? 2 : 1;
  return shell(customer.name, `
    <div class="customer-layout">
      <section class="customer-stage"><div class="customer-placeholder"><span>人物画像</span><small>後から透過画像を重ねられます</small></div></section>
      <section class="dialog-panel glass-panel">
        <p class="dialog-text">${esc(customer.opening)}</p>
        <article class="request-card"><small>希望</small><strong>${esc(customer.preferenceText)}</strong><span>予算：${yen(customer.request.budget)}</span></article>
        <h2>商品を見せる</h2>
        ${candidates.length ? `<div class="candidate-list">${candidates.slice(0, 4).map(({ item, score }) => `<article><div><strong>${esc(item.name)}</strong><small>${score >= 4 ? 'ぴったり' : score >= 2 ? 'おすすめ' : '少し違う'}・${yen(item.recommendedPrice)}</small></div><button class="primary-button" data-action="customer-buy" data-customer="${customerId}" data-id="${item.id}">見せる</button></article>`).join('')}</div>` : '<p class="small-note">販売できる完成品がありません。</p>'}
        <div class="dialog-actions">
          <button class="secondary-button" data-action="accept-order" data-customer="${customerId}" ${activeOrders >= orderLimit ? 'disabled' : ''}>注文を受ける</button>
          <button class="text-button" data-action="ignore-customer" data-id="${customerId}">今回は対応しない</button>
        </div>
        ${activeOrders >= orderLimit ? `<p class="error-text">同時に受けられる注文は${orderLimit}件までです。</p>` : ''}
      </section>
    </div>`, { help: '希望に合う完成品を見せるか、注文を受けるか、今回は対応しないかを選べます。' });
}

function renderOrders() {
  const active = state.orders.filter((order) => order.status !== '完了');
  return shell('注文', `
    <section class="wide-panel glass-panel">
      ${active.length ? `<div class="order-list">${active.map((order) => {
        const remaining = order.deadlineDay - state.game.day;
        return `<article class="order-card ${remaining < 0 ? 'overdue' : ''}">
          <div><h2>${esc(order.customerName)}</h2><p>${esc(GEMS[order.gem].name)}・${esc(METALS[order.metal].name)}${esc(ITEMS[order.item].name)}</p><small>${esc(DESIGNS[order.design].name)}／${remaining < 0 ? `${Math.abs(remaining)}日遅れ` : remaining === 0 ? '本日が納期' : `納期まであと${remaining}日`}</small></div>
          <div class="order-status"><span>${esc(order.status)}</span><strong>${yen(order.price)}</strong></div>
          <div class="order-actions">
            ${order.status === '受注' ? `<button class="primary-button" data-action="craft-order" data-id="${order.id}">注文の商品を作る</button>` : ''}
            ${order.status === '完成' ? `<button class="primary-button" data-action="deliver-order" data-id="${order.id}">納品する</button>` : ''}
          </div>
        </article>`;
      }).join('')}</div>` : '<div class="empty-state"><strong>現在の注文はありません。</strong><p>注文を受けなくても、通常商品の制作と販売を続けられます。</p></div>'}
      ${state.orders.some((order) => order.status === '完了') ? `<details><summary>完了した注文</summary><div class="history-list">${state.orders.filter((order) => order.status === '完了').map((order) => `<p>${order.customerName}：${GEMS[order.gem].name}${ITEMS[order.item].name}</p>`).join('')}</div></details>` : ''}
    </section>`, { help: '注文は任意です。受けた注文は、指定された条件の商品を作って納品します。' });
}

function renderExpansion() {
  if (!state.store.rented) return shell('店舗情報', '<div class="empty-state"><strong>店舗を借りてから確認できます。</strong><p>御徒町の不動産屋で契約してください。</p><button class="primary-button" data-action="nav" data-screen="okachimachi">御徒町へ</button></div>');
  const eligible = expansionEligible();
  return shell('店舗情報', `
    <section class="center-card glass-panel expansion-card">
      <h1>${state.store.expanded ? '拡張済みの店舗' : '小さな店舗'}</h1>
      <div class="stat-grid">
        <div><small>ショーケース</small><strong>${state.store.showcaseCount}枠</strong></div>
        <div><small>完成品保管</small><strong>${state.inventory.capacity}点</strong></div>
        <div><small>同時注文</small><strong>${state.store.expanded ? 2 : 1}件</strong></div>
        <div><small>店員</small><strong>${state.store.expanded ? '1人' : 'なし'}</strong></div>
      </div>
      ${state.store.expanded ? '<p>この基本版での店舗拡張は完了しています。小さな店のまま遊び続けることもできます。</p>' : `
        <h2>拡張条件</h2>
        <ul class="condition-list">
          <li class="${state.store.salesCount >= 5 ? 'done' : ''}">商品を5点販売：${state.store.salesCount}/5</li>
          <li class="${state.store.totalRevenue >= 100000 ? 'done' : ''}">累計売上100,000円：${yen(state.store.totalRevenue)}</li>
          <li class="${state.game.money >= 50000 ? 'done' : ''}">所持金50,000円：${yen(state.game.money)}</li>
        </ul>
        <p>拡張費：${yen(50000)}</p>
        <button class="primary-button full-button" data-action="expand-store" ${eligible ? '' : 'disabled'}>店舗を拡張する</button>
        <p class="small-note">条件を満たしても、拡張するかどうかは自由です。</p>`}
    </section>`, { help: '条件を満たすと店舗を1回拡張できます。拡張は必須ではありません。' });
}

function renderEmployee() {
  if (!state.store.rented) return shell('店員', '<div class="empty-state"><strong>店舗を借りてから利用できます。</strong></div>');
  if (!state.store.expanded) return shell('店員', '<div class="empty-state"><strong>店舗拡張後に利用できます。</strong></div>');
  return shell('店員', `
    <section class="center-card glass-panel employee-card">
      ${state.employee.hired ? `
        <h1>${esc(state.employee.name)}</h1>
        <p>勤務した日は、1日の終わりに給与2,000円を支払います。</p>
        <fieldset class="craft-field"><legend>担当</legend><div class="choice-grid three">
          <button class="choice-card ${state.employee.role === 'service' ? 'selected' : ''}" data-action="employee-role" data-role="service"><strong>接客</strong><small>固定客が来店しやすい</small></button>
          <button class="choice-card ${state.employee.role === 'sales' ? 'selected' : ''}" data-action="employee-role" data-role="sales"><strong>販売</strong><small>商品が少し売れやすい</small></button>
          <button class="choice-card ${state.employee.role === 'craft' ? 'selected' : ''}" data-action="employee-role" data-role="craft"><strong>制作補助</strong><small>制作時間を1時間短縮</small></button>
        </div></fieldset>
        <label class="toggle-row"><span>本日勤務する</span><input type="checkbox" data-action="employee-working" ${state.employee.working ? 'checked' : ''}></label>` : `
        <h1>店員を1人雇えます。</h1>
        <article class="candidate-card"><h2>田中 葵</h2><p>接客・販売・制作補助のいずれかを担当できます。</p><small>給与：勤務日ごとに2,000円</small></article>
        <button class="primary-button full-button" data-action="hire-employee">雇う</button>`}
    </section>`, { help: '店員は1人だけ雇えます。担当を1つ選ぶ簡単な仕組みです。' });
}

function renderPhone() {
  if (phoneTab === 'notifications') state.notifications.forEach((note) => { note.unread = false; });
  return shell('スマートフォン', `
    <div class="phone-stage">
      <section class="phone-ui">
        <nav class="phone-tabs">
          <button class="${phoneTab === 'orders' ? 'active' : ''}" data-action="phone-tab" data-tab="orders">注文</button>
          <button class="${phoneTab === 'calendar' ? 'active' : ''}" data-action="phone-tab" data-tab="calendar">予定</button>
          <button class="${phoneTab === 'notifications' ? 'active' : ''}" data-action="phone-tab" data-tab="notifications">通知</button>
          <button class="${phoneTab === 'finance' ? 'active' : ''}" data-action="phone-tab" data-tab="finance">収支</button>
          <button class="${phoneTab === 'settings' ? 'active' : ''}" data-action="phone-tab" data-tab="settings">設定</button>
        </nav>
        <div class="phone-content">${renderPhoneContent()}</div>
      </section>
    </div>`, { help: '注文、予定、通知、収支、設定を確認できます。確認するだけでは時間は進みません。' });
}

function renderPhoneContent() {
  if (phoneTab === 'orders') {
    const orders = state.orders.filter((order) => order.status !== '完了');
    return orders.length ? orders.map((order) => `<article class="phone-card"><strong>${esc(order.customerName)}</strong><span>${esc(GEMS[order.gem].name)}${esc(ITEMS[order.item].name)}</span><small>${esc(order.status)}・${order.deadlineDay - state.game.day >= 0 ? `あと${order.deadlineDay - state.game.day}日` : '期限超過'}</small></article>`).join('') : '<div class="phone-empty">注文はありません。</div>';
  }
  if (phoneTab === 'calendar') {
    const orders = state.orders.filter((order) => order.status !== '完了');
    const visitors = Object.keys(CUSTOMERS).filter((id) => state.customers[id].visiting);
    return `<h2>${state.game.day}日目</h2>
      ${orders.map((order) => `<article class="phone-card"><strong>${order.deadlineDay}日目</strong><span>${esc(order.customerName)}さんの納期</span></article>`).join('')}
      ${visitors.map((id) => `<article class="phone-card"><strong>本日</strong><span>${esc(CUSTOMERS[id].name)}さんが来店中</span></article>`).join('')}
      ${!orders.length && !visitors.length ? '<div class="phone-empty">予定はありません。</div>' : ''}`;
  }
  if (phoneTab === 'notifications') {
    return state.notifications.length ? state.notifications.map((note) => `<article class="phone-card"><strong>${esc(note.title)}</strong><span>${esc(note.body)}</span><small>${note.day}日目</small></article>`).join('') : '<div class="phone-empty">通知はありません。</div>';
  }
  if (phoneTab === 'finance') {
    const income = state.finance.reduce((sum, row) => sum + row.income, 0);
    const expense = state.finance.reduce((sum, row) => sum + row.expense, 0);
    return `<div class="phone-totals"><div><small>収入</small><strong>${yen(income)}</strong></div><div><small>支出</small><strong>${yen(expense)}</strong></div></div>
      ${state.finance.slice().reverse().map((row) => `<article class="finance-row"><span>${row.day}日目 ${esc(row.label)}</span><strong class="${row.income ? 'income' : 'expense'}">${row.income ? `+${yen(row.income)}` : `-${yen(row.expense)}`}</strong></article>`).join('') || '<div class="phone-empty">収支の記録はありません。</div>'}`;
  }
  return renderSettingsForm(false, true);
}

function renderSettings(titleMode) {
  const settings = titleMode ? titleSettings : state.settings;
  return titleMode ? `
    <main class="screen-shell">
      <header class="game-header simple"><button class="icon-button" data-action="title-back">←</button><strong>設定</strong></header>
      <section class="screen-content"><section class="center-card glass-panel">${renderSettingsForm(true, false)}</section></section>
    </main>` : shell('設定', `<section class="center-card glass-panel">${renderSettingsForm(false, false)}</section>`);
}

function renderSettingsForm(titleMode, compact) {
  const settings = titleMode ? titleSettings : state.settings;
  return `<div class="settings-form ${compact ? 'compact' : ''}">
    <label><span>音楽</span><input type="range" min="0" max="1" step="0.05" value="${settings.bgmVolume}" data-setting="bgmVolume" data-title-mode="${titleMode}"></label>
    <label><span>環境音</span><input type="range" min="0" max="1" step="0.05" value="${settings.ambientVolume}" data-setting="ambientVolume" data-title-mode="${titleMode}"></label>
    <label><span>効果音</span><input type="range" min="0" max="1" step="0.05" value="${settings.sfxVolume}" data-setting="sfxVolume" data-title-mode="${titleMode}"></label>
    <label class="toggle-row"><span>音楽を消す</span><input type="checkbox" data-setting="bgmMuted" data-title-mode="${titleMode}" ${settings.bgmMuted ? 'checked' : ''}></label>
    <label class="toggle-row"><span>環境音を消す</span><input type="checkbox" data-setting="ambientMuted" data-title-mode="${titleMode}" ${settings.ambientMuted ? 'checked' : ''}></label>
    <label class="toggle-row"><span>効果音を消す</span><input type="checkbox" data-setting="sfxMuted" data-title-mode="${titleMode}" ${settings.sfxMuted ? 'checked' : ''}></label>
    <label><span>文字の大きさ</span><select data-setting="textSize" data-title-mode="${titleMode}"><option value="normal" ${settings.textSize === 'normal' ? 'selected' : ''}>標準</option><option value="large" ${settings.textSize === 'large' ? 'selected' : ''}>大きい</option></select></label>
    <small>バージョン ${VERSION}</small>
    ${!titleMode && !compact ? '<button class="secondary-button full-button" data-action="logout">ログアウト</button><button class="danger-button full-button" data-action="delete-save">セーブデータを消す</button>' : ''}
  </div>`;
}

function renderDayResult() {
  const result = state.store.lastResult;
  if (!result) return shell('1日の結果', '<p>結果がありません。</p>', { main: false });
  return `
    <main class="day-result-screen">
      <section class="sleep-card glass-panel">
        <h1>${result.day}日目の結果</h1>
        <div class="result-list">
          <div><span>採掘した原石</span><strong>${result.mined.length ? result.mined.map((entry) => `${GEMS[entry.gem].name}${entry.qty}個`).join('、') : 'なし'}</strong></div>
          <div><span>研磨</span><strong>${result.polished?.length ? result.polished.map((entry) => `${GEMS[entry.gem].name}${entry.qty}個`).join('、') : 'なし'}</strong></div>
          <div><span>原石売却</span><strong>${result.roughSold?.length || 0}個</strong></div>
          <div><span>制作</span><strong>${result.crafted.length}点</strong></div>
          <div><span>販売</span><strong>${result.sold.length}点</strong></div>
          <div><span>来店人数</span><strong>${result.visitors}人</strong></div>
          <div><span>売上</span><strong>${yen(result.income)}</strong></div>
          <div><span>支出</span><strong>${yen(result.expense)}</strong></div>
        </div>
        <p class="goodnight">お疲れ様でした。おやすみなさい。</p>
        <button class="primary-button full-button" data-action="next-day">次の日へ</button>
      </section>
    </main>`;
}

function weightedPick(entries) {
  const total = entries.reduce((sum, entry) => sum + entry.weight, 0);
  let roll = Math.random() * total;
  for (const entry of entries) {
    roll -= entry.weight;
    if (roll <= 0) return entry.id;
  }
  return entries.at(-1).id;
}

function mine() {
  const location = MINING_LOCATIONS[selectedMining];
  if (!canSpendHours(location.hours)) return showToast('今日は採掘する時間がありません。', 'error');
  spendHours(location.hours);
  const success = state.miningMisses >= 1 || Math.random() < 0.83;
  let result = null;
  if (success) {
    const gem = weightedPick(location.gems);
    const qty = Math.random() < 0.18 ? 2 : 1;
    state.inventory.rough[gem] += qty;
    state.daily.mined.push({ gem, qty });
    state.miningMisses = 0;
    result = { gem, qty };
    playSfx('success');
    vibrate([30, 30, 50]);
  } else {
    state.miningMisses += 1;
    playSfx('impact');
  }
  saveGame();
  setScreen('miningResult', { result });
}

function purchase(kind, id) {
  const product = kind === 'metal' ? METALS[id] : kind === 'loose' ? GEMS[id] : null;
  if (!product) return showToast('この商品は購入できません。', 'error');
  if (!canSpendHours(1)) return showToast('今日は購入手続きをする時間がありません。', 'error');
  if (state.game.money < product.price) return showToast('所持金が足りません。', 'error');
  state.game.money -= product.price;
  if (kind === 'metal') state.inventory.metals[id] += 1;
  else state.inventory.loose[id] += 1;
  spendHours(1);
  addFinance(`${product.name}${kind === 'loose' ? 'ルース' : ''}を購入`, 0, product.price);
  saveGame();
  showToast(`${product.name}${kind === 'loose' ? 'ルース' : ''}を購入しました。`);
  render();
}

function sellRough(id) {
  const gem = GEMS[id];
  if (!gem || state.inventory.rough[id] < 1) return showToast('売却できる原石がありません。', 'error');
  if (!canSpendHours(1)) return showToast('今日は売却手続きをする時間がありません。', 'error');
  const price = roughSalePrice(id);
  state.inventory.rough[id] -= 1;
  state.game.money += price;
  spendHours(1);
  state.daily.roughSold.push({ gem: id, qty: 1, price });
  addFinance(`${gem.name}原石を素材屋へ売却`, price, 0);
  saveGame();
  showToast(`${gem.name}原石を${yen(price)}で売却しました。`);
  render();
}

function buyPolishingMachine() {
  if (state.tools.polishingMachine) return showToast('研磨機は購入済みです。');
  if (state.game.money < POLISHING_MACHINE_PRICE) return showToast('研磨機を購入する所持金が足りません。', 'error');
  if (!canSpendHours(1)) return showToast('今日は購入手続きをする時間がありません。', 'error');
  state.game.money -= POLISHING_MACHINE_PRICE;
  spendHours(1);
  state.tools.polishingMachine = true;
  state.tools.polishingMachineDay = state.game.day;
  addFinance('g-Lab.で原石研磨機を購入', 0, POLISHING_MACHINE_PRICE);
  addNotification('原石研磨機を購入しました', '工房で原石をルースへ研磨できるようになりました。');
  saveGame();
  playSfx('success');
  showToast('原石研磨機を購入しました。');
  render();
}

function polishRough() {
  const gem = GEMS[selectedPolishing];
  if (!state.tools.polishingMachine) return showToast('原石研磨機が必要です。', 'error');
  if (!gem || state.inventory.rough[selectedPolishing] < 1) return showToast('選択した原石を持っていません。', 'error');
  if (!canSpendHours(POLISHING_HOURS)) return showToast('今日は研磨する時間がありません。', 'error');
  state.inventory.rough[selectedPolishing] -= 1;
  state.inventory.loose[selectedPolishing] += 1;
  spendHours(POLISHING_HOURS);
  state.daily.polished.push({ gem: selectedPolishing, qty: 1 });
  saveGame();
  playSfx('success');
  vibrate([35, 25, 55]);
  showToast(`${gem.name}原石をルースへ研磨しました。`);
  render();
}

function qualityRoll() {
  const r = Math.random();
  if (state.artisan.level <= 1) return r < 0.72 ? 'standard' : 'good';
  if (state.artisan.level === 2) return r < 0.18 ? 'standard' : r < 0.82 ? 'good' : 'premium';
  return r < 0.55 ? 'good' : 'premium';
}

function expectedQuality() {
  if (state.artisan.level === 1) return 'standard';
  if (state.artisan.level === 2) return 'good';
  return 'premium';
}

function confirmCraft() {
  const hours = productionHours(craftDraft, state.employee);
  showModal({
    title: 'この内容で制作しますか？',
    body: `<p><strong>${esc(itemName(craftDraft))}</strong></p><p>制作時間：${hours}時間</p><p>${esc(GEMS[craftDraft.gem].name)}ルース1個・${esc(METALS[craftDraft.metal].name)}1個を使用します。</p>`,
    confirm: '制作する', action: 'craft',
  });
}

function craft() {
  closeModal();
  const hours = productionHours(craftDraft, state.employee);
  if (!canSpendHours(hours)) return showToast('今日は制作する時間がありません。', 'error');
  if (state.inventory.loose[craftDraft.gem] < 1 || state.inventory.metals[craftDraft.metal] < 1) return showToast('材料が足りません。', 'error');
  if (state.inventory.jewelry.filter((item) => item.status !== 'sold').length >= state.inventory.capacity) return showToast('完成品の保管場所に空きがありません。', 'error');
  state.inventory.loose[craftDraft.gem] -= 1;
  state.inventory.metals[craftDraft.metal] -= 1;
  spendHours(hours);
  const quality = qualityRoll();
  const xp = ITEMS[craftDraft.item].id === 'earrings' ? 12 : 10;
  const jewelry = {
    id: uid(),
    ...craftDraft,
    name: itemName(craftDraft),
    quality,
    cost: productionCost(craftDraft),
    recommendedPrice: recommendedPrice({ ...craftDraft, quality }),
    xp,
    status: craftDraft.orderId ? 'order' : 'stored',
    createdDay: state.game.day,
  };
  state.inventory.jewelry.push(jewelry);
  state.daily.crafted.push(jewelry.id);
  state.artisan.xp += xp;
  const previousLevel = state.artisan.level;
  state.artisan.level = state.artisan.xp >= 250 ? 3 : state.artisan.xp >= 100 ? 2 : 1;
  if (state.artisan.level > previousLevel) addNotification('職人レベルが上がりました', `職人レベル${state.artisan.level}になりました。`);
  if (craftDraft.orderId) {
    const order = state.orders.find((entry) => entry.id === craftDraft.orderId);
    if (order) {
      order.status = '完成';
      order.jewelryId = jewelry.id;
      addNotification('注文品が完成しました', `${order.customerName}さんの注文品を納品できます。`);
    }
  }
  completionId = jewelry.id;
  craftDraft = null;
  saveGame();
  playSfx('success');
  vibrate([40, 30, 70]);
  setScreen('completion');
}

function placeItem(itemId) {
  if (!state.store.rented) {
    showToast('先に御徒町の不動産屋で店舗を借りてください。', 'error');
    return setScreen('realEstate');
  }
  const item = state.inventory.jewelry.find((entry) => entry.id === itemId);
  if (!item || item.status !== 'stored') return showToast('この商品は並べられません。', 'error');
  const emptySlot = state.store.showcases.findIndex((slot) => !slot);
  if (emptySlot < 0) return showToast('ショーケースに空きがありません。', 'error');
  state.store.showcases[emptySlot] = { jewelryId: itemId, priceMode: 'standard' };
  item.status = 'displayed';
  saveGame();
  showToast('商品をショーケースに並べました。');
  setScreen('store', {}, false);
}

function removeShowcase(slotIndex) {
  const slot = state.store.showcases[slotIndex];
  if (!slot) return;
  const item = state.inventory.jewelry.find((entry) => entry.id === slot.jewelryId);
  if (item) item.status = 'stored';
  state.store.showcases[slotIndex] = null;
  saveGame();
  showToast('商品をショーケースから下げました。');
  render();
}

function matchScore(item, request) {
  let score = 0;
  if (item.item === request.item) score += 2;
  if (item.gem === request.gem) score += 2;
  if (item.metal === request.metal) score += 2;
  if (item.design === request.design) score += 1;
  if (item.recommendedPrice <= request.budget) score += 1;
  return score;
}

function removeJewelry(itemId) {
  state.store.showcases = state.store.showcases.map((slot) => slot?.jewelryId === itemId ? null : slot);
  const item = state.inventory.jewelry.find((entry) => entry.id === itemId);
  if (item) item.status = 'sold';
}

function customerBuy(customerId, itemId) {
  if (!canServeCustomers()) return showToast('現在は接客できません。', 'error');
  const customer = CUSTOMERS[customerId];
  const customerState = state.customers[customerId];
  const item = state.inventory.jewelry.find((entry) => entry.id === itemId);
  if (!customer || !item) return;
  if (!canSpendHours(1)) return showToast('今日は接客する時間がありません。', 'error');
  const score = matchScore(item, customer.request);
  const price = item.recommendedPrice;
  const willBuy = score >= 5 || (score >= 3 && Math.random() < 0.65);
  spendHours(1);
  customerState.met = true;
  customerState.lastVisitDay = state.game.day;
  customerState.visiting = false;
  if (willBuy) {
    removeJewelry(itemId);
    state.game.money += price;
    state.store.salesCount += 1;
    state.store.totalRevenue += price;
    state.store.totalProfit += price - item.cost;
    state.store.rating = clamp(state.store.rating + (score >= 7 ? 0.2 : 0.1), 1, 5);
    customerState.purchases += 1;
    customerState.relation = customerState.purchases >= 3 ? '常連客' : 'リピーター';
    addFinance(`${customer.name}さんへ販売`, price, 0);
    showModal({ title: '商品を購入していただきました。', body: `<p>${esc(item.name)}</p><p>売上：${yen(price)}</p>`, confirm: '閉じる', action: 'modal-close', hideCancel: true });
  } else {
    showModal({ title: '今回は購入されませんでした。', body: '<p>希望とは少し違ったようです。注文を受けなくても、また来店することがあります。</p>', confirm: '閉じる', action: 'modal-close', hideCancel: true });
  }
  saveGame();
  setTimeout(() => { if (screen === 'customer') setScreen('store', {}, false); }, 50);
}

function acceptOrder(customerId) {
  if (!canServeCustomers()) return showToast('現在は接客できません。', 'error');
  const customer = CUSTOMERS[customerId];
  const customerState = state.customers[customerId];
  const active = state.orders.filter((order) => order.status !== '完了').length;
  const limit = state.store.expanded ? 2 : 1;
  if (active >= limit) return showToast(`同時に受けられる注文は${limit}件までです。`, 'error');
  if (!canSpendHours(1)) return showToast('今日は接客する時間がありません。', 'error');
  const request = customer.request;
  const estimated = recommendedPrice({ ...request, finish: 'mirror', quality: 'good' }) + 5000;
  const order = {
    id: uid(), customerId, customerName: customer.name,
    item: request.item, gem: request.gem, metal: request.metal, design: request.design,
    budget: request.budget, price: Math.min(request.budget, estimated),
    acceptedDay: state.game.day, deadlineDay: state.game.day + request.deadlineDays,
    status: '受注', jewelryId: null,
  };
  state.orders.push(order);
  spendHours(1);
  customerState.met = true;
  customerState.visiting = false;
  customerState.lastVisitDay = state.game.day;
  addNotification('注文を受けました', `${customer.name}さんの注文は${order.deadlineDay}日目が納期です。`);
  saveGame();
  showToast('注文を受けました。');
  setScreen('orders', {}, false);
}

function ignoreCustomer(customerId) {
  const customerState = state.customers[customerId];
  if (!customerState) return;
  customerState.visiting = false;
  customerState.ignoredToday = true;
  saveGame();
  showToast('今回は対応しませんでした。');
  setScreen('store', {}, false);
}

function deliverOrder(orderId) {
  const order = state.orders.find((entry) => entry.id === orderId);
  const item = state.inventory.jewelry.find((entry) => entry.id === order?.jewelryId);
  if (!order || !item || order.status !== '完成') return showToast('納品できる商品がありません。', 'error');
  if (!canSpendHours(1)) return showToast('今日は納品する時間がありません。', 'error');
  spendHours(1);
  const lateDays = Math.max(0, state.game.day - order.deadlineDay);
  order.status = '完了';
  item.status = 'sold';
  state.game.money += order.price;
  state.store.salesCount += 1;
  state.store.totalRevenue += order.price;
  state.store.totalProfit += order.price - item.cost;
  state.store.rating = clamp(state.store.rating + (lateDays ? -0.05 : 0.2), 1, 5);
  const customerState = state.customers[order.customerId];
  customerState.purchases += 1;
  customerState.relation = customerState.purchases >= 3 ? '常連客' : 'リピーター';
  addFinance(`${order.customerName}さんへ注文品を納品`, order.price, 0);
  saveGame();
  showModal({ title: '注文品を納品しました。', body: `<p>${esc(item.name)}</p><p>売上：${yen(order.price)}</p><p>${lateDays ? '少し遅れての納品になりました。' : '納期内に納品できました。'}</p>`, confirm: '閉じる', action: 'modal-close', hideCancel: true });
  render();
}

function rentStore() {
  if (state.store.rented) return setScreen('store', {}, false);
  if (state.game.money < STORE_LEASE_COST) return showToast('店舗の契約費が足りません。', 'error');
  if (!canSpendHours(1)) return showToast('今日は契約手続きをする時間がありません。', 'error');
  state.game.money -= STORE_LEASE_COST;
  spendHours(1);
  state.store.rented = true;
  state.store.rentedDay = state.game.day;
  addFinance('小さな店舗を契約', 0, STORE_LEASE_COST);
  addNotification('店舗を借りました', '完成品をショーケースに並べられるようになりました。');
  saveGame();
  playSfx('success');
  showToast('小さな店舗を借りました。');
  setScreen('store', {}, false);
}

function expansionEligible() {
  return state.store.rented && !state.store.expanded && state.store.salesCount >= 5 && state.store.totalRevenue >= 100000 && state.game.money >= 50000;
}

function expandStore() {
  if (!expansionEligible()) return;
  state.game.money -= 50000;
  state.store.expanded = true;
  state.store.showcaseCount = 5;
  while (state.store.showcases.length < 5) state.store.showcases.push(null);
  state.inventory.capacity = 20;
  addFinance('店舗を拡張', 0, 50000);
  addNotification('店舗を拡張しました', 'ショーケースが5枠になり、店員を1人雇えるようになりました。');
  saveGame();
  playSfx('success');
  showToast('店舗を拡張しました。');
  render();
}

function settleDay() {
  const sold = [];
  let visitors = state.store.rented ? Math.floor(Math.random() * 4) + 1 : 0;
  if (state.store.rented && state.store.expanded) visitors += Math.floor(Math.random() * 3) + 1;
  if (state.store.rented && state.game.weather === '雨') visitors = Math.max(0, visitors - 1);
  if (state.store.rented && state.employee.hired && state.employee.working && state.employee.role === 'sales') visitors += 1;

  if (state.store.rented) for (let i = 0; i < state.store.showcases.length; i += 1) {
    const slot = state.store.showcases[i];
    if (!slot) continue;
    const item = state.inventory.jewelry.find((entry) => entry.id === slot.jewelryId);
    if (!item) { state.store.showcases[i] = null; continue; }
    const mode = PRICE_MODES[slot.priceMode];
    const price = roundThousand(item.recommendedPrice * mode.multiplier);
    let chance = 0.24 + visitors * 0.055 + mode.saleBonus + QUALITIES[item.quality].saleBonus + state.store.rating * 0.018;
    if (state.employee.hired && state.employee.working && state.employee.role === 'sales') chance += 0.1;
    chance = clamp(chance, 0.08, 0.9);
    if (Math.random() < chance) {
      removeJewelry(item.id);
      state.game.money += price;
      state.store.salesCount += 1;
      state.store.totalRevenue += price;
      state.store.totalProfit += price - item.cost;
      state.store.rating = clamp(state.store.rating + 0.04, 1, 5);
      addFinance(`${item.name}を販売`, price, 0);
      sold.push({ itemId: item.id, name: item.name, price, profit: price - item.cost });
    }
  }

  state.store.totalVisitors += visitors;
  state.daily.visitors = visitors;
  state.daily.sold.push(...sold);

  if (state.store.rented && state.employee.hired && state.employee.working) {
    const salary = 2000;
    state.game.money = Math.max(0, state.game.money - salary);
    addFinance(`${state.employee.name}さんの給与`, 0, salary);
  }

  const result = {
    day: state.game.day,
    mined: structuredClone(state.daily.mined),
    polished: structuredClone(state.daily.polished),
    roughSold: structuredClone(state.daily.roughSold),
    crafted: structuredClone(state.daily.crafted),
    sold: structuredClone(state.daily.sold),
    visitors,
    income: state.daily.income,
    expense: state.daily.expense,
  };
  state.store.lastResult = result;

  state.game.day += 1;
  state.game.minutes = 8 * 60;
  state.game.weather = nextWeather();
  state.daily = { mined: [], polished: [], roughSold: [], crafted: [], sold: [], visitors: 0, income: 0, expense: 0 };
  Object.values(state.customers).forEach((customer) => { customer.ignoredToday = false; });
  scheduleCustomerVisit();
  updateOrderNotifications();
  saveGame();
  setScreen('dayResult', {}, false);
}

function scheduleCustomerVisit() {
  if (!canServeCustomers()) {
    Object.values(state.customers).forEach((customer) => { customer.visiting = false; });
    return;
  }
  if (Object.values(state.customers).some((customer) => customer.visiting)) return;
  const employeeBonus = state.employee.hired && state.employee.working && state.employee.role === 'service' ? 0.12 : 0;
  if (!state.customers.misaki.met && state.game.day >= 2 && Math.random() < 0.38 + employeeBonus) {
    state.customers.misaki.visiting = true;
    addNotification('お客様が来店しています', `${CUSTOMERS.misaki.name}さんが店舗に来ています。`);
    return;
  }
  if (state.customers.misaki.met && !state.customers.kenta.met && state.game.day >= 3 && Math.random() < 0.32 + employeeBonus) {
    state.customers.kenta.visiting = true;
    addNotification('お客様が来店しています', `${CUSTOMERS.kenta.name}さんが店舗に来ています。`);
    return;
  }
  const known = Object.keys(CUSTOMERS).filter((id) => state.customers[id].met && state.game.day - (state.customers[id].lastVisitDay || 0) >= 3);
  if (known.length && Math.random() < 0.18 + employeeBonus) {
    const id = known[Math.floor(Math.random() * known.length)];
    state.customers[id].visiting = true;
    addNotification('お客様が来店しています', `${CUSTOMERS[id].name}さんが店舗に来ています。`);
  }
}

function updateOrderNotifications() {
  state.orders.filter((order) => !['完了', '取消'].includes(order.status)).forEach((order) => {
    const remaining = order.deadlineDay - state.game.day;
    if (remaining === 1) addNotification('明日が納期です', `${order.customerName}さんの注文は明日が納期です。`, 'warning');
    if (remaining === 0) addNotification('本日が納期です', `${order.customerName}さんの注文は本日が納期です。`, 'warning');
    if (remaining < 0 && order.status !== '完成') addNotification('注文の納期を過ぎています', `${order.customerName}さんの注文を確認してください。`, 'warning');
  });
}

function confirmSleep() {
  showModal({ title: '今日はもう休みますか？', body: '<p>寝ると一般のお客様への販売判定を行い、翌日へ進みます。</p>', confirm: '寝る', cancel: 'まだ起きている', action: 'do-sleep', className: 'sleep-confirm-modal' });
}

async function deleteSave() {
  if (!currentUser) return;
  try {
    await deleteGameData(currentUser.uid);
    localStorage.removeItem(localSaveKey());
    localStorage.setItem(freshStartFlagKey(), '1');
    cloudSave = null;
    state = null;
    screen = 'title';
    navigation = [];
    closeModal();
    showToast('セーブデータを消しました。');
    render();
  } catch (error) {
    console.error(error);
    showToast('セーブデータを削除できませんでした。', 'error');
  }
}

root.addEventListener('click', async (event) => {
  const button = event.target.closest('[data-action]');
  if (!button || button.disabled) return;
  const action = button.dataset.action;
  playSfx('select');
  switch (action) {
    case 'google-login':
      try { await googleLogin(); } catch (error) { showToast(firebaseErrorMessage(error), 'error'); }
      break;
    case 'email-login': {
      const email = document.querySelector('#login-email')?.value.trim() || '';
      const password = document.querySelector('#login-password')?.value || '';
      if (!email || !password) { showToast('メールアドレスとパスワードを入力してください。', 'error'); break; }
      try { await emailLogin(email, password); } catch (error) { showToast(firebaseErrorMessage(error), 'error'); }
      break;
    }
    case 'email-signup': {
      const email = document.querySelector('#login-email')?.value.trim() || '';
      const password = document.querySelector('#login-password')?.value || '';
      if (!email || !password) { showToast('メールアドレスと6文字以上のパスワードを入力してください。', 'error'); break; }
      try { await emailSignup(email, password); } catch (error) { showToast(firebaseErrorMessage(error), 'error'); }
      break;
    }
    case 'logout':
      try { await saveQueue.catch(() => {}); await logout(); } catch (error) { showToast(firebaseErrorMessage(error), 'error'); }
      break;
    case 'start':
      if (hasSave()) {
        state = loadGame();
        if (!state) return showToast('セーブデータを読み込めませんでした。', 'error');
        navigation = [];
        setScreen('main', {}, false);
      } else {
        startNewGame();
      }
      break;
    case 'nav': setScreen(button.dataset.screen, button.dataset.screen === 'supplier' ? { tab: button.dataset.tab || 'metals' } : {}); break;
    case 'rent-store': rentStore(); break;
    case 'back': goBack(); break;
    case 'main': goMain(); break;
    case 'help': showModal({ title: '説明', body: `<p>${esc(button.dataset.help)}</p>`, confirm: '閉じる', action: 'modal-close', hideCancel: true }); break;
    case 'modal-close': closeModal(); break;
    case 'reload-page': location.reload(); break;
    case 'select-mining': selectedMining = button.dataset.id; render(); break;
    case 'mine': mine(); break;
    case 'mine-again': setScreen('mining', {}, false); break;
    case 'supplier-tab': screenData.tab = button.dataset.tab; render(); break;
    case 'glab-info': showModal({ title: 'g-Lab.', body: '<p>御徒町のジュエリー工房です。ゲーム内では原石研磨機などの工房設備を購入できます。</p>', confirm: '閉じる', action: 'modal-close', hideCancel: true }); break;
    case 'purchase': purchase(button.dataset.kind, button.dataset.id); break;
    case 'sell-rough': sellRough(button.dataset.id); break;
    case 'buy-polishing-machine': buyPolishingMachine(); break;
    case 'select-polishing': selectedPolishing = button.dataset.id; render(); break;
    case 'polish-rough': polishRough(); break;
    case 'open-craft': craftDraft = defaultDraft(); setScreen('craft', {}); break;
    case 'craft-choice': craftDraft[button.dataset.group] = button.dataset.id; render(); break;
    case 'confirm-craft': confirmCraft(); break;
    case 'craft': craft(); break;
    case 'place-from-completion': placeItem(button.dataset.id); break;
    case 'inventory-tab': screenData.tab = button.dataset.tab; render(); break;
    case 'place-item': placeItem(button.dataset.id); break;
    case 'remove-showcase': removeShowcase(Number(button.dataset.slot)); break;
    case 'customer':
      if (!canServeCustomers()) showToast(state.store.rented ? 'まずジュエリーを1点制作してください。' : '先に御徒町の不動産屋で店舗を借りてください。', 'error');
      else setScreen('customer', { customerId: button.dataset.id });
      break;
    case 'ignore-customer': ignoreCustomer(button.dataset.id); break;
    case 'customer-buy': customerBuy(button.dataset.customer, button.dataset.id); break;
    case 'accept-order': acceptOrder(button.dataset.customer); break;
    case 'craft-order': craftDraft = defaultDraft(button.dataset.id); setScreen('craft', { orderId: button.dataset.id }); break;
    case 'deliver-order': deliverOrder(button.dataset.id); break;
    case 'expand-store': expandStore(); break;
    case 'hire-employee': state.employee.hired = true; state.employee.working = true; saveGame(); showToast('店員を雇いました。'); render(); break;
    case 'employee-role': state.employee.role = button.dataset.role; saveGame(); render(); break;
    case 'phone-tab': phoneTab = button.dataset.tab; render(); saveGame(); break;
    case 'sleep': confirmSleep(); break;
    case 'do-sleep': closeModal(); settleDay(); break;
    case 'next-day': goMain(); break;
    case 'delete-save': showModal({ title: 'セーブデータを消しますか？', body: '<p>この操作は元に戻せません。</p>', confirm: '消す', cancel: 'キャンセル', danger: true, action: 'delete-save-confirmed' }); break;
    case 'delete-save-confirmed': await deleteSave(); break;
    default: break;
  }
});

root.addEventListener('change', (event) => {
  const target = event.target;
  if (target.matches('[data-action="price-mode"]')) {
    const slot = state.store.showcases[Number(target.dataset.slot)];
    if (slot) slot.priceMode = target.value;
    saveGame();
    showToast('価格を変更しました。');
    render();
    return;
  }
  if (target.matches('[data-action="employee-working"]')) {
    state.employee.working = target.checked;
    saveGame();
    render();
    return;
  }
  if (target.matches('[data-setting]')) {
    const titleMode = target.dataset.titleMode === 'true';
    const settings = titleMode ? titleSettings : state.settings;
    const key = target.dataset.setting;
    settings[key] = target.type === 'checkbox' ? target.checked : target.type === 'range' ? Number(target.value) : target.value;
    if (titleMode) {
      titleSettings = settings;
      localStorage.setItem(`${SAVE_KEY}-settings`, JSON.stringify(settings));
    } else saveGame();
    applyAudioSettings();
    document.body.dataset.textSize = settings.textSize || 'normal';
  }
});

root.addEventListener('input', (event) => {
  const target = event.target;
  if (!target.matches('[data-setting]') || target.type !== 'range') return;
  const titleMode = target.dataset.titleMode === 'true';
  const settings = titleMode ? titleSettings : state.settings;
  settings[target.dataset.setting] = Number(target.value);
  applyAudioSettings();
});

function startNewGame() {
  localStorage.removeItem(freshStartFlagKey());
  state = initialState();
  state.settings = { ...state.settings, ...titleSettings };
  navigation = [];
  craftDraft = null;
  completionId = null;
  saveGame();
  setScreen('main', {}, false);
}

window.addEventListener('beforeunload', () => saveLocalBackup());
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').then((registration) => registration.update()).catch(() => {}));
}

async function boot() {
  render();
  try {
    await initializeFirebase();
    observeAuth(async (user) => {
      authReady = true;
      currentUser = user;
      state = null;
      navigation = [];
      sessionTakenOver = false;
      if (stopSessionWatch) stopSessionWatch();
      if (heartbeatTimer) clearInterval(heartbeatTimer);
      if (!user) {
        cloudSave = null;
        screen = 'login';
        render();
        return;
      }
      screen = 'loading';
      render();
      try {
        cloudSave = await loadState(user.uid);
        if (cloudSave) localStorage.setItem(localSaveKey(), JSON.stringify(cloudSave));
        await claimSession(user.uid, sessionId);
        stopSessionWatch = watchSession(user.uid, sessionId, () => {
          sessionTakenOver = true;
          showModal({
            title: '別の端末でゲームが開始されました',
            body: '<p>続けるには、この画面を再読み込みしてください。</p>',
            confirm: '再読み込み',
            action: 'reload-page',
            hideCancel: true,
          });
        });
        heartbeatTimer = setInterval(() => heartbeat(user.uid, sessionId), 60000);
        screen = 'title';
        render();
      } catch (error) {
        console.error(error);
        screen = 'login';
        render();
        showToast('クラウドデータを読み込めませんでした。', 'error');
      }
    });
  } catch (error) {
    console.error(error);
    authReady = true;
    screen = 'login';
    render();
    showToast('ログイン機能を初期化できませんでした。', 'error');
  }
}

boot();

modalEl.addEventListener('click', async (event) => {
  const button = event.target.closest('[data-action]');
  if (!button || button.disabled) return;
  const action = button.dataset.action;
  playSfx('select');
  switch (action) {
    case 'modal-close': closeModal(); break;
    case 'reload-page': location.reload(); break;
    case 'craft': craft(); break;
    case 'do-sleep': closeModal(); settleDay(); break;
    case 'delete-save-confirmed': await deleteSave(); break;
    default: break;
  }
});
