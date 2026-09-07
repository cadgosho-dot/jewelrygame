#!/usr/bin/env python3
from pathlib import Path
import re

APP = Path('js/app.js').read_text(encoding='utf-8')
OUT = Path('stage47-audit.txt')

PROTECTED = {
    'settleDay','customerBuy','deliverOrder','confirmOrder','craft','buyMetal','sellMetal',
    'polishRough','finishMiningRock','purchaseLoose','sellLoose','sellRough','buyDisplayProduct',
    'buyJewelryShopItem','sellJewelryShopItem','buyWorkshopTool','repairWorkshopTool','rentNextStore',
    'processMonthlyFixedCosts','payOutstandingPayment','purchaseTropicalItem','expandStore','expandWorkshop',
    'upgradeStoreLevel','spendMinutes','removeJewelry','saveGame','loadGame','addArtisanXp',
    'buyTerryCaliforniaBenitoite','applyMysteryChineseMeal','maybeTriggerRobberyEvent',
    'startEmeraldCaptainKebabMeal','finishEmeraldCaptainKebabMeal'
}

DECL = re.compile(r'^(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(', re.M)


def extract(match):
    brace = APP.find('{', match.end())
    if brace < 0:
        return ''
    depth = 0
    quote = None
    escaped = False
    line_comment = False
    block_comment = False
    i = brace
    while i < len(APP):
        c = APP[i]
        n = APP[i + 1] if i + 1 < len(APP) else ''
        if line_comment:
            if c == '\n': line_comment = False
            i += 1; continue
        if block_comment:
            if c == '*' and n == '/': block_comment = False; i += 2; continue
            i += 1; continue
        if quote:
            if escaped: escaped = False
            elif c == '\\': escaped = True
            elif c == quote: quote = None
            i += 1; continue
        if c == '/' and n == '/': line_comment = True; i += 2; continue
        if c == '/' and n == '*': block_comment = True; i += 2; continue
        if c in "'\"`": quote = c; i += 1; continue
        if c == '{': depth += 1
        elif c == '}':
            depth -= 1
            if depth == 0:
                return APP[match.start():i + 1]
        i += 1
    return ''

signals = [
    ('state-write', re.compile(r'\bstate\.[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*\s*(?:\+\+|--|[+\-*/]?=(?!=))')),
    ('state-array', re.compile(r'\bstate\.[^\n;]{0,120}\.(?:push|splice|pop|shift|unshift)\s*\(')),
    ('money', re.compile(r'\bstate\.money\b')),
    ('save', re.compile(r'\bsaveGame\s*\(')),
    ('finance', re.compile(r'\b(?:recordFinance|addFinance|recordIncome|recordExpense)\s*\(')),
    ('time', re.compile(r'\bspendMinutes\s*\(')),
    ('notify', re.compile(r'\baddNotification\s*\(')),
    ('inventory', re.compile(r'\b(?:removeJewelry|addLoose|addRough|inventory|completedJewelry)\b')),
    ('event-stage', re.compile(r'\.stage\s*=')),
]

rows = []
functions = {}
for m in DECL.finditer(APP):
    name = m.group(1)
    body = extract(m)
    if not body:
        continue
    functions[name] = body
    counts = {label: len(rx.findall(body)) for label, rx in signals}
    score = counts['state-write'] * 8 + counts['state-array'] * 8 + counts['money'] * 5 + counts['save'] * 4 + counts['finance'] * 4 + counts['time'] * 3 + counts['notify'] * 2 + counts['inventory'] * 3 + counts['event-stage'] * 4
    if name in PROTECTED or score <= 0:
        continue
    rows.append((score, name, len(body), counts))
rows.sort(reverse=True)

lines = []
lines.append(f'FUNCTIONS={len(functions)} UNPROTECTED_MUTATION_CANDIDATES={len(rows)}')
lines.append('TOP CANDIDATES')
for score, name, size, counts in rows[:100]:
    nonzero = ', '.join(f'{k}={v}' for k,v in counts.items() if v)
    lines.append(f'{score:4d}  {name:45s} size={size:6d}  {nonzero}')

focus_names = [n for n in functions if any(key.lower() in n.lower() for key in ('EmeraldCaptain','Reward','Purchase','Event','Meal')) and n not in PROTECTED]
lines.append('\nFOCUS FUNCTION NAMES')
for name in sorted(focus_names):
    lines.append(name)

for name in sorted(set(focus_names + ['advanceEmeraldCaptainKebabEvent'])):
    body = functions.get(name)
    if not body:
        continue
    lines.append(f'\n===== {name} ({len(body)} chars) =====')
    lines.append(body[:12000])
    if len(body) > 12000:
        lines.append('\n...TRUNCATED...')

OUT.write_text('\n'.join(lines) + '\n', encoding='utf-8')
print('\n'.join(lines[:120]))
