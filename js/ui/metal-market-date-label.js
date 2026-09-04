// Pure display formatter for YYYY-MM-DD market-date labels.
export function formatMetalMarketDateLabel(value, includeYear = true) {
  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return '';
  const [, year, month, day] = match;
  return includeYear ? `${Number(year)}年${Number(month)}月${Number(day)}日` : `${Number(month)}月${Number(day)}日`;
}
