export const OKACHIMACHI_BENCH_VIDEO_EVENT_KEY = 'okachimachiBenchVideoEvent';
export const OKACHIMACHI_BENCH_VIDEO_FIRST_DAY = 366;
export const OKACHIMACHI_BENCH_VIDEO_COOLDOWN_DAYS = 180;

function wholeDay(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.floor(number) : 0;
}

export function isOkachimachiBenchVideoEligible(snapshot) {
  if (!snapshot || typeof snapshot !== 'object') return false;

  const event = snapshot.events?.[OKACHIMACHI_BENCH_VIDEO_EVENT_KEY];
  if (event?.active === true && event.stage === 'video') return true;

  const day = wholeDay(snapshot.game?.day);
  if (day < OKACHIMACHI_BENCH_VIDEO_FIRST_DAY) return false;

  const tools = snapshot.tools;
  const ownsJewelryBench = Boolean(tools?.items?.jewelryBench) || tools?.jewelryBench === true;
  if (!ownsJewelryBench) return false;

  const lastTriggeredDay = Math.max(0, wholeDay(event?.lastTriggeredDay));
  return lastTriggeredDay === 0 || day - lastTriggeredDay >= OKACHIMACHI_BENCH_VIDEO_COOLDOWN_DAYS;
}
