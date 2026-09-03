#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
path = ROOT / 'scripts/version-sync.py'
text = path.read_text(encoding='utf-8')

sw_rule = "    Rule('sw.js', 'lazy-modules.js precache key', qparam(r'\\./js/runtime/lazy-modules\\.js'), keep_prefix),\n"
sw_extra = "    Rule('sw.js', 'finished-video-cache-warm.js precache key', qparam(r'\\./js/runtime/finished-video-cache-warm\\.js'), keep_prefix),\n"
if sw_extra not in text:
    if text.count(sw_rule) != 1:
        raise SystemExit('version-sync.py: sw lazy-module rule marker mismatch')
    text = text.replace(sw_rule, sw_rule + sw_extra, 1)

app_rule = "    Rule('js/app.js', 'lazy-modules.js import key', qparam(r'\\./runtime/lazy-modules\\.js'), keep_prefix),\n"
app_extra = "    Rule('js/app.js', 'finished-video-cache-warm.js import key', qparam(r'\\./runtime/finished-video-cache-warm\\.js'), keep_prefix),\n"
if app_extra not in text:
    if text.count(app_rule) != 1:
        raise SystemExit('version-sync.py: app lazy-module rule marker mismatch')
    text = text.replace(app_rule, app_rule + app_extra, 1)

path.write_text(text, encoding='utf-8')
print('VERSION SYNC RULE FIX: PASS')
