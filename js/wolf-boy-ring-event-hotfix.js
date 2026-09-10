// 狼少年・指輪イベント: 承認済みの暗転時間は2秒。
// 本体モジュールの5秒定数を書き換えず、該当イベントの「はい」操作直後だけ
// setTimeout(5000) を setTimeout(2000) として受ける。イベント外には影響させない。
const OVERLAY_ID = 'jxj-wolf-boy-ring-overlay';
const APPROVED_BLACKOUT_MS = 2000;
const LEGACY_BLACKOUT_MS = 5000;

document.addEventListener('click', (event) => {
  const target = event.target instanceof Element
    ? event.target.closest(`#${OVERLAY_ID} [data-wolf-action="yes"]`)
    : null;
  if (!target) return;

  const originalSetTimeout = window.setTimeout;
  let replaced = false;
  window.setTimeout = function wolfBoyApprovedBlackout(callback, delay, ...args) {
    if (!replaced && Number(delay) === LEGACY_BLACKOUT_MS) {
      replaced = true;
      window.setTimeout = originalSetTimeout;
      return originalSetTimeout(callback, APPROVED_BLACKOUT_MS, ...args);
    }
    return originalSetTimeout(callback, delay, ...args);
  };

  queueMicrotask(() => {
    if (window.setTimeout !== originalSetTimeout) window.setTimeout = originalSetTimeout;
  });
}, true);
