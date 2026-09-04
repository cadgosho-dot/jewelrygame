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
module_path = ROOT / 'js/ui/modal-presenter.js'
errors: list[str] = []

expected_import = f"import {{ createModalPresenter }} from './ui/modal-presenter.js?v={version}';"
if expected_import not in app:
    errors.append('app.js: modal-presenter のVERSION付きimportがありません')
if 'const modalPresenter = createModalPresenter({ element: modalEl, escapeHtml: esc });' not in app:
    errors.append('app.js: modalPresenter の生成がありません')
if 'modalPresenter.show({' not in app:
    errors.append('app.js: showModal がmodalPresenterへ委譲されていません')
if 'modalPresenter.close();' not in app:
    errors.append('app.js: closeModal がmodalPresenterへ委譲されていません')

legacy_show = (
    'modalEl.innerHTML = `\n    <div class="modal-backdrop">',
    "modalEl.classList.remove('hidden');",
)
for legacy in legacy_show:
    if legacy in app:
        errors.append(f'app.js: 旧showModal DOM表示処理が残っています: {legacy}')

if 'winterColdTextEffect.schedule();' not in app:
    errors.append('app.js: showModal後の冬文字効果scheduleが見つかりません')
if 'queueMicrotask(() => {\n    maybeShowGameClearModal();\n    maybeStartForcedBirthdayRest();\n  });' not in app:
    errors.append('app.js: closeModal後のゲームクリア/誕生日休息フックが維持されていません')

# Recovery/autopilot paths intentionally retain direct modal reset behavior.
if app.count("modalEl?.classList.add('hidden');") < 2:
    errors.append('app.js: 復旧経路の直接modal非表示処理まで誤って移動しています')
if app.count("if (modalEl) modalEl.innerHTML = '';") < 2:
    errors.append('app.js: 復旧経路の直接modalクリア処理まで誤って移動しています')

if f"./js/ui/modal-presenter.js?v={version}" not in sw:
    errors.append('sw.js: modal-presenter がCORE_SHELLにありません')
if not module_path.is_file():
    errors.append('js/ui/modal-presenter.js がありません')
else:
    module = module_path.read_text(encoding='utf-8')
    required = (
        'class="modal-backdrop"',
        'role="dialog" aria-modal="true"',
        'class="modal-body"',
        'class="modal-actions"',
        "danger ? 'danger-button' : 'primary-button'",
        "action === 'do-sleep' ? 'data-illness-readable=\"true\"' : ''",
        "confirmDisabled ? 'disabled' : ''",
        "element.classList.remove('hidden');",
        "element.classList.add('hidden');",
        "element.innerHTML = '';",
    )
    for marker in required:
        if marker not in module:
            errors.append(f'modal-presenter: 必須表示仕様がありません: {marker}')
    for forbidden in ('state.', 'saveGame(', 'playSfx(', 'winterColdTextEffect', 'maybeShowGameClearModal', 'maybeStartForcedBirthdayRest'):
        if forbidden in module:
            errors.append(f'modal-presenter: ゲーム本体への逆依存があります: {forbidden}')

sw_rule = "Rule('sw.js', 'modal-presenter.js precache key'"
app_rule = "Rule('js/app.js', 'modal-presenter.js import key'"
if sw_rule not in version_sync:
    errors.append('version-sync.py: modal-presenter のSW同期ルールがありません')
if app_rule not in version_sync:
    errors.append('version-sync.py: modal-presenter のapp import同期ルールがありません')
if "('モーダル表示管理', [sys.executable, str(ROOT / 'scripts/check-modal-presenter.py')])," not in check_current:
    errors.append('scripts/check-current.py: モーダル表示管理の総合検査登録がありません')

if errors:
    print('MODAL PRESENTER INTEGRATION: FAIL')
    for error in errors:
        print(f'- {error}')
    sys.exit(1)

proc = subprocess.run(
    ['node', str(ROOT / 'tools/test-modal-presenter.mjs')],
    cwd=ROOT, capture_output=True, text=True, encoding='utf-8'
)
if proc.returncode != 0:
    print('MODAL PRESENTER INTEGRATION: FAIL')
    print(proc.stdout, end='')
    print(proc.stderr, end='', file=sys.stderr)
    sys.exit(proc.returncode)

print(proc.stdout, end='')
print('MODAL PRESENTER INTEGRATION: PASS')
print('通常show/closeのDOM表示だけをUI moduleへ分離し、冬文字効果・close後フック・復旧経路の直接modalリセットを維持しています。')
