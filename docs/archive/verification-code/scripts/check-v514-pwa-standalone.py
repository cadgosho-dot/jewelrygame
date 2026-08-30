from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[1]
manifest = json.loads((ROOT / 'manifest.webmanifest').read_text(encoding='utf-8'))
shell = (ROOT / 'viewport-shell.js').read_text(encoding='utf-8')
index = (ROOT / 'index.html').read_text(encoding='utf-8')
app = (ROOT / 'js/app.js').read_text(encoding='utf-8')

assert manifest.get('start_url') == './game.html?source=pwa'
assert "if (isStandalone())" in shell
assert "window.location.replace(directUrl.href)" in shell
assert "directUrl.searchParams.set('source', 'pwa')" in shell
assert "google-login" in shell
assert './game.html?v=0.10.514' in index
assert "window.parent && window.parent !== window" in app
print('PWA standalone direct-launch static check: OK')
