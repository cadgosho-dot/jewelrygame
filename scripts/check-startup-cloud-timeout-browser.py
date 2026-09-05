#!/usr/bin/env python3
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
