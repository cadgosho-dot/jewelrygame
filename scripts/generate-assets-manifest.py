#!/usr/bin/env python3
"""Generate ASSETS.md from the current assets tree and static code references."""
from __future__ import annotations

import argparse
import hashlib
import json
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / 'ASSETS.md'
TODAY = '2026-08-30'


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open('rb') as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b''):
            h.update(chunk)
    return h.hexdigest()


def provenance_map() -> dict[str, dict[str, str]]:
    provenance: dict[str, dict[str, str]] = {}
    manifest_dirs = [ROOT, ROOT / 'docs' / 'archive' / 'asset-manifests']
    manifests = []
    for manifest_dir in manifest_dirs:
        if manifest_dir.is_dir():
            manifests.extend(sorted(manifest_dir.glob('TOOL_IMAGE_INTAKE_MANIFEST_*.json')))
    for manifest in manifests:
        try:
            data = json.loads(manifest.read_text(encoding='utf-8'))
        except Exception:
            continue
        for item in data.get('items', []):
            output_path = item.get('outputPath')
            if output_path:
                provenance[output_path] = {
                    'source': f"受領アセット（{manifest.name}, source={item.get('sourceFilename', '?')}）",
                    'permission': '変更禁止（原本由来。明示許可時のみ加工）',
                }
    for rel in [
        'assets/images/events/hospital-room-landscape.jpg',
        'assets/images/events/hospital-room-portrait.jpg',
        'assets/images/events/mystery-chinese-food-03.png',
        'assets/images/events/mystery-chinese-food-04.png',
    ]:
        provenance[rel] = {
            'source': 'ユーザー提供（直近引継ぎ記録あり）',
            'permission': '変更禁止（色・彩度・画風・再描画）',
        }
    return provenance

SOURCE_ORDER = [
    'UPDATE_MANIFEST.json',
    'about.html',
    'auth-cache-recovery.js',
    'auth.html',
    'data/cinema-event-videos.json',
    'data/daily-gems-365.json',
    'data/jewelry_okachimachi_quiz_200_game_format.json',
    'data/jewelry_quiz_50_verified_2026-08-10.json',
    'data/metals.json',
    'firebase.json',
    'hosting-origin-guard.js',
    'index.html',
    'game.html',
    'js/audio.js',
    'js/daily-gems-index.js',
    'js/daily-gems.js',
    'js/firebase-config.js',
    'js/firebase-service.js',
    'js/game-data.js',
    'js/google-auth-bridge.js',
    'js/japan-holidays.js',
    'js/local-save-storage.js',
    'js/loose-gem-professional.js',
    'js/memories-backgrounds.js',
    'js/security-config.js',
    'js/workshop-staff-images-loader-v754.js',
    'manifest.webmanifest',
    'meal-image-size-hotfix.css',
    'memories-event-image-overrides-v751.js',
    'one-love-player-name-hotfix.js',
    'quiz-layout-test.html',
    'scripts/check-app-check-readiness.py',
    'scripts/check-apprentice-cinema-center.py',
    'scripts/check-aquarium-runtime.py',
    'scripts/check-browser-smoke.py',
    'scripts/check-cloud-delete-policy.py',
    'scripts/check-completion-portrait-header-clearance.py',
    'scripts/check-current.py',
    'scripts/check-event-integrity.py',
    'scripts/check-event-save-roundtrip.py',
    'scripts/check-gift-chunked-save.py',
    'scripts/check-hosting-guard-policy.py',
    'scripts/check-indexeddb-save-policy.py',
    'scripts/check-lifecycle-save-policy.py',
    'scripts/check-long-term-history.py',
    'scripts/check-long-term-misc-cleanup.py',
    'scripts/check-management-docs.py',
    'scripts/check-meal-quiz-recovery.py',
    'scripts/check-metal-market-fallback.py',
    'scripts/check-orphan-chunk-cleanup.py',
    'scripts/check-processing-knowledge.py',
    'scripts/check-pwa-cache-policy.py',
    'scripts/check-repository-hygiene.py',
    'scripts/check-save-diagnostics.py',
    'scripts/check-save-storage-policy.py',
    'scripts/check-seasonal-main-background.py',
    'scripts/check-showcase-jewelry-visuals.py',
    'scripts/check-startup-diagnostics.py',
    'scripts/check_phone_layout_baseline.py',
    'scripts/generate-event-probability-list.py',
    'scripts/update-metals.py',
    'scripts/version-sync.py',
    'styles.css',
    'sw.js',
    'scripts/check-okachimachi-night-background.py',
    'scripts/check-regression-baseline.py',
    'scripts/check-pages-publish-policy.py',
    'scripts/check-seo.py',
    'scripts/generate-assets-manifest.py',
    'js/app.js',
    'js/kaitenzushi-embedded.js',
    'js/memories-screen.js',
    'js/game-data-core.js',
    'tools/test-audio-transitions.mjs',
    'js/audio-scene-map.js',
    'tools/test-store-staff-growth.mjs',
    'tools/test-workshop-staff-growth.mjs',
    'tools/validate-audio-scenes.mjs',
    'tools/validate-diamond-polishing-lap-event.mjs',
    'tools/validate-polishing-result-modal.mjs',
    'tools/validate-store-customer-indicator.mjs',
    'tools/validate-store-showcase-return.mjs',
    'tools/validate-store-staff.mjs',
    'tools/validate-time-and-meals.mjs',
    'tools/validate-workshop-staff.mjs',
    'viewport-shell.css',
    'viewport-shell.js',
    'workshop-staff-images-v754.js',
]
SOURCE_ORDER_RANK = {path: i for i, path in enumerate(SOURCE_ORDER)}

