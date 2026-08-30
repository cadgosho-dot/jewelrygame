#!/usr/bin/env python3
"""Real-browser smoke test for core JEWELRY×JEWELRY flows.

Runs when Playwright + its Chromium bundle are available. In CI set
JXJ_REQUIRE_BROWSER_SMOKE=1 so missing browser support is a hard failure.
"""
from __future__ import annotations

import contextlib
import http.server
import json
import os
import re
from pathlib import Path
import socket
import sys
import threading
import time

ROOT = Path(__file__).resolve().parents[1]
REQUIRE = os.environ.get('JXJ_REQUIRE_BROWSER_SMOKE') == '1'
SAVE_KEY = 'jewelrygame-clean-v0.4.0-preview-user'


def skip_or_fail(message: str) -> int:
    label = 'BROWSER SMOKE: FAIL' if REQUIRE else 'BROWSER SMOKE: SKIP'
    print(label)
    print(f'- {message}')
    return 1 if REQUIRE else 0


def free_port() -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.bind(('127.0.0.1', 0))
        return int(sock.getsockname()[1])


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, fmt: str, *args) -> None:
        return


def handler_factory(*args, **kwargs):
    return QuietHandler(*args, directory=str(ROOT), **kwargs)


def main() -> int:
    workflow = (ROOT / '.github/workflows/update-metals.yml').read_text(encoding='utf-8')
    contract_errors = []
    if 'python3 -m playwright install --with-deps chromium' not in workflow:
        contract_errors.append('GitHub ActionsでPlaywright Chromiumを導入する処理がありません。')
    if "JXJ_REQUIRE_BROWSER_SMOKE: '1'" not in workflow:
        contract_errors.append('GitHub Actionsで実ブラウザ検査を必須化していません。')
    if contract_errors:
        print('BROWSER SMOKE: FAIL')
        for error in contract_errors:
            print(f'- {error}')
        return 1

    try:
        from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeoutError
    except Exception as exc:
        return skip_or_fail(f'Playwrightを読み込めません: {exc}')

    port = free_port()
    server = http.server.ThreadingHTTPServer(('127.0.0.1', port), handler_factory)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()

    errors: list[str] = []
    browser = None
    try:
        with sync_playwright() as p:
            try:
                launch_kwargs = {'headless': True}
                executable = os.environ.get('JXJ_BROWSER_EXECUTABLE', '').strip()
                if executable:
                    launch_kwargs['executable_path'] = executable
                    launch_kwargs['args'] = ['--no-sandbox']
                browser = p.chromium.launch(**launch_kwargs)
            except Exception as exc:
                return skip_or_fail(f'Playwright Chromiumを起動できません: {exc}')

            context = browser.new_context(viewport={'width': 1280, 'height': 720}, service_workers='allow')

            # Preview mode never uses Firebase network services. Stub only the imported ESM surface so
            # the browser smoke test remains deterministic even when external network access is unavailable.
            firebase_stubs = {
                'firebase-app.js': "export function initializeApp(config){return {config};}",
                'firebase-app-check.js': "export function initializeAppCheck(){return {}}; export class ReCaptchaEnterpriseProvider{constructor(key){this.key=key;}}",
                'firebase-auth.js': """
                  export const indexedDBLocalPersistence={}, browserLocalPersistence={}, browserSessionPersistence={}, browserPopupRedirectResolver={};
                  export function initializeAuth(){return {currentUser:null,authStateReady:async()=>{},languageCode:'ja'};}
                  export class GoogleAuthProvider{static credential(){return {};}; addScope(){} setCustomParameters(){}}
                  export class EmailAuthProvider{static credential(){return {};}}
                  export function onAuthStateChanged(_a,cb){queueMicrotask(()=>cb(null));return()=>{};}
                  export async function signInWithCredential(){return {user:null};}
                  export async function signInWithEmailAndPassword(){return {user:null};}
                  export async function createUserWithEmailAndPassword(){return {user:null};}
                  export async function sendEmailVerification(){} export async function sendPasswordResetEmail(){}
                  export async function reauthenticateWithPopup(){} export async function reauthenticateWithCredential(){}
                  export async function deleteUser(){} export async function reload(){} export async function signOut(){}
                """,
                'firebase-firestore.js': """
                  export function getFirestore(){return {};}
                  export function collection(){return {};}; export function query(){return {};}; export function where(){return {};}; export function limit(){return {};}
                  export async function getDocs(){return {docs:[],empty:true};}; export function doc(){return {};}; export async function getDoc(){return {exists:()=>false,data:()=>null};}
                  export async function setDoc(){}; export async function updateDoc(){}; export async function deleteDoc(){};
                  export function onSnapshot(){return()=>{};}; export async function runTransaction(_db,fn){return fn({get:async()=>({exists:()=>false,data:()=>null}),set(){},update(){},delete(){}});}
                  export function serverTimestamp(){return new Date().toISOString();}
                """,
            }
            def route_firebase(route):
                name = route.request.url.rsplit('/', 1)[-1].split('?', 1)[0]
                body = firebase_stubs.get(name)
                if body is None:
                    route.abort()
                else:
                    route.fulfill(status=200, content_type='application/javascript; charset=utf-8', body=body)
            context.route('https://www.gstatic.com/firebasejs/**', route_firebase)

            page = context.new_page()
            page_errors: list[str] = []
            page.on('pageerror', lambda exc: page_errors.append(str(exc)))
            base = f'http://127.0.0.1:{port}'

            # Core flow: title -> new game -> name setup -> main -> phone -> reload -> continue.
            page.goto(f'{base}/game.html?preview=1', wait_until='domcontentloaded', timeout=45_000)
            page.locator('[data-action="start"]').wait_for(state='visible', timeout=45_000)
            page.locator('[data-action="start"]').click()
            page.locator('#player-name-setup').wait_for(state='visible', timeout=15_000)
            page.locator('#player-name-setup').fill('Smoke Test')
            page.locator('[data-setup-birthday-month]').select_option('4')
            page.locator('[data-setup-birthday-day]').select_option('1')
            page.locator('[data-action="confirm-player-name"]').click()
            page.wait_for_function("document.body.dataset.screen === 'main'", timeout=15_000)

            page.locator('[data-action="nav"][data-screen="phone"]').click()
            page.wait_for_function("document.body.dataset.screen === 'phone'", timeout=10_000)
            page.locator('[data-action="back"]').first.click()
            page.wait_for_function("document.body.dataset.screen === 'main'", timeout=10_000)

            saved = page.evaluate(f"() => localStorage.getItem('{SAVE_KEY}')")
            if not saved:
                errors.append('新規ゲーム後に端末セーブが作成されませんでした。')

            page.reload(wait_until='domcontentloaded', timeout=45_000)
            page.locator('[data-action="start"]').wait_for(state='visible', timeout=45_000)
            page.locator('[data-action="start"]').click()
            page.wait_for_function("document.body.dataset.screen === 'main'", timeout=15_000)
            if page.locator('body').get_attribute('data-screen') != 'main':
                errors.append('再読込後に続きからメイン画面へ復帰できませんでした。')

            # Re-open the saved game in a fresh browser context with a 19:00 seed.
            # Seeding a live page and reloading is intentionally avoided: pagehide/beforeunload
            # correctly writes the in-memory state and would overwrite an artificial test seed.
            saved = page.evaluate(f"() => localStorage.getItem('{SAVE_KEY}')")
            if not saved:
                errors.append('続きから確認後の端末セーブを取得できませんでした。')
                seed_state = None
                before_day = 1
            else:
                seed_state = json.loads(saved)
                seed_state.setdefault('game', {})['minutes'] = 19 * 60
                seed_state['game']['screen'] = 'main'
                seed_state['updatedAt'] = '2099-01-01T00:00:00.000Z'
                seed_state['saveRevision'] = (int(seed_state.get('saveRevision') or 0) + 10)
                before_day = int(seed_state['game'].get('day') or 1)

            context.close()
            context = browser.new_context(viewport={'width': 1280, 'height': 720}, service_workers='allow')
            context.route('https://www.gstatic.com/firebasejs/**', route_firebase)
            if seed_state is not None:
                seed_raw = json.dumps(seed_state, ensure_ascii=False, separators=(',', ':'))
                seed_script = f"""
                  (() => {{
                    if (location.origin !== {json.dumps(base)}) return;
                    if (sessionStorage.getItem('jxj-browser-smoke-seeded')) return;
                    const raw = {json.dumps(seed_raw)};
                    localStorage.setItem({json.dumps(SAVE_KEY)}, raw);
                    localStorage.setItem('jewelrygame-preview-preview-user', raw);
                    sessionStorage.setItem('jxj-browser-smoke-seeded', '1');
                  }})();
                """
                context.add_init_script(script=seed_script)

            page = context.new_page()
            page_errors = []
            page.on('pageerror', lambda exc: page_errors.append(str(exc)))
            page.goto(f'{base}/game.html?preview=1', wait_until='domcontentloaded', timeout=45_000)
            page.locator('[data-action="start"]').wait_for(state='visible', timeout=45_000)
            page.locator('[data-action="start"]').click()
            page.wait_for_function("document.body.dataset.screen === 'main'", timeout=15_000)
            sleep_button = page.locator('[data-action="sleep"]')
            if sleep_button.is_disabled():
                debug = page.evaluate(f"""() => {{
                  const raw = localStorage.getItem('{SAVE_KEY}');
                  const data = raw ? JSON.parse(raw) : null;
                  const button = document.querySelector('[data-action=\"sleep\"]');
                  return {{ minutes: data?.game?.minutes, day: data?.game?.day, disabled: button?.disabled, title: button?.title }};
                }}""")
                errors.append(f'19:00の保存データを新規セッションで読み込んでも「寝る」が有効になりませんでした: {debug}')
            else:
                sleep_button.click()
                page.locator('[data-action="do-sleep"]').wait_for(state='visible', timeout=10_000)
                page.locator('[data-action="do-sleep"]').click()
                page.wait_for_function(
                    f"""() => {{
                      const raw = localStorage.getItem('{SAVE_KEY}');
                      if (!raw) return false;
                      try {{ return (Number(JSON.parse(raw).game.day) || 0) > {int(before_day)}; }} catch (_) {{ return false; }}
                    }}""",
                    timeout=30_000,
                )

            # Aquarium is tested directly with a real postMessage snapshot. Uninstalled-but-owned decor must remain reinstallable.
            aquarium = context.new_page()
            aquarium_errors: list[str] = []
            aquarium.on('pageerror', lambda exc: aquarium_errors.append(str(exc)))
            aquarium.goto(f'{base}/assets/minigames/aquarium/index.html', wait_until='domcontentloaded', timeout=45_000)
            aquarium.evaluate("""() => {
              const state = {
                fish: { neon_tetra: { owned: 2, inTank: 2 } },
                plants: { anacharis: { owned: 1, inTank: 1 } },
                displayItems: {
                  tank: { owned: 1, installed: 1 }, light: { owned: 1, installed: 1 },
                  hang_on_filter: { owned: 1, installed: 1 }, heater: { owned: 1, installed: 1 },
                  soil: { owned: 1, installed: 1 }, wood_large_a: { owned: 1, installed: 0 }
                },
                fishLoad: { current: 2, max: 40 }
              };
              window.postMessage({ source: 'jxj-main-game', type: 'aquarium-state', state }, window.location.origin);
            }""")
            aquarium.wait_for_function("!document.body.classList.contains('aquarium-waiting')", timeout=10_000)
            aquarium.locator('#observe').click()
            aquarium.locator('#catalogGrid').wait_for(state='visible', timeout=10_000)
            if 'ネオンテトラ' not in aquarium.locator('#catalogGrid').inner_text():
                errors.append('水槽観察に水槽内の魚が表示されません。')
            aquarium.get_by_role('button', name=re.compile(r'^ディスプレイ用品')).click()
            grid_text = aquarium.locator('#catalogGrid').inner_text()
            if '流木 大 A' not in grid_text or '未設置' not in grid_text:
                errors.append('所持中・未設置の流木が観察一覧に残らず、再設置できない状態です。')
            wood_card = aquarium.locator('.catalog-card').filter(has_text='流木 大 A')
            if wood_card.count() != 1 or wood_card.get_by_role('button', name='1個設置').is_disabled():
                errors.append('未設置の所持流木で「1個設置」が有効になっていません。')
            page_errors.extend(aquarium_errors)
            aquarium.close()

            # Ignore browser media autoplay/network warnings; uncaught JS exceptions are not allowed.
            if page_errors:
                errors.extend(f'ブラウザ例外: {message}' for message in page_errors)

            context.close()
            browser.close()
            browser = None

    except PlaywrightTimeoutError as exc:
        errors.append(f'ブラウザ操作がタイムアウトしました: {exc}')
    except Exception as exc:
        errors.append(f'ブラウザスモークテスト実行エラー: {exc}')
    finally:
        with contextlib.suppress(Exception):
            if browser is not None:
                browser.close()
        server.shutdown()
        server.server_close()
        thread.join(timeout=2)

    if errors:
        print('BROWSER SMOKE: FAIL')
        for error in errors:
            print(f'- {error}')
        return 1
    print('BROWSER SMOKE: PASS')
    print('新規ゲーム・端末保存・再読込・続きから・スマートフォン・就寝翌日・水槽観察を実ブラウザで確認しました。')
    return 0


if __name__ == '__main__':
    sys.exit(main())
