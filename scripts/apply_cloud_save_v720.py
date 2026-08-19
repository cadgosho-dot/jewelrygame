from __future__ import annotations

from pathlib import Path
import hashlib
import re

ROOT = Path(__file__).resolve().parents[1]


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding='utf-8')


def write(path: str, text: str) -> None:
    (ROOT / path).write_text(text, encoding='utf-8', newline='\n')


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f'{label}: expected exactly one match, found {count}')
    return text.replace(old, new, 1)


# ---------------------------------------------------------------------------
# 1) Firebase cloud save: inline + chunked storage, retry, diagnostics.
# ---------------------------------------------------------------------------
service_path = 'js/firebase-service.js'
service = read(service_path)

load_save_pattern = re.compile(
    r"export async function loadState\(uid\) \{.*?\n\}\n\n"
    r"export async function saveState\(uid, state\) \{.*?\n\}\n\n"
    r"export async function deleteGameData",
    re.S,
)

new_load_save = r'''const CLOUD_INLINE_SAFE_BYTES = 640 * 1024;
const CLOUD_CHUNK_RAW_BYTES = 480 * 1024;
const CLOUD_CHUNK_MAX_COUNT = 64;
const cloudStorageMetaByUid = new Map();

function cloudSaveError(code, message, detail = null) {
  const error = new Error(message);
  error.code = code;
  if (detail) error.detail = detail;
  return error;
}

function normalizeCloudCode(error) {
  return String(error?.code || '').replace(/^firestore\//, '');
}

function cloudUtf8Bytes(text) {
  return new TextEncoder().encode(String(text || ''));
}

function bytesToBase64(bytes) {
  let binary = '';
  const step = 0x8000;
  for (let index = 0; index < bytes.length; index += step) {
    binary += String.fromCharCode(...bytes.subarray(index, Math.min(index + step, bytes.length)));
  }
  return btoa(binary);
}

function base64ToBytes(value) {
  const binary = atob(String(value || ''));
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

function encodeCloudChunks(raw) {
  const bytes = cloudUtf8Bytes(raw);
  const count = Math.ceil(bytes.length / CLOUD_CHUNK_RAW_BYTES);
  if (count > CLOUD_CHUNK_MAX_COUNT) {
    throw cloudSaveError(
      'jxj/cloud-save-too-large',
      'セーブデータがクラウド保存の上限を超えています。端末には保存済みです。',
      { bytes: bytes.length, chunks: count },
    );
  }
  const chunks = [];
  for (let index = 0; index < count; index += 1) {
    const start = index * CLOUD_CHUNK_RAW_BYTES;
    const end = Math.min(start + CLOUD_CHUNK_RAW_BYTES, bytes.length);
    chunks.push(bytesToBase64(bytes.subarray(start, end)));
  }
  return { bytes: bytes.length, chunks };
}

function decodeCloudChunks(encodedChunks) {
  const parts = encodedChunks.map((chunk) => base64ToBytes(chunk));
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const joined = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    joined.set(part, offset);
    offset += part.length;
  }
  return new TextDecoder().decode(joined);
}

function cloudChunkDocId(generation, index) {
  return `${generation}-${String(index).padStart(3, '0')}`;
}

async function mergeUserRoot(uid, payload) {
  const userRef = doc(db, 'users', uid);
  try {
    await updateDoc(userRef, payload);
  } catch (error) {
    if (normalizeCloudCode(error) !== 'not-found') throw error;
    await setDoc(userRef, payload, { merge: true });
  }
}

async function cleanupChunkGeneration(uid, metadata) {
  if (!metadata || metadata.mode !== 'chunked') return;
  const generation = String(metadata.generation || '');
  const count = Math.max(0, Math.floor(Number(metadata.count) || 0));
  if (!generation || !count) return;
  await Promise.allSettled(Array.from({ length: count }, (_, index) => (
    deleteDoc(doc(db, 'users', uid, 'saveChunks', cloudChunkDocId(generation, index)))
  )));
}

function shouldRetryCloudSave(error, attempt) {
  if (attempt >= 2) return false;
  const code = normalizeCloudCode(error);
  return [
    'aborted',
    'cancelled',
    'deadline-exceeded',
    'internal',
    'network-request-failed',
    'permission-denied',
    'resource-exhausted',
    'unauthenticated',
    'unavailable',
    'unknown',
  ].includes(code);
}

async function refreshCloudAuthIfUseful(error) {
  const code = normalizeCloudCode(error);
  if (!['permission-denied', 'unauthenticated'].includes(code)) return;
  try {
    await auth?.currentUser?.getIdToken?.(true);
  } catch (_) {}
}

async function runCloudSaveWithRetry(operation) {
  let lastError = null;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (!shouldRetryCloudSave(error, attempt)) throw error;
      if (attempt === 0) await refreshCloudAuthIfUseful(error);
      await new Promise((resolve) => setTimeout(resolve, 350 * (2 ** attempt)));
    }
  }
  throw lastError;
}

async function readChunkedGameState(uid, metadata) {
  const generation = String(metadata?.generation || '');
  const count = Math.max(0, Math.floor(Number(metadata?.count) || 0));
  if (!generation || !count || count > CLOUD_CHUNK_MAX_COUNT) {
    throw cloudSaveError('jxj/cloud-save-invalid-metadata', 'クラウドセーブの管理情報を確認できません。');
  }
  const snapshots = await Promise.all(Array.from({ length: count }, (_, index) => (
    getDoc(doc(db, 'users', uid, 'saveChunks', cloudChunkDocId(generation, index)))
  )));
  const encodedChunks = snapshots.map((snapshot, index) => {
    if (!snapshot.exists()) {
      throw cloudSaveError(
        'jxj/cloud-save-chunk-missing',
        'クラウドセーブの一部を読み込めませんでした。端末保存がある場合はそちらを優先します。',
        { generation, index },
      );
    }
    return String(snapshot.data()?.data || '');
  });
  try {
    return JSON.parse(decodeCloudChunks(encodedChunks));
  } catch (error) {
    throw cloudSaveError(
      'jxj/cloud-save-decode-failed',
      'クラウドセーブを復元できませんでした。端末保存がある場合はそちらを優先します。',
      { cause: String(error?.message || error) },
    );
  }
}

export async function loadState(uid) {
  if (previewMode) {
    const saved = localStorage.getItem(`jewelrygame-preview-${uid}`);
    return saved ? JSON.parse(saved) : null;
  }
  const snapshot = await getDoc(doc(db, 'users', uid));
  if (!snapshot.exists()) {
    cloudStorageMetaByUid.delete(uid);
    return null;
  }
  const data = snapshot.data() || {};
  const metadata = data.gameStateStorage || null;
  if (metadata?.mode === 'chunked') {
    const loaded = await readChunkedGameState(uid, metadata);
    cloudStorageMetaByUid.set(uid, metadata);
    return loaded;
  }
  cloudStorageMetaByUid.set(uid, metadata || { mode: 'inline' });
  return data.gameState || null;
}

export async function saveState(uid, state) {
  // v0.10.720: 端末保存スナップショットをそのまま利用し、Firestore 1文書上限に
  // 近づいた場合は users/{uid}/saveChunks へ世代付きで分割する。
  const clean = { ...state, updatedAt: new Date().toISOString() };
  if (previewMode) {
    localStorage.setItem(`jewelrygame-preview-${uid}`, JSON.stringify(clean));
    return;
  }

  const raw = JSON.stringify(clean);
  const encoded = encodeCloudChunks(raw);
  const previousMetadata = cloudStorageMetaByUid.get(uid) || null;

  if (encoded.bytes <= CLOUD_INLINE_SAFE_BYTES) {
    const metadata = {
      mode: 'inline',
      version: 1,
      bytes: encoded.bytes,
      saveRevision: Math.max(0, Math.floor(Number(clean.saveRevision) || 0)),
      updatedAt: clean.updatedAt,
    };
    await runCloudSaveWithRetry(() => mergeUserRoot(uid, {
      gameState: clean,
      gameStateStorage: metadata,
      updatedAt: serverTimestamp(),
    }));
    cloudStorageMetaByUid.set(uid, metadata);
    if (previousMetadata?.mode === 'chunked') void cleanupChunkGeneration(uid, previousMetadata);
    return;
  }

  const generation = `${Math.max(0, Math.floor(Number(clean.saveRevision) || 0))}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const metadata = {
    mode: 'chunked',
    version: 1,
    encoding: 'base64-utf8-v1',
    generation,
    count: encoded.chunks.length,
    bytes: encoded.bytes,
    saveRevision: Math.max(0, Math.floor(Number(clean.saveRevision) || 0)),
    updatedAt: clean.updatedAt,
  };

  const writtenChunkRefs = [];
  try {
    await runCloudSaveWithRetry(async () => {
      for (let index = 0; index < encoded.chunks.length; index += 1) {
        const chunkRef = doc(db, 'users', uid, 'saveChunks', cloudChunkDocId(generation, index));
        await setDoc(chunkRef, {
          generation,
          index,
          count: encoded.chunks.length,
          data: encoded.chunks[index],
          updatedAt: serverTimestamp(),
        });
        writtenChunkRefs[index] = chunkRef;
      }
      // すべてのチャンク書き込み成功後にだけルートの参照先を切り替える。
      await mergeUserRoot(uid, {
        gameState: null,
        gameStateStorage: metadata,
        updatedAt: serverTimestamp(),
      });
    });
  } catch (error) {
    // 参照先を切り替える前の失敗なら、孤立チャンクだけを後片付けする。
    void Promise.allSettled(writtenChunkRefs.filter(Boolean).map((ref) => deleteDoc(ref)));
    throw error;
  }

  cloudStorageMetaByUid.set(uid, metadata);
  if (previousMetadata?.mode === 'chunked' && previousMetadata.generation !== generation) {
    void cleanupChunkGeneration(uid, previousMetadata);
  }
}

export async function deleteGameData'''

