import assert from 'node:assert/strict';
import test from 'node:test';

let eligibility;
try {
  ({ isOkachimachiBenchVideoEligible: eligibility } = await import('../js/events/okachimachi-bench-video-event-rules.js'));
} catch (_) {
  // The missing event module is represented by the assertion below during the RED step.
}

test('video event requires day 366 and ownership of the jewelry bench', () => {
  if (typeof eligibility !== 'function') {
    assert.fail('isOkachimachiBenchVideoEligible is not implemented');
    return;
  }

  const snapshot = ({ day, bench = true, last = 0, active = false } = {}) => ({
    game: { day },
    tools: { items: bench ? { jewelryBench: { status: 'repairing' } } : {} },
    events: {
      okachimachiBenchVideoEvent: { lastTriggeredDay: last, active, stage: active ? 'video' : 'completed' },
    },
  });

  assert.equal(eligibility(snapshot({ day: 1 })), false, 'the first in-game year has not elapsed');
  assert.equal(eligibility(snapshot({ day: 365 })), false, 'must wait until the first anniversary day');
  assert.equal(eligibility(snapshot({ day: 366, bench: false })), false, 'must own the jewelry bench');
  assert.equal(eligibility(snapshot({ day: 366 })), true, 'first eligible Okachimachi visit may play');
  assert.equal(eligibility(snapshot({ day: 2, bench: false, active: true })), true, 'an interrupted video must resume');
});

test('video event repeats only after a full 180-day cooldown', () => {
  if (typeof eligibility !== 'function') assert.fail('isOkachimachiBenchVideoEligible is not implemented');

  const snapshot = (day, lastTriggeredDay) => ({
    game: { day },
    tools: { items: { jewelryBench: { status: 'available' } } },
    events: { okachimachiBenchVideoEvent: { lastTriggeredDay, active: false, stage: 'completed' } },
  });

  assert.equal(eligibility(snapshot(545, 366)), false, '179 days is too soon');
  assert.equal(eligibility(snapshot(546, 366)), true, '180 days is eligible');
});

test('an interrupted video resumes even if its original conditions no longer hold', () => {
  if (typeof eligibility !== 'function') assert.fail('isOkachimachiBenchVideoEligible is not implemented');

  assert.equal(eligibility({
    game: { day: 2 },
    tools: { items: {} },
    events: { okachimachiBenchVideoEvent: { lastTriggeredDay: 500, active: true, stage: 'video' } },
  }), true);
  assert.equal(eligibility({
    game: { day: 366 },
    tools: { items: { jewelryBench: {} } },
    events: { okachimachiBenchVideoEvent: { lastTriggeredDay: 366, active: true, stage: 'completed' } },
  }), false, 'completed events do not resume');
});
