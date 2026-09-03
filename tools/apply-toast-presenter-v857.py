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
import_marker = f"import {{ createWinterColdTextEffect }} from './ui/winter-cold-text-effect.js?v={version}';\n"
new_import = import_marker + f"import {{ createToastPresenter }} from './ui/toast-presenter.js?v={version}';\n"
if app.count(import_marker) != 1:
    raise SystemExit('app.js: winter-cold import marker mismatch')
if 'createToastPresenter' not in app:
    app = app.replace(import_marker, new_import, 1)

winter_boot = """const winterColdTextEffect = createWinterColdTextEffect({
  isActive: () => winterColdTextActive(),
});
"""
if app.count(winter_boot) != 1:
    raise SystemExit('app.js: winterColdTextEffect boot marker mismatch')
toast_boot = winter_boot + "\nconst toastPresenter = createToastPresenter({ element: toastEl });\n"
if 'const toastPresenter = createToastPresenter({ element: toastEl });' not in app:
    app = app.replace(winter_boot, toast_boot, 1)

legacy_show_toast = """function showToast(message, type = 'info', withSound = true) {
  toastEl.textContent = message;
  toastEl.dataset.type = type;
  toastEl.classList.add('show');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toastEl.classList.remove('show'), 2100);
  if (withSound) playSfx(type === 'error' ? 'error' : type === 'sale' ? 'sale' : 'select');
  winterColdTextEffect.schedule();
}
"""
if app.count(legacy_show_toast) != 1:
    raise SystemExit(f'app.js: legacy showToast block count={app.count(legacy_show_toast)}')
new_show_toast = """function showToast(message, type = 'info', withSound = true) {
  toastPresenter.show(message, type);
  if (withSound) playSfx(type === 'error' ? 'error' : type === 'sale' ? 'sale' : 'select');
  winterColdTextEffect.schedule();
}
"""
app = app.replace(legacy_show_toast, new_show_toast, 1)
clock_tower_html = "toastEl.innerHTML = '<strong>時計台募金　−100,000円</strong><small>御徒町パンダ広場の時計台建設へ寄付しました。</small>';"
if app.count(clock_tower_html) != 1:
    raise SystemExit('app.js: clock tower special toast HTML marker mismatch')
APP.write_text(app, encoding='utf-8')

sw = SW.read_text(encoding='utf-8')
sw_marker = f"'./js/ui/winter-cold-text-effect.js?v={version}', './js/ui/press-hold-controller.js?v={version}',"
sw_replacement = f"'./js/ui/winter-cold-text-effect.js?v={version}', './js/ui/toast-presenter.js?v={version}', './js/ui/press-hold-controller.js?v={version}',"
if sw.count(sw_marker) != 1:
    raise SystemExit('sw.js: toast presenter cache marker mismatch')
sw = sw.replace(sw_marker, sw_replacement, 1)
SW.write_text(sw, encoding='utf-8')

version_sync = VERSION_SYNC.read_text(encoding='utf-8')
sw_rule = "    Rule('sw.js', 'winter-cold-text-effect.js precache key', qparam(r'\\./js/ui/winter-cold-text-effect\\.js'), keep_prefix),\n"
sw_extra = "    Rule('sw.js', 'toast-presenter.js precache key', qparam(r'\\./js/ui/toast-presenter\\.js'), keep_prefix),\n"
if version_sync.count(sw_rule) != 1:
    raise SystemExit('version-sync.py: winter-cold SW rule marker mismatch')
if sw_extra not in version_sync:
    version_sync = version_sync.replace(sw_rule, sw_rule + sw_extra, 1)
app_rule = "    Rule('js/app.js', 'winter-cold-text-effect.js import key', qparam(r'\\./ui/winter-cold-text-effect\\.js'), keep_prefix),\n"
app_extra = "    Rule('js/app.js', 'toast-presenter.js import key', qparam(r'\\./ui/toast-presenter\\.js'), keep_prefix),\n"
if version_sync.count(app_rule) != 1:
    raise SystemExit('version-sync.py: winter-cold app rule marker mismatch')
if app_extra not in version_sync:
    version_sync = version_sync.replace(app_rule, app_rule + app_extra, 1)
VERSION_SYNC.write_text(version_sync, encoding='utf-8')

check_current = CHECK_CURRENT.read_text(encoding='utf-8')
check_marker = "    ('冬の体調不良文字効果', [sys.executable, str(ROOT / 'scripts/check-winter-cold-text-effect.py')]),\n"
check_extra = "    ('トースト表示管理', [sys.executable, str(ROOT / 'scripts/check-toast-presenter.py')]),\n"
if check_current.count(check_marker) != 1:
    raise SystemExit('check-current.py: winter-cold check marker mismatch')
if check_extra not in check_current:
    check_current = check_current.replace(check_marker, check_marker + check_extra, 1)
CHECK_CURRENT.write_text(check_current, encoding='utf-8')

changelog = CHANGELOG.read_text(encoding='utf-8')
marker = '## v0.10.856\n'
if changelog.count(marker) != 1:
    raise SystemExit('CHANGELOG marker mismatch')
entry = """## v0.10.857
- `showToast()` に直書きされていたトーストのDOM表示処理を `js/ui/toast-presenter.js` へ分離。
- メッセージ設定、`data-type` 設定、`show` クラス付与、前回タイマー解除、2100ms後の自動消去を従来どおり維持。
- 効果音の `error` / `sale` / `select` 振り分けと冬の体調不良文字効果scheduleは `app.js` に残し、UI moduleはゲーム状態・音声・イベント状態へ依存しない構造に変更。
- 時計台募金の特別な2段トーストHTMLは既存の `toastEl.innerHTML` をそのまま維持し、通常トーストと同じ自動消去タイマーを利用。
- 新UI moduleをService Workerと `version-sync.py` へ正式登録し、専用単体/統合検査を総合監査へ追加。
- セーブ、在庫、所持金、画面遷移、イベント発生条件、トースト文言・表示時間・効果音には変更なし。

## v0.10.856
"""
CHANGELOG.write_text(changelog.replace(marker, entry, 1), encoding='utf-8')

print('TOAST PRESENTER REFACTOR: PASS')
