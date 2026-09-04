// Pure display formatter for remaining-time labels.
export function formatTimeRemainingLabel(minutes) {
  const remaining = Math.max(0, Math.round(Number(minutes) || 0));
  const hours = Math.floor(remaining / 60);
  const restMinutes = remaining % 60;
  if (hours > 0 && restMinutes > 0) return `あと${hours}時間${restMinutes}分`;
  if (hours > 0) return `あと${hours}時間`;
  return `あと${restMinutes}分`;
}
