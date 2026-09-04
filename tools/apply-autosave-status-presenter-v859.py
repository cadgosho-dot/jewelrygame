#!/usr/bin/env python3
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected 1 match, found {count}')
    return text.replace(old, new, 1)


app_path = ROOT / 'js/app.js'
app = app_path.read_text(encoding='utf-8')
app = replace_once(
    app,
    "import { createModalPresenter } from './ui/modal-presenter.js?v=0.10.858';\nimport { createPressHoldController } from './ui/press-hold-controller.js?v=0.10.858';",
    "import { createModalPresenter } from './ui/modal-presenter.js?v=0.10.858';\nimport { createAutosaveStatusPresenter } from './ui/autosave-status-presenter.js?v=0.10.858';\nimport { createPressHoldController } from './ui/press-hold-controller.js?v=0.10.858';",
    'app import',
)
app = replace_once(
    app,
    "const modalPresenter = createModalPresenter({ element: modalEl, escapeHtml: esc });",
    "const modalPresenter = createModalPresenter({ element: modalEl, escapeHtml: esc });\nconst autosaveStatusPresenter = createAutosaveStatusPresenter();",
    'presenter construction',
)
app = replace_once(app, 'let autosaveStatusHideTimer = null;\n', '', 'legacy autosave timer state')
app = replace_once(app, 'const AUTOSAVE_STATUS_HIDE_MS = 2200;\n', '', 'legacy autosave hide delay')
pattern = re.compile(
    r"function ensureAutosaveStatusElement\(\) \{.*?\n\}\n\n"
    r"function showAutosaveStatus\(mode, text, \{ persistent = false \} = \{\}\) \{.*?\n\}\n\n"
    r"function formatAutosaveTime",
    re.S,
)
matches = list(pattern.finditer(app))
if len(matches) != 1:
    raise SystemExit(f'autosave status block: expected 1 match, found {len(matches)}')
app = pattern.sub(
    "function showAutosaveStatus(mode, text, { persistent = false } = {}) {\n"
    "  autosaveStatusPresenter.show(mode, text, { persistent });\n"
    "}\n\n"
    "function formatAutosaveTime",
    app,
    count=1,
)
app_path.write_text(app, encoding='utf-8')

version_sync_path = ROOT / 'scripts/version-sync.py'
version_sync = version_sync_path.read_text(encoding='utf-8')
version_sync = replace_once(
    version_sync,
    "    Rule('sw.js', 'modal-presenter.js precache key', qparam(r'\\./js/ui/modal-presenter\\.js'), keep_prefix),\n",
    "    Rule('sw.js', 'modal-presenter.js precache key', qparam(r'\\./js/ui/modal-presenter\\.js'), keep_prefix),\n"
    "    Rule('sw.js', 'autosave-status-presenter.js precache key', qparam(r'\\./js/ui/autosave-status-presenter\\.js'), keep_prefix),\n",
    'version sync SW rule',
)
version_sync = replace_once(
    version_sync,
    "    Rule('js/app.js', 'modal-presenter.js import key', qparam(r'\\./ui/modal-presenter\\.js'), keep_prefix),\n",
    "    Rule('js/app.js', 'modal-presenter.js import key', qparam(r'\\./ui/modal-presenter\\.js'), keep_prefix),\n"
    "    Rule('js/app.js', 'autosave-status-presenter.js import key', qparam(r'\\./ui/autosave-status-presenter\\.js'), keep_prefix),\n",
    'version sync app rule',
)
version_sync_path.write_text(version_sync, encoding='utf-8')

check_current_path = ROOT / 'scripts/check-current.py'
check_current = check_current_path.read_text(encoding='utf-8')
check_current = replace_once(
    check_current,
    "    ('モーダル表示管理', [sys.executable, str(ROOT / 'scripts/check-modal-presenter.py')]),\n",
    "    ('モーダル表示管理', [sys.executable, str(ROOT / 'scripts/check-modal-presenter.py')]),\n"
    "    ('自動セーブ状態表示', [sys.executable, str(ROOT / 'scripts/check-autosave-status-presenter.py')]),\n",
    'check-current registration',
)
check_current_path.write_text(check_current, encoding='utf-8')

sw_path = ROOT / 'sw.js'
sw = sw_path.read_text(encoding='utf-8')
sw = replace_once(
    sw,
    "'./js/ui/modal-presenter.js?v=0.10.858', './js/ui/press-hold-controller.js?v=0.10.858'",
    "'./js/ui/modal-presenter.js?v=0.10.858', './js/ui/autosave-status-presenter.js?v=0.10.858', './js/ui/press-hold-controller.js?v=0.10.858'",
    'SW core shell',
)
sw_path.write_text(sw, encoding='utf-8')

changelog_path = ROOT / 'CHANGELOG.md'
changelog = changelog_path.read_text(encoding='utf-8')
entry = """
## v0.10.859
- 自動セーブ状態表示のDOM生成・表示・自動非表示処理を `js/ui/autosave-status-presenter.js` へ分離。
- `autosave-status` 要素、`data-autosave-status`、`role=status`、`aria-live=polite`、通常表示2200msを従来どおり維持。
- `showAutosaveStatus()` の呼び出し口は `app.js` に残し、既存の保存処理からの呼び出し箇所を変更しない構造にした。
- IndexedDB、localStorage、クラウド保存、保存成否判定、エラー文言、save fingerprint、セーブデータには変更なし。
- 新UI moduleをService Workerと `version-sync.py` へ正式登録し、専用単体/統合検査を総合監査へ追加。

"""
changelog = replace_once(changelog, '\n## v0.10.858\n', '\n' + entry + '## v0.10.858\n', 'CHANGELOG insertion')
changelog_path.write_text(changelog, encoding='utf-8')

print('AUTOSAVE STATUS PRESENTER REFACTOR: PASS')