service, count = load_save_pattern.subn(new_load_save, service, count=1)
if count != 1:
    raise RuntimeError(f'{service_path}: load/save block replacement failed ({count})')

firebase_message_needle = "export function firebaseErrorMessage(error, context = '') {\n  const code = error?.code || '';\n"
firebase_message_insert = firebase_message_needle + r'''  if (context === 'cloud-save') {
    const normalized = String(code || '').replace(/^firestore\//, '');
    const cloudMessages = {
      'aborted': 'クラウド保存が一時的に中断されました。端末には保存済みです。',
      'cancelled': 'クラウド保存が中断されました。端末には保存済みです。',
      'deadline-exceeded': 'クラウド保存がタイムアウトしました。端末には保存済みです。',
      'internal': 'クラウド側で一時的なエラーが発生しました。端末には保存済みです。',
      'network-request-failed': '通信できないためクラウド保存できません。端末には保存済みです。',
      'permission-denied': 'クラウド保存の認証または権限を確認できません。端末には保存済みです。',
      'resource-exhausted': 'クラウド側の利用制限に達しています。端末には保存済みです。',
      'unauthenticated': 'ログイン情報を確認できないためクラウド保存できません。端末には保存済みです。',
      'unavailable': 'クラウドサービスへ接続できません。端末には保存済みです。',
      'jxj/cloud-save-too-large': 'セーブデータが非常に大きく、クラウドへ保存できません。端末には保存済みです。',
      'jxj/cloud-save-invalid-metadata': 'クラウドセーブの管理情報を確認できません。端末保存は保持されています。',
      'jxj/cloud-save-chunk-missing': 'クラウドセーブの一部を確認できません。端末保存は保持されています。',
      'jxj/cloud-save-decode-failed': 'クラウドセーブを復元できません。端末保存は保持されています。',
    };
    return cloudMessages[normalized] || cloudMessages[code] || error?.message || 'クラウド保存に失敗しました。端末には保存済みです。';
  }
'''
service = replace_once(service, firebase_message_needle, firebase_message_insert, 'firebaseErrorMessage cloud-save messages')
write(service_path, service)


