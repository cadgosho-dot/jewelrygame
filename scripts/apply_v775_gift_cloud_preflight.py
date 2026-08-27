#!/usr/bin/env python3
from __future__ import annotations

import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
APP_PATH = ROOT / 'js/app.js'
FB_PATH = ROOT / 'js/firebase-service.js'
CHECK_PATH = ROOT / 'scripts/check-gift-chunked-save.py'
VERSION_PATH = ROOT / 'VERSION'


def replace_once(path: Path, old: str, new: str, label: str) -> None:
    text = path.read_text(encoding='utf-8')
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f'{label}: expected exactly one anchor, found {count}')
    path.write_text(text.replace(old, new, 1), encoding='utf-8')


def already_applied() -> bool:
    app = APP_PATH.read_text(encoding='utf-8')
    fb = FB_PATH.read_text(encoding='utf-8')
    check = CHECK_PATH.read_text(encoding='utf-8')
    return all((
        'export async function confirmGiftCloudSave(uid, expectedRevision = 0)' in fb,
        "'gift/cloud-save-unavailable'" in fb,
        'await confirmGiftCloudSave(currentUser.uid, state.saveRevision);' in app,
        "error?.code === 'gift/no-save'" in app,
        'gift exports preflight cloud confirmation' in check,
    ))


def run(*args: str) -> None:
    subprocess.run(list(args), cwd=ROOT, check=True)


current_version = VERSION_PATH.read_text(encoding='utf-8').strip()
if current_version == '0.10.775' and already_applied():
    print('v0.10.775 gift cloud preflight is already applied; validating only.')
    run(sys.executable, 'scripts/check-gift-chunked-save.py')
    run(sys.executable, 'scripts/check-current.py')
    raise SystemExit(0)
if current_version != '0.10.774':
    raise RuntimeError(f'Unexpected starting VERSION: {current_version!r}; expected 0.10.774')
if already_applied():
    raise RuntimeError('Gift cloud preflight code exists while VERSION is still 0.10.774; refusing partial reapply.')

fb_insert_anchor = """  return { metadata, gameState };\n}\n\nasync function stageGiftChunkedState(uid, nextState) {\n"""
fb_insert_replacement = """  return { metadata, gameState };\n}\n\nexport async function confirmGiftCloudSave(uid, expectedRevision = 0) {\n  requireGiftUser(uid);\n  if (previewMode) {\n    const saved = localStorage.getItem(`jewelrygame-preview-${uid}`);\n    if (!saved) throw giftServiceError('gift/cloud-save-unavailable', 'プレゼント発行前の保存を確認できませんでした。');\n    return true;\n  }\n\n  let metadata = null;\n  try {\n    // キャッシュへフォールバックせずFirestoreを直接確認する。\n    // これによりsaveGame()内部で通信失敗が処理済みになっていても、\n    // プレゼント発行だけが古いクラウド状態で進むことを防ぐ。\n    metadata = await readCurrentCloudMetadata(uid);\n  } catch (error) {\n    const wrapped = giftServiceError('gift/cloud-save-unavailable', 'プレゼント発行前のクラウド保存を確認できませんでした。');\n    wrapped.cause = error;\n    throw wrapped;\n  }\n\n  const cloudRevision = Math.max(0, Math.floor(Number(metadata?.saveRevision) || 0));\n  const requiredRevision = Math.max(0, Math.floor(Number(expectedRevision) || 0));\n  if (metadata?.mode !== 'chunked' || cloudRevision < requiredRevision) {\n    throw giftServiceError('gift/cloud-save-unavailable', 'プレゼント発行前のクラウド保存が完了していません。');\n  }\n  cloudStorageMetaByUid.set(uid, metadata);\n  return true;\n}\n\nasync function stageGiftChunkedState(uid, nextState) {\n"""
replace_once(FB_PATH, fb_insert_anchor, fb_insert_replacement, 'firebase preflight function')

