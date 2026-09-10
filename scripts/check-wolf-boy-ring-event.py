#!/usr/bin/env python3
"""Regression guard for the approved Wolf Boy ring event."""
from __future__ import annotations

import hashlib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MODULE = ROOT / 'js/wolf-boy-ring-event.js'
BOOTSTRAP = ROOT / 'js/event-bootstrap.js'
HOTFIX = ROOT / 'js/wolf-boy-ring-event-hotfix.js'
GAME_HTML = ROOT / 'game.html'
CHARACTER = ROOT / 'assets/images/events/wolf-boy.png'
RING = ROOT / 'assets/images/events/wolf-boy-ring.png'
VIDEO = ROOT / 'assets/videos/wolf-boy-ring-event.mp4'

EXPECTED_SHA256 = {
    CHARACTER: 'd96c5a4299bfe42c65cc05f5cb861f5be7b72e3986f40807157573439520c128',
    RING: 'd0f428c3ee409bb39bba6f3fd9fa69729762bdab15ffe986185a1f278d79b7ff',
    VIDEO: 'e19c6d8d64023ad1b475d3dac049b8f27963b2f1ebdc6a0144c444b78a8695e6',
}

DIALOGUES = [
    'こんにちは、、ここ、指輪を作ってくれる店なんですか？、、',
    'この石で作って欲しくて、、、',
    'お母さまにあげるんです、、、、作ってくれますか？、、、、',
    '凄い！！きれい、、ありがとう御座います！、、、、、',
    'これなら、お母さまも喜んでくれるかな、、、',
    'また来ます、お礼をさせてもらいます、、ありがとうございました、、、',
]


def require(condition: bool, message: str) -> None:
    if not condition:
        raise SystemExit(f'NG: {message}')


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main() -> None:
    require(MODULE.exists(), 'wolf-boy-ring-event.js がありません')
    require(BOOTSTRAP.exists(), 'event-bootstrap.js がありません')
    require(not HOTFIX.exists(), '一時 hotfix が残っています')

    source = MODULE.read_text(encoding='utf-8')
    bootstrap = BOOTSTRAP.read_text(encoding='utf-8')
    game_html = GAME_HTML.read_text(encoding='utf-8')

    require("const MIN_DAY = 366;" in source, '1年以上の発生条件が固定されていません')
    require("const TRIGGER_CHANCE = 0.30;" in source, '店舗入店時30%条件が固定されていません')
    require("const BLACKOUT_MS = 2000;" in source, '暗転2秒が固定されていません')
    require("const MEMORY_KEY = 'wolfBoyRingEvent';" in source, '一度だけ発生の記録キーがありません')
    require("memoryAlreadySeen(snapshot)" in source, '既発生チェックがありません')
    require("Math.random() >= TRIGGER_CHANCE" in source, '30%抽選処理がありません')
    require("nextScreen === 'store'" in source, '店舗入店トリガーがありません')
    require("Boolean(fullState?.store?.rented)" in source, '店舗所有条件がありません')
    require("fullState?.tools?.items?.jewelryBench?.status === 'available'" in source, 'ジュエリー作成可能条件がありません')

    for text in DIALOGUES:
        require(text in source, f'登録済みセリフが一致しません: {text}')

    require("const CHARACTER_IMAGE = './assets/images/events/wolf-boy.png';" in source, '狼少年画像パスが違います')
    require("const RING_IMAGE = './assets/images/events/wolf-boy-ring.png';" in source, '指輪画像パスが違います')
    require("const VIDEO_URL = './assets/videos/wolf-boy-ring-event.mp4';" in source, '動画パスが違います')
    require("const RUBY_OVAL = './assets/images/loose/ruby/oval.png';" in source, '登録済みルビーオーバルを使用していません')
    require('お預かりする' in source, 'ルビー表示の案内文が違います')
    require("dialogueCard(DIALOGUES.intro3, true)" in source, '「はい」表示中のタップ案内非表示が固定されていません')
    require('class="tap-guide-text">タップして進む</span>' in source, 'タップ案内構造が違います')
    require('transform:scale(.58)!important' in source, 'Android文字自動拡大対策の縮小率が変わっています')
    require('left:-4px!important;top:-5px!important' in source, '横画面のタップ案内最終位置が変わっています')
    require('height:100dvh!important' in source and 'width:auto!important' in source, '横画面動画の高さ基準全体表示が変わっています')
    require('event-safety-recovery' in source, 'イベント終了ボタンがありません')
    require('MOVIEスキップ' in source, 'MOVIEスキップボタンがありません')
    require('background:transparent!important' in source, '通常イベントUIの透明セリフ枠が変わっています')
    require('cleanup({ completed: true });' in source, 'イベント終了時の復旧処理がありません')

    require("import './wolf-boy-ring-event.js?v=0.10.940';" in bootstrap, 'イベント起動口が本体を読み込んでいません')
    require('wolf-boy-ring-event-hotfix' not in bootstrap, 'event-bootstrap に hotfix 参照が残っています')
    require('<script type="module" src="./js/event-bootstrap.js?v=0.10.940"></script>' in game_html, 'game.html にイベント起動口がありません')

    for path, expected in EXPECTED_SHA256.items():
        require(path.exists(), f'{path.relative_to(ROOT)} がありません')
        actual = sha256(path)
        require(actual == expected, f'{path.relative_to(ROOT)} の内容が承認済みアセットと一致しません: {actual}')

    require(CHARACTER.read_bytes().startswith(b'\x89PNG\r\n\x1a\n'), '狼少年画像がPNGではありません')
    require(RING.read_bytes().startswith(b'\x89PNG\r\n\x1a\n'), '指輪画像がPNGではありません')
    video_head = VIDEO.read_bytes()[:32]
    require(b'ftyp' in video_head, 'イベント動画がMP4ではありません')

    print('OK: 狼少年・指輪イベントの発生条件・登録済みセリフ・通常イベントUI・承認済みアセットを確認しました。')


if __name__ == '__main__':
    main()
