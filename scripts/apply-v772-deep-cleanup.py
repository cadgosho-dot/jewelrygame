#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read(path):
    return (ROOT / path).read_text(encoding='utf-8')


def write(path, text):
    (ROOT / path).write_text(text, encoding='utf-8')


def replace_once(path, old, new):
    text = read(path)
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{path}: marker count {count}, expected 1: {old[:120]!r}')
    write(path, text.replace(old, new, 1))


# --- game-data-core.js: bounded miscellaneous long-term data ---
replace_once(
    'js/game-data-core.js',
    "export const FINANCE_HISTORY_LIMIT = 300;\n",
    "export const FINANCE_HISTORY_LIMIT = 300;\n"
    "export const LONG_TERM_MISC_LIMITS = Object.freeze({\n"
    "  calendarPastDays: 365,\n"
    "  notifications: 40,\n"
    "  homeRentReports: 12,\n"
    "  monthlyReports: 12,\n"
    "  robberyHistory: 10,\n"
    "});\n",
)

misc_function = r'''
export function compactLongTermMiscData(state, limits = LONG_TERM_MISC_LIMITS) {
  if (!state || typeof state !== 'object' || Array.isArray(state)) {
    return { changed: false };
  }
  const stats = {
    discardedCalendarEvents: 0,
    discardedNotifications: 0,
    discardedHomeRentReports: 0,
    discardedMonthlyReports: 0,
    discardedRobberyHistory: 0,
    discardedInvalidBranches: 0,
    discardedBranchUnpaidKeys: 0,
    discardedProcessingKnowledge: 0,
    changed: false,
  };

  // カレンダーは未来の予定をすべて保護し、過去分だけ一定期間で自動削除する。
  if (state.game && typeof state.game === 'object') {
    const rawCalendar = state.game.calendarEvents && typeof state.game.calendarEvents === 'object' && !Array.isArray(state.game.calendarEvents)
      ? state.game.calendarEvents
      : {};
    const currentKey = financeDatePartsForDay(state, state.game.day).dayKey;
    const currentMs = /^\d{4}-\d{2}-\d{2}$/.test(currentKey)
      ? Date.parse(`${currentKey}T00:00:00Z`)
      : NaN;
    const pastDays = Math.max(0, Math.floor(Number(limits?.calendarPastDays) || 0));
    const cutoffMs = Number.isFinite(currentMs) ? currentMs - pastDays * 86400000 : NaN;
    const kept = {};
    for (const [key, rawValue] of Object.entries(rawCalendar)) {
      const value = String(rawValue || '').trim().slice(0, 120);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(key) || !value) {
        stats.discardedCalendarEvents += 1;
        continue;
      }
      const eventMs = Date.parse(`${key}T00:00:00Z`);
      if (Number.isFinite(cutoffMs) && Number.isFinite(eventMs) && eventMs < cutoffMs) {
        stats.discardedCalendarEvents += 1;
        continue;
      }
      kept[key] = value;
    }
    state.game.calendarEvents = kept;
  }

  const noticeLimit = Math.max(0, Math.floor(Number(limits?.notifications) || 0));
  const rawNotices = Array.isArray(state.notifications) ? state.notifications : [];
  state.notifications = rawNotices.slice(0, noticeLimit).map((note, index) => ({
    ...note,
    id: String(note?.id || `note-${index}`).slice(0, 120),
    title: String(note?.title || note?.sender || 'お知らせ').slice(0, 80),
    body: String(note?.body || '').slice(0, 500),
    type: String(note?.type || 'info').slice(0, 40),
    day: Math.max(1, Math.floor(Number(note?.day) || Number(state.game?.day) || 1)),
    unread: note?.unread !== false,
  }));
  stats.discardedNotifications = Math.max(0, rawNotices.length - state.notifications.length);

  if (state.business && typeof state.business === 'object' && !Array.isArray(state.business)) {
    const rawHomeRentReports = Array.isArray(state.business.homeRentReports) ? state.business.homeRentReports : [];
    const rawMonthlyReports = Array.isArray(state.business.monthlyReports) ? state.business.monthlyReports : [];
    const homeLimit = Math.max(0, Math.floor(Number(limits?.homeRentReports) || 0));
    const monthlyLimit = Math.max(0, Math.floor(Number(limits?.monthlyReports) || 0));
    state.business.homeRentReports = rawHomeRentReports.slice(-homeLimit || undefined);
    state.business.monthlyReports = rawMonthlyReports.slice(-monthlyLimit || undefined);
    if (homeLimit === 0) state.business.homeRentReports = [];
    if (monthlyLimit === 0) state.business.monthlyReports = [];
    stats.discardedHomeRentReports = Math.max(0, rawHomeRentReports.length - state.business.homeRentReports.length);
    stats.discardedMonthlyReports = Math.max(0, rawMonthlyReports.length - state.business.monthlyReports.length);

    const rawBranchUnpaid = state.business.branchUnpaid && typeof state.business.branchUnpaid === 'object' && !Array.isArray(state.business.branchUnpaid)
      ? state.business.branchUnpaid
      : {};
    const cleanedBranchUnpaid = {};
    for (const [key, value] of Object.entries(rawBranchUnpaid)) {
      const number = Math.floor(Number(key));
      if (number >= 1 && number <= 3 && String(number) === String(key)) cleanedBranchUnpaid[String(number)] = value;
      else stats.discardedBranchUnpaidKeys += 1;
    }
    state.business.branchUnpaid = cleanedBranchUnpaid;
  }

  if (state.events && typeof state.events === 'object' && state.events.robbery && typeof state.events.robbery === 'object') {
    const rawHistory = Array.isArray(state.events.robbery.history) ? state.events.robbery.history : [];
    const robberyLimit = Math.max(0, Math.floor(Number(limits?.robberyHistory) || 0));
    state.events.robbery.history = robberyLimit > 0 ? rawHistory.slice(-robberyLimit) : [];
    stats.discardedRobberyHistory = Math.max(0, rawHistory.length - state.events.robbery.history.length);
  }

  if (state.workshop && typeof state.workshop === 'object') {
    const rawKnowledge = Array.isArray(state.workshop.processingKnowledge) ? state.workshop.processingKnowledge : [];
    const seen = new Set();
    state.workshop.processingKnowledge = rawKnowledge.filter((entry) => {
      const id = String(typeof entry === 'string' ? entry : entry?.id || '').trim();
      if (!id || !PROCESSING_KNOWLEDGE[id] || seen.has(id)) {
        stats.discardedProcessingKnowledge += 1;
        return false;
      }
      seen.add(id);
      return true;
    });
  }

  if (state.store && typeof state.store === 'object') {
    const rawBranches = Array.isArray(state.store.branches) ? state.store.branches : [];
    const seenBranchNumbers = new Set();
    state.store.branches = rawBranches.filter((branch) => {
      const number = Math.floor(Number(branch?.number));
      if (number < 1 || number > 3 || seenBranchNumbers.has(number)) {
        stats.discardedInvalidBranches += 1;
        return false;
      }
      seenBranchNumbers.add(number);
      branch.number = number;
      return true;
    });
    let activeBranchNumber = Math.max(1, Math.min(3, Math.floor(Number(state.store.branchNumber) || 1)));
    if (state.store.branches.length && !state.store.branches.some((branch) => branch.number === activeBranchNumber)) {
      activeBranchNumber = state.store.branches[0].number;
    }
    state.store.branchNumber = activeBranchNumber;
  }

  stats.changed = Object.entries(stats).some(([key, value]) => key !== 'changed' && Number(value) > 0);
  return stats;
}

'''
replace_once(
    'js/game-data-core.js',
    'export function compactLongTermHistory(state, limits = LONG_TERM_HISTORY_LIMITS) {\n',
    misc_function + 'export function compactLongTermHistory(state, limits = LONG_TERM_HISTORY_LIMITS) {\n',
)

