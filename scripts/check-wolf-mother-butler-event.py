#!/usr/bin/env python3
"""Regression guard for the approved Wolf Mother / Butler event."""
from __future__ import annotations

import hashlib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MODULE = ROOT / 'js/wolf-mother-butler-event.js'
BOOTSTRAP = ROOT / 'js/event-bootstrap.js'
VERSION_FILE = ROOT / 'VERSION'
MOTHER = ROOT / 'assets/images/events/wolf-mother.png'
BUTLER = ROOT / 'assets/images/events/sheep-butler.png'
VIDEO = ROOT / 'assets/videos/events/wolf-mother-butler-event.mp4'
BGM = ROOT / 'assets/music/events/teeth_behind_the_glass.mp3'

EXPECTED_SHA256 = {
    MOTHER: '16ca7238c13c986a17c608d5a861e750ee0de34e9a82a935c93a39ddbf5edcb6',
    BUTLER: 'aa8f912ce0e3dfef4cfba0eacda3d6e852a4d828de191d3e235da6372b4b5a5e',
    VIDEO: '197bc8dee4ca7a783e9748daab6c3976b173a2ede3d255cf02e927c2f80cf699',
    BGM: '5a4ba334442e98d8baa69404f3b2ad4804b5925d1d7c405dc4797bbfcff36cd3',
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
    require(VERSION_FILE.exists(), 'VERSION がありません')

    version = VERSION_FILE.read_text(encoding='utf-8').strip()
    source = MODULE.read_text(encoding='utf-8')
    bootstrap = BOOTSTRAP.read_text(encoding='utf-8')

    # 狼少年イベントの後日談としての発生条件を固定する。
    require("const EVENT_KEY = 'wolfMotherButlerEvent';" in source, 'イベント記録キーが違います')
    require("const WOLF_BOY_MEMORY_KEY = 'wolfBoyRingEvent';" in source, '狼少年イベントとの連携キーが違います')
    require("const WOLF_MEMORY_KEY = 'wolfMotherVisitEvent';" in source, '母親の記録キーが違います')
    require("const BUTLER_MEMORY_KEY = 'sheepButlerVisitEvent';" in source, '執事の記録キーが違います')
    require('const DAYS_AFTER_WOLF_BOY = 7;' in source, '狼少年イベントから7日後条件が違います')
    require('const TRIGGER_CHANCE = 0.30;' in source, '店舗入店時30%条件が違います')
    require('currentDay >= firstSeenDay + DAYS_AFTER_WOLF_BOY' in source, '7日経過判定がありません')
    require("nextScreen === 'store'" in source, '店舗入店トリガーがありません')
    require('Math.random() >= TRIGGER_CHANCE' in source, '30%抽選処理がありません')
    require('if (eventState?.completed) return false;' in source, '一度だけ発生の完了判定がありません')
    require("patchEvent({ active:false, stage:'completed', completed:true, rewardGranted });" in source, '完了状態の保存がありません')

    # 登録済みセリフを一字も書き換えない。
    for text in DIALOGUES:
        require(text in source, f'登録済みセリフが一致しません: {text}')

    # 報酬仕様。
    require("const REWARD_METAL_KEY = 'gold';" in source, 'K18YG報酬の地金キーが違います')
    require('const REWARD_AMOUNT = 20;' in source, 'K18YG 20g報酬が違います')
    require("message:'K18YGが20g追加されました'" in source, '報酬メッセージが違います')
    require('grantMetalIgnoreCapacity?.(REWARD_METAL_KEY, REWARD_AMOUNT' in source, '容量無視の報酬付与処理がありません')
    require('if (!rewardGranted)' in source, '報酬二重付与防止がありません')

    # 正式アセットと専用BGM。
    require("const WOLF_IMAGE = './assets/images/events/wolf-mother.png';" in source, '母親画像パスが違います')
    require("const BUTLER_IMAGE = './assets/images/events/sheep-butler.png';" in source, '執事画像パスが違います')
    require("const VIDEO_URL = './assets/videos/events/wolf-mother-butler-event.mp4';" in source, '動画パスが違います')
    require("const EVENT_BGM_URL = './assets/music/events/teeth_behind_the_glass.mp3';" in source, '専用BGMパスが違います')
    require('const EVENT_BGM_VOLUME = 0.35;' in source, '専用BGM音量が違います')
    require('eventBgm.loop = true;' in source, '専用BGMのループがありません')
    require('suspendBgm();' in source, 'イベント開始時の通常BGM停止がありません')
    require("if (stage === 'movie') suspendAudio();" in source, '動画中の通常音声停止がありません')
    require('if (stage !== \'movie\') resumeAudio().catch(() => {});' in source, '会話中の環境音復帰がありません')
    require('stopEventBgm();' in source and 'await resumeBgm();' in source, 'イベント終了時の通常BGM復帰がありません')

    # MOVIE二重進行防止と通常イベントUI固定クラス。
    require('let movieFinishing = false;' in source, 'MOVIE二重進行防止状態がありません')
    require("if (!running || stage !== 'movie' || movieFinishing) return;" in source, 'MOVIE二重進行防止判定がありません')
    require('event-safety-recovery' in source, 'イベント終了ボタンがありません')
    require('MOVIEスキップ' in source, 'MOVIEスキップボタンがありません')
    require('visit-character-event kappa-jade-event' in source, '通常イベントUIのキャラクター領域を使用していません')
    require('main-screen kappa-jade-event-screen' in source, '通常イベントUI画面を使用していません')
    require('event-dialogue-card visit-event-dialogue glass-panel' in source, '通常イベントUIのセリフ枠を使用していません')
    require('kappa-jade-reward-button' in source, '通常イベントUIの報酬枠を使用していません')

    # VERSIONと独立モジュール起動口。
    require(f"from './audio.js?v={version}'" in source, 'audio.js参照VERSIONが同期していません')
    require(f"import './wolf-mother-butler-event.js?v={version}';" in bootstrap, 'event-bootstrapからイベント本体が読み込まれていません')

    for path, expected in EXPECTED_SHA256.items():
        require(path.exists(), f'{path.relative_to(ROOT)} がありません')
        actual = sha256(path)
        require(actual == expected, f'{path.relative_to(ROOT)} が承認済み正式アセットと一致しません: {actual}')

    require(MOTHER.read_bytes().startswith(b'\\x89PNG\\r\\n\\x1a\\n'), '母親画像がPNGではありません')
    require(BUTLER.read_bytes().startswith(b'\\x89PNG\\r\\n\\x1a\\n'), '執事画像がPNGではありません')
    require(b'ftyp' in VIDEO.read_bytes()[:32], 'イベント動画がMP4ではありません')
    bgm_head = BGM.read_bytes()[:4]
    require(bgm_head.startswith(b'ID3') or bgm_head[:2] in {b'\\xff\\xfb', b'\\xff\\xf3', b'\\xff\\xf2'}, '専用BGMがMP3ではありません')

    print('OK: 母親・執事イベントの発生条件・登録済みセリフ・通常イベントUI・報酬・音声制御・正式アセットを確認しました。')


if __name__ == '__main__':
    main()
