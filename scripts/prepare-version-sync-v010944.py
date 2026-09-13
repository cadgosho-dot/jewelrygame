#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
path = ROOT / 'scripts/version-sync.py'
text = path.read_text(encoding='utf-8')
anchor = "    Rule('js/app.js', 'game-data.js import key', qparam(r'\\./game-data\\.js'), keep_prefix),\n"
insert = anchor + """    Rule('js/memories-backgrounds.js', 'event-bootstrap.js import key', qparam(r'\\./event-bootstrap\\.js'), keep_prefix),
    Rule('js/event-bootstrap.js', 'wolf-boy-ring-event.js import key', qparam(r'\\./wolf-boy-ring-event\\.js'), keep_prefix),
    Rule('js/event-bootstrap.js', 'wolf-mother-butler-event.js import key', qparam(r'\\./wolf-mother-butler-event\\.js'), keep_prefix),
    Rule('js/wolf-boy-ring-event.js', 'audio.js import key', qparam(r'\\./audio\\.js'), keep_prefix),
    Rule('js/wolf-mother-butler-event.js', 'audio.js import key', qparam(r'\\./audio\\.js'), keep_prefix),
"""
if text.count(anchor) != 1:
    raise SystemExit(f'FAIL version-sync existing event rules anchor: {text.count(anchor)}')
path.write_text(text.replace(anchor, insert, 1), encoding='utf-8')
print('VERSION SYNC EVENT RULES: PASS')
