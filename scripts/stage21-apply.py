#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

def replace_once(path: str, old: str, new: str) -> None:
    file = ROOT / path
    text = file.read_text(encoding='utf-8')
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{path}: expected exactly one target, found {count}: {old[:80]!r}')
    file.write_text(text.replace(old, new, 1), encoding='utf-8')

# app.js: add versioned helper import and keep the existing public wrapper/call sites.
replace_once(
    'js/app.js',
    "import { formatRoughDisplayName } from './ui/rough-display-name.js?v=0.10.868';\n",
    "import { formatRoughDisplayName } from './ui/rough-display-name.js?v=0.10.868';\n"
    "import { formatTimeRemainingLabel } from './ui/time-remaining-label.js?v=0.10.868';\n",
)
replace_once(
    'js/app.js',
    """function timeRemainingLabel(minutes) {
  const remaining = Math.max(0, Math.round(Number(minutes) || 0));
  const hours = Math.floor(remaining / 60);
  const restMinutes = remaining % 60;
  if (hours > 0 && restMinutes > 0) return `あと${hours}時間${restMinutes}分`;
  if (hours > 0) return `あと${hours}時間`;
  return `あと${restMinutes}分`;
}""",
    """function timeRemainingLabel(minutes) {
  return formatTimeRemainingLabel(minutes);
}""",
)

# Service Worker: make the new UI module part of the versioned app shell.
replace_once(
    'sw.js',
    "  './js/ui/rough-display-name.js?v=0.10.868',\n",
    "  './js/ui/rough-display-name.js?v=0.10.868',\n  './js/ui/time-remaining-label.js?v=0.10.868',\n",
)

# version-sync.py: register both the Service Worker and app import cache keys.
replace_once(
    'scripts/version-sync.py',
    "    Rule('sw.js', 'rough-display-name.js precache key', qparam(r'\\./js/ui/rough-display-name\\.js'), keep_prefix),\n",
    "    Rule('sw.js', 'rough-display-name.js precache key', qparam(r'\\./js/ui/rough-display-name\\.js'), keep_prefix),\n"
    "    Rule('sw.js', 'time-remaining-label.js precache key', qparam(r'\\./js/ui/time-remaining-label\\.js'), keep_prefix),\n",
)
replace_once(
    'scripts/version-sync.py',
    "    Rule('js/app.js', 'rough-display-name.js import key', qparam(r'\\./ui/rough-display-name\\.js'), keep_prefix),\n",
    "    Rule('js/app.js', 'rough-display-name.js import key', qparam(r'\\./ui/rough-display-name\\.js'), keep_prefix),\n"
    "    Rule('js/app.js', 'time-remaining-label.js import key', qparam(r'\\./ui/time-remaining-label\\.js'), keep_prefix),\n",
)

# check-current.py: include the dedicated regression checker in the full audit.
replace_once(
    'scripts/check-current.py',
    "    ('原石表示ラベル', [sys.executable, str(ROOT / 'scripts/check-rough-display-name.py')]),\n",
    "    ('原石表示ラベル', [sys.executable, str(ROOT / 'scripts/check-rough-display-name.py')]),\n"
    "    ('残り時間表示ラベル', [sys.executable, str(ROOT / 'scripts/check-time-remaining-label.py')]),\n",
)

# CHANGELOG: one update, one purpose.
replace_once(
    'CHANGELOG.md',
    "## v0.10.868\n",
    """## v0.10.869
- 残り時間を「あと○時間○分」形式へ整える純粋な表示文字列変換だけを `js/ui/time-remaining-label.js` へ分離。
- 既存 `timeRemainingLabel()` は薄いラッパーとして残し、既存2か所の呼び出し位置と丸め・0未満クランプ・時間/分表示の既存規則を維持。
- ゲーム内時間・行動可否・日付・空腹度・セーブ・所持金・在庫・イベント・画像には変更なし。
- 新UI helperをService Workerと `version-sync.py` へ正式登録し、専用単体/統合検査を総合監査へ追加。

## v0.10.868
""",
)

print('STAGE21 PATCH APPLIED')
