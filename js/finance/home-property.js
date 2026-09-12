export const HOME_PROPERTY_UNLOCK_DAY = 351;
export const HOME_MOVE_COST = 1000000;
export const HOME_PROPERTY_B_MONTHLY_RENT = 200000;

export function normalizeHomeProperty(value) {
  return String(value || '').toUpperCase() === 'B' ? 'B' : 'A';
}

export function homePropertyUnlocked(day) {
  return Math.max(1, Math.floor(Number(day) || 1)) >= HOME_PROPERTY_UNLOCK_DAY;
}

export function homePropertyMonthlyRent(propertyId, propertyARent) {
  if (normalizeHomeProperty(propertyId) === 'B') return HOME_PROPERTY_B_MONTHLY_RENT;
  return Math.max(0, Math.floor(Number(propertyARent) || 0));
}

export function homePropertyMoveTotal(propertyId, propertyARent) {
  return HOME_MOVE_COST + homePropertyMonthlyRent(propertyId, propertyARent);
}

export function homePropertyBackgroundAsset(propertyId, portrait = false) {
  const suffix = portrait ? '-portrait' : '';
  return normalizeHomeProperty(propertyId) === 'B'
    ? `home-property-b${suffix}`
    : `sleep${suffix}`;
}
