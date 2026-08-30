from pathlib import Path
import sys
root=Path(__file__).resolve().parents[1]
app=(root/'js/app.js').read_text(encoding='utf-8')
gd=(root/'js/game-data.js').read_text(encoding='utf-8')
sw=(root/'sw.js').read_text(encoding='utf-8')
boot=app[app.find('async function boot()'):app.find('syncDeviceViewportProfile();\nboot();')]
checks=[]
def ck(label, cond): checks.append((label,bool(cond)))
ck('version app', "UI_BUILD_VERSION = '0.10.667'" in app)
ck('version game-data', "VERSION = '0.10.667'" in gd)
ck('version sw', "const VERSION = '0.10.667'" in sw)
ck('session claim starts in boot', "startupMark('session_claim_started')" in boot)
ck('session claim is fire-and-forget', 'void claimSession(user.uid, sessionId)' in boot)
ck('boot does not await session claim', 'await sessionClaimPromise' not in boot)
ck('boot does not throw session claim error', 'if (sessionClaimError) throw sessionClaimError' not in boot)
ck('cloud read remains awaited before save reconciliation', 'cloudSave = await loadState(user.uid)' in boot)
ck('local newer state adopted immediately', 'cloudSave = structuredClone(migratedLocal)' in boot and 'localStorage.setItem(localSaveKey(), JSON.stringify(migratedLocal))' in boot)
ck('startup cloud write is queued', 'saveQueue = saveQueue' in boot and '.then(() => saveState(user.uid, bootSyncSnapshot))' in boot)
ck('startup cloud write is not awaited', 'await saveState(user.uid, migratedLocal)' not in boot and 'await saveState(user.uid, bootSyncSnapshot)' not in boot)
ck('background sync marker retained', "startupMark('local_cloud_sync_started')" in boot and "startupMark('local_cloud_sync_finished', 'background')" in boot)
ck('session watcher retained', 'stopSessionWatch = watchSession(user.uid, sessionId' in boot)
ck('heartbeat retained', 'heartbeatTimer = setInterval(() => heartbeat(user.uid, sessionId), 300000)' in boot)
ck('title render retained', "screen = 'title';" in boot and "startupMark('title_rendered')" in boot)
failed=[label for label,ok in checks if not ok]
for label,ok in checks: print(('PASS' if ok else 'FAIL'), label)
if failed: sys.exit(1)
