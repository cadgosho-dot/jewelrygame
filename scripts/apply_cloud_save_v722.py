from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]

def read(p): return (ROOT / p).read_text(encoding='utf-8')
def write(p, s): (ROOT / p).write_text(s, encoding='utf-8', newline='\n')
def replace_once(text, old, new, label):
    c = text.count(old)
    if c != 1: raise RuntimeError(f'{label}: expected 1 match, found {c}')
    return text.replace(old, new, 1)

p = 'js/firebase-service.js'
s = read(p)

# Smaller, safer chunks. The root users/{uid} document is no longer used for current saves.
s = replace_once(s,
"// v0.10.721: JSON byte数だけではFirestore実文書サイズを正確に予測できないため安全幅を広げる。\nconst CLOUD_INLINE_SAFE_BYTES = 384 * 1024;\nconst CLOUD_CHUNK_RAW_BYTES = 480 * 1024;",
"// v0.10.722: 現在セーブは常にサブコレクションへ分割保存する。\n// users/{uid} 直下は旧セーブ互換の読み取り専用とし、1文書上限の影響を完全に避ける。\nconst CLOUD_INLINE_SAFE_BYTES = 0;\nconst CLOUD_CHUNK_RAW_BYTES = 384 * 1024;",
'chunk constants')

pattern = re.compile(r"export async function loadState\(uid\) \{.*?\n\}\n\nexport async function saveState\(uid, state\) \{.*?\n\}\n\nexport async function deleteGameData", re.S)
new = r'''function cloudSaveMetaRef(uid) {
  return doc(db, 'users', uid, 'saveMeta', 'current');
}

async function readCurrentCloudMetadata(uid) {
  const metaSnapshot = await getDoc(cloudSaveMetaRef(uid));
  return metaSnapshot.exists() ? (metaSnapshot.data() || null) : null;
}

export async function loadState(uid) {
  if (previewMode) {
    const saved = localStorage.getItem(`jewelrygame-preview-${uid}`);
    return saved ? JSON.parse(saved) : null;
  }

  // v0.10.722: 新方式の小さなメタ文書を最優先で確認する。
  // users/{uid} 直下が旧gameStateで上限ぎりぎりでも、読み込み・保存を継続できる。
  const currentMetadata = await readCurrentCloudMetadata(uid);
  if (currentMetadata?.mode === 'chunked') {
    const loaded = await readChunkedGameState(uid, currentMetadata);
    cloudStorageMetaByUid.set(uid, currentMetadata);
    return loaded;
  }

  // 旧方式との互換読み込み。新方式で一度保存されるまでは従来データを利用する。
  const snapshot = await getDoc(doc(db, 'users', uid));
  if (!snapshot.exists()) {
    cloudStorageMetaByUid.delete(uid);
    return null;
  }
  const data = snapshot.data() || {};
  const legacyMetadata = data.gameStateStorage || null;
  if (legacyMetadata?.mode === 'chunked') {
    const loaded = await readChunkedGameState(uid, legacyMetadata);
    cloudStorageMetaByUid.set(uid, legacyMetadata);
    return loaded;
  }
  cloudStorageMetaByUid.set(uid, legacyMetadata || { mode: 'inline-legacy' });
  return data.gameState || null;
}

export async function saveState(uid, state) {
  // v0.10.722: Firestoreの1文書上限を根本回避するため、セーブは常に
  // users/{uid}/saveChunks + users/{uid}/saveMeta/current へ保存する。
  // 旧 users/{uid}.gameState は触らない。これにより旧文書が上限直前でも保存可能。
  const clean = { ...state, updatedAt: new Date().toISOString() };
  if (previewMode) {
    localStorage.setItem(`jewelrygame-preview-${uid}`, JSON.stringify(clean));
    return;
  }

  const raw = JSON.stringify(clean);
  const encoded = encodeCloudChunks(raw);
  const previousMetadata = await readCurrentCloudMetadata(uid).catch(() => cloudStorageMetaByUid.get(uid) || null);
  const generation = `${Math.max(0, Math.floor(Number(clean.saveRevision) || 0))}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const metadata = {
    mode: 'chunked',
    version: 2,
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
      // 全チャンク成功後、小さなメタ文書だけを切り替える。ルート文書は更新しない。
      await setDoc(cloudSaveMetaRef(uid), metadata);
    });
  } catch (error) {
    void Promise.allSettled(writtenChunkRefs.filter(Boolean).map((ref) => deleteDoc(ref)));
    throw error;
  }

  cloudStorageMetaByUid.set(uid, metadata);
  if (previousMetadata?.mode === 'chunked' && previousMetadata.generation !== generation) {
    void cleanupChunkGeneration(uid, previousMetadata);
  }
}

export async function deleteGameData'''
s, n = pattern.subn(new, s, count=1)
if n != 1: raise RuntimeError(f'load/save replacement failed: {n}')

