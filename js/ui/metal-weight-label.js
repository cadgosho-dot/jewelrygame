// Pure display formatter for metal weights shown in grams.
export function formatMetalWeightLabel(value) {
  const amount = Math.round(Math.max(0, Number(value) || 0) * 10) / 10;
  return Number.isInteger(amount) ? String(amount) : amount.toFixed(1);
}
