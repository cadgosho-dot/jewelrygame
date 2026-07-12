import {
  APP_NAME, VERSION, SCREEN_META, MINING_LOCATIONS, GLAB_ITEMS, ROUGH_BASE_PRICE,
  QUALITY_MULTIPLIER, DEFAULT_METAL_PRICES, HELP_ENTRIES, SMARTPHONE_GAME_URL,
  defaultState, tokyoTodayISO, minutesToClock, addDaysISO, weekdayJa, formatDateJa,
  holidayName, isOkachimachiOpen, isGLabOpen, deterministicWeather, weatherLabelFromCode,
  qualityScore, seasonForDate,
} from './game-data.js';
import { METAL_PRICE_ENDPOINT } from './firebase-config.js';
import {
  initializeFirebase, firebaseConfigured, observeAuth, googleLogin, sendEmailLoginLink,
  logout, ensureState, saveState, appendHistory, fetchAllHistory, deleteAllGameData,
  claimSession, watchSession, heartbeat, isPreviewMode,
} from './firebase-service.js';
import { configureAudio, unlockAudio, applyAudioSettings, switchAudio, playSfx, vibrate, stopAllAudio } from './audio.js';

const root = document.querySelector('#root');
const toastEl = document.querySelector('#toast');
const modalEl = document.querySelector('#modal-layer');
const offlineEl = document.querySelector('#offline-overlay');

let user = null;
let state = null;
let sessionId = crypto.randomUUID();
let heartbeatTimer = null;
let currentWorldScreen = 'main';
let miningSession = null;
let miningResult = null;
let currentStorageTab = 'general';
let phoneParentScreen = 'main';
let ggleQuery = '';
let calendarView = 'month';
let calendarCursor = null;
let financePeriod = 'day';
let financeVisible = { income: true, expense: true, profit: true };
let historyCache = null;
let busy = false;
let modalResolver = null;

configureAudio(() => state?.settings || defaultState().settings);

document.addEventListener('pointerdown', unlockAudio, { once: true });
window.addEventListener('online', () => { offlineEl.classList.add('hidden'); });
window.addEventListener('offline', () => { offlineEl.classList.remove('hidden'); });
if (!navigator.onLine) offlineEl.classList.remove('hidden');

