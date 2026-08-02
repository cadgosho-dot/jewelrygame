from pathlib import Path
from io import BytesIO
from PIL import Image
import zipfile
import sys

IMAGES = [
  'piercing-saw.png','nipper.png','electronic-scale.png','wood-block.png','dividers.png','milgrain-tool.png',
  'rolling-mill.png','file.png','pliers.png','torch.png','hammer.png','magnifier.png','bench-peg.png','graver.png',
  'engraving-block.png','stamps.png','rotary-tool.png','buffer.png','ultrasonic-cleaner.png',
]
zip_path = Path(sys.argv[1]) if len(sys.argv) > 1 else Path('/mnt/data/JEWELRYxJEWELRY_v0_10_491_GitHubDesktop_update.zip')
if not zip_path.exists():
    raise SystemExit(f'ZIPがありません: {zip_path}')
with zipfile.ZipFile(zip_path) as z:
    bad = z.testzip()
    if bad:
        raise SystemExit(f'ZIP破損: {bad}')
    names = set(z.namelist())
    for name in IMAGES:
        member = f'assets/images/tools/{name}'
        if member not in names:
            raise SystemExit(f'更新ZIPに工具画像がありません: {member}')
        raw = z.read(member)
        with Image.open(BytesIO(raw)) as im:
            im.load()
            if im.format != 'PNG' or im.mode != 'RGBA' or im.width <= 0 or im.height <= 0:
                raise SystemExit(f'工具画像形式が不正です: {member} / {im.format} {im.mode} {im.size}')
    required = {'index.html','game.html','js/app.js','js/game-data.js','sw.js','styles.css'}
    missing = sorted(required - names)
    if missing:
        raise SystemExit(f'更新ZIPの必須ファイル不足: {missing}')
print(f'v0.10.491 更新ZIP検査: OK（工具画像{len(IMAGES)}/19点、PNG RGBA、ZIP破損なし）')
