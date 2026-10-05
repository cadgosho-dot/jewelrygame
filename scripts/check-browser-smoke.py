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


def wait_screen(page, name: str, timeout: int = 10_000) -> None:
    page.locator(f'body[data-screen="{name}"]').wait_for(state='attached', timeout=timeout)


def wait_saved_day_advance(page, before_day: int, timeout: int = 30_000) -> None:
    deadline = time.monotonic() + timeout / 1000
    while time.monotonic() < deadline:
        raw = page.evaluate(f"localStorage.getItem({json.dumps(SAVE_KEY)})")
        if raw:
            try:
                if int(json.loads(raw).get('game', {}).get('day') or 0) > int(before_day):
                    return
            except (TypeError, ValueError, json.JSONDecodeError):
                pass
        page.wait_for_timeout(100)
    raise RuntimeError('就寝後の保存データで翌日への進行を確認できませんでした。')


def free_port() -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.bind(('127.0.0.1', 0))
        return int(sock.getsockname()[1])


def check_metal_history_scroll(page, context) -> None:
    """Exercise the real history renderer with touch swipes, without random town events."""
    cdp = context.new_cdp_session(page)
    cdp.send('Emulation.setTouchEmulationEnabled', {'enabled': True, 'maxTouchPoints': 1})
    page.set_viewport_size({'width': 390, 'height': 844})
    # Trigger the existing action directly: layout checks must not depend on shop hours.
    page.evaluate("""() => {
      const button = document.createElement('button');
      button.dataset.action = 'metal-history-open';
      document.querySelector('#root').append(button);
      button.click();
    }""")
    wait_screen(page, 'supplierMetalHistory')
    page.wait_for_timeout(500)
    for width, height in ((390, 844), (360, 740), (844, 390), (1280, 720)):
        cdp.send('Emulation.setTouchEmulationEnabled', {'enabled': width != 1280, 'maxTouchPoints': 1})
        page.set_viewport_size({'width': width, 'height': height})
        page.wait_for_timeout(150)
        for mode in ('month', 'year'):
            # Toggle twice when necessary so the real renderer resets the new viewport.
            for _ in range(2):
                target = page.locator('.metal-history-range-button').get_attribute('data-range')
                if target != mode:
                    break
                page.locator('.metal-history-range-button').evaluate('(button) => button.click()')
            page.wait_for_timeout(100)
            content = page.locator('.screen-content').bounding_box()
            controls = page.locator('.metal-history-controls').bounding_box()
            assert controls['y'] >= content['y'] - 1, f'{width}x{height}/{mode}: 期間選択が上に切れています'
            if width != 1280:
                for _ in range(12):
                    start_y = height - 45
                    end_y = content['y'] + 35
                    cdp.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': [{'x': width / 2, 'y': start_y}]})
                    for step in range(1, 7):
                        cdp.send('Input.dispatchTouchEvent', {'type': 'touchMove', 'touchPoints': [{'x': width / 2, 'y': start_y + (end_y - start_y) * step / 6}]})
                        page.wait_for_timeout(20)
                    cdp.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': []})
                    page.wait_for_timeout(80)
                    if page.locator('.metal-history-close').evaluate('(element) => element.getBoundingClientRect().bottom <= innerHeight'):
                        break
            else:
                page.mouse.move(width / 2, height - 80)
                page.mouse.wheel(0, 6000)
                page.wait_for_function("() => document.querySelector('.metal-history-close').getBoundingClientRect().bottom <= innerHeight", timeout=5000)
            note = page.locator('.metal-history-note').bounding_box()
            close = page.locator('.metal-history-close').bounding_box()
            assert note['y'] >= content['y'] - 1 and note['y'] + note['height'] <= height, f'{width}x{height}/{mode}: 説明文の全文までスクロールできません'
            assert close['y'] >= content['y'] - 1 and close['y'] + close['height'] <= height, f'{width}x{height}/{mode}: 閉じるボタンまでスクロールできません'
            page.locator('.screen-content').evaluate('(element) => { element.scrollTop = 0; }')
            page.locator('.metal-history-panel').evaluate('(element) => { element.scrollTop = 0; }')
    page.locator('.metal-history-close').click()
    wait_screen(page, 'main')
    cdp.detach()


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
            wait_screen(page, 'main', 15_000)

            check_metal_history_scroll(page, context)

            page.locator('[data-action="nav"][data-screen="phone"]').click()
            wait_screen(page, 'phone', 10_000)
            page.locator('[data-action="back"]').first.click()
            wait_screen(page, 'main', 10_000)

            saved = page.evaluate(f"() => localStorage.getItem('{SAVE_KEY}')")
            if not saved:
                errors.append('新規ゲーム後に端末セーブが作成されませんでした。')

            page.reload(wait_until='domcontentloaded', timeout=45_000)
            page.locator('[data-action="start"]').wait_for(state='visible', timeout=45_000)
            page.locator('[data-action="start"]').click()
            wait_screen(page, 'main', 15_000)
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
            wait_screen(page, 'main', 15_000)
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
                wait_saved_day_advance(page, before_day, 30_000)

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
            aquarium.locator('body:not(.aquarium-waiting)').wait_for(state='attached', timeout=10_000)
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
