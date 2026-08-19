from __future__ import annotations
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def read(p): return (ROOT/p).read_text(encoding='utf-8')
def write(p,t): (ROOT/p).write_text(t,encoding='utf-8',newline='\n')
def rep(t,o,n,l):
    c=t.count(o)
    if c!=1: raise RuntimeError(f'{l}: {c}')
    return t.replace(o,n,1)
p='js/firebase-service.js'; s=read(p)
s=rep(s,"const CLOUD_INLINE_SAFE_BYTES = 640 * 1024;","// v0.10.721: JSON byte数だけではFirestore実文書サイズを正確に予測できないため安全幅を広げる。\nconst CLOUD_INLINE_SAFE_BYTES = 384 * 1024;",'threshold')
a="""function normalizeCloudCode(error) {\n  return String(error?.code || '').replace(/^firestore\\//, '');\n}\n"""
s=rep(s,a,a+"""\nfunction isCloudDocumentSizeError(error) {\n  const code = normalizeCloudCode(error);\n  const message = String(error?.message || '');\n  return code === 'invalid-argument'\n    && /cannot be written because its size|exceeds the maximum allowed size|maximum allowed size/i.test(message);\n}\n""",'size-detector')
o="""  if (encoded.bytes <= CLOUD_INLINE_SAFE_BYTES) {\n    const metadata = {\n      mode: 'inline',\n      version: 1,\n      bytes: encoded.bytes,\n      saveRevision: Math.max(0, Math.floor(Number(clean.saveRevision) || 0)),\n      updatedAt: clean.updatedAt,\n    };\n    await runCloudSaveWithRetry(() => mergeUserRoot(uid, {\n      gameState: clean,\n      gameStateStorage: metadata,\n      updatedAt: serverTimestamp(),\n    }));\n    cloudStorageMetaByUid.set(uid, metadata);\n    if (previousMetadata?.mode === 'chunked') void cleanupChunkGeneration(uid, previousMetadata);\n    return;\n  }\n"""
n="""  if (encoded.bytes <= CLOUD_INLINE_SAFE_BYTES && previousMetadata?.mode !== 'chunked') {\n    const metadata = {\n      mode: 'inline',\n      version: 1,\n      bytes: encoded.bytes,\n      saveRevision: Math.max(0, Math.floor(Number(clean.saveRevision) || 0)),\n      updatedAt: clean.updatedAt,\n    };\n    try {\n      await runCloudSaveWithRetry(() => mergeUserRoot(uid, {\n        gameState: clean,\n        gameStateStorage: metadata,\n        updatedAt: serverTimestamp(),\n      }));\n      cloudStorageMetaByUid.set(uid, metadata);\n      return;\n    } catch (error) {\n      if (!isCloudDocumentSizeError(error)) throw error;\n      console.warn('[Cloud Save] Firestore document too large; switching to chunked storage.', {\n        bytes: encoded.bytes, code: error?.code || '', message: error?.message || '',\n      });\n    }\n  }\n"""
s=rep(s,o,n,'inline-block')
s=rep(s,"      'internal': 'クラウド側で一時的なエラーが発生しました。端末には保存済みです。',\n      'network-request-failed': '通信できないためクラウド保存できません。端末には保存済みです。',","      'internal': 'クラウド側で一時的なエラーが発生しました。端末には保存済みです。',\n      'invalid-argument': 'クラウド保存データが1件の容量上限を超えました。端末には保存済みです。',\n      'network-request-failed': '通信できないためクラウド保存できません。端末には保存済みです。',",'message')
write(p,s)
for p in ['index.html','game.html','auth.html','js/app.js','js/game-data.js','sw.js']:
    t=read(p)
    if '0.10.720' not in t: raise RuntimeError(f'{p}: no 720')
    write(p,t.replace('0.10.720','0.10.721'))
cl=read('CHANGELOG.md')
e='''# v0.10.721 - 2026-08-19\n\n- 実機でFirestoreの1文書上限超過を確認（1,050,664 bytes > 1,048,576 bytes）。\n- JSON容量判定だけではFirestore実文書サイズを完全予測できないため修正。\n- インライン保存の安全閾値を引き下げ、Firestoreが容量超過を返した場合は同じ保存処理内で自動的に分割保存へ切り替える。\n- 一度分割保存へ移行したセーブは以後も分割方式を継続。\n- 端末保存先行・既存セーブ互換性・SAVE_SCHEMA_VERSION=1を維持。\n\n'''
if not cl.lstrip().startswith('# v0.10.721'): write('CHANGELOG.md',e+cl.lstrip('\n'))
write('VALIDATION_v0.10.721.txt','''JEWELRY×JEWELRY v0.10.721 VALIDATION\n1. Firestore size invalid-argument を同一saveState内でchunkedへフォールバック。\n2. chunked移行後はインラインへ戻さない。\n3. 端末保存はクラウドより先に完了。\n4. node --check: firebase-service.js / app.js / game-data.js。\n5. v0.10.721へキャッシュ更新。\n6. SAVE_SCHEMA_VERSION=1を維持。\n''')
write('UPDATE_INSTRUCTIONS_v0.10.721.txt','''JEWELRY×JEWELRY v0.10.721\nクラウド保存1MiB上限対策の再修正です。端末データ削除・再インストール不要。ゲームを閉じて開き直し、1回操作して自動保存を発生させてください。大きいセーブは自動で分割保存へ移行します。\n''')
w=ROOT/'.github/workflows/apply-cloud-save-v721.yml'
if w.exists(): w.unlink()
try: Path(__file__).unlink()
except OSError: pass
print('v0.10.721 applied')
