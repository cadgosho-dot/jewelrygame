from pathlib import Path
import hashlib
from PIL import Image, ImageEnhance

TARGET = Path('assets/images/events/pazupan-miner.png')
EXPECTED_GIT_BLOB_SHA = '550026725476e801d1e0cf3397b370d44c71cdd3'
BRIGHTNESS = 0.88


def git_blob_sha(data: bytes) -> str:
    return hashlib.sha1(f'blob {len(data)}\0'.encode('ascii') + data).hexdigest()


def main() -> None:
    if not TARGET.is_file():
        raise SystemExit(f'対象画像がありません: {TARGET}')

    source = TARGET.read_bytes()
    actual = git_blob_sha(source)
    if actual != EXPECTED_GIT_BLOB_SHA:
        raise SystemExit(
            f'ボムじいさん画像が想定外の状態です。二重加工を防ぐため停止します: {actual}'
        )

    image = Image.open(TARGET).convert('RGBA')
    alpha = image.getchannel('A')
    dark_rgb = ImageEnhance.Brightness(image.convert('RGB')).enhance(BRIGHTNESS)
    r, g, b = dark_rgb.split()
    result = Image.merge('RGBA', (r, g, b, alpha))
    result.save(TARGET, format='PNG', optimize=True)

    check = Image.open(TARGET)
    if check.mode != 'RGBA' or check.size != image.size:
        raise SystemExit('出力画像の透明度または寸法が変化したため停止します。')

    print(f'ボムじいさん画像のみ明るさを {BRIGHTNESS:.2f} 倍に調整しました。')


if __name__ == '__main__':
    main()