function escapeHtml(value = '') {
  return String(value).replace(/[&<>'"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c]));
}

function yen(value) {
  const sign = Number(value) < 0 ? '-' : '';
  return `${sign}¥${Math.abs(Math.round(Number(value) || 0)).toLocaleString('ja-JP')}`;
}

function showToast(message, type = 'info') {
  toastEl.textContent = message;
  toastEl.dataset.type = type;
  toastEl.classList.add('show');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toastEl.classList.remove('show'), 2000);
  if (type === 'error') playSfx('error');
}

function showModal(html) {
  modalEl.innerHTML = `<div class="modal-backdrop"><section class="modal-card">${html}</section></div>`;
  modalEl.classList.remove('hidden');
  return new Promise((resolve) => { modalResolver = resolve; });
}

function closeModal(value = null) {
  modalEl.classList.add('hidden');
  modalEl.innerHTML = '';
  if (modalResolver) modalResolver(value);
  modalResolver = null;
}

function setBusy(flag, message = '保存しています…') {
  busy = flag;
  document.body.classList.toggle('is-busy', flag);
  document.querySelector('#busy-text')?.replaceChildren(document.createTextNode(message));
}

function getPickaxeLevel() {
  const tool = state.inventory.general.find((item) => item.category === 'tool' && item.equipped);
  return tool?.level || 1;
}

function usedGeneralSlots() { return state.inventory.general.length; }

function countUnread() { return state.notifications.filter((n) => n.unread).length; }

function addNotification({ sender = 'システム', title, body, link = null }) {
  state.notifications.unshift({
    id: crypto.randomUUID(), sender, title, body, date: state.game.date,
    minutes: state.game.minutes, unread: true, link,
  });
  if (state.notifications.length > 250) state.notifications.length = 250;
}

function discover(key, title, body) {
  if (state.unlocks.discovered.includes(key)) return;
  state.unlocks.discovered.push(key);
  addNotification({
    sender: 'g--gle.', title: '新しい情報が追加されました', body,
    link: { screen: 'ggle', query: title },
  });
}

async function persist(event = null, previous = null) {
  if (!user || !state) return;
  setBusy(true);
  try {
    state.updatedAt = new Date().toISOString();
    await saveState(user.uid, state);
    if (event) {
      await appendHistory(user.uid, {
        gameDate: state.game.date,
        minutes: state.game.minutes,
        type: event.type || 'event',
        title: event.title || '',
        details: event.details || '',
        income: event.income || 0,
        expense: event.expense || 0,
        snapshot: event.snapshot || null,
      });
      historyCache = null;
    }
  } catch (error) {
    console.error(error);
    if (previous) state = previous;
    showToast('保存できなかったため、行動前の状態へ戻しました。', 'error');
    renderCurrent();
    throw error;
  } finally {
    setBusy(false);
  }
}

function headerHtml() {
  const moneyClass = state.game.money < 0 ? 'negative' : '';
  const c = state.player.customization;
  return `
    <header class="game-header">
      <button class="profile-chip" data-action="open-profile" aria-label="プロフィール">
        <span class="avatar-mini" style="--hair:${hairCss(c.hairColor)};--skin:${skinCss(c.skinColor)}">${c.gender === '女性' ? '♀' : c.gender === '中性的' ? '◇' : '♂'}</span>
        <span>${escapeHtml(state.player.name)}</span>
      </button>
      <button class="header-chip" data-action="open-calendar">
        <strong>${escapeHtml(formatDateJa(state.game.date))}</strong><span>（${weekdayJa(state.game.date)}）${holidayName(state.game.date) ? ` ${holidayName(state.game.date)}` : ''}</span>
      </button>
      <div class="header-chip time-chip"><strong>${minutesToClock(state.game.minutes)}</strong></div>
      <button class="header-chip ${moneyClass}" data-action="open-finance"><strong>${yen(state.game.money)}</strong></button>
      <div class="header-chip weather-chip"><strong>${state.game.weather.icon} ${escapeHtml(state.game.weather.label)}</strong></div>
    </header>`;
}

function hairCss(value) {
  return ({ ブラック: '#17130f', ダークブラウン: '#35231a', ブラウン: '#5a3a24', ライトブラウン: '#8b623d', ブロンド: '#c7a45a', グレー: '#777' })[value] || '#17130f';
}
function skinCss(value) {
  return ({ 明るい: '#f3d3ba', 標準: '#d5a77d', 健康的: '#b97f55', 小麦色: '#8f5c3c', オリーブ: '#a3865e' })[value] || '#d5a77d';
}

function commonNav(showHome = true) {
  return `<div class="common-nav">
    <button class="small-ui-button" data-action="back">← 戻る</button>
    ${showHome ? '<button class="small-ui-button" data-action="go-main">⌂ メイン画面へ戻る</button>' : ''}
  </div>`;
}

function setScreenBackground(screen) {
  const inheritVisual = ['phone', 'settings', 'finance'].includes(screen);
  const visualScreen = inheritVisual ? (state?.game?.worldScreen || currentWorldScreen || 'main') : screen;
  const meta = SCREEN_META[visualScreen] || SCREEN_META.main;
  document.documentElement.style.setProperty('--screen-bg', `url('${meta.image}')`);
  const audioKey = meta.bgm === 'inherit' ? null : meta.bgm;
  if (audioKey) {
    currentWorldScreen = visualScreen;
    switchAudio(audioKey);
  }
  applyWeatherEffects();
}

function applyWeatherEffects() {
  const fx = document.querySelector('#weather-fx');
  if (!fx || !state) return;
  fx.innerHTML = '';
  document.body.dataset.weather = state.game.weather.label;
  const m = state.game.minutes;
  document.body.dataset.timeperiod = m < 12 * 60 ? 'morning' : m < 16 * 60 ? 'day' : m < 19 * 60 ? 'evening' : 'night';
  if (['雨', '雪', '嵐'].includes(state.game.weather.label)) {
    const count = state.game.weather.label === '雪' ? 45 : 70;
    for (let i = 0; i < count; i += 1) {
      const span = document.createElement('i');
      span.className = state.game.weather.label === '雪' ? 'snowflake' : 'raindrop';
      span.style.left = `${Math.random() * 100}%`;
      span.style.animationDelay = `${Math.random() * -4}s`;
      span.style.animationDuration = `${0.8 + Math.random() * 1.8}s`;
      fx.appendChild(span);
    }
  }
}

function renderShell(content, screen, options = {}) {
  setScreenBackground(screen);
  root.innerHTML = `
    <div id="weather-fx" aria-hidden="true"></div>
    ${headerHtml()}
    <main class="screen-content ${options.panel ? 'panel-screen' : ''}">${content}</main>
    ${options.nav === false ? '' : commonNav(options.home !== false)}
    <div class="busy-overlay"><span id="busy-text">保存しています…</span></div>`;
  applyWeatherEffects();
}

function renderTitle(authUser = null, setupResult = {}) {
  setScreenBackground('main');
  stopAllAudio();
  const configured = firebaseConfigured || isPreviewMode();
  root.innerHTML = `
    <main class="title-screen">
      <section class="title-panel glass-panel">
        <h1 class="sr-only">Jewelife</h1>
        ${!configured ? `
          <div class="setup-warning">
            <strong>Firebase設定が必要です</strong>
            <p><code>js/firebase-config.js</code>へFirebaseウェブアプリの設定値を入力してください。</p>
            ${['localhost', '127.0.0.1'].includes(location.hostname) ? '<a class="secondary-link" href="?preview=1">開発用UI確認モード</a>' : ''}
          </div>` : ''}
        ${authUser ? `
          <p class="login-status">${escapeHtml(authUser.email || authUser.displayName || 'ログイン済み')}</p>
          <button class="primary-button" data-action="start-game">ゲーム開始</button>
          <button class="text-button" data-action="logout">ログアウト</button>
        ` : `
          <button class="primary-button" data-action="google-login" ${configured ? '' : 'disabled'}>Googleでログイン</button>
          <div class="divider"><span>または</span></div>
          <label class="input-label">メールアドレス
            <input id="email-login-input" type="email" autocomplete="email" placeholder="example@email.com" ${configured ? '' : 'disabled'}>
          </label>
          <button class="secondary-button" data-action="email-login" ${configured ? '' : 'disabled'}>ログインリンクを送信</button>
          <p class="small-note">メールに届いた専用リンクを押すとログインできます。</p>
        `}
      </section>
    </main>`;
}

function renderOnboarding() {
  setScreenBackground('main');
  const c = state.player.customization;
  root.innerHTML = `
    <main class="onboarding-screen">
      <div class="onboarding-reference"></div>
      <section class="onboarding-card glass-panel">
        <h2>主人公を作成</h2>
        <label class="input-label">プレイヤー名<input id="player-name" maxlength="20" value="${escapeHtml(state.player.name)}" placeholder="名前を入力"></label>
        ${selectField('gender', '性別', ['男性', '女性', '中性的'], c.gender)}
        ${selectField('hairStyle', '髪型', ['ショート', 'ベリーショート', 'やや長め', 'センターパート', 'サイドパート', 'マッシュ', 'ウェーブ', 'ボブ', 'ミディアム', 'ロング', 'ポニーテール', 'ひとつ結び'], c.hairStyle)}
        ${selectField('hairColor', '髪色', ['ブラック', 'ダークブラウン', 'ブラウン', 'ライトブラウン', 'ブロンド', 'グレー'], c.hairColor)}
        ${selectField('eyeColor', '目の色', ['ダークブラウン', 'ブラウン', 'ヘーゼル', 'グレー', 'ブルー', 'グリーン'], c.eyeColor)}
        ${selectField('skinColor', '肌の色', ['明るい', '標準', '健康的', '小麦色', 'オリーブ'], c.skinColor)}
        <p class="small-note">服装は装備品や所持アイテムに応じて自動で変化します。</p>
        <button class="primary-button" data-action="complete-onboarding">ゲーム開始</button>
      </section>
    </main>`;
}

function selectField(id, label, values, selected) {
  return `<label class="input-label">${label}<select id="${id}">${values.map((v) => `<option ${v === selected ? 'selected' : ''}>${v}</option>`).join('')}</select></label>`;
}

function isEndOfDay() { return state.game.minutes >= 21 * 60; }
function canSpendHours(hours) { return state.game.minutes + hours * 60 <= 21 * 60; }

function menuButton(action, label, icon, options = {}) {
  const locked = options.locked || false;
  return `<button class="menu-button ${locked ? 'locked' : ''}" data-action="${action}" ${options.reason ? `data-reason="${escapeHtml(options.reason)}"` : ''}>
    <span class="menu-icon">${icon}</span><span class="menu-label">${label}</span>${options.time ? `<small>所要時間：${options.time}</small>` : ''}
  </button>`;
}

function renderMain() {
  const end = isEndOfDay();
  const gOpen = isGLabOpen(state);
  const oOpen = isOkachimachiOpen(state);
  const content = `
    <section class="central-menu main-menu-grid" aria-label="メインメニュー">
      ${menuButton('go-mining', '採掘', '⛏', { locked: end, reason: '時間が足りません' })}
      ${menuButton('go-workshop', '工房', '⚒', { locked: end, reason: '時間が足りません' })}
      ${menuButton('go-store', '店舗', '◇', { locked: end, reason: '時間が足りません' })}
      ${menuButton('go-glab', 'g-Lab.', 'g', { locked: end || !gOpen, reason: end ? '時間が足りません' : '営業時間外です' })}
      ${menuButton('go-okachimachi', '御徒町', '街', { locked: end || !oOpen, reason: end ? '時間が足りません' : '営業時間外です' })}
      ${menuButton('go-phone', 'スマホ', '▣', { locked: false })}
      ${menuButton('go-sleep', '寝る', '☾')}
      ${menuButton('go-settings', '設定', '⚙')}
    </section>`;
  renderShell(content, 'main', { nav: false });
}

function renderMining() {
  if (miningSession) return renderMiningSession();
  const cards = state.unlocks.miningLocations.map((id) => {
    const loc = MINING_LOCATIONS[id];
    const locked = !canSpendHours(loc.hours);
    return `<button class="location-card ${locked ? 'locked' : ''}" data-action="choose-mining" data-id="${id}" data-reason="時間が足りません">
      <h3>${loc.name}</h3><p>${loc.description}</p><small>所要時間：${loc.hours}時間</small>
    </button>`;
  }).join('');
  const content = `<section class="screen-panel mining-panel"><h2>採掘場所を選択</h2><div class="card-grid three">${cards}</div>${miningResult ? `<div class="result-box">${miningResult}</div>` : ''}</section>`;
  renderShell(content, 'mining');
}

function renderMiningSession() {
  const loc = MINING_LOCATIONS[miningSession.locationId];
  const pct = Math.max(0, (miningSession.hp / miningSession.maxHp) * 100);
  const content = `<section class="screen-panel mining-game-panel">
    <h2>${loc.name}で採掘</h2>
    <div class="rock-visual">🪨</div>
    <div class="hp-bar"><span style="width:${pct}%"></span></div>
    <p>岩の硬さ：${miningSession.hp} / ${miningSession.maxHp}</p>
    <button class="primary-button hit-button" data-action="mining-hit">⛏ ツルハシを振る</button>
    <button class="text-button" data-action="cancel-mining">採掘場所へ戻る</button>
  </section>`;
  renderShell(content, 'mining');
}

function renderWorkshop(view = 'menu') {
  if (view === 'storage') return renderStorage();
  if (view === 'roughCut') return renderRoughCut();
  if (view === 'jewelryCraft') return renderJewelryCraft();
  const roughEquipmentLocked = !state.unlocks.equipment.includes('roughCut');
  const jewelryEquipmentLocked = !state.unlocks.equipment.includes('jewelryCraft');
  const roughTimeLocked = !canSpendHours(2);
  const jewelryTimeLocked = !canSpendHours(3);
  const content = `<section class="central-menu workshop-menu">
    ${menuButton('workshop-rough-cut', '原石カット', '◆', { locked: roughEquipmentLocked || roughTimeLocked, reason: roughEquipmentLocked ? '必要なアイテムを持っていません' : '時間が足りません', time: '2時間' })}
    ${menuButton('workshop-jewelry-craft', 'ジュエリー作成', '♢', { locked: jewelryEquipmentLocked || jewelryTimeLocked, reason: jewelryEquipmentLocked ? '必要なアイテムを持っていません' : '時間が足りません', time: '3時間' })}
    ${menuButton('workshop-storage', '保管を見る', '▤')}
  </section>`;
  renderShell(content, 'workshop');
}

function renderStorage() {
  const inv = state.inventory;
  const tabs = ['general', 'loose', 'metal', 'jewelry'].map((id) => {
    const labels = { general: '通常収納', loose: 'ルースボックス', metal: '地金金庫', jewelry: 'ジュエリーボックス' };
    return `<button class="tab-button ${currentStorageTab === id ? 'active' : ''}" data-action="storage-tab" data-id="${id}">${labels[id]}</button>`;
  }).join('');
  let body = '';
  if (currentStorageTab === 'general') {
    body = `<p>使用：${usedGeneralSlots()} / ${inv.generalCapacity}枠</p><div class="inventory-list">${inv.general.map((item) => inventoryRow(item)).join('') || '<p>空です</p>'}</div>`;
  } else if (currentStorageTab === 'loose') {
    body = `<p>使用：${inv.loose.length} / ${inv.looseCapacity}石</p><div class="inventory-list">${inv.loose.map((item) => inventoryRow(item)).join('') || '<p>空です</p>'}</div>`;
  } else if (currentStorageTab === 'metal') {
    body = `<div class="metal-storage">
      ${metalRow('platinum', 'プラチナ')} ${metalRow('gold', 'ゴールド')} ${metalRow('silver', 'シルバー')}
    </div>`;
  } else {
    body = `<p>使用：${inv.jewelry.length} / ${inv.jewelryCapacity}点</p><div class="inventory-list">${inv.jewelry.map((item) => inventoryRow(item)).join('') || '<p>空です</p>'}</div>`;
  }
  const content = `<section class="screen-panel storage-panel"><h2>工房の保管</h2><div class="tabs">${tabs}</div>${body}</section>`;
  renderShell(content, 'workshop');
}

function inventoryRow(item) {
  return `<div class="inventory-row"><div><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.quality || item.category || '')}${item.equipped ? '・装備中' : ''}</small></div><span>${item.qty ? `×${item.qty}` : ''}</span></div>`;
}
function metalRow(key, label) {
  const inv = state.inventory;
  return `<div class="metal-row"><strong>${label}</strong><span>${Number(inv.metals[key]).toFixed(1)}g / ${inv.metalCapacity[key]}g</span><div class="capacity-bar"><span style="width:${Math.min(100, inv.metals[key] / inv.metalCapacity[key] * 100)}%"></span></div></div>`;
}

function renderRoughCut() {
  if (!state.unlocks.equipment.includes('roughCut')) { showToast('必要なアイテムを持っていません', 'error'); return renderWorkshop(); }
  const roughs = state.inventory.general.filter((i) => i.category === 'rough' && i.qty > 0);
  const content = `<section class="screen-panel"><h2>原石カット</h2>
    <p>原石を1個選んでルースへ加工します。所要時間：2時間</p>
    <div class="inventory-list">${roughs.map((r) => `<button class="inventory-row selectable" data-action="cut-rough" data-id="${r.id}"><div><strong>${r.name}</strong><small>${r.quality}</small></div><span>×${r.qty}</span></button>`).join('') || '<p>加工できる原石がありません。</p>'}</div>
  </section>`;
  renderShell(content, 'workshop');
}

function renderJewelryCraft() {
  if (!state.unlocks.equipment.includes('jewelryCraft')) { showToast('必要なアイテムを持っていません', 'error'); return renderWorkshop(); }
  const content = `<section class="screen-panel"><h2>ジュエリー作成</h2>
    <p>ルース1石と地金を選び、リングを制作します。所要時間：3時間</p>
    <label class="input-label">ルース<select id="craft-loose">${state.inventory.loose.map((l) => `<option value="${l.id}">${l.name}（${l.quality}）</option>`).join('')}</select></label>
    <label class="input-label">地金<select id="craft-metal"><option value="silver">シルバー 5g</option><option value="gold">ゴールド 3g</option><option value="platinum">プラチナ 3g</option></select></label>
    <button class="primary-button" data-action="craft-jewelry" ${state.inventory.loose.length ? '' : 'disabled'}>ジュエリーを作成</button>
  </section>`;
  renderShell(content, 'workshop');
}

function renderStore() {
  const content = `<section class="central-menu store-menu">
    ${menuButton('store-select', '店舗選択', '店')}
    <div class="empty-store-message">現在、所有している店舗はありません。<br>店舗機能は今後の更新で実装します。</div>
  </section>`;
  renderShell(content, 'store');
}

function renderGLab(view = 'menu') {
  if (view === 'shop') return renderGLabShop();
  const open = isGLabOpen(state);
  const content = `<section class="central-menu two-menu">
    ${menuButton('glab-shop', 'アイテム購入', '買', { locked: !open, reason: '営業時間外です' })}
    ${menuButton('glab-repair', '修理・加工依頼', '修', { locked: true, reason: 'まだ利用できません' })}
  </section>`;
  renderShell(content, 'glab');
}

function renderGLabShop() {
  const items = GLAB_ITEMS.map((item) => {
    const owned = item.unique && (state.unlocks.equipment.includes(item.effect?.unlock) || state.inventory.general.some((x) => x.key === item.id));
    return `<article class="shop-card ${owned ? 'owned' : ''}">
      <h3>${item.name}</h3><p>${item.description}</p><div class="shop-meta"><span>${yen(item.price)}</span><small>所要時間：${item.hours}時間</small></div>
      <button class="secondary-button ${!canSpendHours(item.hours) && !owned ? 'locked' : ''}" data-action="buy-glab-item" data-id="${item.id}" data-reason="時間が足りません" ${owned ? 'disabled' : ''}>${owned ? '購入済み' : '購入する'}</button>
    </article>`;
  }).join('');
  const content = `<section class="screen-panel wide-panel"><h2>g-Lab. アイテム購入</h2><div class="card-grid shop-grid">${items}</div></section>`;
  renderShell(content, 'glab');
}

function renderOkachimachi() {
  const open = isOkachimachiOpen(state);
  const shops = [
    ['material-shop', '素材屋', '素', false], ['loose-shop', 'ルース屋', '石', true], ['jewelry-shop', 'ジュエリー店', '宝', true],
    ['frame-shop', '空枠屋', '枠', true], ['cast-shop', 'キャスト屋', '鋳', true], ['estate-shop', '不動産屋', '家', true], ['staff-shop', '人材紹介', '人', true],
  ];
  const content = `<section class="central-menu okachimachi-grid">${shops.map(([action, label, icon, future]) => menuButton(action, label, icon, {
    locked: !open || future, reason: !open ? '営業時間外です' : 'まだ利用できません',
  })).join('')}</section>`;
  renderShell(content, 'okachimachi');
}

function renderMaterialShop() {
  const roughs = state.inventory.general.filter((i) => i.category === 'rough' && i.qty > 0);
  const roughHtml = roughs.map((item) => {
    const unit = roughSellPrice(item);
    return `<div class="sell-row"><div><strong>${item.name}</strong><small>${item.quality}・単価 ${yen(unit)}</small></div><span>×${item.qty}</span><button class="secondary-button ${!canSpendHours(1) ? 'locked' : ''}" data-action="sell-rough" data-id="${item.id}" data-reason="時間が足りません">全て売る（1時間）</button></div>`;
  }).join('') || '<p>売却できる原石がありません。</p>';
  const metalHtml = ['platinum', 'gold', 'silver'].map((key) => {
    const label = { platinum: 'プラチナ', gold: 'ゴールド', silver: 'シルバー' }[key];
    return `<div class="sell-row"><div><strong>${label}</strong><small>${yen(state.market[key])} / g</small></div><span>${state.inventory.metals[key].toFixed(1)}g</span><button class="secondary-button ${!canSpendHours(1) ? 'locked' : ''}" data-action="sell-metal" data-id="${key}" data-reason="時間が足りません" ${state.inventory.metals[key] <= 0 ? 'disabled' : ''}>全て売る（1時間）</button></div>`;
  }).join('');
  const content = `<section class="screen-panel wide-panel"><h2>素材屋</h2><p class="market-source">地金相場：${escapeHtml(state.market.source || '')}</p><h3>原石</h3><div class="sell-list">${roughHtml}</div><h3>金属</h3><div class="sell-list">${metalHtml}</div></section>`;
  renderShell(content, 'okachimachi');
}

function roughSellPrice(item) {
  const base = ROUGH_BASE_PRICE[item.key] || 300;
  const q = QUALITY_MULTIPLIER[item.quality] || 1;
  const season = seasonForDate(state.game.date);
  const demandSeed = [...`${season}-${item.key}`].reduce((a, c) => a + c.charCodeAt(0), 0);
  const demand = 0.85 + (demandSeed % 31) / 100;
  return Math.max(1, Math.round(base * q * demand / 10) * 10);
}

function phoneShell(title, body) {
  return `<section class="phone-stage">
    <div class="phone-device">
      <img src="./assets/images/phone.webp" alt="スマートフォン">
      <div class="phone-screen">
        <div class="phone-topbar"><button data-action="phone-home">‹</button><strong>${title}</strong><span></span></div>
        <div class="phone-body">${body}</div>
      </div>
    </div>
  </section>`;
}

function renderPhone() {
  const badge = countUnread();
  const menus = [
    ['phone-profile', 'プロフィール', '人'], ['phone-notifications', '通知', '通'], ['phone-calendar', 'カレンダー', '日'],
    ['phone-ggle', 'g--gle.', 'g'], ['phone-game', 'スマホゲーム', '遊'], ['phone-ai', 'AI', 'AI'],
  ];
  const body = `<div class="phone-menu-grid">${menus.map(([action, label, icon]) => `<button class="phone-app" data-action="${action}"><span>${icon}</span><small>${label}</small>${action === 'phone-notifications' && badge ? `<b>${badge}</b>` : ''}</button>`).join('')}</div>`;
  renderShell(phoneShell('スマホ', body), 'phone');
}

function renderProfile() {
  const c = state.player.customization;
  const body = `<div class="phone-form"><div class="profile-preview"><span class="avatar-large" style="--hair:${hairCss(c.hairColor)};--skin:${skinCss(c.skinColor)}">${c.gender === '女性' ? '♀' : c.gender === '中性的' ? '◇' : '♂'}</span><strong>${escapeHtml(state.player.name)}</strong></div>
    ${selectField('profile-gender', '性別', ['男性', '女性', '中性的'], c.gender)}
    ${selectField('profile-hairStyle', '髪型', ['ショート', 'ベリーショート', 'やや長め', 'センターパート', 'サイドパート', 'マッシュ', 'ウェーブ', 'ボブ', 'ミディアム', 'ロング', 'ポニーテール', 'ひとつ結び'], c.hairStyle)}
    ${selectField('profile-hairColor', '髪色', ['ブラック', 'ダークブラウン', 'ブラウン', 'ライトブラウン', 'ブロンド', 'グレー'], c.hairColor)}
    ${selectField('profile-eyeColor', '目の色', ['ダークブラウン', 'ブラウン', 'ヘーゼル', 'グレー', 'ブルー', 'グリーン'], c.eyeColor)}
    ${selectField('profile-skinColor', '肌の色', ['明るい', '標準', '健康的', '小麦色', 'オリーブ'], c.skinColor)}
    <button class="primary-button" data-action="save-profile">変更を保存</button></div>`;
  renderShell(phoneShell('プロフィール', body), 'phone');
}

function renderNotifications() {
  const rows = state.notifications.map((n) => `<article class="notification-card ${n.unread ? 'unread' : ''}">
    <button class="notification-main" data-action="open-notification" data-id="${n.id}">
      <span class="sender">${escapeHtml(n.sender)}</span><strong>${escapeHtml(n.title)}</strong><p>${escapeHtml(n.body)}</p><small>${n.date} ${minutesToClock(n.minutes)}</small>
    </button><button class="delete-icon" data-action="delete-notification" data-id="${n.id}" aria-label="削除">×</button>
  </article>`).join('') || '<p class="empty-message">通知はありません。</p>';
  const body = `<div class="phone-actions"><button class="text-button" data-action="mark-all-read">すべて既読</button><button class="text-button danger" data-action="delete-all-notifications">すべて削除</button></div><div class="notification-list">${rows}</div>`;
  renderShell(phoneShell('通知', body), 'phone');
}

async function renderCalendar() {
  if (!historyCache) historyCache = await fetchAllHistory(user.uid);
  if (!calendarCursor) calendarCursor = state.game.date;
  const body = calendarBody();
  renderShell(phoneShell('カレンダー', body), 'phone');
}

function calendarBody() {
  const nav = `<div class="calendar-nav"><button data-action="calendar-prev">‹</button><strong>${calendarTitle()}</strong><button data-action="calendar-next">›</button></div>
    <div class="tabs compact">${['year', 'month', 'week', 'day'].map((v) => `<button class="tab-button ${calendarView === v ? 'active' : ''}" data-action="calendar-view" data-id="${v}">${{ year: '年', month: '月', week: '週', day: '日' }[v]}</button>`).join('')}</div>`;
  let content = '';
  if (calendarView === 'year') content = yearCalendar();
  else if (calendarView === 'month') content = monthCalendar();
  else if (calendarView === 'week') content = weekCalendar();
  else content = dayCalendar(calendarCursor);
  const form = `<details class="calendar-add"><summary>予定・メモを追加</summary>
    <label class="input-label">タイトル<input id="cal-title" maxlength="60"></label>
    <label class="input-label">日付<input id="cal-date" type="date" value="${calendarCursor}"></label>
    <label class="input-label">時刻<input id="cal-time" type="time" value="09:00"></label>
    <label class="input-label">内容<textarea id="cal-note" rows="2"></textarea></label>
    <label class="check-row"><input id="cal-notify" type="checkbox" checked> ゲーム内通知</label>
    <button class="secondary-button" data-action="add-calendar-event">追加</button>
  </details>`;
  return nav + content + form;
}

function calendarTitle() {
  const d = new Date(`${calendarCursor}T12:00:00+09:00`);
  if (calendarView === 'year') return `${d.getFullYear()}年`;
  if (calendarView === 'month') return `${d.getFullYear()}年${d.getMonth() + 1}月`;
  if (calendarView === 'week') return `${formatDateJa(calendarCursor)}を含む週`;
  return `${formatDateJa(calendarCursor)}（${weekdayJa(calendarCursor)}）`;
}

function eventCount(iso) {
  return state.manualCalendar.filter((e) => e.date === iso).length + (historyCache || []).filter((e) => e.gameDate === iso).length;
}

function yearCalendar() {
  const year = Number(calendarCursor.slice(0, 4));
  return `<div class="year-grid">${Array.from({ length: 12 }, (_, i) => {
    const prefix = `${year}-${String(i + 1).padStart(2, '0')}`;
    const count = state.manualCalendar.filter((e) => e.date.startsWith(prefix)).length + (historyCache || []).filter((e) => e.gameDate?.startsWith(prefix)).length;
    return `<button data-action="jump-month" data-id="${prefix}-01"><strong>${i + 1}月</strong><small>${count}件</small></button>`;
  }).join('')}</div>`;
}

function monthCalendar() {
  const [year, month] = calendarCursor.split('-').map(Number);
  const first = new Date(`${year}-${String(month).padStart(2, '0')}-01T12:00:00+09:00`);
  const days = new Date(year, month, 0).getDate();
  const offset = first.getDay();
  const cells = Array(offset).fill('<span></span>');
  for (let day = 1; day <= days; day += 1) {
    const iso = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    cells.push(`<button class="calendar-day ${iso === state.game.date ? 'today' : ''}" data-action="calendar-day" data-id="${iso}"><b>${day}</b>${holidayName(iso) ? '<i>祝</i>' : ''}${eventCount(iso) ? `<small>${eventCount(iso)}</small>` : ''}</button>`);
  }
  return `<div class="week-labels"><span>日</span><span>月</span><span>火</span><span>水</span><span>木</span><span>金</span><span>土</span></div><div class="month-grid">${cells.join('')}</div>`;
}

function weekCalendar() {
  const d = new Date(`${calendarCursor}T12:00:00+09:00`);
  const start = addDaysISO(calendarCursor, -d.getDay());
  return `<div class="week-list">${Array.from({ length: 7 }, (_, i) => {
    const iso = addDaysISO(start, i);
    return `<button data-action="calendar-day" data-id="${iso}"><strong>${formatDateJa(iso)}（${weekdayJa(iso)}）</strong><span>${eventCount(iso)}件</span></button>`;
  }).join('')}</div>`;
}

function dayCalendar(iso) {
  const manual = state.manualCalendar.filter((e) => e.date === iso);
  const history = (historyCache || []).filter((e) => e.gameDate === iso);
  return `<div class="day-events">
    ${manual.map((e) => `<article><strong>${escapeHtml(e.title)}</strong><small>${e.time || '終日'}・手動予定</small><p>${escapeHtml(e.note || '')}</p><button class="delete-icon" data-action="delete-calendar-event" data-id="${e.id}">×</button></article>`).join('')}
    ${history.map((e) => `<article class="official-record"><strong>${escapeHtml(e.title)}</strong><small>${minutesToClock(e.minutes || 0)}・正式記録</small><p>${escapeHtml(e.details || '')}</p></article>`).join('')}
    ${!manual.length && !history.length ? '<p class="empty-message">記録はありません。</p>' : ''}
  </div>`;
}

function renderGgle() {
  const entries = HELP_ENTRIES.filter((e) => !e.requiresUnlock || state.unlocks.equipment.includes(e.requiresUnlock));
  const q = ggleQuery.trim().toLowerCase();
  const filtered = entries.filter((e) => !q || `${e.title} ${e.category} ${e.keywords} ${e.body}`.toLowerCase().includes(q));
  const categories = [...new Set(entries.map((e) => e.category))];
  const body = `<div class="ggle-search"><input id="ggle-search" value="${escapeHtml(ggleQuery)}" placeholder="ゲーム内の説明を検索"><button data-action="ggle-search">検索</button></div>
    <div class="category-chips">${categories.map((c) => `<button data-action="ggle-category" data-id="${c}">${c}</button>`).join('')}</div>
    <div class="help-list">${filtered.map((e) => `<article id="help-${e.id}"><h3>${e.title}</h3><small>${e.category}</small><p>${e.body}</p></article>`).join('') || '<p>該当する説明はありません。</p>'}</div>`;
  renderShell(phoneShell('g--gle.', body), 'phone');
}

function renderAI() {
  const body = `<div class="ai-screen"><button class="primary-button ai-copy-button" data-action="copy-ai-data">ゲームデータコピー</button><p>このゲームデータをコピーして、実際のAIチャットへ貼り付けることでゲーム履歴の分析や相談が可能です。</p></div>`;
  renderShell(phoneShell('AI', body), 'phone');
}

async function renderFinance() {
  if (!historyCache) historyCache = await fetchAllHistory(user.uid);
  const financeRows = historyCache.filter((e) => Number(e.income) || Number(e.expense));
  const grouped = groupFinance(financeRows, financePeriod);
  const chart = financeChart(grouped);
  const totals = grouped.reduce((a, r) => ({ income: a.income + r.income, expense: a.expense + r.expense }), { income: 0, expense: 0 });
  const content = `<section class="screen-panel wide-panel finance-panel"><h2>収支履歴</h2>
    <div class="tabs">${['day', 'month', 'year'].map((v) => `<button class="tab-button ${financePeriod === v ? 'active' : ''}" data-action="finance-period" data-id="${v}">${{ day: '日', month: '月', year: '年' }[v]}</button>`).join('')}</div>
    <div class="finance-totals"><div><small>売上</small><strong>${yen(totals.income)}</strong></div><div><small>支出</small><strong>${yen(totals.expense)}</strong></div><div><small>利益</small><strong>${yen(totals.income - totals.expense)}</strong></div></div>
    <div class="chart-controls">${['income', 'expense', 'profit'].map((k) => `<label><input type="checkbox" data-action="finance-toggle" data-id="${k}" ${financeVisible[k] ? 'checked' : ''}>${{ income: '売上', expense: '支出', profit: '利益' }[k]}</label>`).join('')}</div>
    ${chart}
    <div class="finance-breakdown">${financeRows.slice(-30).reverse().map((r) => `<div><span>${r.gameDate} ${escapeHtml(r.title)}</span><strong>${r.income ? `+${yen(r.income)}` : `-${yen(r.expense)}`}</strong></div>`).join('') || '<p>収支履歴はありません。</p>'}</div>
  </section>`;
  renderShell(content, currentWorldScreen, { panel: true });
}

function groupFinance(rows, period) {
  const map = new Map();
  for (const row of rows) {
    const key = period === 'year' ? row.gameDate.slice(0, 4) : period === 'month' ? row.gameDate.slice(0, 7) : row.gameDate;
    const v = map.get(key) || { key, income: 0, expense: 0 };
    v.income += Number(row.income || 0); v.expense += Number(row.expense || 0); map.set(key, v);
  }
  return [...map.values()].sort((a, b) => a.key.localeCompare(b.key)).slice(-24);
}

function financeChart(rows) {
  const width = 800; const height = 260; const pad = 35;
  if (!rows.length) return '<div class="empty-chart">グラフに表示するデータがありません。</div>';
  const values = rows.flatMap((r) => [r.income, r.expense, r.income - r.expense]);
  const max = Math.max(1, ...values.map(Math.abs));
  const x = (i) => pad + i * ((width - pad * 2) / Math.max(1, rows.length - 1));
  const y = (v) => height / 2 - (v / max) * (height / 2 - pad);
  const line = (key, cls) => financeVisible[key] ? `<polyline class="${cls}" points="${rows.map((r, i) => `${x(i)},${y(key === 'profit' ? r.income - r.expense : r[key])}`).join(' ')}"/>` : '';
  return `<svg class="finance-chart" viewBox="0 0 ${width} ${height}" role="img"><line x1="${pad}" y1="${height / 2}" x2="${width - pad}" y2="${height / 2}" class="axis"/>${line('income', 'income-line')}${line('expense', 'expense-line')}${line('profit', 'profit-line')}</svg>`;
}

function renderSettings() {
  const s = state.settings;
  const content = `<section class="screen-panel settings-panel"><h2>設定</h2>
    ${volumeControl('bgm', 'BGM', s.bgmVolume, s.bgmMuted)}
    ${volumeControl('ambient', '環境音', s.ambientVolume, s.ambientMuted)}
    ${volumeControl('sfx', '効果音', s.sfxVolume, s.sfxMuted)}
    <label class="setting-row"><span>バイブレーション</span><input type="checkbox" id="vibration-setting" ${s.vibration ? 'checked' : ''} data-action="toggle-vibration"></label>
    <div class="settings-actions"><button class="secondary-button" data-action="logout">ログアウト</button><button class="danger-button" data-action="delete-game-data">ゲームデータ全削除</button></div>
  </section>`;
  renderShell(content, currentWorldScreen, { panel: true });
}

function volumeControl(id, label, value, muted) {
  return `<div class="setting-row"><span>${label}</span><input type="range" min="0" max="1" step="0.01" value="${value}" data-action="volume-change" data-id="${id}"><button class="mute-button ${muted ? 'active' : ''}" data-action="mute-toggle" data-id="${id}">${muted ? 'ミュート解除' : 'ミュート'}</button></div>`;
}

function renderSleep() {
  const daily = state.daily;
  const eventRows = daily.events.slice(0, 5).map((e) => `<li>${escapeHtml(e)}</li>`).join('') || '<li>特にありませんでした。</li>';
  const content = `<section class="sleep-summary glass-panel"><h2>今日の結果</h2>
    <div class="finance-totals"><div><small>売上</small><strong>${yen(daily.income)}</strong></div><div><small>支出</small><strong>${yen(daily.expense)}</strong></div><div><small>利益</small><strong>${yen(daily.income - daily.expense)}</strong></div></div>
    <h3>主な出来事</h3><ul>${eventRows}</ul><button class="primary-button" data-action="next-day">次の日へ</button>
  </section>`;
  renderShell(content, 'sleep');
}

function renderCurrent() {
  if (!state) return;
  const screen = state.game.currentScreen || 'main';
  const routes = {
    main: renderMain, mining: renderMining, workshop: renderWorkshop, store: renderStore,
    glab: renderGLab, okachimachi: renderOkachimachi, phone: renderPhone, sleep: renderSleep,
    settings: renderSettings, finance: renderFinance, profile: renderProfile, notifications: renderNotifications,
    calendar: renderCalendar, ggle: renderGgle, ai: renderAI, materialShop: renderMaterialShop,
    glabShop: () => renderGLab('shop'), storage: () => renderWorkshop('storage'), roughCut: () => renderWorkshop('roughCut'), jewelryCraft: () => renderWorkshop('jewelryCraft'),
  };
  (routes[screen] || renderMain)();
}

async function navigate(screen, options = {}) {
  if (!state) return;
  if (isEndOfDay() && !['main', 'sleep', 'phone', 'settings', 'profile', 'notifications', 'calendar', 'ggle', 'ai', 'finance'].includes(screen)) {
    showToast('時間が足りません', 'error'); return;
  }
  if (['phone', 'profile', 'notifications', 'calendar', 'ggle', 'ai'].includes(screen) && !['phone', 'profile', 'notifications', 'calendar', 'ggle', 'ai'].includes(state.game.currentScreen)) {
    phoneParentScreen = state.game.currentScreen;
  }
  const worldMap = { glabShop: 'glab', materialShop: 'okachimachi', storage: 'workshop', roughCut: 'workshop', jewelryCraft: 'workshop' };
  if (!['phone', 'profile', 'notifications', 'calendar', 'ggle', 'ai', 'settings', 'finance'].includes(screen)) {
    currentWorldScreen = worldMap[screen] || screen;
    state.game.worldScreen = currentWorldScreen;
  }
  state.game.previousScreen = options.previous || state.game.currentScreen;
  state.game.currentScreen = screen;
  renderCurrent();
  saveState(user.uid, state).catch(() => showToast('画面位置を保存できませんでした。', 'error'));
}

async function refreshWeather() {
  const real = tokyoTodayISO();
  if (state.game.date === real) {
    try {
      const url = 'https://api.open-meteo.com/v1/forecast?latitude=35.7075&longitude=139.7745&current=weather_code,temperature_2m&timezone=Asia%2FTokyo';
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) throw new Error('weather');
      const data = await res.json();
      const label = weatherLabelFromCode(Number(data.current?.weather_code));
      state.game.weather = { ...label, code: Number(data.current?.weather_code), temperature: data.current?.temperature_2m, source: 'real' };
      return;
    } catch (error) { console.warn(error); }
  }
  state.game.weather = deterministicWeather(state.game.date);
}

