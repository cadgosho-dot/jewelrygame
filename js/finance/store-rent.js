export const STORE_RENT_ESCALATION_PERIOD_DAYS = 360;
export const STORE_RENT_ESCALATION_MAX_YEARS = 10;
export const STORE_RENT_ESCALATION_RATE = 1.2;
export const STORE_RENT_ESCALATION_ROUNDING_UNIT = 1000;

export function calculateStoreMonthlyRent(baseRent, currentDay, rentedDay) {
  const base = Math.max(0, Number(baseRent) || 0);
  if (!base) return 0;

  const rented = Number(rentedDay);
  if (!Number.isFinite(rented) || rented <= 0) return base;

  const current = Math.max(1, Math.floor(Number(currentDay) || 1));
  const start = Math.max(1, Math.floor(rented));
  const elapsedDays = Math.max(0, current - start);
  const increaseYears = Math.min(
    STORE_RENT_ESCALATION_MAX_YEARS,
    Math.floor(elapsedDays / STORE_RENT_ESCALATION_PERIOD_DAYS),
  );

  let rent = base;
  for (let year = 0; year < increaseYears; year += 1) {
    rent = Math.ceil((rent * STORE_RENT_ESCALATION_RATE) / STORE_RENT_ESCALATION_ROUNDING_UNIT)
      * STORE_RENT_ESCALATION_ROUNDING_UNIT;
  }
  return rent;
}
