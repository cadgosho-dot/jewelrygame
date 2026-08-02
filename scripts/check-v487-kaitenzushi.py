from __future__ import annotations
from pathlib import Path
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
import contextlib
import os
import threading
from playwright.sync_api import sync_playwright

root = Path(__file__).resolve().parents[1]
harness = root / '__kaitenzushi_v487_test.html'
harness.write_text('''<!doctype html><html lang="ja"><meta charset="utf-8"><body data-ready="0">
<script>
let readyCount=0;
window.addEventListener('message',(event)=>{
  if(event.data?.source==='jxj-kaitenzushi' && event.data?.type==='ready'){
    readyCount+=1; document.body.dataset.ready=String(readyCount);
  }
});
async function installSW(){
  const reg=await navigator.serviceWorker.register('./sw.js');
  await navigator.serviceWorker.ready;
  return Boolean(navigator.serviceWorker.controller || reg.active);
}
function loadGame(token){
  document.querySelector('iframe')?.remove();
  const frame=document.createElement('iframe');
  frame.id='game';
  frame.src=`./assets/minigames/kaitenzushi/game/index.html?v=0.10.487&attempt=${token}#embedded=1&budget=10000&bgmMuted=1&ambientMuted=1`;
  document.body.append(frame);
}
</script></body></html>''', encoding='utf-8')

class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, fmt, *args):
        pass

old_cwd = os.getcwd()
os.chdir(root)
server = ThreadingHTTPServer(('127.0.0.1', 0), QuietHandler)
thread = threading.Thread(target=server.serve_forever, daemon=True)
thread.start()
base = f'http://127.0.0.1:{server.server_address[1]}'

try:
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, executable_path='/usr/bin/chromium', args=['--no-sandbox'])
        context = browser.new_context()
        page = context.new_page()
        page.goto(f'{base}/{harness.name}', wait_until='domcontentloaded')
        assert page.evaluate('installSW()') is True
        page.evaluate("loadGame('online')")
        page.wait_for_function("document.body.dataset.ready === '1'", timeout=15000)
        marker = page.locator('#game').evaluate("frame => frame.contentDocument?.documentElement?.dataset?.jxjKaitenzushi")
        assert marker == '1', f'識別マーカーが不正です: {marker}'

        context.set_offline(True)
        page.evaluate("loadGame('offline')")
        page.wait_for_function("document.body.dataset.ready === '2'", timeout=15000)
        marker_offline = page.locator('#game').evaluate("frame => frame.contentDocument?.documentElement?.dataset?.jxjKaitenzushi")
        assert marker_offline == '1', f'オフライン再読込でメイン画面へ誤遷移しました: {marker_offline}'
        context.set_offline(False)
        browser.close()
finally:
    server.shutdown()
    server.server_close()
    os.chdir(old_cwd)
    with contextlib.suppress(FileNotFoundError):
        harness.unlink()

print('v0.10.487 回転寿司遷移検査: OK')
print('- オンラインで回転寿司文書を読み込み、ready通知を受信')
print('- オフライン再読込でもキャッシュされた回転寿司文書を返し、メイン画面へフォールバックしない')