async function refreshMarket() {
  if (!METAL_PRICE_ENDPOINT) { state.market = state.market || { ...DEFAULT_METAL_PRICES }; return; }
  try {
    const res = await fetch(METAL_PRICE_ENDPOINT, { cache: 'no-store' });
    if (!res.ok) throw new Error('market');
    const data = await res.json();
    if (['platinum', 'gold', 'silver'].every((k) => Number.isFinite(Number(data[k])))) {
      state.market = { platinum: Number(data.platinum), gold: Number(data.gold), silver: Number(data.silver), source: data.source || '外部相場API', fetchedAt: data.fetchedAt || new Date().toISOString() };
    }
  } catch (error) { console.warn('地金相場を取得できませんでした', error); }
}

function addRough(item, qty = 1) {
  const stack = state.inventory.general.find((x) => x.category === 'rough' && x.key === item.key && x.quality === item.quality && x.qty < 99);
  if (stack) {
    const room = 99 - stack.qty;
    const add = Math.min(room, qty); stack.qty += add; qty -= add;
  }
  while (qty > 0) {
    if (usedGeneralSlots() >= state.inventory.generalCapacity) return false;
    const add = Math.min(99, qty);
    state.inventory.general.push({ id: crypto.randomUUID(), category: 'rough', key: item.key, name: item.name, quality: item.quality, qty: add });
    qty -= add;
  }
  return true;
}

