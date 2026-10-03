import assert from 'node:assert/strict';
import test from 'node:test';

import {
  isOkachimachiBenchVideoEligible,
  nextOkachimachiBenchVideoEligibleDay,
  randomizedOkachimachiBenchVideoCooldownDays,
} from '../js/events/okachimachi-bench-video-event-rules.js';

const event = (lastTriggeredDay=0, nextEligibleDay=0, active=false, stage='completed') => ({
  lastTriggeredDay, nextEligibleDay, active, stage,
});
const snapshot = ({ day=366, bench=false, purchaseDay=0, eventState=event() }={}) => ({
  game: { day },
  tools: {
    items: bench ? { jewelryBench: { status: 'repairing' } } : {},
    jewelryBenchDay: purchaseDay,
  },
  events: { okachimachiBenchVideoEvent: eventState },
});

test('first trigger requires day 366 and either workshop ownership or a purchase record', () => {
  assert.equal(isOkachimachiBenchVideoEligible(snapshot({ day: 365, bench: true })), false);
  assert.equal(isOkachimachiBenchVideoEligible(snapshot({ day: 366 })), false);
  assert.equal(isOkachimachiBenchVideoEligible(snapshot({ day: 366, bench: true })), true);
  assert.equal(isOkachimachiBenchVideoEligible(snapshot({ day: 366, purchaseDay: 100 })), true);
  assert.equal(isOkachimachiBenchVideoEligible(snapshot({ day: 366, purchaseDay: 0 })), false);
});

test('repeat interval is randomized from 150 through 210 days inclusive', () => {
  assert.equal(randomizedOkachimachiBenchVideoCooldownDays(() => 0), 150);
  assert.equal(randomizedOkachimachiBenchVideoCooldownDays(() => 0.999999), 210);
  assert.equal(nextOkachimachiBenchVideoEligibleDay(366, () => 0), 516);
  assert.equal(nextOkachimachiBenchVideoEligibleDay(366, () => 0.999999), 576);
  assert.ok(randomizedOkachimachiBenchVideoCooldownDays(() => -1) >= 150);
  assert.ok(randomizedOkachimachiBenchVideoCooldownDays(() => 2) <= 210);
});

test('repeat eligibility follows its saved random due day, without rerolling on visits', () => {
  const earlyDue = event(366, 516);
  assert.equal(isOkachimachiBenchVideoEligible(snapshot({ day: 515, bench: true, eventState: earlyDue })), false);
  assert.equal(isOkachimachiBenchVideoEligible(snapshot({ day: 516, bench: true, eventState: earlyDue })), true);

  const lateDue = event(366, 576);
  assert.equal(isOkachimachiBenchVideoEligible(snapshot({ day: 546, bench: true, eventState: lateDue })), false);
  assert.equal(isOkachimachiBenchVideoEligible(snapshot({ day: 576, purchaseDay: 1, eventState: lateDue })), true);
});

test('interrupted videos resume and completed videos do not', () => {
  assert.equal(isOkachimachiBenchVideoEligible(snapshot({
    day: 2, eventState: event(500, 650, true, 'video'),
  })), true);
  assert.equal(isOkachimachiBenchVideoEligible(snapshot({
    day: 366, bench: true, eventState: event(366, 516, false, 'completed'),
  })), false);
});
