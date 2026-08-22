from pathlib import Path

VERSION = '0.10.736'


def replace_required(text, old, new, label, minimum=1):
    count = text.count(old)
    if count < minimum:
        raise SystemExit(f'{label}: expected at least {minimum}, found {count}: {old!r}')
    return text.replace(old, new)

# 思い出カタログの正式名称を統一
mem_path = Path('js/memories-screen.js')
mem = mem_path.read_text(encoding='utf-8')
mem = mem.replace("const VERSION = '0.10.735';", f"const VERSION = '{VERSION}';")
mem = mem.replace("jxj-memories-style-v735", "jxj-memories-style-v736")
name_replacements = {
    "name:'タトゥーの女性'": "name:'タトゥーの女'",
    "name:'映画館の見習い'": "name:'見習い職人'",
    "name:'リドリー岡崎'": "name:'リドリー・岡崎'",
    "name:'エメラルド船長'": "name:'エメラルド班班長'",
    "name:'寿司職人'": "name:'寿司屋の大将'",
    "name:'灰色パーカーの女性'": "name:'灰色パーカーの女'",
    "name:'パズパン'": "name:'ボムじいさん'",
    "name:'語り部'": "name:'ストーリーテラー'",
    "name:'3Dメガネの人物'": "name:'3Dメガネ'",
}
for old, new in name_replacements.items():
    mem = replace_required(mem, old, new, f'memories {old}')
mem_path.write_text(mem, encoding='utf-8')

# 各イベント内の人物名表記を正式名称へ統一
app_path = Path('js/app.js')
app = app_path.read_text(encoding='utf-8')
app = app.replace('0.10.735', VERSION)
app = replace_required(app, 'タトゥーの女性', 'タトゥーの女', 'tattoo woman references')
app = replace_required(app, 'リドリー・オカザキ', 'リドリー・岡崎', 'ridley event name')
app = replace_required(app, '<small>灰色パーカー</small>', '<small>灰色パーカーの女</small>', 'gray hood event label')
app = app.replace('alt="灰色パーカー"', 'alt="灰色パーカーの女"')
app = replace_required(app, '<small>時計台募金の老婆</small>', '<small>時計塔の老婆</small>', 'clock tower event label')
app = replace_required(app, 'store-theft-dialogue"><small>老婆</small>', 'store-theft-dialogue"><small>店に現れた老婆</small>', 'store theft choice label')
app = replace_required(app, 'store-theft-dialogue store-theft-dialogue-auto" data-action="store-theft-event-recover"><small>老婆</small>', 'store-theft-dialogue store-theft-dialogue-auto" data-action="store-theft-event-recover"><small>店に現れた老婆</small>', 'store theft farewell label')
app = replace_required(app, "KAWAHARA_KNOWLEDGE_EVENT_SOURCE = 'g-Lab. カワハラ';", "KAWAHARA_KNOWLEDGE_EVENT_SOURCE = 'g-Lab. 川原';", 'g-Lab source name')
app = replace_required(app, "const kicker = stage === 'reward' ? '加工知識追加' : 'カワハラ';", "const kicker = stage === 'reward' ? '加工知識追加' : 'g-Lab. 川原';", 'g-Lab event speaker')
app = app.replace('aria-label="カワハラ加工知識イベント導入動画"', 'aria-label="g-Lab. 川原 加工知識イベント導入動画"')
app = app.replace('aria-label="動画をスキップしてカワハラの会話を開始"', 'aria-label="動画をスキップしてg-Lab. 川原の会話を開始"')

# 名前表示がなかったイベントにも正式名称を表示
app = replace_required(
    app,
    '<section class="western-union-dialogue glass-panel">\n          <strong>',
    '<section class="western-union-dialogue glass-panel">\n          <small>Western Unionの使者</small>\n          <strong>',
    'western union speaker label',
)
app = replace_required(
    app,
    'data-action="mermaid-event-next">\n          <strong>',
    'data-action="mermaid-event-next">\n          <small>人魚</small>\n          <strong>',
    'mermaid speaker label',
)
app = replace_required(
    app,
    'data-action="pazupan-event-next">\n          <strong>${dialogue}</strong>',
    'data-action="pazupan-event-next">\n          <small>ボムじいさん</small>\n          <strong>${dialogue}</strong>',
    'bomb grandpa speaker label',
)
app_path.write_text(app, encoding='utf-8')

# 公開バージョン更新
gd_path = Path('js/game-data.js')
gd = gd_path.read_text(encoding='utf-8')
gd = gd.replace('// v0.10.735: 正式版のバージョン入口。', '// v0.10.736: 正式版のバージョン入口。')
gd = replace_required(gd, "export const VERSION = '0.10.735';", f"export const VERSION = '{VERSION}';", 'game-data version')
gd_path.write_text(gd, encoding='utf-8')

for name in ['game.html', 'index.html', 'auth.html']:
    path = Path(name)
    text = path.read_text(encoding='utf-8')
    text = text.replace('0.10.735', VERSION)
    path.write_text(text, encoding='utf-8')

sw_path = Path('sw.js')
sw = sw_path.read_text(encoding='utf-8')
sw = sw.replace('0.10.735', VERSION)
lines = sw.splitlines()
if lines:
    lines[0] = f"const VERSION = '{VERSION}';"
sw_path.write_text('\n'.join(lines) + ('\n' if sw.endswith('\n') else ''), encoding='utf-8')

print('v0.10.736 character names unified')
