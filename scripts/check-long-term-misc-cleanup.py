#!/usr/bin/env python3
from __future__ import annotations
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
NODE = r'''
import {
  initialState,
  migrateState,
  compactLongTermHistory,
  LONG_TERM_MISC_LIMITS,
  PROCESSING_KNOWLEDGE_SEQUENCE,
} from './js/game-data-core.js';

const state = initialState();
state.game.startDate = '2026-01-01';
state.game.day = 1000;
const isoForDay = (day) => {
  const ms = Date.UTC(2026, 0, 1) + (day - 1) * 86400000;
  return new Date(ms).toISOString().slice(0, 10);
};
state.game.calendarEvents = {
  [isoForDay(100)]: '古すぎる予定',
  [isoForDay(635)]: '365日前の予定',
  [isoForDay(1000)]: '今日の予定',
  [isoForDay(1400)]: '未来の予定',
  'broken-key': '不正',
};
state.notifications = Array.from({ length: 100 }, (_, index) => ({
  id: `n-${index}`, title: 'T'.repeat(120), body: 'B'.repeat(800), type: 'x'.repeat(80), day: 1000 - index,
}));
state.business.homeRentReports = Array.from({ length: 24 }, (_, index) => ({ month: index + 1 }));
state.business.monthlyReports = Array.from({ length: 24 }, (_, index) => ({ month: index + 1 }));
state.business.branchUnpaid = { '1': 100, '2': 200, '3': 300, '4': 400, bogus: 500 };
state.events.robbery.history = Array.from({ length: 20 }, (_, index) => ({ id: `r-${index}`, incidentDay: index + 1 }));
const knownKnowledge = PROCESSING_KNOWLEDGE_SEQUENCE[0];
state.workshop.processingKnowledge = [
  { id: knownKnowledge, acquiredDay: 2, source: 'test' },
  { id: knownKnowledge, acquiredDay: 3, source: 'duplicate' },
  { id: 'removed-or-invalid-knowledge', acquiredDay: 4, source: 'legacy' },
];
state.store.branches = [
  { number: 1, id: 'branch-1' },
  { number: 2, id: 'branch-2' },
  { number: 2, id: 'duplicate-2' },
  { number: 4, id: 'invalid-4' },
];
state.store.branchNumber = 4;

const result = compactLongTermHistory(state);
const checks = {
  oldCalendarRemoved: !state.game.calendarEvents[isoForDay(100)],
  boundaryCalendarKept: state.game.calendarEvents[isoForDay(635)] === '365日前の予定',
  currentCalendarKept: state.game.calendarEvents[isoForDay(1000)] === '今日の予定',
  futureCalendarKept: state.game.calendarEvents[isoForDay(1400)] === '未来の予定',
  invalidCalendarRemoved: !state.game.calendarEvents['broken-key'],
  notificationsBounded: state.notifications.length === LONG_TERM_MISC_LIMITS.notifications,
  notificationTextBounded: state.notifications.every((row) => row.title.length <= 80 && row.body.length <= 500 && row.type.length <= 40),
  reportsBounded: state.business.homeRentReports.length === 12 && state.business.monthlyReports.length === 12,
  robberyBounded: state.events.robbery.history.length === 10,
  branchUnpaidClean: JSON.stringify(Object.keys(state.business.branchUnpaid).sort()) === JSON.stringify(['1','2','3']),
  branchesClean: JSON.stringify(state.store.branches.map((row) => row.number)) === JSON.stringify([1,2]),
  activeBranchRecovered: state.store.branchNumber === 1,
  knowledgeClean: state.workshop.processingKnowledge.length === 1 && state.workshop.processingKnowledge[0].id === knownKnowledge,
  cleanupReported: Number(result.miscCleanup?.discardedCalendarEvents || 0) >= 2 && Number(result.miscCleanup?.discardedNotifications || 0) === 60,
};
const roundTrip = migrateState(structuredClone(state));
checks.roundTripStable = roundTrip.notifications.length <= 40
  && roundTrip.business.homeRentReports.length <= 12
  && roundTrip.business.monthlyReports.length <= 12
  && roundTrip.events.robbery.history.length <= 10
  && !roundTrip.game.calendarEvents[isoForDay(100)];
console.log(JSON.stringify({ checks, misc: result.miscCleanup }));
if (Object.values(checks).some((value) => !value)) process.exit(1);
''';
proc = subprocess.run(
    ['node', '--experimental-default-type=module', '--input-type=module', '-e', NODE],
    cwd=ROOT, text=True, capture_output=True, timeout=60,
)
if proc.returncode != 0:
    print('LONG TERM MISC CLEANUP: FAIL')
    if proc.stdout: print(proc.stdout.strip())
    if proc.stderr: print(proc.stderr.strip())
    sys.exit(1)
print('LONG TERM MISC CLEANUP: PASS')
print(proc.stdout.strip())
