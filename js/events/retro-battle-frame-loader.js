export const RETRO_BATTLE_API_READY_TIMEOUT_MS = 10000;
export const RETRO_BATTLE_API_READY_POLL_MS = 100;
const RETRO_BATTLE_PATH = '/assets/minigames/retro-battle/index.html';

export function bindRetroBattleFrameLoader({
  frame,
  isActive,
  startOptions,
  onInventoryChange,
  onEnd,
  onError,
  timeoutMs = RETRO_BATTLE_API_READY_TIMEOUT_MS,
  pollMs = RETRO_BATTLE_API_READY_POLL_MS,
}) {
  let waitTimer = null;
  let waitDeadline = 0;
  let waiting = true;
  let loadHandled = false;
  let battleWindow = null;
  let inventoryHandler = null;
  let endHandler = null;

  const active = () => (typeof isActive === 'function' ? Boolean(isActive()) : true);

  const clearWaitTimer = () => {
    if (waitTimer === null) return;
    clearTimeout(waitTimer);
    waitTimer = null;
  };

  const clearWaitBindings = () => {
    if (!waiting) return;
    waiting = false;
    clearWaitTimer();
    frame.removeEventListener('load', handleFrameLoad);
  };

  const cleanup = () => {
    clearWaitBindings();
    if (battleWindow && inventoryHandler) {
      battleWindow.removeEventListener('retroBattleInventoryChange', inventoryHandler);
    }
    if (battleWindow && endHandler) {
      battleWindow.removeEventListener('retroBattleEnd', endHandler);
    }
    battleWindow = null;
    inventoryHandler = null;
    endHandler = null;
  };

  const documentIsReady = () => {
    try {
      const pathname = String(frame.contentWindow?.location?.pathname || '');
      return pathname.endsWith(RETRO_BATTLE_PATH)
        && frame.contentDocument?.readyState === 'complete';
    } catch (_) {
      return false;
    }
  };

  const fail = (error) => {
    cleanup();
    if (typeof onError === 'function') onError(error);
  };

  const startBattle = () => {
    try {
      battleWindow = frame.contentWindow;
      const battleApi = battleWindow?.RetroBattle;
      if (!battleWindow || !battleApi || typeof battleApi.start !== 'function') return false;

      clearWaitBindings();
      inventoryHandler = (event) => {
        if (active() && typeof onInventoryChange === 'function') onInventoryChange(event?.detail);
      };
      endHandler = (event) => {
        if (active() && typeof onEnd === 'function') onEnd(event?.detail);
      };
      battleWindow.addEventListener('retroBattleInventoryChange', inventoryHandler);
      battleWindow.addEventListener('retroBattleEnd', endHandler);
      battleApi.start(typeof startOptions === 'function' ? startOptions() : {});
      frame.style.visibility = 'visible';
      return true;
    } catch (error) {
      fail(error);
      return true;
    }
  };

  const waitForBattleApi = () => {
    if (!waiting) return;
    if (!active()) {
      cleanup();
      return;
    }
    if (startBattle()) return;

    const remaining = waitDeadline - Date.now();
    if (remaining <= 0) {
      fail(new Error('RetroBattle API の準備がタイムアウトしました'));
      return;
    }

    clearWaitTimer();
    const interval = Math.max(10, Number(pollMs) || RETRO_BATTLE_API_READY_POLL_MS);
    waitTimer = setTimeout(waitForBattleApi, Math.min(interval, remaining));
  };

  function handleFrameLoad() {
    if (!waiting || loadHandled) return;
    if (!active()) {
      cleanup();
      return;
    }
    if (!documentIsReady()) return;

    loadHandled = true;
    waitDeadline = Date.now() + Math.max(0, Number(timeoutMs) || 0);
    waitForBattleApi();
  }

  frame.addEventListener('load', handleFrameLoad);
  queueMicrotask(handleFrameLoad);
  return cleanup;
}
