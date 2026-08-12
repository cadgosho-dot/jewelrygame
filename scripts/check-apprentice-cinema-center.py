from pathlib import Path

root = Path(__file__).resolve().parents[1]
app = (root / 'js/app.js').read_text(encoding='utf-8')
css = (root / 'styles.css').read_text(encoding='utf-8')
html = (root / 'game.html').read_text(encoding='utf-8')

checks = {
    'weekend condition is Saturday/Sunday only': 'return day === 0 || day === 6;' in app,
    'apprentice playback screen has dedicated centered layout': 'body[data-screen="apprenticeCinemaEvent"] .apprentice-cinema-event-screen.cinema-playing-screen' in css,
    'playback screen uses grid': 'display:grid!important;' in css,
    'playback screen centers stage': 'place-items:center!important;' in css,
    'apprentice video stays centered': 'video[data-apprentice-cinema-video]' in css and 'object-position:center center!important;' in css,
    'event videos keep contain mode': 'video[data-apprentice-cinema-video]' in html and 'object-fit: contain !important;' in html,
}
failed = [name for name, ok in checks.items() if not ok]
if failed:
    for name in failed:
        print(f'FAIL {name}')
    raise SystemExit(1)
for name in checks:
    print(f'PASS {name}')
print('APPRENTICE CINEMA CENTER AUDIT: PASS')
