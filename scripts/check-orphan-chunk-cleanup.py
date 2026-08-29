#!/usr/bin/env python3
"""Validate conservative cleanup of unreferenced cloud save chunks."""
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
FIREBASE = (ROOT / 'js/firebase-service.js').read_text(encoding='utf-8')

start = FIREBASE.find('async function cleanupOldOrphanChunks(uid)')
end = FIREBASE.find('function shouldRetryCloudSave', start)
CLEANUP = FIREBASE[start:end] if start >= 0 and end > start else ''
save_start = FIREBASE.find('export async function saveState(uid, state)')
save_end = FIREBASE.find('export async function deleteGameData', save_start)
SAVE = FIREBASE[save_start:save_end] if save_start >= 0 and save_end > save_start else ''
gift_start = FIREBASE.find('async function commitGiftChunkedTransition')
gift_end = FIREBASE.find('export function normalizeGiftCode', gift_start)
GIFT = FIREBASE[gift_start:gift_end] if gift_start >= 0 and gift_end > gift_start else ''

checks = {
    'Firestoreの限定一覧取得APIを使う': all(token in FIREBASE for token in ('collection,', 'query,', 'where,', 'limit,', 'getDocs,')),
    '24時間以上古いチャンクだけを対象にする': 'ORPHAN_CHUNK_MIN_AGE_MS = 24 * 60 * 60 * 1000' in FIREBASE and "where('updatedAt', '<', cutoff)" in CLEANUP,
    '1回最大256件に制限する': 'ORPHAN_CHUNK_CLEANUP_LIMIT = 256' in FIREBASE and 'limit(ORPHAN_CHUNK_CLEANUP_LIMIT)' in CLEANUP,
    '1セッション1回だけ試す': 'orphanCleanupAttemptedUids = new Set()' in FIREBASE and 'orphanCleanupAttemptedUids.has(uid)' in CLEANUP and 'orphanCleanupAttemptedUids.add(uid)' in CLEANUP,
    '問い合わせ前の現行generationを保護する': 'firstProtectedGeneration' in CLEANUP and '[firstProtectedGeneration, latestProtectedGeneration]' in CLEANUP,
    '削除直前に現行metadataを再確認する': CLEANUP.count('readCurrentCloudMetadata(uid)') >= 2 and 'latestProtectedGeneration' in CLEANUP,
    '現行generationは削除対象から除外する': '!protectedGenerations.has(generation)' in CLEANUP,
    '削除は取得した古い文書refだけに限定する': '.map((snapshot) => deleteDoc(snapshot.ref))' in CLEANUP,
    '掃除失敗は保存成功を壊さない': 'catch (error)' in CLEANUP and 'ゲーム保存は継続します。' in CLEANUP,
    '通常保存成功後にベストエフォート掃除を起動する': 'void cleanupOldOrphanChunks(uid);' in SAVE,
    'プレゼント確定後にもベストエフォート掃除を起動する': 'void cleanupOldOrphanChunks(uid);' in GIFT,
    '既存の直前世代掃除を維持する': 'void cleanupChunkGeneration(uid, previousMetadata);' in SAVE and 'void cleanupChunkGeneration(uid, expectedMetadata);' in GIFT,
}

failed = [label for label, ok in checks.items() if not ok]
for label, ok in checks.items():
    print(('OK' if ok else 'NG') + ': ' + label)

proc = subprocess.run(['node', '--check', 'js/firebase-service.js'], cwd=ROOT)
if proc.returncode != 0:
    failed.append('JavaScript構文: js/firebase-service.js')

if failed:
    print('\nORPHAN CHUNK CLEANUP POLICY: FAIL')
    for label in failed:
        print('- ' + label)
    sys.exit(1)
print('\nORPHAN CHUNK CLEANUP POLICY: PASS')
