from pathlib import Path
import re, sys
css = Path('styles.css').read_text(encoding='utf-8')
app = Path('js/app.js').read_text(encoding='utf-8')
html = Path('game.html').read_text(encoding='utf-8')
order_style_marker = '<style id="order-completion-portrait-safety-v947">'
order_style = html.split(order_style_marker, 1)[1].split('</style>', 1)[0] if order_style_marker in html else ''
normal_style_marker = '<style id="completion-safety-v731">'
normal_style = html.split(normal_style_marker, 1)[1].split('</style>', 1)[0] if normal_style_marker in html else ''
checks = [
    ('completion render class exists', 'completion-jewelry-preview' in app and 'completion-jewelry-artwork' in app),
    ('portrait completion rule exists', 'v0.10.663 完成画面' in css),
    ('scoped to completion screen', 'body[data-screen="completion"] .screen-shell:not(.event-shell-no-header) > .screen-content' in css),
    ('reserves both header bars', '--jwj-bar-one-height' in css.split('v0.10.663 完成画面',1)[1] and '--jwj-bar-two-height' in css.split('v0.10.663 完成画面',1)[1]),
    ('safe area included', 'env(safe-area-inset-top)' in css.split('v0.10.663 完成画面',1)[1]),
    ('fallback clearance >= 196px', 'max(196px' in css.split('v0.10.663 完成画面',1)[1]),
    ('landscape not targeted by new rule', '@media (orientation:portrait)' in css.split('v0.10.663 完成画面',1)[1]),
    ('completion artwork rules retained', '.completion-jewelry-artwork.item-pendant' in css and '.completion-jewelry-artwork.item-earrings' in css),
    ('order completion action retained', 'data-action="deliver-order-completion"' in app),
    ('order-only portrait safety style exists', bool(order_style)),
    ('order-only selector is scoped by delivery action', '.result-card:has([data-action="deliver-order-completion"]) > .completion-jewelry-preview' in order_style),
    ('order-only portrait safety stays portrait-only', '@media (orientation: portrait) and (max-width: 820px)' in order_style),
    ('order-only top clearance is 48px', 'padding-top: 48px !important;' in order_style),
    ('order ring has extra 60px top clearance', '.completion-jewelry-preview.item-ring' in order_style and 'padding-top: 60px !important;' in order_style),
    ('order ring with loose has 76px top clearance', '.completion-jewelry-preview.item-ring:has(.jewelry-preview-loose)' in order_style and 'padding-top: 76px !important;' in order_style),
    ('normal completion safety remains unchanged', 'padding: 10px 0 0 !important;' in normal_style),
    ('portrait ring completion has 48px top clearance', 'body[data-screen="completion"] .result-card>.completion-jewelry-preview.item-ring{' in css and 'padding-top:48px!important;' in css),
    ('portrait ring completion allows full artwork overflow', 'body[data-screen="completion"] .result-card>.completion-jewelry-preview.item-ring{' in css and 'overflow:visible!important;' in css),
    ('portrait ring with loose has extra 64px top clearance', '.completion-jewelry-preview.item-ring:has(.jewelry-preview-loose)' in css and 'padding-top:64px!important;' in css),
]
failed=[]
for name, ok in checks:
    print(('PASS' if ok else 'FAIL'), name)
    if not ok: failed.append(name)
if failed:
    sys.exit(1)
print('COMPLETION PORTRAIT HEADER CLEARANCE AUDIT: PASS')