replace_once(
    FB_PATH,
    "    'gift/no-save': 'ゲームデータを保存してから、もう一度お試しください。',\n    'gift/save-conflict': '最新のゲームデータをクラウドへ保存してから、もう一度お試しください。',",
    "    'gift/no-save': 'ゲームデータを保存してから、もう一度お試しください。',\n    'gift/cloud-save-unavailable': 'クラウド保存を完了できませんでした。通信状態を確認して、もう一度お試しください。',\n    'gift/save-conflict': '最新のゲームデータをクラウドへ保存してから、もう一度お試しください。',",
    'firebase gift error message',
)

replace_once(
    APP_PATH,
    '  createGiftCode, inspectGiftCode, claimGiftCode, cancelGiftCode, normalizeGiftCode, giftErrorMessage,',
    '  createGiftCode, inspectGiftCode, claimGiftCode, cancelGiftCode, normalizeGiftCode, confirmGiftCloudSave, giftErrorMessage,',
    'app firebase import',
)

replace_once(
    APP_PATH,
    """    await saveGame();\n    const result = await createGiftCode(currentUser.uid, state.playerName, payload, removeGiftFromGameState);\n""",
    """    await saveGame();\n    // プレゼント発行は在庫をクラウド側でも同時に確定するため、\n    // 通常セーブのPromise終了だけでなく、saveMeta/currentへ今回のsaveRevisionが\n    // 実際に反映されたことを確認してからコード発行へ進む。\n    await confirmGiftCloudSave(currentUser.uid, state.saveRevision);\n    const result = await createGiftCode(currentUser.uid, state.playerName, payload, removeGiftFromGameState);\n""",
    'app gift preflight call',
)

replace_once(
    APP_PATH,
    """    console.error('プレゼントコード発行エラー', error);\n    showToast(giftErrorMessage(error), 'error');\n""",
    """    console.error('プレゼントコード発行エラー', error);\n    // 発行直前にクラウド確認を行っているため、ここでno-saveになった場合も\n    // 「手動保存してください」ではなく、通信／クラウド同期の再試行案内に統一する。\n    const displayError = error?.code === 'gift/no-save'\n      ? Object.assign(new Error('プレゼント発行前のクラウド保存を確認できませんでした。'), { code: 'gift/cloud-save-unavailable' })\n      : error;\n    showToast(giftErrorMessage(displayError), 'error');\n""",
    'app gift error remap',
)

check_anchor = """    'gift has explicit save-conflict message': \"'gift/save-conflict'\" in FB,\n    'app does not raw-write localStorage after committed gift': 'localStorage.setItem' not in APP_GIFT_PERSIST,\n"""
check_replacement = """    'gift has explicit save-conflict message': \"'gift/save-conflict'\" in FB,\n    'gift exports preflight cloud confirmation': 'export async function confirmGiftCloudSave(uid, expectedRevision = 0)' in FB,\n    'gift preflight directly reads current cloud metadata': 'metadata = await readCurrentCloudMetadata(uid);' in FB,\n    'gift preflight validates current saveRevision': 'cloudRevision < requiredRevision' in FB,\n    'gift has cloud-save-unavailable message': \"'gift/cloud-save-unavailable'\" in FB,\n    'app confirms cloud save before gift creation': 'await confirmGiftCloudSave(currentUser.uid, state.saveRevision);' in APP,\n    'app remaps post-confirm no-save to cloud retry guidance': \"error?.code === 'gift/no-save'\" in APP and \"code: 'gift/cloud-save-unavailable'\" in APP,\n    'app does not raw-write localStorage after committed gift': 'localStorage.setItem' not in APP_GIFT_PERSIST,\n"""
replace_once(CHECK_PATH, check_anchor, check_replacement, 'gift regression checks')

run(sys.executable, 'scripts/version-sync.py', '--bump-patch')
run('node', '--check', 'js/app.js')
run('node', '--check', 'js/firebase-service.js')
run(sys.executable, 'scripts/check-gift-chunked-save.py')
run(sys.executable, 'scripts/check-current.py')

if VERSION_PATH.read_text(encoding='utf-8').strip() != '0.10.775':
    raise RuntimeError('VERSION did not finish at 0.10.775')
print('v0.10.775 gift cloud preflight patch: PASS')
