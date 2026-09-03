// Shared press/hold lifecycle for the staged quantity and selling-price step controls.
// Target groups share lifecycle management while keeping each group's timing and adjustment behavior.
export function createPressHoldController({
  onTap,
  onLongPress,
  holdDelayMs = 320,
  repeatMs = 65,
  canContinue = null,
  holdingClass = 'is-holding',
  skipClickDatasetKey = 'skipNextClick',
  timers = globalThis.window || globalThis,
} = {}) {
  if (typeof onTap !== 'function') throw new TypeError('onTap must be a function');
  if (typeof onLongPress !== 'function') throw new TypeError('onLongPress must be a function');
  if (canContinue !== null && typeof canContinue !== 'function') throw new TypeError('canContinue must be a function or null');

  let holdTimeout = null;
  let holdInterval = null;
  let holdButton = null;
  let holdTriggered = false;

  function clear() {
    if (holdTimeout) timers.clearTimeout(holdTimeout);
    if (holdInterval) timers.clearInterval(holdInterval);
    holdTimeout = null;
    holdInterval = null;
    if (holdingClass) holdButton?.classList.remove(holdingClass);
    holdButton = null;
  }

  function continuationAllowed(button) {
    return canContinue === null || canContinue(button) !== false;
  }

  function cancel() {
    clear();
    holdTriggered = false;
  }

  function stopIfContinuationBlocked(button) {
    if (canContinue === null) return false;
    if (holdButton === button && !button.disabled && continuationAllowed(button)) return false;
    cancel();
    return true;
  }

  function start(button) {
    clear();
    if (!button || button.disabled || !continuationAllowed(button)) return false;
    holdButton = button;
    holdTriggered = false;
    if (holdingClass) button.classList.add(holdingClass);
    holdTimeout = timers.setTimeout(() => {
      if (stopIfContinuationBlocked(button)) return;
      holdTriggered = true;
      onLongPress(button);
      if (stopIfContinuationBlocked(button)) return;
      holdInterval = timers.setInterval(() => {
        if (stopIfContinuationBlocked(button)) return;
        onLongPress(button);
      }, repeatMs);
    }, holdDelayMs);
    return true;
  }

  function finish(button) {
    const held = holdButton === button && holdTriggered;
    clear();
    holdTriggered = false;
    if (held && button) button.dataset[skipClickDatasetKey] = 'true';
    return held;
  }

  function activeButton() {
    return holdButton;
  }

  function handleClick(button) {
    if (!button || button.disabled) return false;
    if (button.dataset[skipClickDatasetKey] === 'true') {
      delete button.dataset[skipClickDatasetKey];
      return false;
    }
    onTap(button);
    return true;
  }

  return Object.freeze({ start, finish, cancel, activeButton, handleClick });
}
