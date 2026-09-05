#!/usr/bin/env python3
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[1]
APP_PATH = ROOT / 'js/app.js'
APP = APP_PATH.read_text(encoding='utf-8')

helper_anchor = '\nasync function boot() {\n'
helper = r'''
// v0.10.891: 起動中のクラウド確認が応答待ちのままでも、正常な端末セーブを使って継続できるようにする。
// Firebase自体は無効化せず、起動時の補助的なクラウド待機だけに上限時間を設ける。
const STARTUP_CLOUD_TIMEOUT_MS = 4000;

function startupCloudTimeoutError(label) {
  const error = new Error(`${label}が${Math.round(STARTUP_CLOUD_TIMEOUT_MS / 1000)}秒以内に完了しませんでした。端末保存を優先して継続します。`);
  error.code = 'jxj/startup-cloud-timeout';
  return error;
}

function withStartupCloudTimeout(promise, label, timeoutMs = STARTUP_CLOUD_TIMEOUT_MS) {
  let timerId = null;
  const waitMs = Math.max(1, Number(timeoutMs) || STARTUP_CLOUD_TIMEOUT_MS);
  const timeout = new Promise((_, reject) => {
    timerId = window.setTimeout(() => reject(startupCloudTimeoutError(label)), waitMs);
  });
  return Promise.race([Promise.resolve(promise), timeout]).finally(() => {
    if (timerId !== null) window.clearTimeout(timerId);
  });
}
'''
if 'function withStartupCloudTimeout(' not in APP:
    if helper_anchor not in APP:
        raise SystemExit('boot() insertion anchor not found')
    APP = APP.replace(helper_anchor, '\n' + helper + helper_anchor, 1)

claim_block = '''        try {
          await claimSession(user.uid, sessionId);
          sessionClaimed = true;
        } catch (error) {
          sessionClaimed = false;
          console.warn('セッション取得のクラウド確認に失敗しました。端末保存を優先して継続します。', error);
        }
'''
indexed_block = '''        try {
          indexedDbSave = await readIndexedDbSave(user.uid);
          indexedDbStorageReady = true;
        } catch (error) {
          indexedDbSave = null;
          indexedDbStorageReady = false;
          console.warn('IndexedDBの端末セーブを読み込めませんでした。旧localStorage／クラウドから継続します。', error);
        }
'''
combined = claim_block + indexed_block
replacement = indexed_block + '''        try {
          await withStartupCloudTimeout(
            claimSession(user.uid, sessionId),
            'クラウドセッション確認',
          );
          sessionClaimed = true;
        } catch (error) {
          sessionClaimed = false;
          console.warn('セッション取得のクラウド確認に失敗しました。端末保存を優先して継続します。', error);
        }
'''
if combined in APP:
    APP = APP.replace(combined, replacement, 1)
elif "await withStartupCloudTimeout(\n            claimSession(user.uid, sessionId)," not in APP:
    raise SystemExit('claim/indexedDB startup block not found')

old_cloud = '          cloudSave = await loadState(user.uid);\n'
new_cloud = '''          cloudSave = await withStartupCloudTimeout(
            loadState(user.uid),
            'クラウドセーブ読み込み',
          );
'''
if old_cloud in APP:
    APP = APP.replace(old_cloud, new_cloud, 1)
elif new_cloud not in APP:
    raise SystemExit('cloud load startup line not found')

APP_PATH.write_text(APP, encoding='utf-8')
subprocess.run(['python3', 'scripts/version-sync.py', '--set', '0.10.891'], cwd=ROOT, check=True)

check_static = r'''#!/usr/bin/env python3
from pathlib import Path
import re
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
APP = (ROOT / 'js/app.js').read_text(encoding='utf-8')
failures = []

def check(label, ok):
    print(('OK' if ok else 'NG') + ': ' + label)
    if not ok:
        failures.append(label)

boot_start = APP.find('async function boot() {')
boot = APP[boot_start:] if boot_start >= 0 else ''
indexed_pos = boot.find('indexedDbSave = await readIndexedDbSave(user.uid);')
claim_pos = boot.find('claimSession(user.uid, sessionId)')

check('startup timeout helper exists', 'function withStartupCloudTimeout(' in APP)
timeout_match = re.search(r'const STARTUP_CLOUD_TIMEOUT_MS = (\d+);', APP)
timeout_ms = int(timeout_match.group(1)) if timeout_match else 0
check('startup cloud timeout is bounded', 1000 <= timeout_ms <= 10000)
check('device IndexedDB save is read before cloud session claim', 0 <= indexed_pos < claim_pos)
check('session claim has timeout', "withStartupCloudTimeout(\n            claimSession(user.uid, sessionId)," in boot)
check('cloud save load has timeout', "withStartupCloudTimeout(\n            loadState(user.uid)," in boot)
check('timeout keeps existing local recovery warning path', '端末保存を優先して継続します。' in boot)
check('cloud load failure still falls back to device save', '端末セーブから復旧を試みます。' in boot)

result = subprocess.run(['node', '--check', str(ROOT / 'js/app.js')], cwd=ROOT, text=True, capture_output=True)
if result.returncode:
    print(result.stderr, end='')
    failures.append('app.js syntax')

if failures:
    print('STARTUP CLOUD TIMEOUT CHECK: FAIL')
    for failure in failures:
        print('- ' + failure)
    sys.exit(1)
print('STARTUP CLOUD TIMEOUT CHECK: PASS')
'''
(ROOT / 'scripts/check-startup-cloud-timeout.py').write_text(check_static, encoding='utf-8')

