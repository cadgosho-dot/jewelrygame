from pathlib import Path
import subprocess

ROOT = Path('.')
OLD = '0.10.844'
NEW = '0.10.848'


def read(path):
    return (ROOT / path).read_text(encoding='utf-8')

def write(path, text):
    (ROOT / path).write_text(text, encoding='utf-8')

def replace_once(path, old, new):
    text = read(path)
    if new in text:
        return
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{path}: anchor count {count}, expected 1: {old[:80]!r}')
    write(path, text.replace(old, new, 1))

version = read('VERSION').strip()
if version not in {OLD, NEW}:
    raise SystemExit(f'Unexpected VERSION: {version}')

# v0.10.845: completion ring portrait overlap fix.
styles_block = '''\n\n/* v0.10.845 完成画面: 縦画面のリング位置を維持したまま、商品名との重なりを防止 */
@media (orientation:portrait) and (max-width:820px){
  body[data-screen="completion"] .completion-jewelry-artwork.item-ring{
    transform:none!important;
  }
  body[data-screen="completion"] .result-card>.completion-jewelry-preview.item-ring{
    padding-top:32px!important;
  }
}


/* v0.10.846 エメラルド班班長: 報酬画像の見た目を変えず、実タップ領域を親buttonへ固定 */
body[data-screen="emeraldCaptainKebabEvent"] .emerald-captain-kebab-reward-button{
  pointer-events:auto!important;
  touch-action:manipulation!important;
  -webkit-tap-highlight-color:transparent!important;
  cursor:pointer!important;
}
body[data-screen="emeraldCaptainKebabEvent"] .emerald-captain-kebab-reward-button>*{
  pointer-events:none!important;
}
'''
styles = read('styles.css')
if 'v0.10.845 完成画面: 縦画面のリング位置を維持したまま' not in styles:
    write('styles.css', styles.rstrip() + styles_block)

# v0.10.847: arm next scene immediately after successful purchase.
old_purchase = '''    saveGame();
    playSfx('emerald-captain-purchase', { gain: 0.92, rate: 1.0 });
    render();
    return;
'''
new_purchase = '''    saveGame();
    playSfx('emerald-captain-purchase', { gain: 0.92, rate: 1.0 });
    render();
    // v0.10.847: エメラルド画像のタップ成功後は、購入結果表示で止まらず
    // 必ず次の会話シーン（purchase）へ進むタイマーをここでも開始する。
    // render側にも同じ復旧経路があり、schedule関数が既存タイマーを置換するため二重進行しない。
    scheduleEmeraldCaptainPurchaseDialogue(1200);
    return;
'''
app = read('js/app.js')
if 'scheduleEmeraldCaptainPurchaseDialogue(1200);' not in app:
    if app.count(old_purchase) != 1:
        raise SystemExit(f'js/app.js: purchase anchor count {app.count(old_purchase)}')
    app = app.replace(old_purchase, new_purchase, 1)
    write('js/app.js', app)

# v0.10.846: Android/WebView direct pointer/touch path.
direct_block = r'''

// v0.10.846: エメラルド班班長 — Android/WebViewで報酬画像のタップがclickへ変換されない場合の直通経路。
// v0.10.753の互換clickは残しつつ、showcase段階だけ pointerup / touchend から購入処理へ直接進める。
// 段階判定を先に行うため、両経路が同じ操作で発火しても二重購入にはならない。
let emeraldCaptainRewardDirectTapAt = 0;
let emeraldCaptainRewardDirectTapBusy = false;

function emeraldCaptainRewardButtonFromInputEvent(event) {
  const selector = 'body[data-screen="emeraldCaptainKebabEvent"] .emerald-captain-kebab-reward-button';
  const path = typeof event?.composedPath === 'function' ? event.composedPath() : [];
  for (const node of path) {
    if (node instanceof Element && node.matches?.(selector)) return node;
    if (node instanceof Element) {
      const closest = node.closest?.(selector);
      if (closest) return closest;
    }
  }
  const direct = event?.target instanceof Element ? event.target.closest(selector) : null;
  if (direct) return direct;

  const button = document.querySelector(selector);
  if (!(button instanceof HTMLButtonElement)) return null;
  const point = event?.changedTouches?.[0] || event?.touches?.[0] || event;
  const x = Number(point?.clientX);
  const y = Number(point?.clientY);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;

  // 一部WebViewでは画像上のtouch targetが親buttonから外れることがあるため、
  // 実ボタンと画像の見た目の両方を小さな余裕付きで当たり判定する。
  const rects = [button.getBoundingClientRect()];
  const image = button.querySelector('img');
  if (image instanceof HTMLImageElement) rects.push(image.getBoundingClientRect());
  const hitPadding = 18;
  const hit = rects.some((rect) => x >= rect.left - hitPadding && x <= rect.right + hitPadding
    && y >= rect.top - hitPadding && y <= rect.bottom + hitPadding);
  return hit ? button : null;
}

function activateEmeraldCaptainRewardFromDirectTouch(event) {
  if (!state || screen !== 'emeraldCaptainKebabEvent') return;
  const pointerType = String(event?.pointerType || '');
  if (event?.type === 'pointerup' && pointerType === 'mouse') return;
  const eventState = emeraldCaptainKebabEventState();
  if (!eventState.active || eventState.stage !== 'showcase') return;
  const button = emeraldCaptainRewardButtonFromInputEvent(event);
  if (!button || button.disabled) return;

  const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
  if (emeraldCaptainRewardDirectTapBusy || now - emeraldCaptainRewardDirectTapAt < 450) return;
  emeraldCaptainRewardDirectTapAt = now;
  emeraldCaptainRewardDirectTapBusy = true;
  if (event.cancelable) event.preventDefault();
  event.stopPropagation?.();

  Promise.resolve(advanceEmeraldCaptainKebabEvent())
    .catch((error) => {
      console.error('エメラルド班班長イベント報酬タップ処理エラー', error);
      showToast('エメラルドの購入処理を再試行してください。', 'warning');
    })
    .finally(() => {
      emeraldCaptainRewardDirectTapBusy = false;
    });
}

document.addEventListener('pointerup', activateEmeraldCaptainRewardFromDirectTouch, true);
document.addEventListener('touchend', activateEmeraldCaptainRewardFromDirectTouch, { capture: true, passive: false });
'''
app = read('js/app.js')
if 'function activateEmeraldCaptainRewardFromDirectTouch(event)' not in app:
    anchor = '\nfunction renderEmeraldCaptainKebabEvent() {'
    if app.count(anchor) != 1:
        raise SystemExit(f'js/app.js: render anchor count {app.count(anchor)}')
    app = app.replace(anchor, direct_block + anchor, 1)
    write('js/app.js', app)