function addMetal(metal, grams) {
  const room = state.inventory.metalCapacity[metal] - state.inventory.metals[metal];
  if (room <= 0) return 0;
  const add = Math.min(room, grams);
  state.inventory.metals[metal] += add;
  return add;
}

async function chooseDiscardFor(item) {
  const discardable = state.inventory.general.filter((x) => !x.equipped);
  if (!discardable.length) return false;
  const html = `<h2>これ以上持てません</h2><p>「${escapeHtml(item.name)}」を保管するには、代わりに捨てるものを選んでください。</p><div class="inventory-list">${discardable.map((x) => `<button class="inventory-row selectable" data-action="modal-discard" data-id="${x.id}"><strong>${escapeHtml(x.name)}</strong><span>${x.qty ? `×${x.qty}` : ''}</span></button>`).join('')}</div><button class="text-button" data-action="modal-cancel">保管しない</button>`;
  const id = await showModal(html);
  if (!id) return false;
  state.inventory.general = state.inventory.general.filter((x) => x.id !== id);
  return addRough(item, 1);
}

function weightedChoice(items) {
  const total = items.reduce((s, i) => s + i.weight, 0);
  let r = Math.random() * total;
  for (const item of items) { r -= item.weight; if (r <= 0) return item; }
  return items[0];
}

