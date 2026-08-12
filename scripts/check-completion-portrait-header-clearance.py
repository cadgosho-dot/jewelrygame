from pathlib import Path
import re, sys
css = Path('styles.css').read_text(encoding='utf-8')
app = Path('js/app.js').read_text(encoding='utf-8')
checks = [
    ('completion render class exists', 'completion-jewelry-preview' in app and 'completion-jewelry-artwork' in app),
    ('portrait completion rule exists', 'v0.10.663 完成画面' in css),
    ('scoped to completion screen', 'body[data-screen="completion"] .screen-shell:not(.event-shell-no-header) > .screen-content' in css),
    ('reserves both header bars', '--jwj-bar-one-height' in css.split('v0.10.663 完成画面',1)[1] and '--jwj-bar-two-height' in css.split('v0.10.663 完成画面',1)[1]),
    ('safe area included', 'env(safe-area-inset-top)' in css.split('v0.10.663 完成画面',1)[1]),
    ('fallback clearance >= 196px', 'max(196px' in css.split('v0.10.663 完成画面',1)[1]),
    ('landscape not targeted by new rule', '@media (orientation:portrait)' in css.split('v0.10.663 完成画面',1)[1]),
    ('completion artwork rules retained', '.completion-jewelry-artwork.item-pendant' in css and '.completion-jewelry-artwork.item-earrings' in css),
]
failed=[]
for name, ok in checks:
    print(('PASS' if ok else 'FAIL'), name)
    if not ok: failed.append(name)
if failed:
    sys.exit(1)
print('COMPLETION PORTRAIT HEADER CLEARANCE AUDIT: PASS')
