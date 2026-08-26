#!/usr/bin/env python3
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
