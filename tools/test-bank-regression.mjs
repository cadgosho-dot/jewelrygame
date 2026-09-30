import assert from 'node:assert/strict';
import {
  BANK_BALANCE_LIMIT,
  BANK_TRANSACTION_STEP,
  accrueBankInterest,
  bankIsOpen,
  bankStepForHold,
  normalizeBankAmount,
  performBankTransaction,
} from '../js/finance/bank-engine.js';
import { createEventStateHelpers, setServices } from '../js/events/event-state-helpers.js';

function makeState({ day = 1, minutes = 9 * 60, money = 1_000_000, balance = 0, lastInterestDay = day, hunger = 7 } = {}) {
  return {
    game:{ day, minutes, money },
    wellbeing:{ hunger, maxHunger:7 },
    events:{},
    inventory:{},
    bank:{ balance, lastInterestDay },
  };
}

assert.equal(bankIsOpen(8 * 60), true);
assert.equal(bankIsOpen(15 * 60 + 59), true);
assert.equal(bankIsOpen(16 * 60), false);
assert.equal(bankIsOpen(7 * 60 + 59), false);
assert.equal(normalizeBankAmount(19_999), BANK_TRANSACTION_STEP);
assert.equal(normalizeBankAmount(9_999), 0);
assert.equal(bankStepForHold(100), 10_000);
assert.equal(bankStepForHold(400), 100_000);
assert.equal(bankStepForHold(1300), 1_000_000);
assert.equal(bankStepForHold(2500), 10_000_000);

{
  const state = makeState();
  const result = performBankTransaction(state, 'deposit', 100_000, 1);
  assert.equal(result.ok, true);
  assert.equal(state.game.money, 900_000);
  assert.equal(state.bank.balance, 100_000);
}
{
  const state = makeState({ money:100_000, balance:500_000 });
  const result = performBankTransaction(state, 'withdraw', 200_000, 1);
  assert.equal(result.ok, true);
  assert.equal(state.game.money, 300_000);
  assert.equal(state.bank.balance, 300_000);
}
{
  const state = makeState({ money:50_000 });
  const before = structuredClone(state);
  const result = performBankTransaction(state, 'deposit', 100_000, 1);
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'insufficient-cash');
  assert.deepEqual(state, before);
}
{
  const state = makeState({ balance:BANK_BALANCE_LIMIT - 50_000 });
  const result = performBankTransaction(state, 'deposit', 100_000, 1);
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'balance-limit');
}
{
  const state = makeState({ day:61, balance:1_000_000, lastInterestDay:1 });
  const result = accrueBankInterest(state, 61);
  assert.equal(result.periods, 2);
  assert.equal(result.credited, 20_100);
  assert.equal(state.bank.balance, 1_020_100);
}

{
  let saveCount = 0;
  const state = makeState();
  setServices(
    () => true,
    () => { state.game.minutes += 60; },
    () => {},
    () => {},
    () => {},
    () => {},
  );
  const helpers = createEventStateHelpers(
    () => state,
    () => { saveCount += 1; },
    () => {},
    () => {},
    (value) => value,
    {},
  );
  const result = helpers.bankTransaction('deposit', 100_000);
  assert.equal(result.ok, true);
  assert.equal(state.game.money, 900_000);
  assert.equal(state.bank.balance, 100_000);
  assert.equal(state.game.minutes, 10 * 60);
  assert.equal(state.wellbeing.hunger, 6);
  assert.equal(saveCount, 1);

  const beforeFailed = structuredClone(state);
  const failed = helpers.bankTransaction('deposit', 9_999_990_000);
  assert.equal(failed.ok, false);
  assert.equal(state.game.minutes, beforeFailed.game.minutes);
  assert.equal(state.wellbeing.hunger, beforeFailed.wellbeing.hunger);
  assert.equal(state.game.money, beforeFailed.game.money);
  assert.equal(state.bank.balance, beforeFailed.bank.balance);

  state.game.day = 31;
  const snapshot = helpers.bankRuntimeSnapshot();
  assert.equal(snapshot.interest.credited, 1_000);
  assert.equal(snapshot.bank.balance, 101_000);
  assert.equal(saveCount, 2);
}

console.log('BANK REGRESSION: PASS');
