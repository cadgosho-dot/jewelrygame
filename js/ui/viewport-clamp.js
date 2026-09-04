// Pure numeric helper for device viewport UI scale bounds.
export function clampViewportNumber(value, min, max) {
  return Math.min(max, Math.max(min, Number(value) || min));
}
