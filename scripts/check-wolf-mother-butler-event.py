#!/usr/bin/env python3
"""Regression guard for the approved wolf mother / butler event."""
from __future__ import annotations

import hashlib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MODULE = ROOT / 'js/wolf-mother-butler-event.js'
BOOTSTRAP = ROOT / 'js/event-bootstrap.js'
CHARACTER_WOLF = ROOT / 'assets/images/events/wolf-mother.png'
CHARACTER_BUTLER = ROOT / 'assets/images/events/sheep-butler.png'
VIDEO = ROOT / 'assets/videos/events/wolf-mother-butler-event.mp4'

EXPECTED_SHA256 = {
    CHARACTER_WOLF: '34ae706b461aab584a8f505036253aa69a46b9c115912bbbde3927b12597f768',
    CHARACTER_BUTLER: '10a4321756ede50c9c135c848a3fc308e71bd48b1fcd044c759d2361e812e1ba',
    VIDEO: 'c494b907c03bffcdcddc1d3c3676bd026b84657f3732c5b2cbdfe25948b69ee0',
}

DIALOGUES = [
    '失礼いたします、、こちらで先日、坊ちゃまが指輪を作っていただいたと聞きまして、、、狼のマスクをした羊の子供です、、、',
    'おまえが、あの指輪を作った職人か？、、、',
    '坊ちゃまが、大変お世話になったようでございます、、、',
    '奥様は、たいそう喜んでおられました、、、、ありがとうございました、、、',
    '黙れ、、、',
    '今日はどの程度の店か見に来ただけだ、、、、\\nあと、、、まだ支払いも済ませていないようだな、、、あの恥知らずが、、、、',
    'こちらをお収めください、、、、',
    '今後私の身につけるものは全てこの店に任せる、、、また来る、、、、',
    'それでは、失礼致します、、、',
]


def require(condition: bool, message: str) -> None:
    if not condition:
        raise SystemExit(f'NG: {message}')


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main() -> None:
    require(MODULE.exists(), 'wolf-mother-butler-event.js がありません')
    require(BOOTSTRAP.exists(), 'event-bootstrap.js がありません')
    source = MODULE.read_text(encoding='utf-8')
    bootstrap = BOOTSTRAP.read_text(encoding='utf-8')
    version = (ROOT / 'VERSION').read_text(encoding='utf-8').strip()

    require("const WOLF_BOY_MEMORY_KEY = 'wolfBoyRingEvent';" in source, '狼少年イベント依存が固定されていません')
    require("const WOLF_MEMORY_KEY = 'wolfMotherVisitEvent';" in source, '一度だけ発生の記録キーがありません')
    require('wolfBoyFirstSeenDay(stateSnapshot)' in source, '狼少年の発生日参照がありません')
    require('currentDay >= firstSeenDay + DAYS_AFTER_WOLF_BOY' in source, '狼少年から7日後の判定がありません')
    require('const DAYS_AFTER_WOLF_BOY = 7;' in source, '7日後条件が固定されていません')
    require('const TRIGGER_CHANCE = 0.30;' in source, '店舗入店時30%条件が固定されていません')
    require("nextScreen === 'store'" in source, '店舗入店トリガーがありません')
    require('Math.random() >= TRIGGER_CHANCE' in source, '30%抽選処理がありません')
    require('memoryAlreadySeen(stateSnapshot, WOLF_MEMORY_KEY)' in source, '既発生チェックがありません')

    for text in DIALOGUES:
        require(text in source, f'登録済みセリフが一致しません: {text}')

    require("const WOLF_IMAGE = './assets/images/events/wolf-mother.png';" in source, '狼画像パスが違います')
    require("const BUTLER_IMAGE = './assets/images/events/sheep-butler.png';" in source, '執事画像パスが違います')
    require("const K18_IMAGE = './assets/images/metals/k18yg.png';" in source, '既存K18画像を使用していません')
    require("const VIDEO_URL = './assets/videos/events/wolf-mother-butler-event.mp4';" in source, '動画パスが違います')
    require("const REWARD_METAL_KEY = 'gold';" in source, 'K18報酬の地金キーが違います')
    require('const REWARD_AMOUNT = 20;' in source, 'K18 20g報酬が固定されていません')
    require('live.inventory.metals[REWARD_METAL_KEY] = Math.round((current + REWARD_AMOUNT) * 10) / 10;' in source,
            '保管上限を通さずK18を20g加算する処理がありません')

    require('workshopKappaJadeEvent' in source, '承認済み通常イベントUIの画面基準を使用していません')
    require('visit-character-event kappa-jade-event' in source, '承認済み通常イベントUIのキャラクター領域を使用していません')
    require('event-dialogue-card visit-event-dialogue glass-panel' in source, '承認済み通常イベントUIのセリフ枠を使用していません')
    require('kappa-jade-reward-button' in source, '承認済み通常イベントUIの報酬枠を使用していません')
    require('event-safety-recovery' in source, 'イベント終了ボタンがありません')
    require('MOVIEスキップ' in source, 'MOVIEスキップボタンがありません')
    require('suspendAudio()' in source and 'await resumeAudio().catch(() => {});' in source,
            '動画中の通常音停止／動画後の復帰処理がありません')
    require('BGM_URL' not in source and 'new Audio(' not in source, '未承認のイベント専用BGMが追加されています')

    require(f"import './wolf-mother-butler-event.js?v={version}';" in bootstrap, 'イベント起動口のバージョン同期が取れていません')
    require(f"from './audio.js?v={version}';" in source, 'audio.js参照のバージョン同期が取れていません')

    for path, expected in EXPECTED_SHA256.items():
        require(path.exists(), f'{path.relative_to(ROOT)} がありません')
        actual = sha256(path)
        require(actual == expected, f'{path.relative_to(ROOT)} が承認済み実装用アセットと一致しません: {actual}')

    require(CHARACTER_WOLF.read_bytes().startswith(b'\\x89PNG\\r\\n\\x1a\\n'), '狼画像がPNGではありません')
    require(CHARACTER_BUTLER.read_bytes().startswith(b'\\x89PNG\\r\\n\\x1a\\n'), '執事画像がPNGではありません')
    require(b'ftyp' in VIDEO.read_bytes()[:32], 'イベント動画がMP4ではありません')

    print('OK: 狼・執事イベントの発生条件・登録済みセリフ・通常イベントUI・K18報酬・承認済みアセットを確認しました。')


if __name__ == '__main__':
    main()
