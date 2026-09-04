#!/usr/bin/env python3
from __future__ import annotations

import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
version = (ROOT / 'VERSION').read_text(encoding='utf-8').strip()
app = (ROOT / 'js/app.js').read_text(encoding='utf-8')
sw = (ROOT / 'sw.js').read_text(encoding='utf-8')
version_sync = (ROOT / 'scripts/version-sync.py').read_text(encoding='utf-8')
check_current = (ROOT / 'scripts/check-current.py').read_text(encoding='utf-8')
module_path = ROOT / 'js/ui/autosave-status-presenter.js'
errors: list[str] = []

expected_import = f"import {{ createAutosaveStatusPresenter }} from './ui/autosave-status-presenter.js?v={version}';"
if expected_import not in app:
    errors.append('app.js: autosave-status-presenter のVERSION付きimportがありません')
if 'const autosaveStatusPresenter = createAutosaveStatusPresenter();' not in app:
    errors.append('app.js: autosaveStatusPresenter の生成がありません')
if 'autosaveStatusPresenter.show(mode, text, { persistent });' not in app:
    errors.append('app.js: showAutosaveStatus がpresenterへ委譲されていません')

for legacy in (
    'function ensureAutosaveStatusElement()',
    'let autosaveStatusHideTimer = null;',
    'const AUTOSAVE_STATUS_HIDE_MS = 2200;',
    "document.querySelector('[data-autosave-status]')",
    "element.dataset.autosaveStatus = String(mode || 'idle');",
):
    if legacy in app:
        errors.append(f'app.js: 旧autosave status DOMライフサイクルが残っています: {legacy}')

for save_contract in (
    "showAutosaveStatus('error', 'セーブデータを準備できませんでした', { persistent: true });",
    "showAutosaveStatus('saved', '端末容量を節約して保存しました');",
    "showAutosaveStatus('saved', 'クラウド保存を復旧しました');",
    "showAutosaveStatus('error', '端末に保存できませんでした', { persistent: true });",
):
    if save_contract not in app:
        errors.append(f'app.js: 既存の保存状態通知契約が維持されていません: {save_contract}')

if f"./js/ui/autosave-status-presenter.js?v={version}" not in sw:
    errors.append('sw.js: autosave-status-presenter がCORE_SHELLにありません')

if not module_path.is_file():
    errors.append('js/ui/autosave-status-presenter.js がありません')
else:
    module = module_path.read_text(encoding='utf-8')
    for marker in (
        'hideDelayMs = 2200',
        "element.className = 'autosave-status';",
        "element.dataset.autosaveStatus = 'idle';",
        "element.setAttribute('role', 'status');",
        "element.setAttribute('aria-live', 'polite');",
        'element.hidden = !text;',
    ):
        if marker not in module:
            errors.append(f'autosave-status-presenter: 既存DOM契約がありません: {marker}')
    for forbidden in ('state.', 'saveGame(', 'firebase', 'render(', 'indexedDb', 'cloudSave'):
        if forbidden in module:
            errors.append(f'autosave-status-presenter: 保存/ゲーム本体への逆依存があります: {forbidden}')

sw_rule = "Rule('sw.js', 'autosave-status-presenter.js precache key'"
app_rule = "Rule('js/app.js', 'autosave-status-presenter.js import key'"
if sw_rule not in version_sync:
    errors.append('version-sync.py: autosave-status-presenter のSW同期ルールがありません')
if app_rule not in version_sync:
    errors.append('version-sync.py: autosave-status-presenter のapp import同期ルールがありません')
if "('自動セーブ状態表示', [sys.executable, str(ROOT / 'scripts/check-autosave-status-presenter.py')])," not in check_current:
    errors.append('scripts/check-current.py: 自動セーブ状態表示の総合検査登録がありません')

if errors:
    print('AUTOSAVE STATUS PRESENTER INTEGRATION: FAIL')
    for error in errors:
        print(f'- {error}')
    sys.exit(1)

proc = subprocess.run(
    ['node', str(ROOT / 'tools/test-autosave-status-presenter.mjs')],
    cwd=ROOT, capture_output=True, text=True, encoding='utf-8'
)
if proc.returncode != 0:
    print('AUTOSAVE STATUS PRESENTER INTEGRATION: FAIL')
    print(proc.stdout, end='')
    print(proc.stderr, end='', file=sys.stderr)
    sys.exit(proc.returncode)

print(proc.stdout, end='')
print('AUTOSAVE STATUS PRESENTER INTEGRATION: PASS')
print('自動セーブ状態のDOM生成・表示・2200ms自動非表示だけをUI moduleへ分離し、保存判断・IndexedDB・クラウド保存・エラー処理をapp.js側に維持しています。')
