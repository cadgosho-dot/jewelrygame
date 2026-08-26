#!/usr/bin/env python3
from __future__ import annotations

import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TARGET_VERSION = '0.10.770'
EXPECTED_VERSION = '0.10.769'


def replace_once(path: Path, old: str, new: str, label: str) -> None:
    text = path.read_text(encoding='utf-8')
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f'{label}: anchor count={count}, expected=1')
    path.write_text(text.replace(old, new, 1), encoding='utf-8')


def insert_before(path: Path, anchor: str, addition: str, label: str) -> None:
    replace_once(path, anchor, addition + anchor, label)


def main() -> int:
    version_file = ROOT / 'VERSION'
    current = version_file.read_text(encoding='utf-8').strip()
    if current != EXPECTED_VERSION:
        raise RuntimeError(f'VERSION is {current}, expected {EXPECTED_VERSION}')

    firebase = ROOT / 'js/firebase-service.js'
    firebase_addition = """export async function getCloudSaveDiagnostics(uid) {\n  const base = {\n    chunkRawBytes: CLOUD_CHUNK_RAW_BYTES,\n    maxCount: CLOUD_CHUNK_MAX_COUNT,\n  };\n\n  if (previewMode) {\n    const raw = uid ? String(localStorage.getItem(`jewelrygame-preview-${uid}`) || '') : '';\n    const bytes = raw ? cloudUtf8Bytes(raw).length : 0;\n    return {\n      ...base,\n      mode: 'preview',\n      source: 'preview',\n      bytes,\n      count: bytes ? Math.ceil(bytes / CLOUD_CHUNK_RAW_BYTES) : 0,\n      saveRevision: 0,\n      updatedAt: '',\n    };\n  }\n\n  if (!uid) {\n    return { ...base, mode: 'none', source: 'none', bytes: 0, count: 0, saveRevision: 0, updatedAt: '' };\n  }\n\n  let metadata = null;\n  let source = 'cloud';\n  try {\n    metadata = await readCurrentCloudMetadata(uid);\n    if (metadata) cloudStorageMetaByUid.set(uid, metadata);\n  } catch (error) {\n    metadata = cloudStorageMetaByUid.get(uid) || null;\n    if (!metadata) throw error;\n    source = 'cache';\n  }\n\n  if (!metadata) {\n    return { ...base, mode: 'none', source, bytes: 0, count: 0, saveRevision: 0, updatedAt: '' };\n  }\n\n  return {\n    ...base,\n    mode: String(metadata.mode || 'unknown'),\n    source,\n    bytes: Math.max(0, Math.floor(Number(metadata.bytes) || 0)),\n    count: Math.max(0, Math.floor(Number(metadata.count) || 0)),\n    saveRevision: Math.max(0, Math.floor(Number(metadata.saveRevision) || 0)),\n    updatedAt: String(metadata.updatedAt || ''),\n  };\n}\n\n"""
    insert_before(firebase, 'export async function loadState(uid) {', firebase_addition, 'firebase diagnostics export')

    app = ROOT / 'js/app.js'
    replace_once(
        app,
        '  loadState, saveState, deleteGameData, deleteAccountCompletely, claimSession, watchSession, heartbeat, firebaseErrorMessage,',
        '  loadState, saveState, getCloudSaveDiagnostics, deleteGameData, deleteAccountCompletely, claimSession, watchSession, heartbeat, firebaseErrorMessage,',
        'app diagnostics import',
    )

    helper_anchor = 'function renderSettings(titleMode) {'
    helper_code = r'''function formatSaveDiagnosticBytes(value) {
  const bytes = Math.max(0, Number(value) || 0);
  if (bytes < 1024) return `${Math.round(bytes).toLocaleString('ja-JP')} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatSaveDiagnosticDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('ja-JP');
}

function buildSaveDiagnosticsSnapshot() {
  const snapshot = structuredClone(state || {});
  // v0.10.770: 診断は複製データだけを圧縮し、実ゲームのstateやsaveRevisionを変更しない。
  compactLongTermHistory(snapshot);
  snapshot.saveRevision = Math.max(0, Math.floor(Number(snapshot.saveRevision) || 0)) + 1;
  snapshot.updatedAt = new Date().toISOString();
  if (snapshot.inventory && Object.prototype.hasOwnProperty.call(snapshot.inventory, 'general')) delete snapshot.inventory.general;
  if (snapshot.inventory && Object.prototype.hasOwnProperty.call(snapshot.inventory, 'gems')) delete snapshot.inventory.gems;
  snapshot.migrations = snapshot.migrations && typeof snapshot.migrations === 'object' && !Array.isArray(snapshot.migrations) ? snapshot.migrations : {};
  snapshot.migrations.looseInventoryCanonicalV231 = true;
  snapshot.saveSchemaVersion = SAVE_SCHEMA_VERSION;
  const raw = JSON.stringify(snapshot);
  return {
    bytes: new TextEncoder().encode(raw).length,
    nextSaveRevision: snapshot.saveRevision,
    archivedClosedOrders: Array.isArray(snapshot.history?.closedOrders) ? snapshot.history.closedOrders.length : 0,
    archivedSoldJewelry: Array.isArray(snapshot.history?.soldJewelry) ? snapshot.history.soldJewelry.length : 0,
  };
}

function saveDiagnosticsCapacityLabel(projectedCount, maxCount) {
  if (maxCount <= 0) return '確認不能';
  if (projectedCount > maxCount) return 'クラウド上限超過';
  if (projectedCount === maxCount) return '上限付近';
  if (projectedCount >= Math.ceil(maxCount * 0.8)) return '注意';
  return '余裕あり';
}

async function showSaveDiagnostics() {
  if (!state) return;
  const local = buildSaveDiagnosticsSnapshot();
  let cloud = null;
  let cloudError = null;
  if (currentUser?.uid) {
    try {
      cloud = await getCloudSaveDiagnostics(currentUser.uid);
    } catch (error) {
      cloudError = error;
      console.warn('セーブ容量診断のクラウド管理情報を取得できませんでした。', error);
    }
  }
  const chunkRawBytes = Math.max(1, Number(cloud?.chunkRawBytes) || (384 * 1024));
  const maxCount = Math.max(1, Math.floor(Number(cloud?.maxCount) || 64));
  const projectedCount = local.bytes ? Math.ceil(local.bytes / chunkRawBytes) : 0;
  const currentCloudChunkLabel = cloud?.mode === 'chunked'
    ? `${Math.max(0, Math.floor(Number(cloud.count) || 0))} / ${maxCount}`
    : (cloud?.mode === 'preview' ? `${Math.max(0, Math.floor(Number(cloud.count) || 0))}（プレビュー）` : '—');
  const currentCloudBytes = Number(cloud?.bytes) > 0 ? formatSaveDiagnosticBytes(cloud.bytes) : '—';
  const cloudSourceNote = cloud?.source === 'cache' ? '直近取得済み情報' : '';
  showModal({
    title: 'セーブ容量診断',
    body: `<p>現在のセーブ容量を読み取り専用で確認します。<strong>ゲームデータやsaveRevisionは変更しません。</strong></p>
      <div class="stat-grid">
        <div><small>次回JSON予測</small><strong>${formatSaveDiagnosticBytes(local.bytes)}</strong></div>
        <div><small>次回チャンク予測</small><strong>${projectedCount} / ${maxCount}</strong></div>
        <div><small>完了注文アーカイブ</small><strong>${local.archivedClosedOrders.toLocaleString('ja-JP')}件</strong></div>
        <div><small>売却済みアーカイブ</small><strong>${local.archivedSoldJewelry.toLocaleString('ja-JP')}件</strong></div>
      </div>
      <p><strong>容量判定：${esc(saveDiagnosticsCapacityLabel(projectedCount, maxCount))}</strong></p>
      <div class="stat-grid">
        <div><small>現在クラウド容量</small><strong>${esc(currentCloudBytes)}</strong></div>
        <div><small>現在クラウドチャンク</small><strong>${esc(currentCloudChunkLabel)}</strong></div>
        <div><small>クラウドsaveRevision</small><strong>${cloud ? Math.max(0, Math.floor(Number(cloud.saveRevision) || 0)).toLocaleString('ja-JP') : '—'}</strong></div>
        <div><small>クラウド更新</small><strong>${esc(formatSaveDiagnosticDate(cloud?.updatedAt))}</strong></div>
      </div>
      ${cloudError ? '<p class="small-note">クラウド管理情報は取得できなかったため、端末上の次回保存予測だけを表示しています。</p>' : ''}
      ${cloudSourceNote ? `<p class="small-note">クラウド値は${esc(cloudSourceNote)}です。</p>` : ''}
      <p class="small-note">クラウドは1チャンクあたり約${formatSaveDiagnosticBytes(chunkRawBytes)}、最大${maxCount}チャンクです。診断を開くだけでは保存処理を行いません。次回保存予測のsaveRevisionは ${local.nextSaveRevision.toLocaleString('ja-JP')} です。</p>`,
    confirm: '閉じる',
    action: 'modal-close',
    hideCancel: true,
  });
}

'''
    insert_before(app, helper_anchor, helper_code, 'app diagnostics helpers')

    settings_anchor = """    </section>` : ''}\n    <small>バージョン ${UI_BUILD_VERSION}</small>\n"""
    settings_replacement = """    </section>` : ''}\n    ${!titleMode ? `<section class=\"home-install-setting save-diagnostics-setting\">\n      <div><strong>セーブ容量診断</strong><small>現在のJSON容量・クラウドチャンク数・長期履歴件数を確認します。診断だけでは保存データを変更しません。</small></div>\n      <button type=\"button\" class=\"secondary-button full-button\" data-action=\"save-diagnostics\">セーブ容量を確認する</button>\n    </section>` : ''}\n    <small>バージョン ${UI_BUILD_VERSION}</small>\n"""
    replace_once(app, settings_anchor, settings_replacement, 'settings diagnostics button')

    action_anchor = """    case 'delete-account':\n      showAccountDeletionExecution();\n      break;\n"""
    action_replacement = """    case 'save-diagnostics':\n      await showSaveDiagnostics();\n      break;\n    case 'delete-account':\n      showAccountDeletionExecution();\n      break;\n"""
    replace_once(app, action_anchor, action_replacement, 'diagnostics click action')

    check_script = ROOT / 'scripts/check-save-diagnostics.py'
    check_script.write_text(r'''#!/usr/bin/env python3
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
app = (ROOT / 'js/app.js').read_text(encoding='utf-8')
firebase = (ROOT / 'js/firebase-service.js').read_text(encoding='utf-8')

checks = [
    ('Firebaseに読み取り専用診断APIがある', 'export async function getCloudSaveDiagnostics(uid)' in firebase),
    ('診断APIは現行saveMetaを読む', 'metadata = await readCurrentCloudMetadata(uid);' in firebase),
    ('診断APIはチャンク上限を返す', 'maxCount: CLOUD_CHUNK_MAX_COUNT' in firebase),
    ('診断APIはチャンク実サイズを返す', 'chunkRawBytes: CLOUD_CHUNK_RAW_BYTES' in firebase),
    ('アプリが診断APIを読み込む', 'saveState, getCloudSaveDiagnostics, deleteGameData' in app),
    ('設定にセーブ容量診断ボタンがある', 'data-action="save-diagnostics"' in app and 'セーブ容量を確認する' in app),
    ('診断はstateの複製を使う', 'const snapshot = structuredClone(state || {});' in app),
    ('診断用複製だけ履歴圧縮する', 'compactLongTermHistory(snapshot);' in app),
    ('完了注文アーカイブ件数を表示する', "snapshot.history?.closedOrders" in app and '完了注文アーカイブ' in app),
    ('売却済みアーカイブ件数を表示する', "snapshot.history?.soldJewelry" in app and '売却済みアーカイブ' in app),
    ('次回チャンク数を実チャンクサイズから計算する', 'Math.ceil(local.bytes / chunkRawBytes)' in app),
    ('診断は保存データを変更しない旨を明示する', 'ゲームデータやsaveRevisionは変更しません' in app),
    ('クリックで読み取り専用診断を開く', "case 'save-diagnostics':" in app and 'await showSaveDiagnostics();' in app),
]

failed = [label for label, ok in checks if not ok]
for label, ok in checks:
    print(('OK' if ok else 'NG') + ': ' + label)
if failed:
    print('\nSAVE DIAGNOSTICS POLICY: FAIL')
    sys.exit(1)
print('\nSAVE DIAGNOSTICS POLICY: PASS')
''', encoding='utf-8')

    check_current = ROOT / 'scripts/check-current.py'
    text = check_current.read_text(encoding='utf-8')
    anchor = "    ('長期履歴圧縮', [sys.executable, str(ROOT / 'scripts/check-long-term-history.py')]),\n"
    if anchor not in text:
        raise RuntimeError('check-current long-term-history anchor not found')
    addition = anchor + "    ('セーブ容量診断', [sys.executable, str(ROOT / 'scripts/check-save-diagnostics.py')]),\n"
    if "check-save-diagnostics.py" in text:
        raise RuntimeError('check-save-diagnostics.py is already registered')
    check_current.write_text(text.replace(anchor, addition, 1), encoding='utf-8')

    subprocess.run(['python3', 'scripts/version-sync.py', '--set', TARGET_VERSION], cwd=ROOT, check=True)
    print(f'applied {EXPECTED_VERSION} -> {TARGET_VERSION}')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
