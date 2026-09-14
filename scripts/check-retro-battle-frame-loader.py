#!/usr/bin/env python3
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[1]
app = (ROOT / 'js/app.js').read_text(encoding='utf-8')
module = (ROOT / 'js/events/retro-battle-frame-loader.js').read_text(encoding='utf-8')
sw = (ROOT / 'sw.js').read_text(encoding='utf-8')
version_sync = (ROOT / 'scripts/version-sync.py').read_text(encoding='utf-8')

checks = {
    '10秒待機上限': 'RETRO_BATTLE_API_READY_TIMEOUT_MS = 10000' in module,
    '100ms再確認': 'RETRO_BATTLE_API_READY_POLL_MS = 100' in module,
    '実戦闘document確認': "RETRO_BATTLE_PATH = '/assets/minigames/retro-battle/index.html'" in module,
    'app import': "./events/retro-battle-frame-loader.js?v=" in app,
    '現行iframe selector維持': "root.querySelector('iframe[data-retro-battle-frame]')" in app,
    'プレイヤー名維持': 'playerName: retroBattlePlayerName()' in app,
    'アイテムsnapshot維持': 'inventory: retroBattleInventorySnapshot()' in app,
    'アイテム同期維持': 'onInventoryChange: applyRetroBattleInventoryChange' in app,
    '終了処理維持': 'onEnd: (detail) => finishRetroBattleEvent(detail, session)' in app,
    '既存失敗処理維持': 'onError: failRetroBattleEventLoad' in app,
    'SW precache': './js/events/retro-battle-frame-loader.js?v=' in sw,
    'version-sync SW登録': 'retro-battle-frame-loader.js precache key' in version_sync,
    'version-sync app登録': 'retro-battle-frame-loader.js import key' in version_sync,
}

start = app.index('function bindRetroBattleFrame()')
end = app.index('function renderRetroBattleEvent()', start)
integration = app[start:end]
checks['戦闘開始引数へmoneyを追加しない'] = 'money:' not in integration
checks['既存終了処理を置換しない'] = 'finishRetroBattleEvent' in integration

failed = [label for label, ok in checks.items() if not ok]
for label, ok in checks.items():
    print(('PASS' if ok else 'FAIL') + ': ' + label)
if failed:
    raise SystemExit('RETRO BATTLE FRAME LOADER CHECK: FAIL — ' + ', '.join(failed))

subprocess.run(['node', str(ROOT / 'tools/test-retro-battle-frame-loader.mjs')], check=True)
print('RETRO BATTLE FRAME LOADER CHECK: PASS')