# ---------------------------------------------------------------------------
# 2) app.js: distinguish local/cloud fingerprints and remove duplicate toast.
# ---------------------------------------------------------------------------
app_path = 'js/app.js'
app = read(app_path)
app = replace_once(
    app,
    "let lastSavedFingerprint = '';\nlet lastSuccessfulSaveAt = '';",
    "let lastSavedFingerprint = '';\nlet lastCloudSavedFingerprint = '';\nlet cloudSaveFailureActive = false;\nlet lastSuccessfulSaveAt = '';",
    'app cloud save state variables',
)

app = replace_once(
    app,
    "  if (fingerprint && fingerprint === lastSavedFingerprint) {\n    return saveQueue;\n  }",
    "  if (fingerprint && fingerprint === lastSavedFingerprint && fingerprint === lastCloudSavedFingerprint) {\n    return saveQueue;\n  }",
    'app cloud fingerprint skip condition',
)

old_queue = """  const snapshot = localResult.snapshot;\n  const userId = currentUser.uid;\n  saveQueue = saveQueue\n    .catch(() => {})\n    .then(() => saveState(userId, snapshot))\n    .then(() => {})\n    .catch((error) => {\n      console.error(error);\n      showAutosaveStatus('error', '端末には保存済み／クラウド保存に失敗', { persistent: true });\n      showToast('クラウド保存に失敗しました。通信を確認してください。', 'error');\n    });\n  return saveQueue;\n"""
new_queue = """  const snapshot = localResult.snapshot;\n  const userId = currentUser.uid;\n  const cloudFingerprint = fingerprint || saveStateFingerprint(snapshot);\n  saveQueue = saveQueue\n    .catch(() => {})\n    .then(() => saveState(userId, snapshot))\n    .then(() => {\n      lastCloudSavedFingerprint = cloudFingerprint;\n      if (cloudSaveFailureActive) {\n        cloudSaveFailureActive = false;\n        showAutosaveStatus('saved', 'クラウド保存を復旧しました');\n      }\n    })\n    .catch((error) => {\n      cloudSaveFailureActive = true;\n      const message = firebaseErrorMessage(error, 'cloud-save');\n      console.error('[Cloud Save]', { code: error?.code || '', message: error?.message || '', detail: error?.detail || null }, error);\n      // 端末保存は成功しているので、中央の大きなエラーは出さず下部ステータスだけで通知する。\n      showAutosaveStatus('error', `端末保存済み／${message}`, { persistent: true });\n    });\n  return saveQueue;\n"""
app = replace_once(app, old_queue, new_queue, 'app cloud save queue')
write(app_path, app)