async function completeMining() {
  const before = structuredClone(state);
  const loc = MINING_LOCATIONS[miningSession.locationId];
  const level = getPickaxeLevel();
  let rewardCount = 2 + (Math.random() < 0.35 + level * 0.08 ? 1 : 0);
  if (state.game.weather.label === '雨' && loc.id === 'river') rewardCount += 1;
  const rewards = [];
  for (let i = 0; i < rewardCount; i += 1) {
    const pick = weightedChoice(loc.rewards);
    if (pick.type === 'rough') {
      let quality = pick.quality;
      if (level >= 2 && Math.random() < 0.25) quality = quality === '普通' ? '良質' : quality;
      const item = { ...pick, quality };
      let stored = addRough(item, 1);
      if (!stored) stored = await chooseDiscardFor(item);
      rewards.push(`${item.name}（${quality}）${stored ? '' : ' ※保管できませんでした'}`);
      if (stored) discover(`rough-${item.key}`, item.name, `${item.name}の情報が追加されました。`);
    } else {
      const grams = Math.round((pick.min + Math.random() * (pick.max - pick.min)) * 10) / 10;
      const stored = addMetal(pick.metal, grams);
      rewards.push(`${pick.name} ${stored.toFixed(1)}g${stored < grams ? ' ※容量上限' : ''}`);
      if (stored > 0) discover(`metal-${pick.metal}`, pick.name, `${pick.name}の情報が追加されました。`);
    }
  }
  const oldTime = state.game.minutes;
  state.game.minutes += loc.hours * 60;
  state.daily.events.unshift(`${loc.name}で採掘しました。`);
  miningResult = `<strong>採掘結果</strong><p>${rewards.map(escapeHtml).join('<br>')}</p><small>${minutesToClock(oldTime)} → ${minutesToClock(state.game.minutes)}</small>`;
  miningSession = null;
  playSfx('success'); vibrate([80, 40, 120]);
  try {
    await persist({ type: 'mining', title: `${loc.name}で採掘`, details: rewards.join('、') }, before);
    if (isEndOfDay()) { state.game.currentScreen = 'main'; state.game.worldScreen = 'main'; currentWorldScreen = 'main'; await saveState(user.uid, state); renderMain(); }
    else renderMining();
  } catch (_) {}
}

