from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding='utf-8')


def write(path: str, text: str) -> None:
    (ROOT / path).write_text(text, encoding='utf-8', newline='\n')


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f'{label}: expected exactly one match, found {count}')
    return text.replace(old, new, 1)


app_path = 'js/app.js'
app = read(app_path)

# 1) 熱帯魚屋は通常の御徒町メニューには常設しない。
old_permanent_shop = '''          ${aquariumUnlocked() ? '<button type="button" class="secondary-button full-button" data-action="open-tropical-fish-shop">熱帯魚屋</button>' : ''}
'''
app = replace_once(app, old_permanent_shop, '', 'remove permanent Okachimachi tropical shop')

# 2) イベント中だけ入店可能。旧キャッシュ等からの直接ルートも弾く。
render_shop_needle = 'function renderTropicalFishShop(){\n'
render_shop_replacement = '''function tropicalFishShopEventAccessAllowed() {
  const e = oyatsuDaisukiEventState();
  return Boolean(
    e.active
    && e.route === 'shop'
    && ['shop', 'shopConfirm'].includes(e.stage)
  );
}

function renderTropicalFishShop(){
  if (!tropicalFishShopEventAccessAllowed()) {
    queueMicrotask(() => {
      if (screen === 'tropicalFishShop') setScreen('okachimachi', {}, false);
    });
    return `<main class="main-screen"></main>`;
  }
'''
app = replace_once(app, render_shop_needle, render_shop_replacement, 'guard tropicalFishShop render')

old_handler = '''    case 'open-tropical-fish-shop':
      if (!aquariumUnlocked()) showToast('水槽を手に入れると熱帯魚屋を利用できます。', 'info');
      else setScreen('tropicalFishShop', { tropicalCategory: 'fish' });
      break;
'''
new_handler = '''    case 'open-tropical-fish-shop':
      if (tropicalFishShopEventAccessAllowed()) {
        setScreen('tropicalFishShop', { tropicalCategory: 'fish', fromOyatsu: true });
      } else {
        showToast('熱帯魚屋は「おやつ大好き」イベント中のみ行けます。', 'info');
        setScreen('okachimachi', {}, false);
      }
      break;
'''
app = replace_once(app, old_handler, new_handler, 'guard direct tropical shop route')

# 3) スマホ水槽: iframe側の古いlocalStorage復元後でも、本体ゲームの状態を再適用できるようforceを追加。
app = replace_once(
    app,
    "function syncAquariumRuntime(frame = document.querySelector('.aquarium-game-frame')) {\n",
    "function syncAquariumRuntime(frame = document.querySelector('.aquarium-game-frame'), options = {}) {\n  const force = Boolean(options.force);\n",
    'syncAquariumRuntime options',
)
app = replace_once(
    app,
    '    if (engine.__jxjMainGameFingerprint !== fingerprint) {\n',
    '    if (force || engine.__jxjMainGameFingerprint !== fingerprint) {\n',
    'aquarium fingerprint force bypass',
)

old_sync_closure = '''  const sync = () => {
    postAquariumSnapshot(frame);
    installAquariumPortraitCentering(frame);
    syncAquariumRuntime(frame);
  };
'''
new_sync_closure = '''  const forceFreshSyncs = () => {
    for (const delay of [120, 450, 1000, 1800]) {
      window.setTimeout(() => {
        if (!frame.isConnected) return;
        postAquariumSnapshot(frame);
        syncAquariumRuntime(frame, { force: true });
      }, delay);
    }
  };
  const sync = () => {
    postAquariumSnapshot(frame);
    installAquariumPortraitCentering(frame);
    syncAquariumRuntime(frame);
    forceFreshSyncs();
  };
'''
app = replace_once(app, old_sync_closure, new_sync_closure, 'bindAquariumFrameSync startup resync')

# iframeからready/request-stateが来た後も最終的に本体状態を優先する。
old_ready_sync = "    [0, 80, 260].forEach((delay) => window.setTimeout(() => syncAquariumRuntime(frame), delay));\n"
new_ready_sync = "    [0, 80, 260, 600, 1200].forEach((delay) => window.setTimeout(() => syncAquariumRuntime(frame, { force: delay >= 260 }), delay));\n"
app = replace_once(app, old_ready_sync, new_ready_sync, 'aquarium ready forced resync')

write(app_path, app)

# 4) バージョンとキャッシュを更新。セーブスキーマは変更しない。
version_paths = ['index.html', 'game.html', 'auth.html', 'js/app.js', 'js/game-data.js', 'sw.js']
for path in version_paths:
    text = read(path)
    if '0.10.723' not in text:
        raise RuntimeError(f'{path}: expected v0.10.723 marker')
    write(path, text.replace('0.10.723', '0.10.724'))

# 5) 変更記録と検証メモ。
changelog_path = 'CHANGELOG.md'
changelog = read(changelog_path)
entry = '''# v0.10.724 - 2026-08-19

- 御徒町の通常メニューから熱帯魚屋を削除。「おやつ大好き」イベントのショップルート中のみ入店可能に修正。
- 旧画面・旧キャッシュ等からの直接入店もイベント状態を検証して拒否。
- 熱帯魚購入時の owned / inTank / lastSyncRevision / saveGame の既存保存仕様は維持。
- スマホ水槽iframe起動後に本体ゲーム側の最新水槽状態を強制再同期し、iframe側の旧ローカル状態で表示が戻る問題を防止。
- v0.10.722のクラウド保存ロジックは変更なし。
- SAVE_SCHEMA_VERSION=1を維持。

'''
if not changelog.lstrip().startswith('# v0.10.724'):
    write(changelog_path, entry + changelog.lstrip('\n'))

validation = '''JEWELRY×JEWELRY v0.10.724 VALIDATION
1. 通常の御徒町メニューに「熱帯魚屋」が表示されない。
2. 旧画面・旧キャッシュから open-tropical-fish-shop を直接呼んでも「おやつ大好き」イベント外では入店できない。
3. 「おやつ大好き」イベントで route=shop / stage=shop または shopConfirm の間は熱帯魚屋へ入店できる。
4. 熱帯魚購入時は既存どおり aquarium.fish[id].owned / inTank を加算し、lastSyncRevision更新とsaveGameを行う。
5. スマホ水槽iframeは起動直後とready/request-state後に本体ゲーム側のaquariumSnapshotを強制再同期し、iframe側localStorageの旧表示で上書きされた場合も本体状態へ戻す。
6. js/app.js / js/game-data.js / js/firebase-service.js は node --check 合格。
7. HTML / Service Worker / import query を v0.10.724 へ更新する。
8. v0.10.722のクラウド保存ロジックは変更しない。
9. SAVE_SCHEMA_VERSION=1を維持する。
'''
write('VALIDATION_v0.10.724.txt', validation)

# one-shot/診断ファイルを本番mainに残さない。
for path in [
    ROOT / '.github/workflows/apply-tropical-fish-v724.yml',
    ROOT / 'scripts/apply_tropical_fish_v724.py',
    ROOT / 'TRIGGER_V724.txt',
    ROOT / 'PATCH_LOG_V724.txt',
    ROOT / 'PATCH_SOURCE_V724.txt',
]:
    try:
        path.unlink()
    except FileNotFoundError:
        pass

print('v0.10.724 tropical fish fixes applied')