# ---------------------------------------------------------------------------
# 3) Build/cache version bump so phones/PWA definitely receive the hotfix.
# ---------------------------------------------------------------------------
version_paths = [
    'index.html',
    'game.html',
    'auth.html',
    'js/app.js',
    'js/game-data.js',
    'sw.js',
]
for path in version_paths:
    text = read(path)
    if '0.10.719' not in text:
        raise RuntimeError(f'{path}: expected v0.10.719 reference')
    write(path, text.replace('0.10.719', '0.10.720'))


# ---------------------------------------------------------------------------
# 4) Release notes / validation data.
# ---------------------------------------------------------------------------
changelog_path = 'CHANGELOG.md'
changelog = read(changelog_path)
entry = '''# v0.10.720 - 2026-08-19\n\n- クラウド保存失敗時も端末保存を最優先で保持する既存仕様を維持。\n- Firestoreの1文書サイズに近づいた長期プレイデータは、世代付きチャンクへ自動分割して保存する方式へ変更。\n- チャンク保存は全チャンク書き込み後に参照先を切り替えるため、途中失敗で最新クラウドセーブを壊しにくい構成へ変更。\n- 一時的な通信・認証エラーは短いバックオフ付きで自動再試行。\n- 端末保存済みなのに中央へ大きな「通信を確認してください」を重複表示する挙動を廃止。\n- クラウド失敗理由を通信・認証/権限・利用制限・データ異常に分類し、下部保存ステータスへ表示。\n- クラウド保存が復旧した場合は「クラウド保存を復旧しました」と一時表示。\n- SAVE_SCHEMA_VERSION は 1 のまま。既存端末セーブ互換性を維持。\n\n'''
if not changelog.lstrip().startswith('# v0.10.720'):
    write(changelog_path, entry + changelog.lstrip('\n'))

