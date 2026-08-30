from __future__ import annotations
from pathlib import Path
import html
import json
import re
from playwright.sync_api import sync_playwright, expect

root = Path(__file__).resolve().parents[1]
module_text = (root / 'js/kaitenzushi-embedded.js').read_text(encoding='utf-8')
match = re.search(r'export const KAITENZUSHI_EMBEDDED_HTML = (.*);\n?$', module_text, re.S)
if not match:
    raise SystemExit('埋め込み回転寿司文書を読み取れません')
template = json.loads(match.group(1))

config = (
    'embedded=1&budget=100000&free=0&bgmVolume=0&sfxVolume=1&ambientVolume=0'
    '&bgmMuted=1&sfxMuted=0&ambientMuted=1&externalAudioPriority=0'
)
config_attr = (config.replace('&', '&amp;').replace('"', '&quot;')
               .replace('<', '&lt;').replace('>', '&gt;'))
srcdoc = template.replace('__JXJ_CONFIG__', config_attr).replace('__JXJ_ATTEMPT__', 'test')

csp = (
    "default-src 'self'; base-uri 'self'; object-src 'none'; "
    "script-src 'self' 'nonce-jxj-kaitenzushi'; style-src 'self' 'unsafe-inline'; "
    "img-src 'self' data: blob:; media-src 'self' blob:; frame-src 'self'; child-src 'self' blob:"
)

def harness(width: int, height: int) -> str:
    return f'''<!doctype html><html><head>
<meta http-equiv="Content-Security-Policy" content="{csp}">
</head><body data-ready="0" data-checkout="0">
<script nonce="jxj-kaitenzushi">
window.addEventListener('message',event=>{{
  if(event.data?.source!=='jxj-kaitenzushi') return;
  if(event.data.type==='ready') document.body.dataset.ready=String(Number(document.body.dataset.ready)+1);
  if(event.data.type==='checkout') document.body.dataset.checkout='1';
}});
</script>
<iframe id="game" style="border:0;width:{width}px;height:{height}px" srcdoc="{html.escape(srcdoc, quote=True)}"></iframe>
</body></html>'''

viewports = [(390, 844), (844, 390)]
with sync_playwright() as p:
    browser = p.chromium.launch(
        headless=True,
        executable_path='/usr/bin/chromium',
        args=['--no-sandbox', '--autoplay-policy=no-user-gesture-required'],
    )
    for width, height in viewports:
        page = browser.new_page(viewport={'width': width + 30, 'height': height + 30})
        errors: list[str] = []
        page.on('console', lambda message: errors.append(message.text) if message.type == 'error' else None)
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.set_content(harness(width, height), wait_until='load')
        expect(page.locator("body")).not_to_have_attribute("data-ready", "0", timeout=10000)
        frame = page.frames[1]
        assert frame.evaluate("document.documentElement.dataset.jxjKaitenzushi") == '1'
        assert frame.locator('#startScreen').evaluate("element => getComputedStyle(element).display") == 'none'
        assert frame.locator('#checkoutButton').evaluate("element => getComputedStyle(element).display") == 'block'
        assert frame.locator('#belt > *').count() > 0
        csp_errors = [error for error in errors if 'Content Security Policy' in error]
        assert not csp_errors, csp_errors
        frame.locator('#checkoutButton').click()
        expect(page.locator("body")).to_have_attribute("data-checkout", "1", timeout=3000)
        page.close()
    browser.close()

print('v0.10.491 回転寿司srcdoc起動検査: OK（縦横2サイズ）')
print('- 別ページへ遷移せず、親ゲーム内の埋め込み文書として起動')
print('- CSP nonce下で起動完了通知を受信')
print('- 自動ゲーム開始、寿司出現、お会計通知を確認')
