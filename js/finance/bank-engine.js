import { japaneseHolidayName } from '../japan-holidays.js';

export const BANK_OPEN_MINUTES = 8 * 60;
export const BANK_CLOSE_MINUTES = 17 * 60;
export const BANK_TRANSACTION_STEP = 10_000;
export const BANK_BALANCE_LIMIT = 100_000_000_000;
export const BANK_INTEREST_INTERVAL_DAYS = 30;
export const BANK_INTEREST_RATE = 0.01;
export const BANK_TRANSACTION_TIME_MINUTES = 60;

const safeInt = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? Math.floor(n) : fallback;
};
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function bankGameDate(context = {}) {
  const startDate = String(context?.startDate || '').trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(startDate);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const date = Number(match[3]);
  const day = Math.max(1, safeInt(context?.day, 1));
  const result = new Date(year, month - 1, date, 12, 0, 0, 0);
  if (Number.isNaN(result.getTime())) return null;
  result.setDate(result.getDate() + day - 1);
  return result;
}

export function bankClosureReason(minutes, context = {}) {
  const value = safeInt(minutes, -1);
  if (value < BANK_OPEN_MINUTES || value >= BANK_CLOSE_MINUTES) return 'hours';

  const date = bankGameDate(context);
  if (!date) return '';
  const dayOfWeek = date.getDay();
  if (dayOfWeek === 0 || dayOfWeek === 6) return 'day-off';
  if (japaneseHolidayName(date)) return 'day-off';
  return '';
}

export function bankIsOpen(minutes, context = {}) {
  return bankClosureReason(minutes, context) === '';
}

export function normalizeBankState(state, currentDay = state?.game?.day) {
  if (!state || typeof state !== 'object' || Array.isArray(state)) {
    return { balance: 0, lastInterestDay: 1 };
  }
  const day = Math.max(1, safeInt(currentDay, 1));
  state.bank = state.bank && typeof state.bank === 'object' && !Array.isArray(state.bank) ? state.bank : {};
  state.bank.balance = clamp(safeInt(state.bank.balance, 0), 0, BANK_BALANCE_LIMIT);
  state.bank.lastInterestDay = clamp(safeInt(state.bank.lastInterestDay, day), 1, day);
  return state.bank;
}

export function accrueBankInterest(state, currentDay = state?.game?.day) {
  const day = Math.max(1, safeInt(currentDay, 1));
  const bank = normalizeBankState(state, day);
  if (bank.balance <= 0) {
    const changed = bank.lastInterestDay !== day;
    bank.lastInterestDay = day;
    return { credited: 0, periods: 0, balance: bank.balance, changed };
  }
  const elapsed = Math.max(0, day - bank.lastInterestDay);
  const periods = Math.floor(elapsed / BANK_INTEREST_INTERVAL_DAYS);
  if (periods <= 0) return { credited: 0, periods: 0, balance: bank.balance, changed: false };

  const before = bank.balance;
  let balance = before;
  for (let i = 0; i < periods; i += 1) {
    const interest = Math.max(0, Math.floor(balance * BANK_INTEREST_RATE));
    balance = Math.min(BANK_BALANCE_LIMIT, balance + interest);
    if (balance >= BANK_BALANCE_LIMIT) break;
  }
  bank.balance = balance;
  bank.lastInterestDay += periods * BANK_INTEREST_INTERVAL_DAYS;
  return { credited: balance - before, periods, balance, changed: true };
}

export function normalizeBankAmount(amount) {
  const value = Math.max(0, safeInt(amount, 0));
  return Math.floor(value / BANK_TRANSACTION_STEP) * BANK_TRANSACTION_STEP;
}

export function bankStepForHold(elapsedMs) {
  const ms = Math.max(0, Number(elapsedMs) || 0);
  if (ms >= 4000) return 10_000_000;
  if (ms >= 2000) return 1_000_000;
  if (ms >= 800) return 100_000;
  return BANK_TRANSACTION_STEP;
}

export function performBankTransaction(state, kind, requestedAmount, currentDay = state?.game?.day) {
  if (!state || typeof state !== 'object' || Array.isArray(state)) return { ok: false, reason: 'state-unavailable' };
  state.game = state.game && typeof state.game === 'object' && !Array.isArray(state.game) ? state.game : {};
  const day = Math.max(1, safeInt(currentDay, 1));
  const bank = normalizeBankState(state, day);
  const interest = accrueBankInterest(state, day);
  const amount = normalizeBankAmount(requestedAmount);
  if (amount <= 0) return { ok: false, reason: 'invalid-amount', amount, interest };

  const money = Math.max(0, safeInt(state.game.money, 0));
  const balanceBefore = bank.balance;
  if (kind === 'deposit') {
    if (money < amount) return { ok: false, reason: 'insufficient-cash', amount, money, balance: bank.balance, interest };
    if (bank.balance + amount > BANK_BALANCE_LIMIT) return { ok: false, reason: 'balance-limit', amount, money, balance: bank.balance, interest };
    if (bank.balance === 0) bank.lastInterestDay = day;
    state.game.money = money - amount;
    bank.balance += amount;
    return { ok: true, kind, amount, moneyBefore: money, money: state.game.money, balanceBefore, balance: bank.balance, interest };
  }
  if (kind === 'withdraw') {
    if (bank.balance < amount) return { ok: false, reason: 'insufficient-balance', amount, money, balance: bank.balance, interest };
    state.game.money = money + amount;
    bank.balance -= amount;
    if (bank.balance === 0) bank.lastInterestDay = day;
    return { ok: true, kind, amount, moneyBefore: money, money: state.game.money, balanceBefore, balance: bank.balance, interest };
  }
  return { ok: false, reason: 'invalid-kind', amount, money, balance: bank.balance, interest };
}