async function buyGlabItem(id) {
  const item = GLAB_ITEMS.find((x) => x.id === id);
  if (!item) return;
  if (!isGLabOpen(state)) return showToast('営業時間外です', 'error');
  if (!canSpendHours(item.hours)) return showToast('時間が足りません', 'error');
  if (state.game.money < item.price) return showToast('所持金が足りません', 'error');
  const before = structuredClone(state);
  let storageNeeded = item.category === 'tool';
  if (storageNeeded && usedGeneralSlots() >= state.inventory.generalCapacity) {
    const accepted = await showModal(`<h2>これ以上持てません</h2><p>購入するには通常収納のアイテムを捨ててください。</p><div class="inventory-list">${state.inventory.general.filter((x) => !x.equipped).map((x) => `<button class="inventory-row selectable" data-action="modal-discard" data-id="${x.id}"><strong>${escapeHtml(x.name)}</strong></button>`).join('')}</div><button class="text-button" data-action="modal-cancel">購入しない</button>`);
    if (!accepted) return;
    state.inventory.general = state.inventory.general.filter((x) => x.id !== accepted);
  }
  state.game.money -= item.price;
  state.daily.expense += item.price;
  const oldTime = state.game.minutes; state.game.minutes += item.hours * 60;
  if (item.effect.pickaxeLevel) {
    state.inventory.general.forEach((x) => { if (x.category === 'tool') x.equipped = false; });
    state.inventory.general.push({ id: crypto.randomUUID(), category: 'tool', key: item.id, name: item.name, qty: 1, equipped: true, level: item.effect.pickaxeLevel });
  }
  if (item.effect.generalCapacity) state.inventory.generalCapacity += item.effect.generalCapacity;
  if (item.effect.looseCapacity) state.inventory.looseCapacity += item.effect.looseCapacity;
  if (item.effect.jewelryCapacity) state.inventory.jewelryCapacity += item.effect.jewelryCapacity;
  if (item.effect.metalCapacity) {
    state.inventory.metalCapacity.platinum += 50; state.inventory.metalCapacity.gold += 50; state.inventory.metalCapacity.silver += 500;
  }
  if (item.effect.unlock && !state.unlocks.equipment.includes(item.effect.unlock)) {
    state.unlocks.equipment.push(item.effect.unlock); state.featureFlags[item.effect.unlock] = true;
    addNotification({ sender: 'g-Lab.', title: `${item.name}を設置しました`, body: '工房で新しい加工が利用できます。', link: { screen: 'ggle', query: item.name.includes('原石') ? '原石カット' : 'ジュエリー作成' } });
  }
  state.daily.events.unshift(`${item.name}を購入しました。`);
  playSfx('success'); vibrate(80);
  try {
    await persist({ type: 'purchase', title: `g-Lab.で${item.name}を購入`, details: `${minutesToClock(oldTime)} → ${minutesToClock(state.game.minutes)}`, expense: item.price }, before);
    if (state.game.money < 0 && before.game.money >= 0) addNotification({ sender: 'システム', title: '所持金が不足しています', body: '所持金がマイナスになりました。' });
    renderGLabShop();
  } catch (_) {}
}

async function sellRough(id) {
  const item = state.inventory.general.find((x) => x.id === id);
  if (!item || item.category !== 'rough') return;
  if (!isOkachimachiOpen(state)) return showToast('営業時間外です', 'error');
  if (!canSpendHours(1)) return showToast('時間が足りません', 'error');
  const before = structuredClone(state);
  const oldTime = state.game.minutes;
  const amount = roughSellPrice(item) * item.qty;
  state.game.money += amount; state.daily.income += amount; state.game.minutes += 60;
  state.inventory.general = state.inventory.general.filter((x) => x.id !== id);
  state.daily.events.unshift(`${item.name}を素材屋へ売却しました。`);
  playSfx('success'); vibrate(60);
  try { await persist({ type: 'finance', title: `${item.name}を売却`, details: `${item.qty}個・${minutesToClock(oldTime)} → ${minutesToClock(state.game.minutes)}`, income: amount }, before); if (isEndOfDay()) { state.game.currentScreen = 'main'; state.game.worldScreen = 'main'; currentWorldScreen = 'main'; await saveState(user.uid, state); renderMain(); } else renderMaterialShop(); } catch (_) {}
}

async function sellMetal(key) {
  const grams = state.inventory.metals[key];
  if (grams <= 0) return;
  if (!isOkachimachiOpen(state)) return showToast('営業時間外です', 'error');
  if (!canSpendHours(1)) return showToast('時間が足りません', 'error');
  const before = structuredClone(state);
  const oldTime = state.game.minutes;
  const amount = Math.round(grams * state.market[key]);
  const label = { platinum: 'プラチナ', gold: 'ゴールド', silver: 'シルバー' }[key];
  state.inventory.metals[key] = 0; state.game.money += amount; state.daily.income += amount; state.game.minutes += 60;
  state.daily.events.unshift(`${label}を素材屋へ売却しました。`);
  playSfx('success'); vibrate(60);
  try { await persist({ type: 'finance', title: `${label}を売却`, details: `${grams.toFixed(1)}g・${minutesToClock(oldTime)} → ${minutesToClock(state.game.minutes)}`, income: amount }, before); if (isEndOfDay()) { state.game.currentScreen = 'main'; state.game.worldScreen = 'main'; currentWorldScreen = 'main'; await saveState(user.uid, state); renderMain(); } else renderMaterialShop(); } catch (_) {}
}

async function cutRough(id) {
  if (!canSpendHours(2)) return showToast('時間が足りません', 'error');
  if (state.inventory.loose.length >= state.inventory.looseCapacity) return showToast('これ以上持てません', 'error');
  const item = state.inventory.general.find((x) => x.id === id);
  if (!item) return;
  const before = structuredClone(state);
  item.qty -= 1;
  if (item.qty <= 0) state.inventory.general = state.inventory.general.filter((x) => x.id !== id);
  const baseScore = qualityScore(item.quality);
  const score = Math.max(1, Math.min(100, Math.round(baseScore + (Math.random() * 18 - 9))));
  const quality = score >= 88 ? '上質' : score >= 72 ? '良質' : score >= 50 ? '普通' : '低品質';
  const loose = { id: crypto.randomUUID(), category: 'loose', key: item.key, name: item.name.replace('の原石', ''), quality, cutScore: score };
  state.inventory.loose.push(loose);
  const old = state.game.minutes; state.game.minutes += 120;
  state.daily.events.unshift(`${loose.name}をカットしました。`);
  discover(`loose-${item.key}`, loose.name, `${loose.name}のルース情報が追加されました。`);
  playSfx('success'); vibrate([60, 30, 100]);
  try { await persist({ type: 'craft', title: `${loose.name}を原石カット`, details: `${quality}・加工品質${score}点・${minutesToClock(old)} → ${minutesToClock(state.game.minutes)}` }, before); if (isEndOfDay()) { state.game.currentScreen = 'main'; state.game.worldScreen = 'main'; currentWorldScreen = 'main'; await saveState(user.uid, state); renderMain(); } else renderRoughCut(); } catch (_) {}
}