def source_files() -> list[tuple[Path, str]]:
    source_ext = {'.js', '.mjs', '.html', '.css', '.json', '.webmanifest', '.py'}
    result: list[tuple[Path, str]] = []
    for path in ROOT.rglob('*'):
        if not path.is_file() or path.suffix.lower() not in source_ext or 'assets' in path.parts:
            continue
        rel_parts = path.relative_to(ROOT).parts
        # Historical archive code is preserved for archaeology, not an active runtime/reference source.
        if len(rel_parts) >= 2 and rel_parts[0] == 'docs' and rel_parts[1] == 'archive':
            continue
        if '__pycache__' in rel_parts:
            continue
        try:
            text = path.read_text(encoding='utf-8', errors='ignore')
        except Exception:
            continue
        result.append((path, text))
    result.sort(key=lambda item: (SOURCE_ORDER_RANK.get(item[0].relative_to(ROOT).as_posix(), len(SOURCE_ORDER_RANK)), item[0].relative_to(ROOT).as_posix()))
    return result


def image_info(path: Path) -> tuple[str, str, str]:
    if path.suffix.lower() not in {'.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp', '.tif', '.tiff'}:
        return '', '', ''
    try:
        from PIL import Image
        with Image.open(path) as im:
            width, height = im.size
            orientation = '横' if width > height else ('縦' if height > width else '正方形')
            alpha = 'あり' if ('A' in im.getbands() or 'transparency' in im.info) else 'なし'
            return f'{width}×{height}', orientation, alpha
    except Exception:
        return '', '', ''


def refs_for(rel: str, basename: str, sources: list[tuple[Path, str]]) -> list[str]:
    exact: list[str] = []
    base: list[str] = []
    for path, text in sources:
        pos = text.find(rel)
        if pos >= 0:
            line = text[:pos].count('\n') + 1
            exact.append(f'{path.relative_to(ROOT)}:{line}')
            continue
        pos = text.find(basename)
        if pos >= 0:
            line = text[:pos].count('\n') + 1
            base.append(f'{path.relative_to(ROOT)}:{line} (basename)')
    return (exact or base)[:4]