replace_once(
    'js/game-data-core.js',
    "  const discardedClosedOrders = discardClosed + archivedClosedBefore;\n  const discardedSoldJewelry = discardSold + archivedSoldBefore;\n  return {\n",
    "  const miscCleanup = compactLongTermMiscData(state);\n  const discardedClosedOrders = discardClosed + archivedClosedBefore;\n  const discardedSoldJewelry = discardSold + archivedSoldBefore;\n  return {\n",
)
replace_once(
    'js/game-data-core.js',
    "    archivedSoldJewelry: 0,\n  };\n}\n\nfunction financeDatePartsForDay",
    "    archivedSoldJewelry: 0,\n    miscCleanup,\n  };\n}\n\nfunction financeDatePartsForDay",
)

replace_once(
    'js/game-data-core.js',
    "  state.business.homeRentReports = Array.isArray(state.business.homeRentReports) ? state.business.homeRentReports.slice(-24) : [];\n",
    "  state.business.homeRentReports = Array.isArray(state.business.homeRentReports) ? state.business.homeRentReports.slice(-LONG_TERM_MISC_LIMITS.homeRentReports) : [];\n",
)
replace_once(
    'js/game-data-core.js',
    "  state.business.monthlyReports = Array.isArray(state.business.monthlyReports) ? state.business.monthlyReports.slice(-24) : [];\n",
    "  state.business.monthlyReports = Array.isArray(state.business.monthlyReports) ? state.business.monthlyReports.slice(-LONG_TERM_MISC_LIMITS.monthlyReports) : [];\n",
)
replace_once(
    'js/game-data-core.js',
    "    .filter((branch) => branch && Number(branch.number) >= 1)\n",
    "    .filter((branch) => branch && Number(branch.number) >= 1 && Number(branch.number) <= 3)\n",
)
replace_once(
    'js/game-data-core.js',
    "  state.notifications = (Array.isArray(state.notifications) ? state.notifications : []).slice(0, 80).map((note, index) => ({\n    id: note?.id || `legacy-note-${index}`,\n    title: note?.title || note?.sender || 'お知らせ',\n    body: note?.body || '',\n    type: note?.type || 'info',\n",
    "  state.notifications = (Array.isArray(state.notifications) ? state.notifications : []).slice(0, LONG_TERM_MISC_LIMITS.notifications).map((note, index) => ({\n    id: String(note?.id || `legacy-note-${index}`).slice(0, 120),\n    title: String(note?.title || note?.sender || 'お知らせ').slice(0, 80),\n    body: String(note?.body || '').slice(0, 500),\n    type: String(note?.type || 'info').slice(0, 40),\n",
)
replace_once(
    'js/game-data-core.js',
    "    ? savedRobberyEvents.history.map(normalizeRobberyReport).filter(Boolean).slice(-20)\n",
    "    ? savedRobberyEvents.history.map(normalizeRobberyReport).filter(Boolean).slice(-LONG_TERM_MISC_LIMITS.robberyHistory)\n",
)
replace_once(
    'js/game-data-core.js',
    "          branchNumber: Math.max(1, Number(entry.branchNumber) || 1),\n",
    "          branchNumber: Math.max(1, Math.min(3, Number(entry.branchNumber) || 1)),\n",
)

