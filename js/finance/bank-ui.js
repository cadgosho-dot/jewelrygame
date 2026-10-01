import {
  BANK_BALANCE_LIMIT,
  BANK_TRANSACTION_STEP,
  bankIsOpen,
  bankStepForHold,
  normalizeBankAmount,
} from './bank-engine.js';

const BANK_SCREEN_ID = 'jxj-bank-screen';
const BANK_STYLE_ID = 'jxj-bank-ui-v2';
const LANDSCAPE_BG = './assets/images/backgrounds/bank-okachimachi-landscape.jpg';
const PORTRAIT_BG = './assets/images/backgrounds/bank-okachimachi-portrait.jpg';
const HOLD_START_MS = 320;
const HOLD_REPEAT_MS = 160;

let bankMode = 'menu';
let draftAmount = BANK_TRANSACTION_STEP;
let lastSnapshot = null;
let holdTimer = null;
let holdRepeater = null;
let holdStartedAt = 0;
let holdConsumedClick = false;
let activeHoldButton = null;

const yen = (value) => `${Math.max(0, Math.floor(Number(value) || 0)).toLocaleString('ja-JP')}円`;
const helpers = () => globalThis.__JXJ_EVENT_STATE_HELPERS__ || null;

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => ({
    '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;',
  }[ch]));
}

