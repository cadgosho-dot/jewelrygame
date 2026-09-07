#!/usr/bin/env python3
"""Protect saveGame persistence orchestration without changing gameplay or save format."""
from pathlib import Path
import re
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
APP = (ROOT / 'js/app.js').read_text(encoding='utf-8')
TEST = (ROOT / 'tools/test-save-game-regression.mjs').read_text(encoding='utf-8')
CURRENT = (ROOT / 'scripts/check-current.py').read_text(encoding='utf-8')
SYNC = ROOT / '.github/workflows/phase38-sync-v010927.yml'


def section(name):
    matches = list(re.finditer(r'^(?:async\s+)?function ' + re.escape(name) + r'\(', APP, re.M))
    if len(matches) != 1:
        raise AssertionError(f'{name}: expected exactly one declaration')
    start = matches[0].start()
    following = re.search(r'^(?:async\s+)?function ', APP[matches[0].end():], re.M)
    return APP[start:matches[0].end() + following.start()] if following else APP[start:]


save = section('saveGame')

checks = {
    'saveGame definition exists once': APP.count('function saveGame(') == 1,
    'null state resolves without persistence': 'if (!state) return Promise.resolve();' in save,
    'pre-save maintenance retained': all(token in save for token in [
        'syncGameClearState();',
        'compactLongTermHistory(state);',
        'compactFinanceHistory(state);',
    ]),
    'unauthenticated or taken-over session cannot persist': 'if (!currentUser || sessionTakenOver) return Promise.resolve();' in save,
    'pending autosave timer is cleared': all(token in save for token in [
        'if (autosaveTimer) {',
        'clearTimeout(autosaveTimer);',
        'autosaveTimer = null;',
        'autosavePending = false;',
    ]),
    'duplicate local and cloud fingerprint returns existing queue': all(token in save for token in [
        'const fingerprint = saveStateFingerprint(state);',
        'fingerprint === lastSavedFingerprint && fingerprint === lastCloudSavedFingerprint',
        'return saveQueue;',
    ]),
    'local backup snapshot is prepared before queued persistence': all(token in save for token in [
        'saveLocalBackup({ fingerprint, createCloudSnapshot: true, updateFingerprint: true })',
        'if (localResult.saved && fingerprint) lastLifecycleLocalFingerprint = fingerprint;',
        'const snapshot = localResult.snapshot;',
    ]),
    'missing snapshot aborts with persistent error': all(token in save for token in [
        "showAutosaveStatus('error', 'セーブデータを準備できませんでした', { persistent: true });",
        'return Promise.resolve();',
    ]),
    'quota recovery notice retained': "showAutosaveStatus('saved', '端末容量を節約して保存しました');" in save,
    'indexeddb remains primary queued device save': all(token in save for token in [
        "persistIndexedDbStateSafely(userId, snapshot, '通常セーブ')",
        'deviceSaved = indexedDbSaved || Boolean(localResult.saved);',
        'lastSuccessfulSaveAt = String(snapshot.updatedAt || lastSuccessfulSaveAt || \'\');',
        'lastSavedFingerprint = cloudFingerprint;',
        "showAutosaveStatus('saved', '端末に保存しました（IndexedDB）');",
    ]),
    'device failure continues toward cloud save': all(token in save for token in [
        "localResult.quota ? '端末容量不足／クラウド保存を続行しています' : '端末保存失敗／クラウド保存を続行しています'",
        '{ persistent: true }',
        'return saveState(userId, snapshot);',
    ]),
    'cloud success updates snapshot and fingerprint': all(token in save for token in [
        'cloudSave = snapshot;',
        'lastCloudSavedFingerprint = cloudFingerprint;',
        'cloudSaveFailureActive = false;',
        "showAutosaveStatus('saved', 'クラウドに保存しました（端末容量不足）');",
        "showAutosaveStatus('saved', 'クラウド保存を復旧しました');",
    ]),
    'cloud failure distinguishes device-saved and total failure': all(token in save for token in [
        'cloudSaveFailureActive = true;',
        "firebaseErrorMessage(error, 'cloud-save')",
        '`端末保存済み／${cloudMessage}`',
        '`保存できませんでした／${cloudMessage}`',
    ]),
    'save queue swallows prior rejection and serializes persistence': all(token in save for token in [
        'saveQueue = saveQueue',
        '.catch(() => {})',
        '.then(async () => {',
        'return saveQueue;',
    ]),
    'test executes current production saveGame': all(token in TEST for token in [
        "extractFunction('saveGame')",
        "vm.runInContext(source, ctx",
        "h.ctx.saveGame()",
    ]),
    'registered in audit or pending formal sync': 'check-save-game-regression.py' in CURRENT or (SYNC.is_file() and 'check-save-game-regression.py' in SYNC.read_text(encoding='utf-8')),
}

for name in [
    'testNoStateReturnsResolvedWithoutSideEffects',
    'testPreSaveMaintenanceRunsBeforeAuthGuard',
    'testTakenOverSessionDoesNotPersist',
    'testDuplicateFingerprintReturnsExistingQueue',
    'testMissingSnapshotStopsBeforeDeviceAndCloudSave',
    'testSuccessfulDeviceAndCloudSaveUpdatesFingerprints',
    'testIndexedDbRecoversLocalStorageFailure',
    'testCloudSuccessAfterNoDeviceSaveReportsRecovery',
    'testCloudFailureKeepsDeviceSaveAndShowsPersistentStatus',
    'testQuotaRecoveryNoticeIsRetained',
]:
    checks[f'regression retained: {name}'] = TEST.count(name) >= 2

for name, ok in checks.items():
    print(f"{'OK' if ok else 'NG'}: {name}")
if not all(checks.values()):
    sys.exit('SAVE GAME PROTECTION: FAIL')

result = subprocess.run(['node', str(ROOT / 'tools/test-save-game-regression.mjs')], cwd=ROOT)
if result.returncode:
    sys.exit(result.returncode)
print('SAVE GAME PROTECTION: PASS')
