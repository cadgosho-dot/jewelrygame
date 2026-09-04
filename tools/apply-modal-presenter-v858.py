#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
APP = ROOT / 'js/app.js'
SW = ROOT / 'sw.js'
VERSION_SYNC = ROOT / 'scripts/version-sync.py'
CHECK_CURRENT = ROOT / 'scripts/check-current.py'
CHANGELOG = ROOT / 'CHANGELOG.md'
version = (ROOT / 'VERSION').read_text(encoding='utf-8').strip()

app = APP.read_text(encoding='utf-8')
import_marker = f"import {{ createToastPresenter }} from './ui/toast-presenter.js?v={version}';\n"
new_import = import_marker + f"import {{ createModalPresenter }} from './ui/modal-presenter.js?v={version}';\n"
if app.count(import_marker) != 1:
    raise SystemExit('app.js: toast-presenter import marker mismatch')
if 'createModalPresenter' not in app:
    app = app.replace(import_marker, new_import, 1)

toast_boot = "const toastPresenter = createToastPresenter({ element: toastEl });\n"
if app.count(toast_boot) != 1:
    raise SystemExit('app.js: toastPresenter boot marker mismatch')
modal_boot = toast_boot + "const modalPresenter = createModalPresenter({ element: modalEl, escapeHtml: esc });\n"
if 'const modalPresenter = createModalPresenter({ element: modalEl, escapeHtml: esc });' not in app:
    app = app.replace(toast_boot, modal_boot, 1)

legacy_modal = """function showModal({ title = '', body = '', confirm = '決定', cancel = 'キャンセル', cancelAction = 'modal-close', confirmDisabled = false, danger = false, hideCancel = false, hideActions = false, action = '', className = '' }) {
  modalEl.innerHTML = `
    <div class=\"modal-backdrop\">
      <section class=\"modal-card ${esc(className)}\" role=\"dialog\" aria-modal=\"true\">
        ${title ? `<h2>${esc(title)}</h2>` : ''}
        <div class=\"modal-body\">${body}</div>
        ${hideActions ? '' : `<div class=\"modal-actions\">
          ${hideCancel ? '' : `<button class=\"secondary-button\" data-action=\"${esc(cancelAction)}\">${esc(cancel)}</button>`}
          <button class=\"${danger ? 'danger-button' : 'primary-button'}\" data-action=\"${esc(action)}\" ${action === 'do-sleep' ? 'data-illness-readable=\"true\"' : ''} ${confirmDisabled ? 'disabled' : ''}>${esc(confirm)}</button>
        </div>`}
      </section>
    </div>`;
  modalEl.classList.remove('hidden');
  winterColdTextEffect.schedule();
}

function closeModal() {
  modalEl.classList.add('hidden');
  modalEl.innerHTML = '';
  queueMicrotask(() => {
    maybeShowGameClearModal();
    maybeStartForcedBirthdayRest();
  });
}
"""
if app.count(legacy_modal) != 1:
    raise SystemExit(f'app.js: legacy modal block count={app.count(legacy_modal)}')
new_modal = """function showModal({ title = '', body = '', confirm = '決定', cancel = 'キャンセル', cancelAction = 'modal-close', confirmDisabled = false, danger = false, hideCancel = false, hideActions = false, action = '', className = '' }) {
  modalPresenter.show({
    title,
    body,
    confirm,
    cancel,
    cancelAction,
    confirmDisabled,
    danger,
    hideCancel,
    hideActions,
    action,
    className,
  });
  winterColdTextEffect.schedule();
}

function closeModal() {
  modalPresenter.close();
  queueMicrotask(() => {
    maybeShowGameClearModal();
    maybeStartForcedBirthdayRest();
  });
}
"""
app = app.replace(legacy_modal, new_modal, 1)
APP.write_text(app, encoding='utf-8')

sw = SW.read_text(encoding='utf-8')
sw_marker = f"'./js/ui/toast-presenter.js?v={version}', './js/ui/press-hold-controller.js?v={version}',"
sw_replacement = f"'./js/ui/toast-presenter.js?v={version}', './js/ui/modal-presenter.js?v={version}', './js/ui/press-hold-controller.js?v={version}',"
if sw.count(sw_marker) != 1:
    raise SystemExit('sw.js: modal presenter cache marker mismatch')
sw = sw.replace(sw_marker, sw_replacement, 1)
SW.write_text(sw, encoding='utf-8')

version_sync = VERSION_SYNC.read_text(encoding='utf-8')
sw_rule = "    Rule('sw.js', 'toast-presenter.js precache key', qparam(r'\\./js/ui/toast-presenter\\.js'), keep_prefix),\n"
sw_extra = "    Rule('sw.js', 'modal-presenter.js precache key', qparam(r'\\./js/ui/modal-presenter\\.js'), keep_prefix),\n"
if version_sync.count(sw_rule) != 1:
    raise SystemExit('version-sync.py: toast SW rule marker mismatch')
if sw_extra not in version_sync:
    version_sync = version_sync.replace(sw_rule, sw_rule + sw_extra, 1)
app_rule = "    Rule('js/app.js', 'toast-presenter.js import key', qparam(r'\\./ui/toast-presenter\\.js'), keep_prefix),\n"
app_extra = "    Rule('js/app.js', 'modal-presenter.js import key', qparam(r'\\./ui/modal-presenter\\.js'), keep_prefix),\n"
if version_sync.count(app_rule) != 1:
    raise SystemExit('version-sync.py: toast app rule marker mismatch')
if app_extra not in version_sync:
    version_sync = version_sync.replace(app_rule, app_rule + app_extra, 1)
VERSION_SYNC.write_text(version_sync, encoding='utf-8')

check_current = CHECK_CURRENT.read_text(encoding='utf-8')
check_marker = "    ('トースト表示管理', [sys.executable, str(ROOT / 'scripts/check-toast-presenter.py')]),\n"
check_extra = "    ('モーダル表示管理', [sys.executable, str(ROOT / 'scripts/check-modal-presenter.py')]),\n"
if check_current.count(check_marker) != 1:
    raise SystemExit('check-current.py: toast check marker mismatch')
if check_extra not in check_current:
    check_current = check_current.replace(check_marker, check_marker + check_extra, 1)
CHECK_CURRENT.write_text(check_current, encoding='utf-8')

changelog = CHANGELOG.read_text(encoding='utf-8')
marker = '## v0.10.857\n'
if changelog.count(marker) != 1:
    raise SystemExit('CHANGELOG marker mismatch')
entry = """## v0.10.858
- `showModal()` / 通常の `closeModal()` に直書きされていたモーダルDOM表示・消去処理を `js/ui/modal-presenter.js` へ分離。
- 既存のタイトル、本文HTML、confirm/cancel、danger、hideCancel、hideActions、confirmDisabled、className、`do-sleep` の `data-illness-readable` を従来どおり維持。
- HTMLエスケープは既存 `esc` をcallback注入し、本文だけは従来どおりHTMLとして表示するため、既存モーダル内容を変更しない。
- `closeModal()` 後のゲームクリア表示判定・誕生日強制休息判定は `app.js` に残し、復旧/自動進行経路の直接 `modalEl` リセットも未変更。
- 新UI moduleをService Workerと `version-sync.py` へ正式登録し、専用単体/統合検査を総合監査へ追加。
- セーブ、在庫、所持金、画面遷移、イベント条件、confirm/cancel実行ロジックには変更なし。

## v0.10.857
"""
CHANGELOG.write_text(changelog.replace(marker, entry, 1), encoding='utf-8')

print('MODAL PRESENTER REFACTOR: PASS')