# --- firebase-service.js: aggressive but safe user-save cleanup ---
replace_once(
    'js/firebase-service.js',
    "const ORPHAN_CHUNK_MIN_AGE_MS = 7 * 24 * 60 * 60 * 1000;\nconst ORPHAN_CHUNK_CLEANUP_LIMIT = 128;\n",
    "const ORPHAN_CHUNK_MIN_AGE_MS = 24 * 60 * 60 * 1000;\nconst ORPHAN_CHUNK_CLEANUP_LIMIT = 256;\n",
)

cloud_cleanup_helper = r'''
async function deleteUserSaveSubcollections(uid) {
  if (previewMode || !uid) return;
  // 親ドキュメントを消してもFirestoreのサブコレクションは自動削除されないため、
  // 現在のゲーム保存で利用する既知サブコレクションを先に明示的に掃除する。
  const chunkSnapshots = await getDocs(collection(db, 'users', uid, 'saveChunks'));
  const deletions = chunkSnapshots.docs.map((snapshot) => deleteDoc(snapshot.ref));
  deletions.push(deleteDoc(cloudSaveMetaRef(uid)));
  deletions.push(deleteDoc(sessionDocRef(uid)));
  await Promise.all(deletions);
  cloudStorageMetaByUid.delete(uid);
  orphanCleanupAttemptedUids.delete(uid);
}

'''
replace_once(
    'js/firebase-service.js',
    'export async function deleteGameData(uid) {\n',
    cloud_cleanup_helper + 'export async function deleteGameData(uid) {\n',
)
replace_once(
    'js/firebase-service.js',
    "  await setDoc(doc(db, 'users', uid), {\n    gameState: null,\n    activeSession: null,\n    updatedAt: serverTimestamp(),\n  }, { merge: true });\n}\n\nexport async function deleteAccountCompletely",
    "  await deleteUserSaveSubcollections(uid);\n  await setDoc(doc(db, 'users', uid), {\n    gameState: null,\n    gameStateStorage: null,\n    activeSession: null,\n    updatedAt: serverTimestamp(),\n  }, { merge: true });\n}\n\nexport async function deleteAccountCompletely",
)
replace_once(
    'js/firebase-service.js',
    "  // 再認証が成功した後にクラウドデータと認証アカウントを削除する。\n  await deleteDoc(doc(db, 'users', user.uid));\n  await deleteUser(user);\n",
    "  // 再認証が成功した後に既知サブコレクションを先に削除し、\n  // 残存セーブを作らない状態で親ドキュメントと認証アカウントを削除する。\n  await deleteUserSaveSubcollections(user.uid);\n  await deleteDoc(doc(db, 'users', user.uid));\n  await deleteUser(user);\n",
)

# --- tests ---
long_term_test = r'''#!/usr/bin/env python3
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
'''
write('scripts/check-long-term-misc-cleanup.py', long_term_test)

