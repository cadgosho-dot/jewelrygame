#!/usr/bin/env python3
"""Guard against duplicate lifecycle save handlers and saveRevision inflation."""
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
text = (ROOT / 'js/app.js').read_text(encoding='utf-8')
errors = []

expected_counts = {
    "window.addEventListener('beforeunload'": 1,
    "window.addEventListener('pagehide'": 1,
    "document.addEventListener('visibilitychange'": 1,
    "window.addEventListener('freeze'": 1,
}
for token, expected in expected_counts.items():
    actual = text.count(token)
    if actual != expected:
        errors.append(f'{token} が {actual} 件あります（期待 {expected} 件）。')

required = [
    "let lastLifecycleLocalFingerprint = '';",
    "if (fingerprint && fingerprint === lastLifecycleLocalFingerprint) return;",
    "if (result.saved) lastLifecycleLocalFingerprint = fingerprint;",
    "if (localResult.saved && fingerprint) lastLifecycleLocalFingerprint = fingerprint;",
    "processAutopilotIfDue().catch((error) => console.error(error));",
    "window.addEventListener('pagehide', () => flushAutosaveLocally('pagehide')",
    "window.addEventListener('beforeunload', () => flushAutosaveLocally('beforeunload')",
]
for token in required:
    if token not in text:
        errors.append(f'終了時保存の一本化ロジックが不足しています: {token}')

# A lifecycle listener must not bypass the de-duplicating wrapper.
for match in re.finditer(r"(?:window|document)\.addEventListener\('(beforeunload|pagehide|visibilitychange|freeze)'[\s\S]{0,220}?saveLocalBackup\(", text):
    errors.append(f'{match.group(1)} が saveLocalBackup() を直接呼んでいます。')

if errors:
    print('LIFECYCLE SAVE POLICY: FAIL')
    for error in errors:
        print(f'- {error}')
    sys.exit(1)
print('LIFECYCLE SAVE POLICY: PASS')
print('終了・非表示イベントは単一経路を使い、同一状態の重複保存を抑止します。')
