// Shared press/hold lifecycle for quantity step buttons.
// The first adoption is intentionally limited to metal quantity controls so
// pointer behavior can be verified before migrating other quantity regions.
export function createPressHoldController({
  onTap,
  onLongPress,
  holdDelayMs = 320,
  repeatMs = 65,
  holdingClass = 'is-holding',
  skipClickDatasetKey = 'skipNextClick',
  timers = globalThis.window || globalThis,
} = {}) {
  if (typeof onTap !== 'function') throw new TypeError('onTap must be a function');
  if (typeof onLongPress !== 'function') throw new TypeError('onLongPress must be a function');

  let holdTimeout = null;
  let holdInterval = null;
  let holdButton = null;
  let holdTriggered = false;

  function clear() {
    if (holdTimeout) timers.clearTimeout(holdTimeout);
    if (holdInterval) timers.clearInterval(holdInterval);
    holdTimeout = null;
    holdInterval = null;
    holdButton?.classList.remove(holdingClass);
    holdButton = null;
  }

  function start(button) {
    clear();
    if (!button || button.disabled) return false;
    holdButton = button;
    holdTriggered = false;
    button.classList.add(holdingClass);
    holdTimeout = timers.setTimeout(() => {
      holdTriggered = true;
      onLongPress(button);
      holdInterval = timers.setInterval(() => onLongPress(button), repeatMs);
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

  function cancel() {
    clear();
    holdTriggered = false;
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