check_browser = r'''#!/usr/bin/env python3
"""Verify that a valid device save can start even when Firestore never answers."""
from __future__ import annotations
import contextlib
import http.server
import json
from pathlib import Path
import socket
import sys
import threading

ROOT = Path(__file__).resolve().parents[1]
SAVE_KEY = 'jewelrygame-clean-v0.4.0'
TEST_UID = 'startup-timeout-user'

def free_port():
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.bind(('127.0.0.1', 0))
        return int(sock.getsockname()[1])

class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, fmt, *args):
        return

def handler_factory(*args, **kwargs):
    return QuietHandler(*args, directory=str(ROOT), **kwargs)

FIREBASE_STUBS = {
    'firebase-app.js': "export function initializeApp(config){return {config};}",
    'firebase-app-check.js': "export function initializeAppCheck(){return {}}; export class ReCaptchaEnterpriseProvider{constructor(key){this.key=key;}}",
    'firebase-auth.js': f"""
      const USER={{uid:{json.dumps(TEST_UID)},displayName:'Timeout Test',email:'timeout@example.test',emailVerified:true,providerData:[]}};
      export const indexedDBLocalPersistence={{}}, browserLocalPersistence={{}}, browserSessionPersistence={{}}, browserPopupRedirectResolver={{}};
      export function initializeAuth(){{return {{currentUser:USER,authStateReady:async()=>{{}},languageCode:'ja'}};}}
      export class GoogleAuthProvider{{static credential(){{return {{}};}} addScope(){{}} setCustomParameters(){{}}}}
      export class EmailAuthProvider{{static credential(){{return {{}};}}}}
      export function onAuthStateChanged(_a,cb){{queueMicrotask(()=>cb(USER));return()=>{{}};}}
      export async function signInWithCredential(){{return {{user:USER}};}}
      export async function signInWithEmailAndPassword(){{return {{user:USER}};}}
      export async function createUserWithEmailAndPassword(){{return {{user:USER}};}}
      export async function sendEmailVerification(){{}} export async function sendPasswordResetEmail(){{}}
      export async function reauthenticateWithPopup(){{}} export async function reauthenticateWithCredential(){{}}
      export async function deleteUser(){{}} export async function reload(){{}} export async function signOut(){{}}
    """,
    'firebase-firestore.js': """
      export function getFirestore(){return {};}
      export function collection(){return {};}; export function query(){return {};}; export function where(){return {};}; export function limit(){return {};}
      export async function getDocs(){return new Promise(()=>{});}; export function doc(){return {};}; export async function getDoc(){return new Promise(()=>{});}
      export async function setDoc(){return new Promise(()=>{});}; export async function updateDoc(){return new Promise(()=>{});}; export async function deleteDoc(){};
      export function onSnapshot(){return()=>{};}; export async function runTransaction(){return new Promise(()=>{});}
      export function serverTimestamp(){return new Date().toISOString();}
    """,
}

def route_firebase(route):
    name = route.request.url.rsplit('/', 1)[-1].split('?', 1)[0]
    body = FIREBASE_STUBS.get(name)
    if body is None:
        route.abort()
    else:
        route.fulfill(status=200, content_type='application/javascript; charset=utf-8', body=body)

def main():
    try:
        from playwright.sync_api import sync_playwright
    except Exception as exc:
        print('STARTUP CLOUD TIMEOUT BROWSER: FAIL')
        print(f'- Playwrightを読み込めません: {exc}')
        return 1

    port = free_port()
    server = http.server.ThreadingHTTPServer(('127.0.0.1', port), handler_factory)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    browser = None
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            base = f'http://127.0.0.1:{port}'

            seed_context = browser.new_context(viewport={'width': 1280, 'height': 720}, service_workers='block')
            seed_context.route('https://www.gstatic.com/firebasejs/**', route_firebase)
            seed_page = seed_context.new_page()
            seed_page.goto(f'{base}/game.html?preview=1', wait_until='domcontentloaded', timeout=45000)
            seed_page.locator('[data-action="start"]').wait_for(state='visible', timeout=15000)
            seed_page.locator('[data-action="start"]').click()
            seed_page.locator('#player-name-setup').fill('Timeout Recovery')
            seed_page.locator('[data-setup-birthday-month]').select_option('4')
            seed_page.locator('[data-setup-birthday-day]').select_option('1')
            seed_page.locator('[data-action="confirm-player-name"]').click()
            seed_page.locator('body[data-screen="main"]').wait_for(state='attached', timeout=15000)
            raw = seed_page.evaluate(f"localStorage.getItem('{SAVE_KEY}-preview-user')")
            if not raw:
                raise RuntimeError('preview seed save was not created')
            seed_context.close()

            context = browser.new_context(viewport={'width': 1280, 'height': 720}, service_workers='block')
            context.route('https://www.gstatic.com/firebasejs/**', route_firebase)
            device_key = f'{SAVE_KEY}-{TEST_UID}'
            context.add_init_script(script=f"localStorage.setItem({json.dumps(device_key)}, {json.dumps(raw)});")
            page = context.new_page()
            page_errors = []
            page.on('pageerror', lambda exc: page_errors.append(str(exc)))
            page.goto(f'{base}/game.html', wait_until='domcontentloaded', timeout=45000)
            start = page.locator('[data-action="start"]')
            start.wait_for(state='visible', timeout=15000)
            page.wait_for_function("() => !document.querySelector('[data-action=\"start\"]').disabled", timeout=15000)
            if 'セーブ確認中' in start.inner_text():
                raise RuntimeError('start button stayed in save-checking state')
            start.click()
            page.locator('body[data-screen="main"]').wait_for(state='attached', timeout=15000)
            if page_errors:
                raise RuntimeError('browser exception: ' + ' / '.join(page_errors))
            context.close()
            browser.close()
            browser = None
    except Exception as exc:
        print('STARTUP CLOUD TIMEOUT BROWSER: FAIL')
        print('- ' + str(exc))
        return 1
    finally:
        with contextlib.suppress(Exception):
            if browser is not None:
                browser.close()
        server.shutdown()
        server.server_close()
        thread.join(timeout=2)
    print('STARTUP CLOUD TIMEOUT BROWSER: PASS')
    print('Firestore無応答でも正常な端末セーブからタイトルを解放し、続きからメイン画面へ入れることを確認しました。')
    return 0

if __name__ == '__main__':
    sys.exit(main())
'''
(ROOT / 'scripts/check-startup-cloud-timeout-browser.py').write_text(check_browser, encoding='utf-8')