function installStyle() {
  if (document.getElementById(BANK_STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = BANK_STYLE_ID;
  style.textContent = `
    #${BANK_SCREEN_ID}{
      position:fixed; inset:0; z-index:2200; overflow:hidden;
      display:flex; flex-direction:column; min-height:0;
      color:var(--text,#f7ead4); font-family:var(--ui-font,inherit);
      background:#171410 center/cover no-repeat;
      background-image:linear-gradient(rgba(0,0,0,.10),rgba(0,0,0,.20)),url("${LANDSCAPE_BG}");
      touch-action:manipulation;
    }
    #${BANK_SCREEN_ID}::before{
      content:""; position:absolute; inset:0; z-index:0; pointer-events:none;
      background:linear-gradient(180deg,rgba(0,0,0,.08),rgba(0,0,0,.02) 45%,rgba(0,0,0,.24));
    }
.jxj-bank-content{
      position:relative; z-index:2; flex:1; min-height:0; overflow:auto;
      display:grid; align-items:center;
      padding-inline:clamp(12px,2vw,24px);
      padding-bottom:max(18px,var(--safe-bottom,8px));
    }
    .jxj-bank-panel{
      width:min(620px,100%); margin:auto; box-sizing:border-box;
      display:flex; flex-direction:column; justify-content:center; align-items:stretch;
      padding:clamp(16px,3vw,24px);
      border:2.25px solid var(--line,rgba(232,191,104,.45)); border-radius:18px;
      background:rgba(8,6,4,.26);
      box-shadow:0 8px 28px rgba(0,0,0,.15);
    }
    .jxj-bank-menu{display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:16px; width:100%;}
    .jxj-bank-menu-button,
    .jxj-bank-confirm,
    .jxj-bank-secondary,
    .jxj-bank-step{
      border:2.25px solid var(--line,rgba(232,191,104,.45));
      color:var(--text,#f7ead4); background:rgba(8,6,4,.38);
      box-shadow:none; -webkit-tap-highlight-color:transparent;
      text-shadow:0 2px 6px rgba(0,0,0,.82);
    }
    .jxj-bank-menu-button,
    .jxj-bank-confirm,
    .jxj-bank-secondary{
      width:100%; min-height:76px; border-radius:12px;
      font:700 clamp(20px,4vw,28px)/1.15 inherit; letter-spacing:.02em;
    }
    .jxj-bank-menu-button:active,.jxj-bank-confirm:active,.jxj-bank-secondary:active,.jxj-bank-step:active{
      transform:translateY(1px); background:rgba(42,31,21,.50);
    }
    .jxj-bank-balance-card{
      width:100%; box-sizing:border-box; padding:18px 16px; border-radius:12px;
      border:2.25px solid var(--line,rgba(232,191,104,.45)); background:rgba(8,6,4,.34);
      box-shadow:none; text-align:center;
    }
    .jxj-bank-balance-card small{display:block; opacity:.88; font-size:14px; margin-bottom:5px;}
    .jxj-bank-balance-card strong{display:block; font-size:clamp(24px,6vw,36px); line-height:1.15;}
    .jxj-bank-menu-balance{margin-bottom:16px;}
    .jxj-bank-menu-balance small{font-size:clamp(16px,2.8vw,20px);}
    .jxj-bank-menu-balance strong{font-size:clamp(34px,7vw,54px);}
    .jxj-bank-balance-grid{display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:18px;}
    .jxj-bank-transaction-title{
      text-align:center; font-size:clamp(22px,5vw,30px); font-weight:700;
      margin:0 0 16px; text-shadow:0 2px 6px rgba(0,0,0,.82);
    }
    .jxj-bank-amount-box{
      display:grid; grid-template-columns:72px minmax(0,1fr) 72px; align-items:stretch; gap:10px;
      margin:2px 0 18px;
    }
    .jxj-bank-step{
      min-height:76px; border-radius:12px; font:800 30px/1 inherit;
      touch-action:none;
    }
    .jxj-bank-amount{
      min-width:0; display:flex; align-items:center; justify-content:center; text-align:center;
      border-radius:12px; border:2.25px solid var(--line,rgba(232,191,104,.45));
      background:rgba(8,6,4,.34); font-size:clamp(22px,5vw,32px); font-weight:800;
      letter-spacing:.01em; text-shadow:0 2px 6px rgba(0,0,0,.82);
    }
    .jxj-bank-actions{display:grid; grid-template-columns:1fr 1fr; gap:12px;}
    .jxj-bank-confirm,.jxj-bank-secondary{min-height:66px; font-size:clamp(18px,3.5vw,23px);}
    .jxj-bank-secondary{font-weight:600;}
    .jxj-bank-note{
      text-align:center; min-height:1.5em; margin:14px 0 0; font-size:14px; opacity:.94;
      text-shadow:0 2px 6px rgba(0,0,0,.82);
    }
    .jxj-bank-note.is-error{color:#ffd1d1;}
    .jxj-bank-note.is-success{color:#dcffdf;}
    .jxj-bank-interest{
      margin:0 0 15px; padding:9px 12px; border-radius:12px; text-align:center;
      border:2.25px solid rgba(255,232,157,.42); background:rgba(36,28,5,.32);
      color:#fff0b8; font-weight:700; text-shadow:0 2px 6px rgba(0,0,0,.82);
    }
    .jxj-bank-money-change{
      display:inline-block; margin-left:8px; font-weight:800; animation:jxjBankMoneyPop 1.05s ease both;
    }
    .jxj-bank-money-change.gain{color:#9fffb6}.jxj-bank-money-change.loss{color:#ffb1b1}
    @keyframes jxjBankMoneyPop{
      0%{opacity:0;transform:translateY(7px) scale(.84)}
      18%{opacity:1;transform:translateY(0) scale(1.18)}
      72%{opacity:1;transform:translateY(-2px) scale(1)}
      100%{opacity:0;transform:translateY(-8px) scale(.96)}
    }
    @media (orientation:portrait){
      #${BANK_SCREEN_ID}{
        background-image:linear-gradient(rgba(0,0,0,.08),rgba(0,0,0,.20)),url("${PORTRAIT_BG}");
      }
      .jxj-bank-content{padding:12px;}
      .jxj-bank-panel{width:min(94vw,620px); padding:18px;}
      .jxj-bank-menu{grid-template-columns:1fr; gap:16px;}
      .jxj-bank-menu-button{min-height:86px; font-size:clamp(24px,7vw,32px);}
      .jxj-bank-balance-grid{grid-template-columns:1fr; gap:10px;}
      .jxj-bank-amount-box{grid-template-columns:66px minmax(0,1fr) 66px;}
      .jxj-bank-step{min-height:78px;}
    }
    @media (orientation:landscape) and (max-height:650px){
      .jxj-bank-content{padding-inline:18px; padding-bottom:10px;}
      .jxj-bank-panel{width:min(62vw,680px); padding:14px 20px;}
      .jxj-bank-menu{gap:12px;}
      .jxj-bank-menu-button{min-height:62px; font-size:22px;}
      .jxj-bank-balance-card{padding:10px;}
      .jxj-bank-balance-card strong{font-size:25px;}
      .jxj-bank-step{min-height:58px;}
      .jxj-bank-confirm,.jxj-bank-secondary{min-height:54px;}
    }
  `;
  document.head.appendChild(style);
}

function injectBankEntry() {
  const host = document.querySelector('body[data-screen="okachimachi"] .okachimachi-facilities');
  if (!(host instanceof HTMLElement) || host.querySelector('[data-jxj-bank-entry]')) return;
  const snapshot = helpers()?.bankRuntimeSnapshot?.();
  const open = Boolean(snapshot?.ok && snapshot.open);
  const dayOff = snapshot?.closureReason === 'day-off';
  const button = document.createElement('button');
  button.type = 'button';
  button.dataset.jxjBankEntry = 'true';
  button.className = `secondary-button full-button${open ? '' : ' facility-closed'}`;
  if (open) {
    button.textContent = '銀行';
  } else {
    button.disabled = true;
    button.setAttribute('aria-disabled','true');
    const closedLabel = dayOff ? '休業日' : '営業時間外';
    button.innerHTML = `<span>銀行</span><small>${closedLabel}</small>`;
    button.title = dayOff ? '本日は休業日です。' : '営業時間外です。';
  }
  host.appendChild(button);
}

function findSourceHeader() {
  return Array.from(document.querySelectorAll('.game-header')).find((header) => !header.closest(`#${BANK_SCREEN_ID}`)) || null;
}

function buildBankHeader() {
  const source = findSourceHeader();
  let header;
  if (source instanceof HTMLElement) {
    header = source.cloneNode(true);
    header.querySelectorAll('[id]').forEach((node) => node.removeAttribute('id'));
    const back = header.querySelector('[data-action="back"]');
    const main = header.querySelector('[data-action="main"], .header-main-button');
    header.querySelector('.header-help-button')?.remove();
    if (back instanceof HTMLElement) {
      back.dataset.bankClose = 'true';
      back.setAttribute('aria-label','御徒町へ戻る');
    }
    if (main instanceof HTMLElement) {
      main.dataset.bankMain = 'true';
    }
    const titleStrong = header.querySelector('.header-title strong');
    const title = titleStrong || header.querySelector('.header-title');
    if (title) title.textContent = '銀行';
  } else {
    header = document.createElement('header');
    header.className = 'game-header';
    header.innerHTML = `
      <div class="header-center">
        <button type="button" class="icon-button" data-bank-close aria-label="御徒町へ戻る">←</button>
        <div class="header-title"><strong>銀行</strong></div>
        <div class="header-actions"><button type="button" class="secondary-button header-main-button" data-bank-main>メイン画面</button></div>
      </div>`;
  }
  header.classList.add('jxj-bank-header');
  return header;
}

function refreshBankHeader() {
  const screen = document.getElementById(BANK_SCREEN_ID);
  const current = screen?.querySelector(':scope > .game-header');
  if (!screen || !current) return;
  current.replaceWith(buildBankHeader());
}

function maxDraftAmount(snapshot = lastSnapshot) {
  const money = Math.max(0, Math.floor(Number(snapshot?.game?.money) || 0));
  const balance = Math.max(0, Math.floor(Number(snapshot?.bank?.balance) || 0));
  const raw = bankMode === 'deposit'
    ? Math.min(money, Math.max(0, BANK_BALANCE_LIMIT - balance))
    : balance;
  return normalizeBankAmount(raw);
}

function clampDraft() {
  const max = maxDraftAmount();
  if (max <= 0) {
    draftAmount = BANK_TRANSACTION_STEP;
    return;
  }
  draftAmount = Math.max(BANK_TRANSACTION_STEP, Math.min(max, normalizeBankAmount(draftAmount) || BANK_TRANSACTION_STEP));
}

function currentInterestHtml() {
  const credited = Math.max(0, Math.floor(Number(lastSnapshot?.interest?.credited) || 0));
  return credited > 0 ? `<div class="jxj-bank-interest">利息 +${credited.toLocaleString('ja-JP')}円</div>` : '';
}

function renderMenu() {
  const screen = document.getElementById(BANK_SCREEN_ID);
  if (!screen) return;
  const snapshot = lastSnapshot || helpers()?.bankRuntimeSnapshot?.();
  if (snapshot?.ok) lastSnapshot = snapshot;
  const open = Boolean(lastSnapshot?.open);
  const panel = screen.querySelector('.jxj-bank-panel');
  if (!panel) return;
  if (!open) {
    const closedMessage = lastSnapshot?.closureReason === 'day-off' ? '本日は休業日です。' : '本日の銀行窓口は終了しました。';
    panel.innerHTML = `
      <p class="jxj-bank-note">${closedMessage}</p>
      <button type="button" class="jxj-bank-secondary" data-bank-close>御徒町へ戻る</button>`;
    return;
  }
  panel.innerHTML = `
    ${currentInterestHtml()}
    <div class="jxj-bank-balance-card jxj-bank-menu-balance">
      <small>銀行残高</small>
      <strong>${yen(lastSnapshot?.bank?.balance)}</strong>
    </div>
    <div class="jxj-bank-menu">
      <button type="button" class="jxj-bank-menu-button" data-bank-mode="deposit">預ける</button>
      <button type="button" class="jxj-bank-menu-button" data-bank-mode="withdraw">引き出す</button>
    </div>`;
}

function renderTransaction(note = '', noteType = '') {
  clampDraft();
  const panel = document.querySelector(`#${BANK_SCREEN_ID} .jxj-bank-panel`);
  if (!panel) return;
  const title = bankMode === 'deposit' ? '預ける' : '引き出す';
  panel.innerHTML = `
    <h2 class="jxj-bank-transaction-title">${title}</h2>
    <div class="jxj-bank-balance-grid">
      <div class="jxj-bank-balance-card"><small>所持金</small><strong data-bank-cash>${yen(lastSnapshot?.game?.money)}</strong></div>
      <div class="jxj-bank-balance-card"><small>銀行残高</small><strong data-bank-balance>${yen(lastSnapshot?.bank?.balance)}</strong></div>
    </div>
    <div class="jxj-bank-amount-box">
      <button type="button" class="jxj-bank-step" data-bank-step="-1" aria-label="金額を減らす">▼</button>
      <div class="jxj-bank-amount" data-bank-amount>${yen(draftAmount)}</div>
      <button type="button" class="jxj-bank-step" data-bank-step="1" aria-label="金額を増やす">▲</button>
    </div>
    <div class="jxj-bank-actions">
      <button type="button" class="jxj-bank-secondary" data-bank-menu>戻る</button>
      <button type="button" class="jxj-bank-confirm" data-bank-confirm>${title}</button>
    </div>
    <p class="jxj-bank-note ${noteType ? `is-${noteType}` : ''}" data-bank-note>${escapeHtml(note)}</p>`;
}

function openBank() {
  if (document.getElementById(BANK_SCREEN_ID)) return;
  const helper = helpers();
  const snapshot = helper?.bankRuntimeSnapshot?.();
  if (!snapshot?.ok || !snapshot.open) return;
  lastSnapshot = snapshot;
  bankMode = 'menu';
  draftAmount = BANK_TRANSACTION_STEP;
  installStyle();
  const screen = document.createElement('section');
  screen.id = BANK_SCREEN_ID;
  screen.classList.add('screen-shell');
  screen.setAttribute('aria-label','銀行');
  screen.appendChild(buildBankHeader());
  const content = document.createElement('div');
  content.className = 'screen-content jxj-bank-content';
  content.innerHTML = '<div class="jxj-bank-panel"></div>';
  screen.appendChild(content);
  document.body.appendChild(screen);
  renderMenu();
}

function closeBank() {
  stopHold();
  document.getElementById(BANK_SCREEN_ID)?.remove();
  bankMode = 'menu';
  lastSnapshot = null;
  draftAmount = BANK_TRANSACTION_STEP;
}

function goToMainFromBank() {
  const mainButton = Array.from(document.querySelectorAll('.game-header [data-action="main"], .game-header .header-main-button'))
    .find((button) => !button.closest(`#${BANK_SCREEN_ID}`));
  closeBank();
  if (mainButton instanceof HTMLElement) mainButton.click();
}

function updateDraft(delta) {
  const max = maxDraftAmount();
  if (max <= 0) {
    draftAmount = BANK_TRANSACTION_STEP;
  } else {
    draftAmount = Math.max(BANK_TRANSACTION_STEP, Math.min(max, normalizeBankAmount(draftAmount + delta)));
  }
  const amountEl = document.querySelector(`#${BANK_SCREEN_ID} [data-bank-amount]`);
  if (amountEl) amountEl.textContent = yen(draftAmount);
}

function transactionError(reason) {
  return ({
    'insufficient-cash':'所持金が足りません。',
    'insufficient-balance':'銀行残高が足りません。',
    'balance-limit':'銀行残高の上限を超えます。',
    'invalid-amount':'金額を指定してください。',
    'closed':'現在は銀行を利用できません。',
  })[reason] || '取引できませんでした。';
}

function moneyFeedback(delta) {
  const cashEl = document.querySelector(`#${BANK_SCREEN_ID} [data-bank-cash]`);
  if (cashEl) {
    cashEl.querySelector('.jxj-bank-money-change')?.remove();
    const span = document.createElement('span');
    span.className = `jxj-bank-money-change ${delta > 0 ? 'gain' : 'loss'}`;
    span.textContent = `${delta > 0 ? '+' : '−'}${Math.abs(delta).toLocaleString('ja-JP')}円`;
    cashEl.appendChild(span);
    setTimeout(() => span.remove(), 1120);
  }

  document.querySelectorAll('.header-money-value').forEach((headerValue) => {
    headerValue.textContent = yen(lastSnapshot?.game?.money);
  });
  document.querySelectorAll('.header-money').forEach((headerMoney) => {
    headerMoney.querySelector('.header-money-change')?.remove();
    const change = document.createElement('span');
    change.className = `header-money-change ${delta > 0 ? 'gain' : 'loss'}`;
    change.textContent = `${delta > 0 ? '+' : '−'}${Math.abs(delta).toLocaleString('ja-JP')}円`;
    headerMoney.appendChild(change);
    headerMoney.classList.add('money-change-active', delta > 0 ? 'money-gain' : 'money-loss');
    setTimeout(() => {
      change.remove();
      headerMoney.classList.remove('money-change-active','money-gain','money-loss');
    }, 1100);
  });
}

function performTransaction() {
  const helper = helpers();
  const result = helper?.bankTransaction?.(bankMode, draftAmount);
  if (!result?.ok) {
    renderTransaction(transactionError(result?.reason), 'error');
    return;
  }
  const delta = bankMode === 'deposit' ? -result.amount : result.amount;
  lastSnapshot = helper.bankRuntimeSnapshot?.() || {
    ok:true,
    open:bankIsOpen(result.minutes),
    game:{ money:result.money, minutes:result.minutes },
    bank:{ balance:result.balance },
    interest:{ credited:0 },
  };
  refreshBankHeader();
  renderTransaction('取引が完了しました。', 'success');
  moneyFeedback(delta);
  setTimeout(() => {
    if (!document.getElementById(BANK_SCREEN_ID)) return;
    if (!lastSnapshot?.open) {
      bankMode = 'menu';
      renderMenu();
    }
  }, 1180);
}

function stopHold() {
  if (holdTimer) clearTimeout(holdTimer);
  if (holdRepeater) clearInterval(holdRepeater);
  holdTimer = null;
  holdRepeater = null;
  activeHoldButton = null;
}

function startHold(button) {
  stopHold();
  activeHoldButton = button;
  holdStartedAt = performance.now();
  holdConsumedClick = false;
  const direction = Number(button.dataset.bankStep) < 0 ? -1 : 1;
  holdTimer = setTimeout(() => {
    holdConsumedClick = true;
    const tick = () => updateDraft(direction * bankStepForHold(performance.now() - holdStartedAt));
    tick();
    holdRepeater = setInterval(tick, HOLD_REPEAT_MS);
  }, HOLD_START_MS);
}

if (typeof document !== 'undefined') {
document.addEventListener('pointerdown', (event) => {
  const button = event.target instanceof Element ? event.target.closest('[data-bank-step]') : null;
  if (!(button instanceof HTMLButtonElement)) return;
  event.preventDefault();
  startHold(button);
}, true);

document.addEventListener('pointerup', (event) => {
  const button = event.target instanceof Element ? event.target.closest('[data-bank-step]') : null;
  if (!activeHoldButton) return;
  const same = button === activeHoldButton;
  const wasHold = holdConsumedClick;
  stopHold();
  if (same && !wasHold) {
    const direction = Number(button.dataset.bankStep) < 0 ? -1 : 1;
    updateDraft(direction * BANK_TRANSACTION_STEP);
  }
  holdConsumedClick = false;
}, true);

document.addEventListener('pointercancel', () => {
  stopHold();
  holdConsumedClick = false;
}, true);

document.addEventListener('click', (event) => {
  const target = event.target instanceof Element ? event.target.closest('button') : null;
  if (!(target instanceof HTMLButtonElement)) return;
  if (target.matches('[data-jxj-bank-entry]')) {
    event.preventDefault();
    event.stopPropagation();
    openBank();
    return;
  }
  if (!target.closest(`#${BANK_SCREEN_ID}`)) return;
  event.preventDefault();
  event.stopPropagation();

  if (target.matches('[data-bank-close]')) { closeBank(); return; }
  if (target.matches('[data-bank-main]')) { goToMainFromBank(); return; }
  if (target.matches('[data-bank-menu]')) { bankMode = 'menu'; renderMenu(); return; }
  if (target.matches('[data-bank-mode]')) {
    const mode = target.dataset.bankMode;
    bankMode = mode === 'withdraw' ? 'withdraw' : 'deposit';
    draftAmount = BANK_TRANSACTION_STEP;
    renderTransaction();
    return;
  }
  if (target.matches('[data-bank-confirm]')) performTransaction();
}, true);

const observer = new MutationObserver(() => {
  if (!document.getElementById(BANK_SCREEN_ID)) injectBankEntry();
});
const start = () => {
  installStyle();
  observer.observe(document.body, { childList:true, subtree:true, attributes:true, attributeFilter:['data-screen'] });
  injectBankEntry();
};
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once:true });
else start();
}