def generate() -> str:
    version = (ROOT / 'VERSION').read_text(encoding='utf-8').strip()
    provenance = provenance_map()
    sources = source_files()
    assets = []
    for path in sorted((ROOT / 'assets').rglob('*')):
        if not path.is_file():
            continue
        rel = path.relative_to(ROOT).as_posix()
        ext = path.suffix.lower()
        if ext in {'.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp', '.tif', '.tiff', '.svg', '.avif'}:
            kind = '画像'
        elif ext in {'.wav', '.ogg', '.mp3', '.m4a', '.aac', '.flac'}:
            kind = '音源'
        elif ext in {'.mp4', '.webm', '.mov', '.mkv'}:
            kind = '動画'
        elif ext in {'.json', '.csv', '.txt'}:
            kind = 'データ'
        elif ext in {'.html', '.css', '.js'}:
            kind = 'ミニゲーム/コード'
        else:
            kind = 'その他'
        dim, orientation, alpha = image_info(path)
        prov = provenance.get(rel, {
            'source': '由来記録なし',
            'permission': '要確認（明示許可がない限り加工しない）',
        })
        assets.append({
            'rel': rel,
            'kind': kind,
            'dim': dim or '-',
            'orientation': orientation or '-',
            'alpha': alpha or '-',
            'bytes': path.stat().st_size,
            'sha': sha256(path),
            'source': prov['source'],
            'permission': prov['permission'],
            'refs': refs_for(rel, path.name, sources),
        })

    counts = Counter(item['kind'] for item in assets)
    refcount = sum(bool(item['refs']) for item in assets)
    out = [
        '# ASSETS — JEWELRY×JEWELRY',
        '',
        f'> 対象: **v{version}** / 棚卸し日: {TODAY}',
        '> `assets/` 配下を実ファイルから自動棚卸し。**参照なし = 不要とは限らない**（動的組み立て・CSS・ミニゲーム内部・将来予約の可能性があるため）。',
        '',
        '## アセット運用ルール',
        '',
        '- ユーザー提供画像は、明示許可がない限り **色・彩度・画風変更、再描画、生成し直しを禁止**する。',
        '- 「輪郭でトリミング・背景透明PNG」は、RGBを変更せずアルファ／余白処理だけを行うのを基本とする。',
        '- 新しい画像・音源を実装するときは、このファイルへ **ファイル名 / 使用場所 / 横縦 / 透明性 / 由来 / 加工可否** を追記する。',
        '- 由来が記録されていない既存アセットは、勝手に「GPT生成」「ユーザー提供」と決めない。変更前に確認する。',
        '- ファイル削除は `ASSETS.md` の参照欄だけで決めず、コード検索・PWAプリキャッシュ・動的パス・ミニゲーム参照を追加調査してから行う。',
        '- 同名差し替え時はSHA-256を更新し、意図しない画像差し替えを検出できるようにする。',
        '',
        '## 集計',
        '',
        f'- 総ファイル数: **{len(assets)}**',
    ]
    for kind in ['画像', '音源', '動画', 'データ', 'ミニゲーム/コード', 'その他']:
        if counts[kind]:
            out.append(f'- {kind}: **{counts[kind]}**')
    out.extend([
        f'- 静的な直接参照を検出: **{refcount}** / 直接参照未検出: **{len(assets) - refcount}**',
        '',
        '## 重要な由来記録',
        '',
        '- 直近引継ぎでユーザー提供と確認できる病院背景2枚、中華料理画像2枚は「変更禁止」として記録。',
        '- `TOOL_IMAGE_INTAKE_MANIFEST_*` で受領元ファイルが記録されている工具画像は「受領アセット」として記録。',
        '- それ以外は由来を推測せず「由来記録なし」とした。',
        '',
        '## 全アセット一覧',
        '',
        '| パス | 種別 | サイズ/画素 | 横縦 | 透明 | 使用場所（静的検出） | 由来 | 加工可否 | SHA-256 |',
        '|---|---|---:|---|---|---|---|---|---|',
    ])
    for item in assets:
        size = item['dim'] if item['dim'] != '-' else f"{item['bytes']:,} B"
        refs = '<br>'.join(f'`{ref}`' for ref in item['refs']) if item['refs'] else '直接参照未検出'
        vals = [item['rel'], item['kind'], size, item['orientation'], item['alpha'], refs, item['source'], item['permission'], item['sha']]
        vals = [str(v).replace('|', '\\|').replace('\n', ' ') for v in vals]
        out.append('| ' + ' | '.join(vals) + ' |')
    out.append('')
    return '\n'.join(out)


def main() -> int:
    parser = argparse.ArgumentParser()
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument('--write', action='store_true')
    mode.add_argument('--check', action='store_true')
    args = parser.parse_args()
    rendered = generate()
    if args.write:
        OUTPUT.write_text(rendered, encoding='utf-8')
        print('ASSETS MANIFEST: WROTE')
        return 0
    current = OUTPUT.read_text(encoding='utf-8') if OUTPUT.is_file() else ''
    if current != rendered:
        print('ASSETS MANIFEST: FAIL')
        print('- ASSETS.md が現在のassets/と静的参照に一致しません')
        return 1
    print('ASSETS MANIFEST: PASS')
    return 0


if __name__ == '__main__':
    sys.exit(main())