async function craftJewelry() {
  if (!canSpendHours(3)) return showToast('時間が足りません', 'error');
  if (state.inventory.jewelry.length >= state.inventory.jewelryCapacity) return showToast('これ以上持てません', 'error');
  const looseId = document.querySelector('#craft-loose')?.value;
  const metal = document.querySelector('#craft-metal')?.value;
  const loose = state.inventory.loose.find((x) => x.id === looseId);
  if (!loose) return showToast('ルースを選択してください', 'error');
  const grams = metal === 'silver' ? 5 : 3;
  if (state.inventory.metals[metal] < grams) return showToast('必要なアイテムを持っていません', 'error');
  const before = structuredClone(state);
  state.inventory.loose = state.inventory.loose.filter((x) => x.id !== looseId);
  state.inventory.metals[metal] -= grams;
  const craftScore = Math.max(1, Math.min(100, Math.round((loose.cutScore || 60) * .45 + 35 + Math.random() * 20)));
  const metalLabel = { silver: 'SV', gold: 'K18', platinum: 'Pt' }[metal];
  const materialCost = Math.round(grams * state.market[metal]);
  const jewelry = {
    id: crypto.randomUUID(), category: 'jewelry', name: `${metalLabel} ${loose.name}リング`, loose, metal,
    grams, craftScore, designScore: 60 + Math.round(Math.random() * 25), materialCost, createdDate: state.game.date,
  };
  state.inventory.jewelry.push(jewelry);
  const old = state.game.minutes; state.game.minutes += 180;
  state.daily.events.unshift(`${jewelry.name}を制作しました。`);
  playSfx('success'); vibrate([80, 40, 150]);
  try { await persist({ type: 'craft', title: `${jewelry.name}を制作`, details: `加工品質${craftScore}点・${minutesToClock(old)} → ${minutesToClock(state.game.minutes)}` }, before); if (isEndOfDay()) { state.game.currentScreen = 'main'; state.game.worldScreen = 'main'; currentWorldScreen = 'main'; await saveState(user.uid, state); renderMain(); } else renderJewelryCraft(); } catch (_) {}
}

async function nextDay() {
  const before = structuredClone(state);
  const goodnightPromise = showModal(`<h2>お疲れ様でした、おやすみなさい。</h2><div class="goodnight-icon">☾</div>`);
  setTimeout(() => closeModal(true), 1400);
  await goodnightPromise;
  const summary = { ...state.daily };
  const oldDate = state.game.date;
  state.game.date = addDaysISO(state.game.date, 1);
  state.game.minutes = 9 * 60;
  state.game.dayNumber += 1;
  state.daily = { income: 0, expense: 0, events: [] };
  state.game.currentScreen = 'main'; state.game.previousScreen = 'sleep'; state.game.worldScreen = 'main'; currentWorldScreen = 'main';
  await refreshWeather();
  notifyCalendarEventsForDate(state.game.date);
  try {
    await persist({ type: 'day-summary', title: `${oldDate}の1日結果`, details: `売上${yen(summary.income)}・支出${yen(summary.expense)}・利益${yen(summary.income - summary.expense)}・${summary.events.slice(0, 5).join('、')}` }, before);
    renderMain();
  } catch (_) {}
}

function notifyCalendarEventsForDate(date) {
  state.manualCalendar.filter((e) => e.date === date && e.notify).forEach((e) => addNotification({ sender: 'カレンダー', title: e.title, body: e.note || `${date}の予定です。`, link: { screen: 'calendar', date } }));
}

async function saveProfile() {
  const before = structuredClone(state);
  state.player.customization = {
    gender: document.querySelector('#profile-gender').value,
    hairStyle: document.querySelector('#profile-hairStyle').value,
    hairColor: document.querySelector('#profile-hairColor').value,
    eyeColor: document.querySelector('#profile-eyeColor').value,
    skinColor: document.querySelector('#profile-skinColor').value,
  };
  try { await persist({ type: 'profile', title: 'プロフィールを変更', details: '主人公の外見を変更しました。' }, before); showToast('プロフィールを保存しました'); renderProfile(); } catch (_) {}
}

async function copyAIData() {
  setBusy(true, '全履歴を読み込んでいます…');
  try {
    const history = await fetchAllHistory(user.uid);
    const jewelries = state.inventory.jewelry.map((j) => ({
      name: j.name, designScore: j.designScore, material: j.metal, stone: j.loose?.name,
      stoneQuality: j.loose?.quality, cutScore: j.loose?.cutScore, craftScore: j.craftScore,
      cost: j.materialCost, createdDate: j.createdDate,
    }));
    const text = `【Jewelife AI相談用ゲームデータ】\n\nあなたはゲーム「Jewelife」専用の分析AIです。以下のゲームデータだけを根拠に回答してください。現実世界の行動、未実装機能、ゲーム内で実行できない行動を提案・発言してはいけません。情報が不足している場合は推測で断定せず「現在のゲームデータでは判断できません」と明記してください。プレイヤーから明示的に相談されない限り、次にやるべきこと、改善案、最適解、おすすめ行動は提示しないでください。\n\n最初の回答は必ず次の順番にしてください。\n1. 現在のゲーム状況を簡潔に報告\n2. 店舗の評価（店舗未所有・未実装の場合はその旨を明記）\n3. 良いジュエリーランキングBEST10（所有数が少ない場合は存在する分だけ）。各ジュエリーについて、総合点100点、デザイン性100点、素材価値・希少性100点、加工品質100点、利益性100点、実際の利益率、現在の店舗での予想販売価格1点、ジュエリーの参考市場価値1点、評価理由を表示。総合点は4項目の単純平均。店舗・季節・天気・流行・客層など外部環境はランキング基準から除外し、現在の店舗での予想販売価格にのみ反映してください。\n4. その他のプレイヤーの特徴、これまでの変化、制作・販売傾向を分析\n\n【実装済み機能】\nログイン、主人公作成、自動セーブ、日付・時刻・天気、採掘、工房保管、g-Lab.アイテム購入、設備解放後の原石カット・ジュエリー作成、御徒町素材屋への売却、スマホ（プロフィール・通知・カレンダー・g--gle.・スマホゲーム・AI）、寝る・日付進行、収支履歴、設定。店舗開業、接客、アルバイト、外注は現バージョンでは未実装です。\n\n【現在状態】\n${JSON.stringify(state, null, 2)}\n\n【所有ジュエリー】\n${JSON.stringify(jewelries, null, 2)}\n\n【ゲーム開始から現在までの全履歴】\n${JSON.stringify(history, null, 2)}\n`;
    await copyText(text);
    showToast('ゲームデータをコピーしました');
  } catch (error) { console.error(error); showToast('コピーできませんでした', 'error'); }
  finally { setBusy(false); }
}

async function copyText(text) {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text);
  const area = document.createElement('textarea'); area.value = text; document.body.appendChild(area); area.select(); document.execCommand('copy'); area.remove();
}

async function completeOnboarding() {
  const name = document.querySelector('#player-name').value.trim();
  if (!name) return showToast('プレイヤー名を入力してください', 'error');
  const before = structuredClone(state);
  state.player.name = name;
  state.player.customization = {
    gender: document.querySelector('#gender').value,
    hairStyle: document.querySelector('#hairStyle').value,
    hairColor: document.querySelector('#hairColor').value,
    eyeColor: document.querySelector('#eyeColor').value,
    skinColor: document.querySelector('#skinColor').value,
  };
  state.onboardingComplete = true; state.game.currentScreen = 'main';
  try { await persist({ type: 'start', title: 'Jewelifeを開始', details: `${name}としてゲームを開始しました。` }, before); renderMain(); } catch (_) {}
}

async function deleteGameDataFlow() {
  const answer = await showModal(`<h2>ゲームデータ全削除</h2><p>ゲームの進行データをすべて削除しますか？ログイン中のアカウントは残ります。</p><button class="danger-button" data-action="modal-confirm">削除を続ける</button><button class="text-button" data-action="modal-cancel">キャンセル</button>`);
  if (!answer) return;
  const name = await showModal(`<h2>プレイヤー名を入力</h2><p>確認のため、現在のプレイヤー名を入力してください。</p><input id="delete-name-input" class="modal-input" autocomplete="off"><button class="danger-button" data-action="modal-name-confirm">ゲームデータ全削除を実行</button><button class="text-button" data-action="modal-cancel">キャンセル</button>`);
  if (name !== state.player.name) return showToast('プレイヤー名が一致しません', 'error');
  setBusy(true, 'ゲームデータを削除しています…');
  try {
    playSfx('explosion', { gain: 1.4 }); vibrate([100, 60, 200, 80, 400]);
    const fresh = defaultState();
    fresh.player.name = state.player.name;
    fresh.onboardingComplete = true;
    await deleteAllGameData(user.uid, fresh);
    state = fresh;
    await new Promise((r) => setTimeout(r, 1500));
    renderMain();
  } catch (error) { console.error(error); showToast('削除できませんでした', 'error'); }
  finally { setBusy(false); }
}

