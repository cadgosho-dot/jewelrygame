from pathlib import Path
import sys

app_js = Path(__file__).resolve().parents[1] / 'js' / 'app.js'
text = app_js.read_text(encoding='utf-8')
checks = [
    ("showcase slot uses showcaseSmall", "renderShowcaseSlot(slot, showcaseIndex, slotIndex, branch)"),
    ("showcaseSmall mode exists", "const isShowcaseSmall = mode === 'showcaseSmall';"),
    ("showcase selection uses showcaseSmall", "jewelryLooseSetVisual(item.item, item.gem, item.looseShape, 'showcaseSmall')"),
    ("showcase detail uses completion preview", 'showcase-detail-visual jewelry-preview large completion-jewelry-preview'),
    ("showcase detail uses completion artwork", 'completion-jewelry-artwork item-${item.item}'),
    ("showcase detail loose uses completion mode", "jewelryLooseSetVisual(item.item, item.gem, item.looseShape, 'completion')"),
]
failed = []
for label, needle in checks:
    if needle not in text:
        failed.append(label)
if failed:
    print('FAIL showcase jewelry visual audit')
    for item in failed:
        print('MISSING', item)
    sys.exit(1)
print('PASS showcase jewelry visual audit')
