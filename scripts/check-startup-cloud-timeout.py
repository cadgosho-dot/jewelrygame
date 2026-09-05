#!/usr/bin/env python3
from pathlib import Path
import re
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
APP = (ROOT / 'js/app.js').read_text(encoding='utf-8')
failures = []

def check(label, ok):
    print(('OK' if ok else 'NG') + ': ' + label)
    if not ok:
        failures.append(label)

boot_start = APP.find('async function boot() {')
boot = APP[boot_start:] if boot_start >= 0 else ''
indexed_pos = boot.find('indexedDbSave = await readIndexedDbSave(user.uid);')
claim_pos = boot.find('claimSession(user.uid, sessionId)')

check('startup timeout helper exists', 'function withStartupCloudTimeout(' in APP)
timeout_match = re.search(r'const STARTUP_CLOUD_TIMEOUT_MS = (\d+);', APP)
timeout_ms = int(timeout_match.group(1)) if timeout_match else 0
check('startup cloud timeout is bounded', 1000 <= timeout_ms <= 10000)
check('device IndexedDB save is read before cloud session claim', 0 <= indexed_pos < claim_pos)
check('session claim has timeout', "withStartupCloudTimeout(\n            claimSession(user.uid, sessionId)," in boot)
check('cloud save load has timeout', "withStartupCloudTimeout(\n            loadState(user.uid)," in boot)
check('timeout keeps existing local recovery warning path', '端末保存を優先して継続します。' in boot)
check('cloud load failure still falls back to device save', '端末セーブから復旧を試みます。' in boot)

result = subprocess.run(['node', '--check', str(ROOT / 'js/app.js')], cwd=ROOT, text=True, capture_output=True)
if result.returncode:
    print(result.stderr, end='')
    failures.append('app.js syntax')

if failures:
    print('STARTUP CLOUD TIMEOUT CHECK: FAIL')
    for failure in failures:
        print('- ' + failure)
    sys.exit(1)
print('STARTUP CLOUD TIMEOUT CHECK: PASS')
