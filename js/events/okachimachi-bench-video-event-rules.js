export const OKACHIMACHI_BENCH_VIDEO_EVENT_KEY = 'okachimachiBenchVideoEvent';
export const OKACHIMACHI_BENCH_VIDEO_FIRST_DAY = 366;
export const OKACHIMACHI_BENCH_VIDEO_COOLDOWN_MIN_DAYS = 150;
export const OKACHIMACHI_BENCH_VIDEO_COOLDOWN_MAX_DAYS = 210;

function wholeDay(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.floor(number) : 0;
}

export function randomizedOkachimachiBenchVideoCooldownDays(random = Math.random) {
  const sampled = Number(random());
  const normalized = Number.isFinite(sampled)
    ? Math.min(1 - Number.EPSILON, Math.max(0, sampled))
    : 0;
  const range = OKACHIMACHI_BENCH_VIDEO_COOLDOWN_MAX_DAYS - OKACHIMACHI_BENCH_VIDEO_COOLDOWN_MIN_DAYS + 1;
  return OKACHIMACHI_BENCH_VIDEO_COOLDOWN_MIN_DAYS + Math.floor(normalized * range);
}

export function nextOkachimachiBenchVideoEligibleDay(triggerDay, random = Math.random) {
  return wholeDay(triggerDay) + randomizedOkachimachiBenchVideoCooldownDays(random);
}

export function isOkachimachiBenchVideoEligible(snapshot) {
  if (!snapshot || typeof snapshot !== 'object') return false;

  const event = snapshot.events?.[OKACHIMACHI_BENCH_VIDEO_EVENT_KEY];
  if (event?.active === true && event.stage === 'video') return true;

  const day = wholeDay(snapshot.game?.day);
  if (day < OKACHIMACHI_BENCH_VIDEO_FIRST_DAY) return false;

  const tools = snapshot.tools;
  const ownsJewelryBench = Boolean(tools?.items?.jewelryBench) || tools?.jewelryBench === true;
  const hasJewelryBenchPurchaseRecord = wholeDay(tools?.jewelryBenchDay) > 0;
  if (!ownsJewelryBench && !hasJewelryBenchPurchaseRecord) return false;

  const lastTriggeredDay = Math.max(0, wholeDay(event?.lastTriggeredDay));
  if (lastTriggeredDay === 0) return true;

  const nextEligibleDay = Math.max(0, wholeDay(event?.nextEligibleDay));
  return nextEligibleDay > 0 && day >= nextEligibleDay;
}
