#!/usr/bin/env python3
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]


def replace_once(path: str, old: str, new: str, label: str) -> None:
    target = ROOT / path
    text = target.read_text(encoding='utf-8')
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly 1 occurrence, found {count}')
    target.write_text(text.replace(old, new, 1), encoding='utf-8')


def regex_replace_once(path: str, pattern: str, replacement: str, label: str) -> None:
    target = ROOT / path
    text = target.read_text(encoding='utf-8')
    updated, count = re.subn(pattern, replacement, text, count=1, flags=re.MULTILINE)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly 1 regex replacement, found {count}')
    target.write_text(updated, encoding='utf-8')


# app.js: add the versioned helper import next to the other UI modules.
regex_replace_once(
    'js/app.js',
    r"(import \{ createAutosaveStatusPresenter \} from '\./ui/autosave-status-presenter\.js\?v=0\.10\.\d+';\n)",
    r"\1import { fallbackCopyText } from './ui/clipboard-fallback.js?v=0.10.859';\n",
    'app import insertion',
)

# app.js: remove only the legacy 15-line DOM implementation. The two call sites stay unchanged.
legacy = """function fallbackCopyText(text) {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.left = '-9999px';
  textarea.style.top = '0';
  document.body.appendChild(textarea);
  textarea.select();
  textarea.setSelectionRange(0, textarea.value.length);
  let copied = false;
  try { copied = document.execCommand('copy'); } catch (_) { copied = false; }
  textarea.remove();
  return copied;
}

"""
replace_once('js/app.js', legacy, '', 'legacy fallbackCopyText removal')

# Service Worker: precache the new module next to the current UI helper set.
regex_replace_once(
    'sw.js',
    r"('\./js/ui/autosave-status-presenter\.js\?v=0\.10\.\d+', )('\./js/ui/press-hold-controller\.js\?v=0\.10\.\d+')",
    r"\1'./js/ui/clipboard-fallback.js?v=0.10.859', \2",
    'SW clipboard helper precache insertion',
)

# Version synchronization: register both active references.
replace_once(
    'scripts/version-sync.py',
    "    Rule('sw.js', 'autosave-status-presenter.js precache key', qparam(r'\\./js/ui/autosave-status-presenter\\.js'), keep_prefix),\n",
    "    Rule('sw.js', 'autosave-status-presenter.js precache key', qparam(r'\\./js/ui/autosave-status-presenter\\.js'), keep_prefix),\n"
    "    Rule('sw.js', 'clipboard-fallback.js precache key', qparam(r'\\./js/ui/clipboard-fallback\\.js'), keep_prefix),\n",
    'version-sync SW rule insertion',
)
replace_once(
    'scripts/version-sync.py',
    "    Rule('js/app.js', 'autosave-status-presenter.js import key', qparam(r'\\./ui/autosave-status-presenter\\.js'), keep_prefix),\n",
    "    Rule('js/app.js', 'autosave-status-presenter.js import key', qparam(r'\\./ui/autosave-status-presenter\\.js'), keep_prefix),\n"
    "    Rule('js/app.js', 'clipboard-fallback.js import key', qparam(r'\\./ui/clipboard-fallback\\.js'), keep_prefix),\n",
    'version-sync app rule insertion',
)

# Current-build audit: keep this seam under permanent regression coverage.
replace_once(
    'scripts/check-current.py',
    "    ('自動セーブ状態表示', [sys.executable, str(ROOT / 'scripts/check-autosave-status-presenter.py')]),\n",
    "    ('自動セーブ状態表示', [sys.executable, str(ROOT / 'scripts/check-autosave-status-presenter.py')]),\n"
    "    ('クリップボードフォールバック', [sys.executable, str(ROOT / 'scripts/check-clipboard-fallback.py')]),\n",
    'check-current registration',
)

# Changelog: one update = one purpose. Do not mix unrelated cleanup.
replace_once(
    'CHANGELOG.md',
    "\n\n## v0.10.859\n",
    "\n\n## v0.10.860\n"
    "- Clipboard APIが使えない場合の一時`textarea`によるコピー処理だけを `js/ui/clipboard-fallback.js` へ分離。\n"
    "- `readonly`、画面外固定配置、選択範囲、`document.execCommand('copy')`、成功/失敗の真偽値を従来どおり維持。\n"
    "- プレゼントコードとAI相談用データの既存2呼び出しは変更せず、コピー判断・通知・効果音・振動は `app.js` に残した。\n"
    "- セーブ、認証、所持金、在庫、購入、水槽、イベント進行、画面遷移、画像assetには変更なし。\n"
    "- 新UI helperをService Workerと `version-sync.py` へ正式登録し、専用単体/統合検査を総合監査へ追加。\n"
    "\n## v0.10.859\n",
    'CHANGELOG v0.10.860 insertion',
)

# Temporary implementation files must not remain in the PR diff.
for rel in (
    '.github/workflows/v0-10-860-apply-and-test.yml',
    'tools/apply-v0-10-860.py',
):
    path = ROOT / rel
    if path.exists():
        path.unlink()

print('v0.10.860 applicator: PASS')
