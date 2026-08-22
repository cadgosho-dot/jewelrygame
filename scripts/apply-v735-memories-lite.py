from pathlib import Path

VERSION = '0.10.735'


def replace_once(text, old, new, label):
    if old not in text:
        if new in text:
            return text
        raise SystemExit(f'{label}: target not found')
    return text.replace(old, new, 1)

app_path = Path('js/app.js')
app = app_path.read_text(encoding='utf-8')
accessor = "globalThis.__JXJ_MEMORIES_STATE__ = () => state ? structuredClone({ events: state.events, inventory: state.inventory, game: state.game }) : null;"
if accessor not in app:
    app = replace_once(app, 'let state = null;\n', 'let state = null;\n' + accessor + '\n', 'app state accessor')
app = app.replace("const UI_BUILD_VERSION = '0.10.732';", "const UI_BUILD_VERSION = '0.10.735';")
app = app.replace("./audio.js?v=0.10.732", "./audio.js?v=0.10.735")
app = app.replace("./audio-scene-map.js?v=0.10.732", "./audio-scene-map.js?v=0.10.735")
app = app.replace("./firebase-service.js?v=0.10.732", "./firebase-service.js?v=0.10.735")
app_path.write_text(app, encoding='utf-8')

gd_path = Path('js/game-data.js')
gd = gd_path.read_text(encoding='utf-8')
gd = gd.replace('// v0.10.734: 正式版のバージョン入口。', '// v0.10.735: 正式版のバージョン入口。')
gd = gd.replace("export const VERSION = '0.10.734';", "export const VERSION = '0.10.735';")
gd_path.write_text(gd, encoding='utf-8')

for name in ['game.html', 'index.html', 'auth.html']:
    path = Path(name)
    text = path.read_text(encoding='utf-8')
    text = text.replace('0.10.734', '0.10.735')
    if name == 'game.html' and 'memories-screen.js?v=0.10.735' not in text:
        anchor = '<script type="module" src="./js/app.js?v=0.10.735"></script>'
        if anchor not in text:
            raise SystemExit('game.html: app script anchor not found')
        text = text.replace(anchor, anchor + '\n  <script type="module" src="./js/memories-screen.js?v=0.10.735"></script>', 1)
    path.write_text(text, encoding='utf-8')

sw_path = Path('sw.js')
sw = sw_path.read_text(encoding='utf-8')
lines = sw.splitlines()
if lines:
    lines[0] = "const VERSION = '0.10.735';"
sw = '\n'.join(lines) + ('\n' if sw.endswith('\n') else '')
sw = sw.replace('0.10.734', '0.10.735')
sw = sw.replace("'./js/game-data.js', './js/aquarium-observe-v734-hotfix.js?v=20260822-1', './js/daily-gems-index.js?v=0.10.691',",
                "'./js/game-data.js', './js/memories-screen.js?v=0.10.735', './js/memories-backgrounds.js?v=0.10.735', './js/daily-gems-index.js?v=0.10.691',")
if "./js/memories-screen.js?v=0.10.735" not in sw:
    sw = sw.replace("'./js/game-data.js', './js/daily-gems-index.js?v=0.10.691',",
                    "'./js/game-data.js', './js/memories-screen.js?v=0.10.735', './js/memories-backgrounds.js?v=0.10.735', './js/daily-gems-index.js?v=0.10.691',")
sw_path.write_text(sw, encoding='utf-8')

print('v0.10.735 memories integration applied')
