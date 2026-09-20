#!/usr/bin/env python3
from pathlib import Path
import sys
ROOT = Path(__file__).resolve().parents[1]
module = (ROOT / 'js/events/glab-kawahara-game-event.js').read_text(encoding='utf-8')
app = (ROOT / 'js/app.js').read_text(encoding='utf-8')
sw = (ROOT / 'sw.js').read_text(encoding='utf-8')
checks = {
    '300日目以降': "GLAB_KAWAHARA_GAME_EVENT_FIRST_DAY = 300" in module,
    '発生率5%': "GLAB_KAWAHARA_GAME_EVENT_CHANCE = 0.05" in module,
    '一回限定完了フラグ': "completed: true" in module and "active || completed" in module,
    '専用イベントキー': "glabKawaharaGameEvent" in module,
    '正式カワハラ画像': "./assets/images/events/glab-kawahara.png" in module,
    'g-Lab横背景': "./assets/images/glab.webp" in module,
    'g-Lab縦背景': "./assets/images/glab-portrait.webp" in module,
    'タップ音': "./assets/audio/sfx-select.ogg" in module,
    '通常イベントUI': all(token in module for token in ['visit-character-event','visit-character-area','visit-character','event-dialogue-card visit-event-dialogue glass-panel','タップして進む']),
    '開始音なし': "startSfx" not in module and "playSfx(" not in module,
    'app接続': "./events/glab-kawahara-game-event.js?v=" in app,
    'PWA接続': "./js/events/glab-kawahara-game-event.js?v=" in sw,
}
lines = [
    'いらっしゃいませ、、、、、',
    'あ、、${name}さん、、こんにちは、、、、',
    'そうだ、、最近自分ゲーム作ってるんですよ、、、${name}さんにもやってほしいな、、、、、',
    'ここ御徒町を舞台にして、この現実と同じように宝石買って、ジュエリー作って、売るとこまでやれるんです、、、、',
    'また進捗あったら共有しますね！',
]
checks['登録済み5セリフ'] = all(line in module for line in lines) and module.count('line1:') == 1 and module.count('line5:') == 1
failed=[name for name,ok in checks.items() if not ok]
if failed:
    print('GLAB KAWAHARA GAME EVENT: FAIL')
    for name in failed: print(f'- {name}')
    sys.exit(1)
print('GLAB KAWAHARA GAME EVENT: PASS')