async function handleAction(action, target) {
  if (busy) return;
  const reason = target.dataset.reason;
  if (target.classList.contains('locked') || target.disabled) {
    if (reason) showToast(reason, 'error');
    return;
  }
  playSfx('select'); vibrate(25);
  switch (action) {
    case 'google-login': await googleLogin().catch((e) => showToast(e.message, 'error')); break;
    case 'email-login': {
      const email = document.querySelector('#email-login-input')?.value.trim();
      if (!email) return showToast('メールアドレスを入力してください', 'error');
      try { await sendEmailLoginLink(email); showToast('ログインリンクを送信しました'); } catch (e) { showToast(e.message, 'error'); }
      break;
    }
    case 'logout': stopAllAudio(); await logout(); break;
    case 'start-game': await startAuthenticatedGame(); break;
    case 'complete-onboarding': await completeOnboarding(); break;
    case 'go-mining': await navigate('mining'); break;
    case 'go-workshop': await navigate('workshop'); break;
    case 'go-store': await navigate('store'); break;
    case 'go-glab': if (!isGLabOpen(state)) showToast('営業時間外です', 'error'); else await navigate('glab'); break;
    case 'go-okachimachi': if (!isOkachimachiOpen(state)) showToast('営業時間外です', 'error'); else await navigate('okachimachi'); break;
    case 'go-phone': phoneParentScreen = state.game.currentScreen; await navigate('phone'); break;
    case 'go-sleep': await navigate('sleep'); break;
    case 'go-settings': await navigate('settings'); break;
    case 'go-main': miningSession = null; await navigate('main'); break;
    case 'back': await navigate(state.game.previousScreen || 'main'); break;
    case 'choose-mining': {
      const loc = MINING_LOCATIONS[target.dataset.id];
      if (!canSpendHours(loc.hours)) return showToast('時間が足りません', 'error');
      miningSession = { locationId: loc.id, maxHp: Math.max(2, loc.hp - (getPickaxeLevel() - 1) * 2), hp: Math.max(2, loc.hp - (getPickaxeLevel() - 1) * 2) };
      miningResult = null; renderMining(); break;
    }
    case 'mining-hit':
      if (!miningSession) return;
      miningSession.hp -= getPickaxeLevel(); playSfx('impact'); vibrate(55);
      if (miningSession.hp <= 0) await completeMining(); else renderMiningSession();
      break;
    case 'cancel-mining': miningSession = null; renderMining(); break;
    case 'workshop-storage': await navigate('storage'); break;
    case 'workshop-rough-cut': if (!state.unlocks.equipment.includes('roughCut')) showToast('必要なアイテムを持っていません', 'error'); else await navigate('roughCut'); break;
    case 'workshop-jewelry-craft': if (!state.unlocks.equipment.includes('jewelryCraft')) showToast('必要なアイテムを持っていません', 'error'); else await navigate('jewelryCraft'); break;
    case 'storage-tab': currentStorageTab = target.dataset.id; renderStorage(); break;
    case 'cut-rough': await cutRough(target.dataset.id); break;
    case 'craft-jewelry': await craftJewelry(); break;
    case 'store-select': showToast('まだ利用できません', 'error'); break;
    case 'glab-shop': await navigate('glabShop'); break;
    case 'glab-repair': showToast('まだ利用できません', 'error'); break;
    case 'buy-glab-item': await buyGlabItem(target.dataset.id); break;
    case 'material-shop': await navigate('materialShop'); break;
    case 'loose-shop': case 'jewelry-shop': case 'frame-shop': case 'cast-shop': case 'estate-shop': case 'staff-shop': showToast('まだ利用できません', 'error'); break;
    case 'sell-rough': await sellRough(target.dataset.id); break;
    case 'sell-metal': await sellMetal(target.dataset.id); break;
    case 'phone-profile': await navigate('profile'); break;
    case 'phone-notifications': await navigate('notifications'); break;
    case 'phone-calendar': await navigate('calendar'); break;
    case 'phone-ggle': ggleQuery = ''; await navigate('ggle'); break;
    case 'phone-game': window.open(SMARTPHONE_GAME_URL, '_blank', 'noopener,noreferrer'); break;
    case 'phone-ai': await navigate('ai'); break;
    case 'phone-home': await navigate('phone'); break;
    case 'open-profile': phoneParentScreen = state.game.currentScreen; await navigate('profile'); break;
    case 'open-calendar': phoneParentScreen = state.game.currentScreen; await navigate('calendar'); break;
    case 'open-finance': await navigate('finance'); break;
    case 'save-profile': await saveProfile(); break;
    case 'open-notification': {
      const n = state.notifications.find((x) => x.id === target.dataset.id); if (!n) return;
      n.unread = false; await saveState(user.uid, state);
      if (n.link?.screen === 'ggle') { ggleQuery = n.link.query || ''; await navigate('ggle'); }
      else if (n.link?.screen === 'calendar') { calendarCursor = n.link.date || state.game.date; calendarView = 'day'; await navigate('calendar'); }
      else renderNotifications();
      break;
    }
    case 'delete-notification': state.notifications = state.notifications.filter((n) => n.id !== target.dataset.id); await saveState(user.uid, state); renderNotifications(); break;
    case 'mark-all-read': state.notifications.forEach((n) => { n.unread = false; }); await saveState(user.uid, state); renderNotifications(); break;
    case 'delete-all-notifications': {
      const ok = await showModal('<h2>通知をすべて削除しますか？</h2><button class="danger-button" data-action="modal-confirm">すべて削除</button><button class="text-button" data-action="modal-cancel">キャンセル</button>');
      if (ok) { state.notifications = []; await saveState(user.uid, state); renderNotifications(); }
      break;
    }
    case 'ggle-search': ggleQuery = document.querySelector('#ggle-search')?.value || ''; renderGgle(); break;
    case 'ggle-category': ggleQuery = target.dataset.id; renderGgle(); break;
    case 'copy-ai-data': await copyAIData(); break;
    case 'calendar-view': calendarView = target.dataset.id; await renderCalendar(); break;
    case 'calendar-prev': calendarCursor = shiftCalendar(-1); await renderCalendar(); break;
    case 'calendar-next': calendarCursor = shiftCalendar(1); await renderCalendar(); break;
    case 'jump-month': calendarCursor = target.dataset.id; calendarView = 'month'; await renderCalendar(); break;
    case 'calendar-day': calendarCursor = target.dataset.id; calendarView = 'day'; await renderCalendar(); break;
    case 'add-calendar-event': await addCalendarEvent(); break;
    case 'delete-calendar-event': state.manualCalendar = state.manualCalendar.filter((e) => e.id !== target.dataset.id); await saveState(user.uid, state); await renderCalendar(); break;
    case 'finance-period': financePeriod = target.dataset.id; await renderFinance(); break;
    case 'finance-toggle': financeVisible[target.dataset.id] = target.checked; await renderFinance(); break;
    case 'volume-change': state.settings[`${target.dataset.id}Volume`] = Number(target.value); applyAudioSettings(); await saveState(user.uid, state); break;
    case 'mute-toggle': state.settings[`${target.dataset.id}Muted`] = !state.settings[`${target.dataset.id}Muted`]; applyAudioSettings(); await saveState(user.uid, state); renderSettings(); break;
    case 'toggle-vibration': state.settings.vibration = target.checked; await saveState(user.uid, state); break;
    case 'delete-game-data': await deleteGameDataFlow(); break;
    case 'next-day': await nextDay(); break;
    case 'modal-confirm': closeModal(true); break;
    case 'modal-cancel': closeModal(false); break;
    case 'modal-discard': closeModal(target.dataset.id); break;
    case 'modal-name-confirm': closeModal(document.querySelector('#delete-name-input')?.value || ''); break;
    default: break;
  }
}

function shiftCalendar(amount) {
  if (calendarView === 'year') return `${Number(calendarCursor.slice(0, 4)) + amount}-01-01`;
  if (calendarView === 'month') {
    const d = new Date(`${calendarCursor}T12:00:00+09:00`); d.setMonth(d.getMonth() + amount); return d.toISOString().slice(0, 10);
  }
  if (calendarView === 'week') return addDaysISO(calendarCursor, amount * 7);
  return addDaysISO(calendarCursor, amount);
}

async function addCalendarEvent() {
  const title = document.querySelector('#cal-title')?.value.trim();
  if (!title) return showToast('タイトルを入力してください', 'error');
  state.manualCalendar.push({
    id: crypto.randomUUID(), title,
    date: document.querySelector('#cal-date').value,
    time: document.querySelector('#cal-time').value,
    note: document.querySelector('#cal-note').value,
    notify: document.querySelector('#cal-notify').checked,
  });
  await saveState(user.uid, state); showToast('予定を追加しました'); await renderCalendar();
}

document.addEventListener('click', async (event) => {
  const target = event.target.closest('[data-action]');
  if (!target) return;
  event.preventDefault();
  try { await handleAction(target.dataset.action, target); }
  catch (error) { console.error(error); showToast(error.message || 'エラーが発生しました', 'error'); }
});


document.addEventListener('input', (event) => {
  const target = event.target;
  if (target?.dataset?.action === 'volume-change' && state) {
    state.settings[`${target.dataset.id}Volume`] = Number(target.value);
    applyAudioSettings();
  }
});
document.addEventListener('change', async (event) => {
  const target = event.target;
  if (target?.dataset?.action === 'volume-change' && state && user) {
    try { await saveState(user.uid, state); } catch (error) { showToast('設定を保存できませんでした', 'error'); }
  }
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && document.activeElement?.id === 'ggle-search') document.querySelector('[data-action="ggle-search"]')?.click();
});

async function startAuthenticatedGame() {
  state = await ensureState(user.uid);
  currentWorldScreen = state.game.worldScreen || 'main';
  await refreshWeather(); await refreshMarket();
  await claimSession(user.uid, sessionId);
  watchSession(user.uid, sessionId, () => {
    stopAllAudio();
    showModal('<h2>別の端末でゲームが開始されました。</h2><p>続けるには再読み込みしてください。</p><button class="primary-button" onclick="location.reload()">再読み込み</button>');
  });
  clearInterval(heartbeatTimer);
  heartbeatTimer = setInterval(() => heartbeat(user.uid, sessionId), 30000);
  if (!state.onboardingComplete) renderOnboarding(); else renderCurrent();
}

async function bootstrap() {
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(console.error);
  const setup = await initializeFirebase();
  renderTitle(null, setup);
  observeAuth((authUser) => {
    user = authUser;
    renderTitle(authUser, setup);
  });
}

bootstrap().catch((error) => {
  console.error(error);
  root.innerHTML = `<main class="fatal-error"><h1>Jewelife</h1><p>起動できませんでした。</p><pre>${escapeHtml(error.message)}</pre></main>`;
});
