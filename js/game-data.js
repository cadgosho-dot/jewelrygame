// v0.10.758: 18時以降の食事中画面を各店舗背景へ戻す修正を反映。
// v0.10.753: balance / purchase hotfix を継続。
// 大容量の既存ゲームデータ本体は game-data-core.js に保持し、内容を変更せず再利用する。
import * as core from './game-data-core.js';

export const VERSION = '0.10.853';
export * from './game-data-core.js';

// v0.10.753 balance hotfix:
// 見習い職人の成長が長すぎるため、既存の勤務日数をそのまま活かして成長テンポを緩和する。
// 性能・日給は従来値を維持し、昇格に必要な勤務日数だけを変更する。
export const WORKSHOP_STAFF_GROWTH_LEVELS = Object.freeze([
  Object.freeze({ level: 1, label: '見習い職人', minWorkDays: 0, dailyWage: 10000, speedMultiplier: 0.55, goodChance: 0, premiumChance: 0 }),
  Object.freeze({ level: 2, label: '若手職人', minWorkDays: 60, dailyWage: 15000, speedMultiplier: 0.70, goodChance: 0.10, premiumChance: 0 }),
  Object.freeze({ level: 3, label: '一人前職人', minWorkDays: 180, dailyWage: 22000, speedMultiplier: 0.85, goodChance: 0.20, premiumChance: 0.02 }),
  Object.freeze({ level: 4, label: '熟練職人', minWorkDays: 360, dailyWage: 32000, speedMultiplier: 1.00, goodChance: 0.32, premiumChance: 0.08 }),
  Object.freeze({ level: 5, label: '匠', minWorkDays: 720, dailyWage: 45000, speedMultiplier: 1.20, goodChance: 0.42, premiumChance: 0.15 }),
]);

export function workshopStaffGrowthForWorkDays(workDays = 0) {
  const days = Math.max(0, Math.floor(Number(workDays) || 0));
  return [...WORKSHOP_STAFF_GROWTH_LEVELS].reverse().find((level) => days >= Number(level.minWorkDays))
    || WORKSHOP_STAFF_GROWTH_LEVELS[0];
}

export function workshopStaffNextGrowthForWorkDays(workDays = 0) {
  const current = workshopStaffGrowthForWorkDays(workDays);
  return WORKSHOP_STAFF_GROWTH_LEVELS.find((level) => Number(level.level) === Number(current.level) + 1) || null;
}

function syncWorkshopStaffGrowthState(state) {
  const staff = state?.workshopStaff;
  if (!staff || typeof staff !== 'object' || Array.isArray(staff)) return state;
  const growth = workshopStaffGrowthForWorkDays(staff.workDays);
  // 既存仕様では熟練職人以上で evolutionStage 2。新しい勤務日条件に合わせて同期する。
  staff.evolutionStage = Number(growth.level) >= 4 ? 2 : 1;
  return state;
}

const EMERALD_CAPTAIN_KEBAB_EVENT_MEAL_ID = 'kebab';
const EMERALD_CAPTAIN_KEBAB_EVENT_GEM_ID = 'emerald';
const EMERALD_CAPTAIN_KEBAB_EVENT_SHAPE_IDS = Object.freeze([
  'round', 'oval', 'pear', 'marquise', 'emerald', 'trilliant', 'roundCabochon', 'ovalCabochon',
]);

function emeraldCaptainKebabMigrationPrice() {
  if (typeof core.loosePurchasePrice !== 'function') return 0;
  return EMERALD_CAPTAIN_KEBAB_EVENT_SHAPE_IDS.reduce((sum, shapeId) => {
    const price = Math.max(0, Math.floor(Number(core.loosePurchasePrice(EMERALD_CAPTAIN_KEBAB_EVENT_GEM_ID, shapeId)) || 0));
    return sum + price;
  }, 0);
}

function repairEmeraldCaptainKebabSavedState(source) {
  const eventState = source?.events?.emeraldCaptainKebabEvent;
  if (!eventState || typeof eventState !== 'object' || Array.isArray(eventState) || !eventState.active) return false;
  let changed = false;

  // 購入処理は完了したのに、画面遷移前の showcase で保存された状態だけを次段階へ戻す。
  // purchased=false の保存には触れず、二重課金や無料取得を起こさない。
  if (eventState.purchased === true && eventState.stage === 'showcase') {
    eventState.stage = 'purchaseResult';
    changed = true;
  }

  if (typeof eventState.pendingMealId !== 'string' || !eventState.pendingMealId) {
    eventState.pendingMealId = EMERALD_CAPTAIN_KEBAB_EVENT_MEAL_ID;
    changed = true;
  }

  if (!(Number(eventState.gemTotalPrice) > 0)) {
    const fallbackPrice = emeraldCaptainKebabMigrationPrice();
    if (fallbackPrice > 0) {
      eventState.gemTotalPrice = fallbackPrice;
      changed = true;
    }
  }

  return changed;
}

