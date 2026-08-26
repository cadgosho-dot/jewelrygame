#!/usr/bin/env python3
"""Validate long-play localStorage quota recovery policy."""
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
APP = (ROOT / 'js/app.js').read_text(encoding='utf-8')

try:
    BOOT_HELPER = APP[
        APP.index('function persistBootLocalStateSafely(savedState'):
        APP.index('function saveStateFingerprint')
    ]
except ValueError:
    BOOT_HELPER = ''

checks = {
    '容量超過判定がある': 'function isLocalStorageQuotaError(error)' in APP,
    '端末1コピー節約モードがある': "'single-copy'" in APP and 'function enableLocalSingleCopyMode()' in APP,
    '起動時端末保存に安全ヘルパーがある': bool(BOOT_HELPER),
    '起動時容量不足で1コピー化して再試行する': 'isLocalStorageQuotaError(error)' in BOOT_HELPER and 'enableLocalSingleCopyMode();' in BOOT_HELPER and BOOT_HELPER.count('writePrimary();') >= 2,
    '起動時端末保存の最終失敗で起動を止めない': 'return false;' in BOOT_HELPER and 'クラウド/メモリ上のセーブで起動を続行します。' in BOOT_HELPER,
    'クラウド採用時は安全保存を使う': "persistBootLocalStateSafely(preferredAtBoot.state, 'クラウド採用セーブ');" in APP and 'localStorage.setItem(localSaveKey(), JSON.stringify(preferredAtBoot.state));' not in APP,
    '端末優先移行時は安全保存を使う': "persistBootLocalStateSafely(migratedLocal, '起動時ローカル移行');" in APP and 'localStorage.setItem(localSaveKey(), JSON.stringify(migratedLocal));' not in APP,
    '容量不足時に重複バックアップを解放する': 'removeLocalStorageItemQuietly(localSaveBackupKey())' in APP and 'removeLocalStorageItemQuietly(localSavePreMigrationKey())' in APP,
    '破損診断へ巨大なraw全文を保存しない': 'rawCharacters: String(raw).length' in APP and '\n      raw,\n' not in APP[APP.index('function preserveCorruptLocalSave'):APP.index('function localSavedState')],
    '正常読込時に旧pre-migrationを解放する': 'removeLocalStorageItemQuietly(localSavePreMigrationKey());' in APP[APP.index('function localSavedState'):APP.index('function preferredSavedState')],
    '端末書込前にクラウド用snapshotを確保する': 'snapshot = createCloudSnapshot ? JSON.parse(nextRaw) : null;' in APP,
    '容量不足時に最新端末セーブを再試行する': 'quotaRecoveryUsed = true;\n      writePrimary();' in APP,
    '端末保存失敗でもクラウド保存へ進む': "端末保存失敗／クラウド保存を続行しています" in APP and '.then(() => saveState(userId, snapshot))' in APP,
    '端末とクラウド両方失敗時の表示がある': '保存できませんでした／${cloudMessage}' in APP,
}

failed = [label for label, ok in checks.items() if not ok]
for label, ok in checks.items():
    print(('OK' if ok else 'NG') + ': ' + label)

if failed:
    print('\nSAVE STORAGE POLICY: FAIL')
    sys.exit(1)
print('\nSAVE STORAGE POLICY: PASS')