notes = '''# JEWELRY×JEWELRY v0.10.720 実装ノート\n\n更新日: 2026-08-19\n\n## 対象\nクラウドセーブ失敗と、端末保存済み時のエラー表示。\n\n## 実装\n- 端末保存は従来どおり先に完了させる。\n- クラウド保存データが安全なインライン容量を超えた場合、`users/{uid}/saveChunks` へ分割保存する。\n- 新しいチャンクを全部保存してからルート文書の参照を切り替える。旧世代チャンクは切り替え成功後に削除する。\n- 一時エラーは最大3回まで短時間で再試行し、認証系ではIDトークン更新も試す。\n- エラー理由を分類し、中央トーストではなく下部の保存状態へ表示する。\n- 復旧時は下部に復旧メッセージを一時表示する。\n\n## 互換性\n- `SAVE_SCHEMA_VERSION = 1` を維持。\n- localStorageの既存保存形式は変更しない。\n- Firestore Rules は既存の `users/{userId}/{document=**}` ルールでサブコレクションを許可済みのため、ルール変更不要。\n'''
write('IMPLEMENTATION_NOTES_v0.10.720.md', notes)

validation = '''JEWELRY×JEWELRY v0.10.720 VALIDATION\n\n1. js/app.js / js/firebase-service.js が構文エラーなく読み込めること。\n2. 通常サイズのセーブは users/{uid}.gameState へインライン保存されること。\n3. 大きいセーブは users/{uid}/saveChunks へ分割され、全チャンク成功後にルート参照が切り替わること。\n4. 分割保存を loadState が再結合して JSON 復元できること。\n5. クラウド保存失敗時も localStorage の端末保存が残ること。\n6. クラウド失敗時、中央の大きな重複トーストを出さず、下部保存ステータスに理由が表示されること。\n7. 一度失敗した後にクラウド保存が成功すると「クラウド保存を復旧しました」が一時表示されること。\n8. SAVE_SCHEMA_VERSION は 1 のままであること。\n9. firestore.rules の users/{userId}/{document=**} により saveChunks が本人のみ読み書き可能であること。\n10. Service Worker / HTML / import query が v0.10.720 へ更新され、PWAの旧キャッシュが置換されること。\n'''
write('VALIDATION_v0.10.720.txt', validation)

instructions = '''JEWELRY×JEWELRY v0.10.720 更新内容\n\nこの更新はクラウド保存の耐障害性修正です。\n端末セーブ形式とSAVE_SCHEMA_VERSIONは変更していないため、既存プレイデータはそのまま利用できます。\n\n更新後の確認:\n1. 通常どおりゲームを開く。\n2. 何か1回操作して自動保存を発生させる。\n3. 下部に赤いクラウド失敗表示が出ないことを確認する。\n4. 以前失敗していた端末では、成功すると「クラウド保存を復旧しました」が一時表示される。\n\n注意:\n- データ削除・再インストールは不要です。\n- 端末保存は常に先に行われます。\n'''
write('UPDATE_INSTRUCTIONS_v0.10.720.txt', instructions)

# Build a compact checksum manifest for the release files.
manifest_files = [
    'CHANGELOG.md',
    'IMPLEMENTATION_NOTES_v0.10.720.md',
    'UPDATE_INSTRUCTIONS_v0.10.720.txt',
    'VALIDATION_v0.10.720.txt',
    'auth.html',
    'game.html',
    'index.html',
    'js/app.js',
    'js/firebase-service.js',
    'js/game-data.js',
    'sw.js',
]
manifest_lines = ['JEWELRY×JEWELRY v0.10.720 UPDATE MANIFEST', '']
for path in manifest_files:
    digest = hashlib.sha256((ROOT / path).read_bytes()).hexdigest()
    manifest_lines.append(f'{digest}  {path}')
write('PATCH_MANIFEST_v0.10.720.txt', '\n'.join(manifest_lines) + '\n')

# One-shot helper files are removed by the release commit so they do not remain in main.
workflow_path = ROOT / '.github/workflows/apply-cloud-save-v720.yml'
if workflow_path.exists():
    workflow_path.unlink()
try:
    Path(__file__).unlink()
except OSError:
    pass

print('v0.10.720 cloud save hotfix applied')