# Move session lease out of the root user document as well, so an old near-limit gameState
# cannot prevent session claim/heartbeat writes.
old_claim = """export async function claimSession(uid, sessionId) {\n  if (previewMode) return;\n  await setDoc(doc(db, 'users', uid), {\n    activeSession: {\n      id: sessionId,\n      startedAt: new Date().toISOString(),\n      updatedAt: new Date().toISOString(),\n    },\n  }, { merge: true });\n}\n\nexport function watchSession(uid, sessionId, onTakenOver) {\n  if (previewMode || !db) return () => {};\n  if (unsubscribeSession) unsubscribeSession();\n  let initialized = false;\n  unsubscribeSession = onSnapshot(doc(db, 'users', uid), (snapshot) => {\n    if (!snapshot.exists()) return;\n    const active = snapshot.data().activeSession;\n    if (!initialized) {\n      initialized = true;\n      return;\n    }\n    if (active?.id && active.id !== sessionId) onTakenOver(active);\n  });\n  return unsubscribeSession;\n}\n\nexport async function heartbeat(uid, sessionId) {\n  if (previewMode || !db) return;\n  try {\n    await updateDoc(doc(db, 'users', uid), {\n      'activeSession.id': sessionId,\n      'activeSession.updatedAt': new Date().toISOString(),\n    });\n  } catch (error) {\n    console.warn('Heartbeat failed:', error);\n  }\n}\n"""
new_claim = """function sessionDocRef(uid) {\n  return doc(db, 'users', uid, 'session', 'current');\n}\n\nexport async function claimSession(uid, sessionId) {\n  if (previewMode) return;\n  await setDoc(sessionDocRef(uid), {\n    id: sessionId,\n    startedAt: new Date().toISOString(),\n    updatedAt: new Date().toISOString(),\n  }, { merge: true });\n}\n\nexport function watchSession(uid, sessionId, onTakenOver) {\n  if (previewMode || !db) return () => {};\n  if (unsubscribeSession) unsubscribeSession();\n  let initialized = false;\n  unsubscribeSession = onSnapshot(sessionDocRef(uid), (snapshot) => {\n    if (!snapshot.exists()) return;\n    const active = snapshot.data();\n    if (!initialized) {\n      initialized = true;\n      return;\n    }\n    if (active?.id && active.id !== sessionId) onTakenOver(active);\n  });\n  return unsubscribeSession;\n}\n\nexport async function heartbeat(uid, sessionId) {\n  if (previewMode || !db) return;\n  try {\n    await setDoc(sessionDocRef(uid), {\n      id: sessionId,\n      updatedAt: new Date().toISOString(),\n    }, { merge: true });\n  } catch (error) {\n    console.warn('Heartbeat failed:', error);\n  }\n}\n"""
s = replace_once(s, old_claim, new_claim, 'session block')

# Better fallback message if an old inline-size error somehow appears.
needle = "      'resource-exhausted': 'クラウド側の利用制限に達しています。端末には保存済みです。',\n"
replacement = needle + "      'invalid-argument': 'クラウド保存形式を切り替えています。端末には保存済みです。',\n"
s = replace_once(s, needle, replacement, 'invalid argument cloud message')
write(p, s)

# Version bump across files that carry cache/import build numbers.
for p in ['index.html','game.html','auth.html','js/app.js','js/game-data.js','sw.js']:
    t = read(p)
    if '0.10.721' not in t: raise RuntimeError(f'{p}: no v0.10.721 marker')
    write(p, t.replace('0.10.721','0.10.722'))

# Add release note.
cp = 'CHANGELOG.md'
c = read(cp)
entry = '''# v0.10.722 - 2026-08-19\n\n- クラウドセーブを常に `users/{uid}/saveChunks` と `saveMeta/current` に分離し、ルートユーザー文書の1MB上限から完全に切り離しました。\n- 旧 `users/{uid}.gameState` は互換読み込み専用とし、上限ぎりぎりの旧文書へ新しいセーブを書き戻しません。\n- セッション管理も `users/{uid}/session/current` へ移動し、旧gameStateのサイズがログイン継続判定へ影響しないようにしました。\n- SAVE_SCHEMA_VERSIONは1のままです。端末セーブ形式は変更していません。\n\n'''
if not c.lstrip().startswith('# v0.10.722'):
    write(cp, entry + c.lstrip('\n'))

write('VALIDATION_v0.10.722.txt', '''JEWELRY×JEWELRY v0.10.722 VALIDATION\n1. node --check js/firebase-service.js js/app.js js/game-data.js が成功すること。\n2. saveState が users/{uid} 直下へ gameState を書かないこと。\n3. saveChunks と saveMeta/current だけで現在セーブが保存・復元できること。\n4. 旧 users/{uid}.gameState は新metaが無い時だけ互換読み込みされること。\n5. claimSession/watchSession/heartbeat が session/current を使うこと。\n6. SAVE_SCHEMA_VERSION=1 を維持すること。\n7. HTML/Service Worker/import query が0.10.722へ更新されること。\n''')

# Remove one-shot files after the workflow runs.
for q in [ROOT/'.github/workflows/apply-cloud-save-v722.yml', Path(__file__)]:
    try: q.unlink()
    except OSError: pass
print('v0.10.722 applied')
