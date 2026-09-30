import {
  BANK_BALANCE_LIMIT,
  BANK_CLOSE_MINUTES,
  BANK_OPEN_MINUTES,
  BANK_TRANSACTION_STEP,
  bankIsOpen,
  bankStepForHold,
  normalizeBankAmount,
} from './bank-engine.js';

const BANK_SCREEN_ID = 'jxj-bank-screen';
const BANK_STYLE_ID = 'jxj-bank-ui-v1';
const LANDSCAPE_BG = './assets/images/backgrounds/bank-okachimachi-landscape.webp';
const PORTRAIT_BG = './assets/images/backgrounds/bank-okachimachi-portrait.webp';
const HOLD_START_MS = 320;
const HOLD_REPEAT_MS = 95;

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
      color:#fff; font-family:inherit; background:#171410 center/cover no-repeat;
      background-image:linear-gradient(rgba(0,0,0,.13),rgba(0,0,0,.22)),url("${LANDSCAPE_BG}");
      touch-action:manipulation;
    }
    #${BANK_SCREEN_ID}::before{
      content:""; position:absolute; inset:0; pointer-events:none;
      background:linear-gradient(180deg,rgba(0,0,0,.14),rgba(0,0,0,.05) 35%,rgba(0,0,0,.18));
    }
    .jxj-bank-topbar{
      position:absolute; z-index:3; top:max(12px,env(safe-area-inset-top)); left:12px; right:12px;
      display:flex; align-items:center; justify-content:space-between; gap:12px;
      pointer-events:none;
    }
    .jxj-bank-back{
      pointer-events:auto; width:46px; height:46px; border:1px solid rgba(255,255,255,.54);
      border-radius:12px; background:rgba(8,8,8,.58); color:#fff; font-size:26px; line-height:1;
      box-shadow:0 2px 8px rgba(0,0,0,.16); -webkit-tap-highlight-color:transparent;
    }
    .jxj-bank-hours{
      padding:8px 12px; border-radius:12px; background:rgba(6,6,6,.56);
      border:1px solid rgba(255,255,255,.34); font-size:13px; letter-spacing:.04em;
      box-shadow:0 2px 8px rgba(0,0,0,.14);
    }
    .jxj-bank-panel{
      position:absolute; z-index:2; left:50%; top:52%; transform:translate(-50%,-50%);
      width:min(88vw,560px); min-height:min(64vh,540px);
      display:flex; flex-direction:column; justify-content:center; align-items:stretch;
      box-sizing:border-box; padding:24px clamp(18px,4vw,34px);
      border:1px solid rgba(255,255,255,.35); border-radius:22px;
      background:rgba(7,7,7,.70);
      box-shadow:0 5px 18px rgba(0,0,0,.17);
      backdrop-filter:blur(3px); -webkit-backdrop-filter:blur(3px);
    }
    .jxj-bank-menu{display:grid; gap:18px; width:100%;}
    .jxj-bank-menu-button,
    .jxj-bank-confirm,
    .jxj-bank-secondary{
      width:100%; min-height:82px; border:1px solid rgba(255,255,255,.42); border-radius:17px;
      color:#fff; background:rgba(18,18,18,.68); font:700 clamp(21px,4vw,30px)/1.15 inherit;
      letter-spacing:.04em; box-shadow:0 3px 10px rgba(0,0,0,.14); -webkit-tap-highlight-color:transparent;
    }
    .jxj-bank-menu-button:active,.jxj-bank-confirm:active,.jxj-bank-secondary:active{transform:translateY(1px);}
    .jxj-bank-balance-card{
      width:100%; box-sizing:border-box; padding:18px 16px; border-radius:16px;
      border:1px solid rgba(255,255,255,.30); background:rgba(0,0,0,.50);
      box-shadow:0 2px 8px rgba(0,0,0,.11); text-align:center;
    }
    .jxj-bank-balance-card small{display:block; opacity:.80; font-size:14px; margin-bottom:5px;}
    .jxj-bank-balance-card strong{display:block; font-size:clamp(24px,6vw,38px); line-height:1.15;}
    .jxj-bank-balance-grid{display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:18px;}
    .jxj-bank-transaction-title{text-align:center; font-size:clamp(22px,5vw,30px); font-weight:700; margin:0 0 16px;}
    .jxj-bank-amount-box{
      display:grid; grid-template-columns:72px minmax(0,1fr) 72px; align-items:stretch; gap:10px;
      margin:2px 0 18px;
    }
    .jxj-bank-step{
      min-height:78px; border:1px solid rgba(255,255,255,.40); border-radius:15px;
      color:#fff; background:rgba(16,16,16,.69); font:800 30px/1 inherit;
      box-shadow:0 2px 7px rgba(0,0,0,.12); touch-action:none; -webkit-tap-highlight-color:transparent;
    }
    .jxj-bank-amount{
      min-width:0; display:flex; align-items:center; justify-content:center; text-align:center;
      border-radius:15px; border:1px solid rgba(255,255,255,.31); background:rgba(0,0,0,.54);
      font-size:clamp(22px,5vw,34px); font-weight:800; letter-spacing:.01em;
    }
    .jxj-bank-actions{display:grid; grid-template-columns:1fr 1fr; gap:12px;}
    .jxj-bank-confirm,.jxj-bank-secondary{min-height:70px; font-size:clamp(18px,3.5vw,24px);}
    .jxj-bank-secondary{background:rgba(20,20,20,.58); font-weight:600;}
    .jxj-bank-note{text-align:center; min-height:1.5em; margin:14px 0 0; font-size:14px; opacity:.90;}
    .jxj-bank-note.is-error{color:#ffd1d1;}
    .jxj-bank-note.is-success{color:#dcffdf;}
    .jxj-bank-interest{
      margin:0 0 15px; padding:9px 12px; border-radius:12px; text-align:center;
      border:1px solid rgba(255,232,157,.42); background:rgba(36,28,5,.55); color:#fff0b8; font-weight:700;
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
        background-image:linear-gradient(rgba(0,0,0,.12),rgba(0,0,0,.22)),url("${PORTRAIT_BG}");
      }
      .jxj-bank-panel{
        top:53%; width:min(91vw,560px); min-height:min(59vh,610px);
        padding:26px 20px;
      }
      .jxj-bank-menu{gap:20px;}
      .jxj-bank-menu-button{min-height:96px; font-size:clamp(25px,7vw,34px);}
      .jxj-bank-balance-grid{grid-template-columns:1fr; gap:10px;}
      .jxj-bank-amount-box{grid-template-columns:68px minmax(0,1fr) 68px;}
      .jxj-bank-step{min-height:84px;}
    }
    @media (orientation:landscape) and (max-height:650px){
      .jxj-bank-panel{top:53%; min-height:auto; width:min(58vw,640px); padding:18px 24px;}
      .jxj-bank-menu{gap:14px;}
      .jxj-bank-menu-button{min-height:68px; font-size:23px;}
      .jxj-bank-balance-card{padding:12px;}
      .jxj-bank-balance-card strong{font-size:26px;}
      .jxj-bank-step{min-height:64px;}
      .jxj-bank-confirm,.jxj-bank-secondary{min-height:58px;}
    }
  `;
  document.head.appendChild(style);
}

function gameMinutes() {
  const snap = helpers()?.eventRuntimeSnapshot?.('__bank__');
  return Math.max(0, Math.floor(Number(snap?.game?.minutes) || 0));
}

function injectBankEntry() {
  const host = document.querySelector('body[data-screen="okachimachi"] .okachimachi-facilities');
  if (!(host instanceof HTMLElement) || host.querySelector('[data-jxj-bank-entry]')) return;
  const minutes = gameMinutes();
  const open = bankIsOpen(minutes);
  const button = document.createElement('button');
  button.type = 'button';
  button.dataset.jxjBankEntry = 'true';
  button.className = `secondary-button full-button${open ? '' : ' facility-closed'}`;
  if (open) {
    button.textContent = '銀行';
  } else {
    button.disabled = true;
    button.setAttribute('aria-disabled','true');
    button.innerHTML = '<span>銀行</span><small>営業時間外</small>';
    button.title = '銀行を利用できるのは8:00〜16:00です。';
  }
  host.appendChild(button);
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
    panel.innerHTML = `
      <div class="jxj-bank-balance-card"><small>営業時間</small><strong>8:00〜16:00</strong></div>
      <p class="jxj-bank-note">本日の銀行窓口は終了しました。</p>
      <button type="button" class="jxj-bank-secondary" data-bank-close>御徒町へ戻る</button>`;
    return;
  }
  panel.innerHTML = `
    ${currentInterestHtml()}
    <div class="jxj-bank-menu">
      <button type="button" class="jxj-bank-menu-button" data-bank-mode="deposit">預ける</button>
      <button type="button" class="jxj-bank-menu-button" data-bank-mode="withdraw">引き出す</button>
      <button type="button" class="jxj-bank-menu-button" data-bank-mode="balance">残高確認</button>
    </div>`;
}

function renderBalance() {
  const panel = document.querySelector(`#${BANK_SCREEN_ID} .jxj-bank-panel`);
  if (!panel) return;
  panel.innerHTML = `
    <div class="jxj-bank-balance-card">
      <small>銀行残高</small>
      <strong>${yen(lastSnapshot?.bank?.balance)}</strong>
    </div>
    <p class="jxj-bank-note">預金利息：30日ごとに1%</p>
    <button type="button" class="jxj-bank-secondary" data-bank-menu>戻る</button>`;
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
  screen.setAttribute('aria-label','銀行');
  screen.innerHTML = `
    <div class="jxj-bank-topbar">
      <button type="button" class="jxj-bank-back" data-bank-close aria-label="御徒町へ戻る">←</button>
      <div class="jxj-bank-hours">8:00〜16:00</div>
    </div>
    <div class="jxj-bank-panel"></div>`;
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
    'closed':'営業時間外です。',
  })[reason] || '取引できませんでした。';
}

function moneyFeedback(delta) {
  const cashEl = document.querySelector(`#${BANK_SCREEN_ID} [data-bank-cash]`);
  if (!cashEl) return;
  cashEl.querySelector('.jxj-bank-money-change')?.remove();
  const span = document.createElement('span');
  span.className = `jxj-bank-money-change ${delta > 0 ? 'gain' : 'loss'}`;
  span.textContent = `${delta > 0 ? '+' : '−'}${Math.abs(delta).toLocaleString('ja-JP')}円`;
  cashEl.appendChild(span);
  setTimeout(() => span.remove(), 1120);

  const headerValue = document.querySelector('.header-money-value');
  if (headerValue) headerValue.textContent = yen(lastSnapshot?.game?.money);
  const headerMoney = document.querySelector('.header-money');
  if (headerMoney) {
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
  }
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
  if (target.matches('[data-bank-menu]')) { bankMode = 'menu'; renderMenu(); return; }
  if (target.matches('[data-bank-mode]')) {
    const mode = target.dataset.bankMode;
    if (mode === 'balance') { bankMode = 'balance'; renderBalance(); return; }
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
