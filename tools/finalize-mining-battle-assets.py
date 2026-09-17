#!/usr/bin/env python3
from __future__ import annotations

from hashlib import sha256
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

EXPECTED = {
    'assets/minigames/mining-battle/mole.png': '9f2b578062a3e61058d7767acb56e7d0a6999c518569e35d2565256731de154c',
    'assets/minigames/mining-battle/bat.png': '346ebaef5a44a4993f8dc41e376672cc0058529810a14a5640d1924ae19ff218',
    'assets/minigames/mining-battle/pickaxe.png': '6b49221b6a77f287dc1d97a2f5c157bf443cee43c8c5608e0003e091a6d7e044',
}


def require_exact_assets() -> None:
    for rel, expected in EXPECTED.items():
        path = ROOT / rel
        if not path.is_file():
            raise SystemExit(f'missing approved asset: {rel}')
        raw = path.read_bytes()
        if not raw.startswith(b'\x89PNG\r\n\x1a\n'):
            raise SystemExit(f'not PNG: {rel}')
        actual = sha256(raw).hexdigest()
        if actual != expected:
            raise SystemExit(f'approved asset hash mismatch: {rel}: {actual}')


def replace_once(rel: str, old: str, new: str) -> None:
    path = ROOT / rel
    text = path.read_text(encoding='utf-8')
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'expected exactly one replacement in {rel}: {old!r}, found {count}')
    path.write_text(text.replace(old, new, 1), encoding='utf-8')


def main() -> None:
    require_exact_assets()
    replace_once(
        'js/events/mining-battle-event.js',
        "pickaxe: 'assets/images/equipment/basic-pickaxe.png'",
        "pickaxe: 'assets/minigames/mining-battle/pickaxe.png'",
    )
    replace_once(
        'assets/minigames/retro-battle/index.html',
        'background-image:url("../../images/equipment/basic-pickaxe.png")',
        'background-image:url("../mining-battle/pickaxe.png")',
    )
    replace_once(
        'tools/test-mining-battle-event.mjs',
        "assert.equal(MINING_BATTLE_REUSED_ASSETS.pickaxe, 'assets/images/equipment/basic-pickaxe.png');",
        "assert.equal(MINING_BATTLE_REUSED_ASSETS.pickaxe, 'assets/minigames/mining-battle/pickaxe.png');",
    )
    replace_once(
        'tools/test-mining-battle-integration.mjs',
        r"assert.match(battle, /\.\.\/\.\.\/images\/equipment\/basic-pickaxe\.png/);",
        r"assert.match(battle, /\.\.\/mining-battle\/pickaxe\.png/);",
    )
    print('approved mining battle assets verified and references finalized')


if __name__ == '__main__':
    main()
