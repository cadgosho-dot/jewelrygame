from pathlib import Path
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
print('save resilience v0.10.774: PASS')
