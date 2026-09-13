#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
path = ROOT / 'scripts/version-sync.py'
text = path.read_text(encoding='utf-8')
anchor = "    Rule('js/memories-screen.js', 'memories VERSION', quoted_constant('VERSION'), keep_quote),\n"
rules = (
    "    Rule('js/event-bootstrap.js', 'wolf-boy event import key', qparam(r'\\./wolf-boy-ring-event\\.js'), keep_prefix),\n"
    "    Rule('js/event-bootstrap.js', 'wolf-mother event import key', qparam(r'\\./wolf-mother-butler-event\\.js'), keep_prefix),\n"
    "    Rule('js/memories-backgrounds.js', 'event-bootstrap import key', qparam(r'\\./event-bootstrap\\.js'), keep_prefix),\n"
    "    Rule('js/wolf-boy-ring-event.js', 'audio import key', qparam(r'\\./audio\\.js'), keep_prefix),\n"
    "    Rule('js/wolf-mother-butler-event.js', 'audio import key', qparam(r'\\./audio\\.js'), keep_prefix),\n"
)
if rules not in text:
    if text.count(anchor) != 1:
        raise SystemExit(f'version-sync event anchor mismatch: {text.count(anchor)}')
    text = text.replace(anchor, anchor + rules, 1)
    path.write_text(text, encoding='utf-8')
print('VERSION SYNC EVENT RULES: PASS')
