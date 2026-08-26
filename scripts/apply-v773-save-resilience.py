from pathlib import Path

firebase_path = Path('js/firebase-service.js')
firebase = firebase_path.read_text(encoding='utf-8')
start = firebase.index('export async function saveState(uid, state) {')
end = firebase.index('\n\nasync function deleteUserSaveSubcollections(uid)', start)
new_save = r'''export async function saveState(uid, state) {
  // v0.10.773: チャンク本体を先に別世代へ書き、最後のメタ切替だけを
  // compare-and-swap付きトランザクションで確定する。別端末の新しい保存を
  // 古い端末が後から上書きすることを防ぐ。
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
  const metadataIdentityMatches = (left, right) => Boolean(
    left?.mode === 'chunked'
      && right?.mode === 'chunked'
      && String(left.generation || '') === String(right.generation || '')
      && Math.max(0, Math.floor(Number(left.saveRevision) || 0)) === Math.max(0, Math.floor(Number(right.saveRevision) || 0)),
  );

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
    });
  } catch (error) {
    await Promise.allSettled(writtenChunkRefs.filter(Boolean).map((ref) => deleteDoc(ref)));
    throw error;
  }

  try {
    await runCloudSaveWithRetry(async () => {
      const metaRef = cloudSaveMetaRef(uid);
      await runTransaction(db, async (transaction) => {
        const metaSnapshot = await transaction.get(metaRef);
        const currentMetadata = metaSnapshot.exists() ? (metaSnapshot.data() || null) : null;
        const expectedMatches = previousMetadata?.mode === 'chunked'
          ? metadataIdentityMatches(currentMetadata, previousMetadata)
          : !currentMetadata;
        const currentRevision = Math.max(0, Math.floor(Number(currentMetadata?.saveRevision) || 0));
        const nextRevision = Math.max(0, Math.floor(Number(metadata.saveRevision) || 0));
        const currentTimestamp = Date.parse(String(currentMetadata?.updatedAt || ''));
        const nextTimestamp = Date.parse(String(metadata.updatedAt || ''));
        const sameRevisionButOlder = nextRevision === currentRevision
          && Number.isFinite(currentTimestamp)
          && Number.isFinite(nextTimestamp)
          && nextTimestamp < currentTimestamp;

        if (!expectedMatches || nextRevision < currentRevision || sameRevisionButOlder) {
          throw cloudSaveError(
            'jxj/cloud-save-conflict',
            '別の端末で新しいゲームデータが保存されています。この端末の保存データは残っています。',
            {
              expectedGeneration: String(previousMetadata?.generation || ''),
              currentGeneration: String(currentMetadata?.generation || ''),
              currentRevision,
              nextRevision,
            },
          );
        }
        transaction.set(metaRef, metadata);
      });
    });
  } catch (error) {
    const currentMetadata = await readCurrentCloudMetadata(uid).catch(() => null);
    if (!metadataIdentityMatches(currentMetadata, metadata)) {
      await Promise.allSettled(writtenChunkRefs.filter(Boolean).map((ref) => deleteDoc(ref)));
      throw error;
    }
  }

  cloudStorageMetaByUid.set(uid, metadata);
  if (previousMetadata?.mode === 'chunked' && previousMetadata.generation !== generation) {
    void cleanupChunkGeneration(uid, previousMetadata);
  }
  void cleanupOldOrphanChunks(uid);
}'''
firebase = firebase[:start] + new_save + firebase[end:]
firebase_path.write_text(firebase, encoding='utf-8')

app_path = Path('js/app.js')
app = app_path.read_text(encoding='utf-8')
old = """        cloudSave = await loadState(user.uid);\n        const preferredAtBoot = preferredSavedState();\n        const deviceWasNewer = ['local', 'indexeddb'].includes(preferredAtBoot.source) && Boolean(preferredAtBoot.state);"""
new = """        let cloudLoadError = null;\n        try {\n          cloudSave = await loadState(user.uid);\n        } catch (error) {\n          // v0.10.773: クラウドの現行チャンクが欠損・破損していても、\n          // 先に読み込めた正常な端末セーブがあればそちらから起動を継続する。\n          cloudLoadError = error;\n          cloudSave = null;\n          console.warn('クラウドセーブを読み込めなかったため、端末セーブから復旧を試みます。', error);\n        }\n        const preferredAtBoot = preferredSavedState();\n        if (cloudLoadError && !preferredAtBoot.state) throw cloudLoadError;\n        const deviceWasNewer = ['local', 'indexeddb'].includes(preferredAtBoot.source) && Boolean(preferredAtBoot.state);\n        if (cloudLoadError && deviceWasNewer) {\n          saveRecoveryNotice = 'クラウドセーブを読み込めなかったため、端末の正常なセーブから復旧しました。';\n          saveRecoveryDetails = String(cloudLoadError?.message || cloudLoadError);\n        }"""
if old not in app:
    raise SystemExit('startup cloud load block not found')
