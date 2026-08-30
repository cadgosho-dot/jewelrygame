from pathlib import Path
import contextlib
import http.server
import socketserver
import threading
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
IMAGES = [
  'piercing-saw.png','nipper.png','electronic-scale.png','wood-block.png','dividers.png','milgrain-tool.png',
  'rolling-mill.png','file.png','pliers.png','torch.png','hammer.png','magnifier.png','bench-peg.png','graver.png',
  'engraving-block.png','stamps.png','rotary-tool.png','buffer.png','ultrasonic-cleaner.png',
]

class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass

with contextlib.ExitStack() as stack:
    handler = lambda *args, **kwargs: QuietHandler(*args, directory=str(ROOT), **kwargs)
    server = socketserver.TCPServer(('127.0.0.1', 0), handler)
    stack.callback(server.server_close)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    stack.callback(server.shutdown)
    port = server.server_address[1]

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, executable_path='/usr/bin/chromium', args=['--no-sandbox'])
        page = browser.new_page(viewport={'width': 390, 'height': 844})
        html = '<!doctype html><meta charset="utf-8"><style>body{display:grid;grid-template-columns:repeat(3,1fr)}img{width:100px;height:100px;object-fit:contain}</style>' + ''.join(
            f'<img data-name="{name}" src="http://127.0.0.1:{port}/assets/images/tools/{name}?v=0.10.491">' for name in IMAGES
        )
        page.set_content(html, wait_until='load')
        page.wait_for_function("Array.from(document.images).every(img => img.complete)")
        results = page.eval_on_selector_all('img', "els => els.map(img => ({name:img.dataset.name, complete:img.complete, naturalWidth:img.naturalWidth, naturalHeight:img.naturalHeight}))")
        browser.close()

failed = [item for item in results if not item['complete'] or item['naturalWidth'] <= 0 or item['naturalHeight'] <= 0]
if failed:
    for item in failed:
        print('NG', item)
    raise SystemExit(f'工具画像ブラウザ読込失敗: {len(failed)}点')
print(f'v0.10.491 工具画像ブラウザ読込検査: OK（{len(results)}/{len(IMAGES)}点）')
print('- HTTP取得後、全画像のnaturalWidth・naturalHeightが1以上')
print('- v0.10.491のクエリ付きURLで画像デコード成功')