# Add regression check script and hook it into current audit.
check_script = '''from pathlib import Path
import sys

app = Path("js/app.js").read_text(encoding="utf-8")
css = Path("styles.css").read_text(encoding="utf-8")
game_data = Path("js/game-data.js").read_text(encoding="utf-8")

checks = [
    ("reward button action retained", 'class="kappa-jade-reward-button emerald-captain-kebab-reward-button" data-action="emerald-captain-kebab-event-next"' in app),
    ("legacy v753 compatibility retained", 'installEmeraldCaptainKebabTapCompatibility();' in game_data and 'button.click();' in game_data),
    ("v846 direct guard exists", 'activateEmeraldCaptainRewardFromDirectTouch' in app),
    ("direct guard restricted to showcase", "eventState.stage !== 'showcase'" in app),
    ("pointerup direct path", "document.addEventListener('pointerup', activateEmeraldCaptainRewardFromDirectTouch, true);" in app),
    ("touchend fallback path", "document.addEventListener('touchend', activateEmeraldCaptainRewardFromDirectTouch, { capture: true, passive: false });" in app),
    ("direct path advances event without depending on click", 'Promise.resolve(advanceEmeraldCaptainKebabEvent())' in app),
    ("successful reward tap enters purchase result", "eventState.stage = 'purchaseResult';" in app),
    ("purchase result immediately arms next-scene continuation", 'scheduleEmeraldCaptainPurchaseDialogue(1200);' in app),
    ("purchase-result render keeps reload fallback", "eventState.stage === 'purchaseResult'" in app and 'queueMicrotask(() => scheduleEmeraldCaptainPurchaseDialogue());' in app),
    ("next dialogue stage is purchase", "eventState.stage = 'purchase';" in app and "if (eventState.stage === 'purchase')" in app),
    ("purchase dialogue continues to meal scene", 'await startEmeraldCaptainKebabMeal();' in app),
    ("button and image rect fallback", 'button.getBoundingClientRect()' in app and 'image.getBoundingClientRect()' in app),
    ("child hit targets delegated to parent", '.emerald-captain-kebab-reward-button>*' in css and 'pointer-events:none!important' in css.split('v0.10.846 エメラルド班班長', 1)[1]),
]

failed = []
for name, ok in checks:
    print(('PASS' if ok else 'FAIL'), name)
    if not ok:
        failed.append(name)
if failed:
    sys.exit(1)
print('EMERALD CAPTAIN REWARD TAP AUDIT: PASS')
'''
check_path = ROOT / 'scripts/check-emerald-captain-reward-tap.py'
if not check_path.exists() or check_path.read_text(encoding='utf-8') != check_script:
    check_path.write_text(check_script, encoding='utf-8')

check_current = read('scripts/check-current.py')
check_line = "    ('エメラルド班班長報酬タップ', [sys.executable, str(ROOT / 'scripts/check-emerald-captain-reward-tap.py')]),\n"
if check_line not in check_current:
    anchor = "    ('見習い映画館中央配置', [sys.executable, str(ROOT / 'scripts/check-apprentice-cinema-center.py')]),\n"
    if check_current.count(anchor) != 1:
        raise SystemExit('scripts/check-current.py: audit anchor not unique')
    check_current = check_current.replace(anchor, anchor + check_line, 1)
    write('scripts/check-current.py', check_current)

