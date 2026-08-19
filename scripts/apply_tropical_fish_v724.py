from __future__ import annotations

from pathlib import Path
import re

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
aquarium_shop_pattern = re.compile(
    r"\n\s*const aquariumShop\s*=\s*aquariumUnlocked\(\)\s*\?\s*`<button class=\"okachimachi-icon-button\" data-action=\"open-tropical-fish-shop\">.*?<strong>熱帯魚屋</strong>.*?</button>`\s*:\s*'';\n",
    re.S,
)
app, count = aquarium_shop_pattern.subn('\n', app, count=1)
if count != 1:
    raise RuntimeError(f'remove permanent aquariumShop: expected 1 match, found {count}')
if app.count('${aquariumShop}') != 1:
    raise RuntimeError(f'remove aquariumShop insertion: expected 1, found {app.count("${aquariumShop}")}')
app = app.replace('${aquariumShop}', '', 1)

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
      setScreen('tropicalFishShop', {}, false);
      break;
'''
new_handler = '''    case 'open-tropical-fish-shop':
      if (tropicalFishShopEventAccessAllowed()) {
        setScreen('tropicalFishShop', {}, false);
      } else {
        showToast('熱帯魚屋は「おやつ大好き」イベント中のみ行けます。', 'info');
        setScreen('okachimachi', {}, false);
      }
      break;
'''
app = replace_once(app, old_handler, new_handler, 'guard direct tropical shop route')

# 3) スマホ水槽: iframe自身のlocalStorage復元が本体同期後に走っても、本体状態を再適用する。
app = replace_once(
    app,
    'function syncAquariumRuntime(frame, snapshot) {\n',
    'function syncAquariumRuntime(frame, snapshot, options = {}) {\n  const force = Boolean(options.force);\n',
    'syncAquariumRuntime options',
)
app = replace_once(
    app,
    '  if (aquariumWindow.__jxjMainGameFingerprint === fingerprint) return true;\n',
    '  if (!force && aquariumWindow.__jxjMainGameFingerprint === fingerprint) return true;\n',
    'aquarium fingerprint force bypass',
)

old_bind = '''function bindAquariumFrameSync(frame) {
  if (!(frame instanceof HTMLIFrameElement)) return;
  let attempts = 0;
  const sync = () => {
    attempts += 1;
    const ok = syncAquariumRuntime(frame, aquariumSnapshot());
    if (!ok && attempts < 16 && frame.isConnected && screen === 'phone' && phoneTab === 'aquarium') {
      window.setTimeout(sync, Math.min(900, 90 + (attempts * 70)));
    }
  };
  frame.addEventListener('load', () => {
    attempts = 0;
    window.setTimeout(sync, 80);
  }, { once: true });
  window.setTimeout(sync, 0);
}
'''
new_bind = '''function bindAquariumFrameSync(frame) {
  if (!(frame instanceof HTMLIFrameElement)) return;
  let attempts = 0;

  const sync = (force = false) => {
    attempts += 1;
    const ok = syncAquariumRuntime(frame, aquariumSnapshot(), { force });
    if (!ok && attempts < 16 && frame.isConnected && screen === 'phone' && phoneTab === 'aquarium') {
      window.setTimeout(() => sync(force), Math.min(900, 90 + (attempts * 70)));
    }
  };

  const forceFreshSyncs = () => {
    for (const delay of [120, 450, 1000, 1800]) {
      window.setTimeout(() => {
        if (!frame.isConnected || screen !== 'phone' || phoneTab !== 'aquarium') return;
        syncAquariumRuntime(frame, aquariumSnapshot(), { force: true });
      }, delay);
    }
  };

  frame.addEventListener('load', () => {
    attempts = 0;
    window.setTimeout(() => sync(false), 80);
    forceFreshSyncs();
  }, { once: true });

  window.setTimeout(() => sync(false), 0);
  forceFreshSyncs();
}
'''
app = replace_once(app, old_bind, new_bind, 'bindAquariumFrameSync startup resync')

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
5. スマホ水槽iframeは起動直後に本体ゲーム側のaquariumSnapshotを複数回強制再同期し、iframe側localStorageの旧表示で上書きされた場合も本体状態へ戻す。
6. js/app.js / js/game-data.js / js/firebase-service.js は node --check 合格。
7. HTML / Service Worker / import query を v0.10.724 へ更新する。
8. v0.10.722のクラウド保存ロジックは変更しない。
9. SAVE_SCHEMA_VERSION=1を維持する。
'''
write('VALIDATION_v0.10.724.txt', validation)

# one-shot filesを本番mainに残さない。
for path in [
    ROOT / '.github/workflows/apply-tropical-fish-v724.yml',
    ROOT / 'scripts/apply_tropical_fish_v724.py',
    ROOT / 'TRIGGER_V724.txt',
]:
    try:
        path.unlink()
    except FileNotFoundError:
        pass

print('v0.10.724 tropical fish fixes applied')