check_current = ROOT / 'scripts/check-current.py'
text = check_current.read_text(encoding='utf-8')
anchor = "    ('起動診断', [sys.executable, str(ROOT / 'scripts/check-startup-diagnostics.py')]),\n"
addition = anchor + "    ('起動クラウド無応答復旧', [sys.executable, str(ROOT / 'scripts/check-startup-cloud-timeout.py')]),\n    ('起動クラウド無応答・実ブラウザ', [sys.executable, str(ROOT / 'scripts/check-startup-cloud-timeout-browser.py')]),\n"
if 'check-startup-cloud-timeout.py' not in text:
    if anchor not in text:
        raise SystemExit('check-current startup anchor not found')
    text = text.replace(anchor, addition, 1)
    check_current.write_text(text, encoding='utf-8')

changelog = ROOT / 'CHANGELOG.md'
text = changelog.read_text(encoding='utf-8')
if '## v0.10.891' not in text:
    marker = '## v0.10.890\n'
    section = '''## v0.10.891
- 起動時にクラウドのセッション確認やクラウドセーブ読み込みが応答待ちのまま停止しても、正常な端末セーブから継続できるように修正。
- IndexedDBの端末セーブ確認をクラウドセッション取得より先に実行し、起動時のクラウド待機に4秒の上限を設定。
- Firebase認証・クラウドセーブ機能・セーブ形式は維持し、タイムアウト時だけ既存の端末セーブ復旧経路へフォールバックする。
- Firestoreが無応答でも端末セーブから「続きから」でメイン画面へ入れる実ブラウザ回帰テストを追加。

'''
    if marker not in text:
        raise SystemExit('CHANGELOG insertion marker not found')
    text = text.replace(marker, section + marker, 1)
    changelog.write_text(text, encoding='utf-8')

print('temporary startup repair applied')