app = app.replace(old, new, 1)
app_path.write_text(app, encoding='utf-8')

for name in ['VERSION', 'index.html', 'service-worker.js', 'js/app.js', 'js/game-data.js', 'js/game-data-core.js', 'js/firebase-service.js']:
    path = Path(name)
    if not path.exists():
        continue
    text = path.read_text(encoding='utf-8')
    if '0.10.772' in text:
        path.write_text(text.replace('0.10.772', '0.10.773'), encoding='utf-8')

test = r'''from pathlib import Path
firebase = Path('js/firebase-service.js').read_text(encoding='utf-8')
app = Path('js/app.js').read_text(encoding='utf-8')

def require(condition, message):
    if not condition:
        raise AssertionError(message)

require("runTransaction(db, async (transaction) =>" in firebase, 'metadata transaction missing')
require("'jxj/cloud-save-conflict'" in firebase, 'cloud conflict guard missing')
require('metadataIdentityMatches(currentMetadata, previousMetadata)' in firebase, 'metadata compare-and-swap missing')
require('nextRevision < currentRevision' in firebase, 'revision rollback guard missing')
require('sameRevisionButOlder' in firebase, 'same-revision timestamp guard missing')
require('metadataIdentityMatches(currentMetadata, metadata)' in firebase, 'ambiguous commit recovery missing')
require("let cloudLoadError = null;" in app, 'cloud fallback missing')
require("if (cloudLoadError && !preferredAtBoot.state) throw cloudLoadError;" in app, 'no-device fallback guard missing')
require("クラウドセーブを読み込めなかったため、端末の正常なセーブから復旧しました。" in app, 'recovery notice missing')
require(".then(() => saveState(user.uid, bootSyncSnapshot))" in app, 'cloud rebuild path missing')

def identity(a, b):
    return bool(a and b and a.get('mode') == b.get('mode') == 'chunked' and a.get('generation') == b.get('generation') and int(a.get('saveRevision', 0)) == int(b.get('saveRevision', 0)))

def may_commit(previous, current, next_meta):
    expected = identity(current, previous) if previous and previous.get('mode') == 'chunked' else current is None
    if not expected:
        return False
    cr = int((current or {}).get('saveRevision', 0)); nr = int(next_meta.get('saveRevision', 0))
    if nr < cr:
        return False
    if nr == cr and str(next_meta.get('updatedAt', '')) < str((current or {}).get('updatedAt', '')):
        return False
    return True

base={'mode':'chunked','generation':'G100','saveRevision':100,'updatedAt':'2026-08-27T00:00:00.000Z'}
a={'mode':'chunked','generation':'A101','saveRevision':101,'updatedAt':'2026-08-27T00:00:01.000Z'}
b={'mode':'chunked','generation':'B101','saveRevision':101,'updatedAt':'2026-08-27T00:00:02.000Z'}
require(may_commit(base, base, a), 'first writer blocked')
require(not may_commit(base, a, b), 'stale concurrent writer allowed')
require(not may_commit(a, a, {'mode':'chunked','generation':'OLD','saveRevision':100,'updatedAt':'2026-08-27T00:00:03.000Z'}), 'revision rollback allowed')
require(not may_commit(a, a, {'mode':'chunked','generation':'OLDTIME','saveRevision':101,'updatedAt':'2026-08-27T00:00:00.500Z'}), 'same revision older save allowed')
require(may_commit(a, a, {'mode':'chunked','generation':'REPAIR','saveRevision':101,'updatedAt':'2026-08-27T00:00:04.000Z'}), 'newer same revision repair blocked')
print('save resilience v0.10.773: PASS')
'''
Path('scripts/check-save-resilience-v773.py').write_text(test, encoding='utf-8')