function installEmeraldCaptainKebabTapCompatibility() {
  if (typeof document === 'undefined' || typeof globalThis === 'undefined') return;
  if (globalThis.__JXJ_EMERALD_CAPTAIN_TAP_V753__) return;
  globalThis.__JXJ_EMERALD_CAPTAIN_TAP_V753__ = true;

  const installStyle = () => {
    if (!document.head || document.getElementById('jxj-emerald-captain-tap-v753')) return;
    const style = document.createElement('style');
    style.id = 'jxj-emerald-captain-tap-v753';
    style.textContent = `
      /* v0.10.753: 古いAndroid/WebViewでも購入カードと実タップ領域を一致させる。 */
      body[data-screen="emeraldCaptainKebabEvent"] .emerald-captain-kebab-reward-button {
        position: absolute !important;
        z-index: 24 !important;
        left: 50% !important;
        top: 48% !important;
        transform: translate(-50%, -50%) !important;
        width: 86vw !important;
        max-width: 620px !important;
        min-height: 170px !important;
        pointer-events: auto !important;
        touch-action: manipulation !important;
        -webkit-tap-highlight-color: transparent !important;
        -webkit-appearance: none !important;
        appearance: none !important;
        cursor: pointer !important;
      }
      body[data-screen="emeraldCaptainKebabEvent"] .emerald-captain-kebab-reward-button > * {
        pointer-events: none !important;
      }
      body[data-screen="emeraldCaptainKebabEvent"] .emerald-captain-kebab-reward-button img {
        width: 72vw !important;
        max-width: 430px !important;
        max-height: 31vh !important;
        object-fit: contain !important;
      }
      @media (orientation: portrait) {
        body[data-screen="emeraldCaptainKebabEvent"] .emerald-captain-kebab-reward-button {
          width: 90vw !important;
          max-width: 620px !important;
        }
      }
      @media (orientation: landscape) {
        body[data-screen="emeraldCaptainKebabEvent"] .emerald-captain-kebab-reward-button {
          width: 52vw !important;
          max-width: 620px !important;
        }
        body[data-screen="emeraldCaptainKebabEvent"] .emerald-captain-kebab-reward-button img {
          width: 40vw !important;
          max-width: 430px !important;
          max-height: 34vh !important;
        }
      }
    `;
    document.head.appendChild(style);
  };

  if (document.head) installStyle();
  else document.addEventListener('DOMContentLoaded', installStyle, { once: true });

  let lastSyntheticActivation = 0;
  let suppressTrustedClickUntil = 0;

  const purchaseButtonAtEvent = (event) => {
    const direct = event?.target instanceof Element
      ? event.target.closest('body[data-screen="emeraldCaptainKebabEvent"] .emerald-captain-kebab-reward-button')
      : null;
    if (direct) return direct;

    const button = document.querySelector('body[data-screen="emeraldCaptainKebabEvent"] .emerald-captain-kebab-reward-button');
    if (!(button instanceof HTMLButtonElement)) return null;
    const point = event?.changedTouches?.[0] || event?.touches?.[0] || event;
    const x = Number(point?.clientX);
    const y = Number(point?.clientY);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
    const rect = button.getBoundingClientRect();
    return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom ? button : null;
  };

  const activatePurchaseFromTouch = (event) => {
    const pointerType = String(event?.pointerType || '');
    if (event?.type === 'pointerup' && pointerType === 'mouse') return;
    const button = purchaseButtonAtEvent(event);
    if (!button || button.disabled) return;
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    if (now - lastSyntheticActivation < 500) return;
    lastSyntheticActivation = now;
    suppressTrustedClickUntil = now + 700;
    if (event.cancelable) event.preventDefault();
    event.stopPropagation?.();
    button.click();
  };

  // 古いWebViewでは touchend、比較的新しいAndroidでは pointerup のどちらでも拾えるようにする。
  document.addEventListener('pointerup', activatePurchaseFromTouch, true);
  document.addEventListener('touchend', activatePurchaseFromTouch, { capture: true, passive: false });

  // 合成clickの直後に端末が互換clickを追加発火しても二重購入させない。
  document.addEventListener('click', (event) => {
    if (!event.isTrusted) return;
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    if (now > suppressTrustedClickUntil) return;
    if (!purchaseButtonAtEvent(event)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  }, true);
}

installEmeraldCaptainKebabTapCompatibility();

// 本体側のVERSION依存箇所だけ、753の保存バージョンとして整合させる。
export function initialState(...args) {
  const state = core.initialState(...args);
  if (state && typeof state === 'object') {
    state.version = VERSION;
    syncWorkshopStaffGrowthState(state);
  }
  return state;
}

export function migrateState(saved) {
  let source = saved;
  let cloned = false;
  const editableSource = () => {
    if (!cloned) {
      source = structuredClone(saved);
      cloned = true;
    }
    return source;
  };

  // v0.10.732 hotfix:
  // 「おやつ大好き」アイスルートで、食事中に再読込・アプリ復帰が入ると
  // 食事完了用の実行中処理だけが失われ、保存状態が iceEating のまま残ることがある。
  // 食事代・1時間・空腹回復は再実行せず、御徒町へ戻るフェードから安全に再開する。
  const savedOyatsu = saved?.events?.oyatsuDaisukiEvent;
  if (saved && typeof saved === 'object' && savedOyatsu?.active && savedOyatsu?.stage === 'iceEating') {
    editableSource().events.oyatsuDaisukiEvent.stage = 'iceFade';
  }

  // v0.10.753 hotfix:
  // エメラルド班班長イベントの購入直後にアプリ復帰・保存同期が割り込んだ旧状態を安全に復旧する。
  const savedEmeraldCaptain = saved?.events?.emeraldCaptainKebabEvent;
  if (saved && typeof saved === 'object' && savedEmeraldCaptain?.active) {
    repairEmeraldCaptainKebabSavedState(editableSource());
  }

  const state = core.migrateState(source);
  if (state && typeof state === 'object') {
    state.version = VERSION;
    syncWorkshopStaffGrowthState(state);
  }
  return state;
}