# v0.10.848: Pages should exclude only root /tools, never assets/images/tools.
workflow = read('.github/workflows/update-metals.yml')
workflow = workflow.replace("            --exclude='tools/' \\\n", "            --exclude='/tools/' \\\n")
pages_check = '''\n      - name: 工具・設備画像23枚の公開漏れを検査
        run: |
          python3 - <<'PY'
          from pathlib import Path

          expected = [
              'bench-peg.png',
              'buffer.png',
              'diamond-polishing-lap.png',
              'dividers.png',
              'electronic-scale.png',
              'engraving-block.png',
              'file.png',
              'gem-polishing-machine.png',
              'graver.png',
              'hammer.png',
              'jewelry-bench.png',
              'loupe.png',
              'magnifier.png',
              'milgrain-tool.png',
              'nipper.png',
              'piercing-saw.png',
              'pliers.png',
              'rolling-mill.png',
              'rotary-tool.png',
              'stamps.png',
              'torch.png',
              'ultrasonic-cleaner.png',
              'wood-block.png',
          ]
          root = Path('_site/assets/images/tools')
          missing = [name for name in expected if not (root / name).is_file()]
          if missing:
              raise SystemExit('GitHub Pages公開用フォルダに工具・設備画像が不足しています: ' + ', '.join(missing))
          print(f'工具・設備画像: {len(expected)}/23 公開対象に含まれています。')
          PY
'''
if '工具・設備画像23枚の公開漏れを検査' not in workflow:
    anchor = "\n      - name: GitHub Pages用ファイルをアップロード\n"
    if workflow.count(anchor) != 1:
        raise SystemExit('.github/workflows/update-metals.yml: upload anchor not unique')
    workflow = workflow.replace(anchor, pages_check + anchor, 1)
write('.github/workflows/update-metals.yml', workflow)

# Changelog entries for cumulative versions 845-848.
changelog = read('CHANGELOG.md')
if '## v0.10.848' not in changelog:
    insert = '''\n## v0.10.848
- GitHub Pages公開用の `rsync` 除外指定 `--exclude='tools/'` が `assets/images/tools/` にも一致し、工房の工具・設備画像23枚を公開成果物から除外していた問題を修正。
- 除外対象をリポジトリ直下の開発用 `/tools/` のみに限定し、`assets/images/tools/` はGitHub Pagesへ確実に含める。
- Pagesアップロード前に工具・設備画像23枚の存在を検査し、1枚でも欠けていれば公開を中止する安全チェックを追加。
- v0.10.845〜v0.10.847の累積修正（縦画面リング完成品、エメラルド班班長タップ・シーン継続）をそのまま含む。


## v0.10.847
- エメラルド班班長のケバブイベントで、エメラルド一式をタップして購入が成立した後、購入結果表示だけで停止せず次の会話シーンへ確実に継続するよう進行タイマーを購入成立箇所から直接開始。
- 購入結果画面側の既存復旧タイマーも残し、アプリ復帰・再描画時にも `purchaseResult → purchase → ケバブ` のイベント進行を再開できる二重の復旧経路を維持。タイマーは毎回置換されるため二重進行・二重購入は発生しない。
- v0.10.845の縦画面リング完成品重なり修正、v0.10.846のAndroid／WebView報酬タップ補強をそのまま含む累積版。


## v0.10.846
- エメラルド班班長のケバブイベントで、エメラルド一式の画像をタップしても購入へ進まないことがあるAndroid／WebView向けの入力経路を補強。
- v0.10.753の互換click処理は残したまま、`showcase`段階では`pointerup`／`touchend`から購入処理へ直接進める予備経路を追加。画像とボタンの実座標も照合し、見た目とタップ領域のずれを吸収する。
- 購入処理は`showcase`段階だけ受け付けるため二重購入を防止。イベントの見た目、エメラルド8カットの内容・価格、ケバブ処理、他イベント、セーブデータ形式には変更なし。


## v0.10.845
- ジュエリー完成画面の縦画面で、リング完成品を下へ配置する際の余白をレイアウト側で確保し、完成品画像が商品名テキストへ重ならないよう修正。
- v0.10.843で調整したリングの見た目の縦位置は維持し、横画面・ペンダント・ピアス・完成結果の品質／価格表示・制作ロジック・セーブデータには変更なし。
\n'''
    anchor = '\n## v0.10.844\n'
    if changelog.count(anchor) != 1:
        raise SystemExit('CHANGELOG.md: v844 anchor not unique')
    changelog = changelog.replace(anchor, insert + anchor, 1)
    write('CHANGELOG.md', changelog)

# Use the repository's canonical synchronizer for every version reference.
subprocess.run(['python3', 'scripts/version-sync.py', '--set', NEW], check=True)
