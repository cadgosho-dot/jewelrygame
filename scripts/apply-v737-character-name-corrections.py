from pathlib import Path

VERSION = '0.10.737'


def replace_required(text, old, new, label, minimum=1):
    count = text.count(old)
    if count < minimum:
        raise SystemExit(f'{label}: expected at least {minimum}, found {count}: {old!r}')
    return text.replace(old, new)

mem_path = Path('js/memories-screen.js')
mem = mem_path.read_text(encoding='utf-8')
mem = replace_required(mem, "const VERSION = '0.10.736';", f"const VERSION = '{VERSION}';", 'memories version')
mem = mem.replace('jxj-memories-style-v736', 'jxj-memories-style-v737')
mem = replace_required(mem, "name:'灰色パーカーの女'", "name:'灰色パーカー'", 'gray hood memory name')
mem = replace_required(mem, "name:'g-Lab. 川原'", "name:'カワハラ'", 'kawahara memory name')
mem_path.write_text(mem, encoding='utf-8')

app_path = Path('js/app.js')
app = app_path.read_text(encoding='utf-8')
app = app.replace('0.10.736', VERSION)
app = replace_required(app, '<small>灰色パーカーの女</small>', '<small>灰色パーカー</small>', 'gray hood event label')
app = app.replace('alt="灰色パーカーの女"', 'alt="灰色パーカー"')
app = replace_required(app, "KAWAHARA_KNOWLEDGE_EVENT_SOURCE = 'g-Lab. 川原';", "KAWAHARA_KNOWLEDGE_EVENT_SOURCE = 'カワハラ';", 'kawahara source name')
app = replace_required(app, "const kicker = stage === 'reward' ? '加工知識追加' : 'g-Lab. 川原';", "const kicker = stage === 'reward' ? '加工知識追加' : 'カワハラ';", 'kawahara dialogue name')
app = app.replace('aria-label="g-Lab. 川原 加工知識イベント導入動画"', 'aria-label="カワハラ 加工知識イベント導入動画"')
app = app.replace('aria-label="動画をスキップしてg-Lab. 川原の会話を開始"', 'aria-label="動画をスキップしてカワハラの会話を開始"')
app_path.write_text(app, encoding='utf-8')

gd_path = Path('js/game-data.js')
gd = gd_path.read_text(encoding='utf-8')
gd = gd.replace('// v0.10.736: 正式版のバージョン入口。', '// v0.10.737: 正式版のバージョン入口。')
gd = replace_required(gd, "export const VERSION = '0.10.736';", f"export const VERSION = '{VERSION}';", 'game-data version')
gd_path.write_text(gd, encoding='utf-8')

for name in ['game.html', 'index.html', 'auth.html']:
    path = Path(name)
    text = path.read_text(encoding='utf-8').replace('0.10.736', VERSION)
    path.write_text(text, encoding='utf-8')

sw_path = Path('sw.js')
sw = sw_path.read_text(encoding='utf-8').replace('0.10.736', VERSION)
lines = sw.splitlines()
if lines:
    lines[0] = f"const VERSION = '{VERSION}';"
sw_path.write_text('\n'.join(lines) + ('\n' if sw.endswith('\n') else ''), encoding='utf-8')

print('v0.10.737 character name corrections applied')