cloud_delete_test = r'''#!/usr/bin/env python3
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
FIREBASE = (ROOT / 'js/firebase-service.js').read_text(encoding='utf-8')

helper_start = FIREBASE.find('async function deleteUserSaveSubcollections(uid)')
helper_end = FIREBASE.find('export async function deleteGameData(uid)', helper_start)
HELPER = FIREBASE[helper_start:helper_end] if helper_start >= 0 and helper_end > helper_start else ''
game_start = FIREBASE.find('export async function deleteGameData(uid)')
game_end = FIREBASE.find('export async function deleteAccountCompletely', game_start)
GAME_DELETE = FIREBASE[game_start:game_end] if game_start >= 0 and game_end > game_start else ''
account_start = FIREBASE.find('export async function deleteAccountCompletely')
account_end = FIREBASE.find('function sessionDocRef', account_start)
ACCOUNT_DELETE = FIREBASE[account_start:account_end] if account_start >= 0 and account_end > account_start else ''

checks = {
    '既知saveChunksを全件列挙して削除': "getDocs(collection(db, 'users', uid, 'saveChunks'))" in HELPER and 'deleteDoc(snapshot.ref)' in HELPER,
    'saveMetaを削除': 'deleteDoc(cloudSaveMetaRef(uid))' in HELPER,
    'session/currentを削除': 'deleteDoc(sessionDocRef(uid))' in HELPER,
    'ゲームデータ削除でサブコレクション掃除': 'await deleteUserSaveSubcollections(uid);' in GAME_DELETE,
    '旧gameStateStorage参照も消す': 'gameStateStorage: null' in GAME_DELETE,
    'アカウント削除でサブコレクションを先に掃除': 'await deleteUserSaveSubcollections(user.uid);' in ACCOUNT_DELETE and ACCOUNT_DELETE.find('deleteUserSaveSubcollections') < ACCOUNT_DELETE.find("deleteDoc(doc(db, 'users', user.uid))"),
    '孤立チャンクは24時間後から掃除': 'ORPHAN_CHUNK_MIN_AGE_MS = 24 * 60 * 60 * 1000' in FIREBASE,
    '孤立チャンク掃除は最大256件': 'ORPHAN_CHUNK_CLEANUP_LIMIT = 256' in FIREBASE,
}
failed = [label for label, ok in checks.items() if not ok]
for label, ok in checks.items(): print(('OK' if ok else 'NG') + ': ' + label)
proc = subprocess.run(['node', '--check', 'js/firebase-service.js'], cwd=ROOT)
if proc.returncode != 0: failed.append('JavaScript構文')
if failed:
    print('\nCLOUD DELETE POLICY: FAIL')
    for label in failed: print('- ' + label)
    sys.exit(1)
print('\nCLOUD DELETE POLICY: PASS')
'''
write('scripts/check-cloud-delete-policy.py', cloud_delete_test)

# Update existing orphan cleanup expectations.
replace_once(
    'scripts/check-orphan-chunk-cleanup.py',
    "'7日以上古いチャンクだけを対象にする': 'ORPHAN_CHUNK_MIN_AGE_MS = 7 * 24 * 60 * 60 * 1000' in FIREBASE and \"where('updatedAt', '<', cutoff)\" in CLEANUP,\n    '1回最大128件に制限する': 'ORPHAN_CHUNK_CLEANUP_LIMIT = 128' in FIREBASE and 'limit(ORPHAN_CHUNK_CLEANUP_LIMIT)' in CLEANUP,\n",
    "'24時間以上古いチャンクだけを対象にする': 'ORPHAN_CHUNK_MIN_AGE_MS = 24 * 60 * 60 * 1000' in FIREBASE and \"where('updatedAt', '<', cutoff)\" in CLEANUP,\n    '1回最大256件に制限する': 'ORPHAN_CHUNK_CLEANUP_LIMIT = 256' in FIREBASE and 'limit(ORPHAN_CHUNK_CLEANUP_LIMIT)' in CLEANUP,\n",
)

replace_once(
    'scripts/check-current.py',
    "    ('長期履歴自動整理', [sys.executable, str(ROOT / 'scripts/check-long-term-history.py')]),\n",
    "    ('長期履歴自動整理', [sys.executable, str(ROOT / 'scripts/check-long-term-history.py')]),\n    ('長期不要データ整理', [sys.executable, str(ROOT / 'scripts/check-long-term-misc-cleanup.py')]),\n    ('クラウド完全削除', [sys.executable, str(ROOT / 'scripts/check-cloud-delete-policy.py')]),\n",
)

print('v0.10.772 deep cleanup patch prepared.')
