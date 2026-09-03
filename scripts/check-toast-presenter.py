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
module_path = ROOT / 'js/ui/toast-presenter.js'
errors: list[str] = []

expected_import = f"import {{ createToastPresenter }} from './ui/toast-presenter.js?v={version}';"
if expected_import not in app:
    errors.append('app.js: toast-presenter のVERSION付きimportがありません')
if 'const toastPresenter = createToastPresenter({ element: toastEl });' not in app:
    errors.append('app.js: toastPresenter の生成がありません')
if 'toastPresenter.show(message, type);' not in app:
    errors.append('app.js: showToast がtoastPresenterへ委譲されていません')
for legacy in (
    'toastEl.textContent = message;',
    'toastEl.dataset.type = type;',
    "toastEl.classList.add('show');",
    'clearTimeout(showToast.timer);',
    "showToast.timer = setTimeout(() => toastEl.classList.remove('show'), 2100);",
):
    if legacy in app:
        errors.append(f'app.js: 旧トースト表示ライフサイクルが残っています: {legacy}')
if "if (withSound) playSfx(type === 'error' ? 'error' : type === 'sale' ? 'sale' : 'select');" not in app:
    errors.append('app.js: 既存のトースト効果音振り分けが維持されていません')
if 'winterColdTextEffect.schedule();' not in app:
    errors.append('app.js: 冬の文字効果schedule呼び出しが見つかりません')
if "toastEl.innerHTML = '<strong>時計台募金　−100,000円</strong><small>御徒町パンダ広場の時計台建設へ寄付しました。</small>';" not in app:
    errors.append('app.js: 時計台募金の特別トーストHTMLが維持されていません')
if f"./js/ui/toast-presenter.js?v={version}" not in sw:
    errors.append('sw.js: toast-presenter がCORE_SHELLにありません')
if not module_path.is_file():
    errors.append('js/ui/toast-presenter.js がありません')
else:
    module = module_path.read_text(encoding='utf-8')
    if 'durationMs = 2100' not in module:
        errors.append('toast-presenter: 既存の2100ms表示時間が既定値になっていません')
    for forbidden in ('state.', 'saveGame(', 'playSfx(', 'winterColdTextEffect'):
        if forbidden in module:
            errors.append(f'toast-presenter: ゲーム本体への逆依存があります: {forbidden}')

sw_rule = "Rule('sw.js', 'toast-presenter.js precache key'"
app_rule = "Rule('js/app.js', 'toast-presenter.js import key'"
if sw_rule not in version_sync:
    errors.append('version-sync.py: toast-presenter のSW同期ルールがありません')
if app_rule not in version_sync:
    errors.append('version-sync.py: toast-presenter のapp import同期ルールがありません')
if "('トースト表示管理', [sys.executable, str(ROOT / 'scripts/check-toast-presenter.py')])," not in check_current:
    errors.append('scripts/check-current.py: トースト表示管理の総合検査登録がありません')

if errors:
    print('TOAST PRESENTER INTEGRATION: FAIL')
    for error in errors:
        print(f'- {error}')
    sys.exit(1)

proc = subprocess.run(
    ['node', str(ROOT / 'tools/test-toast-presenter.mjs')],
    cwd=ROOT, capture_output=True, text=True, encoding='utf-8'
)
if proc.returncode != 0:
    print('TOAST PRESENTER INTEGRATION: FAIL')
    print(proc.stdout, end='')
    print(proc.stderr, end='', file=sys.stderr)
    sys.exit(proc.returncode)

print(proc.stdout, end='')
print('TOAST PRESENTER INTEGRATION: PASS')
print('トーストのDOM表示・type設定・showクラス・2100ms自動消去だけをUI moduleへ分離し、効果音・冬文字効果・時計台募金の特別HTMLを維持しています。')
