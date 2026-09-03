# ASSETS — JEWELRY×JEWELRY

> 対象: **v0.10.852** / 棚卸し日: 2026-08-30
> `assets/` 配下を実ファイルから自動棚卸し。**参照なし = 不要とは限らない**（動的組み立て・CSS・ミニゲーム内部・将来予約の可能性があるため）。

## アセット運用ルール

- ユーザー提供画像は、明示許可がない限り **色・彩度・画風変更、再描画、生成し直しを禁止**する。
- 「輪郭でトリミング・背景透明PNG」は、RGBを変更せずアルファ／余白処理だけを行うのを基本とする。
- 新しい画像・音源を実装するときは、このファイルへ **ファイル名 / 使用場所 / 横縦 / 透明性 / 由来 / 加工可否** を追記する。
- 由来が記録されていない既存アセットは、勝手に「GPT生成」「ユーザー提供」と決めない。変更前に確認する。
- ファイル削除は `ASSETS.md` の参照欄だけで決めず、コード検索・PWAプリキャッシュ・動的パス・ミニゲーム参照を追加調査してから行う。
- 同名差し替え時はSHA-256を更新し、意図しない画像差し替えを検出できるようにする。

## 集計

- 総ファイル数: **581**
- 画像: **456**
- 音源: **100**
- 動画: **12**
- データ: **8**
- ミニゲーム/コード: **4**
- その他: **1**
- 静的な直接参照を検出: **458** / 直接参照未検出: **123**

## 重要な由来記録

- 直近引継ぎでユーザー提供と確認できる病院背景2枚、中華料理画像2枚は「変更禁止」として記録。
- `TOOL_IMAGE_INTAKE_MANIFEST_*` で受領元ファイルが記録されている工具画像は「受領アセット」として記録。
- それ以外は由来を推測せず「由来記録なし」とした。

## 全アセット一覧

| パス | 種別 | サイズ/画素 | 横縦 | 透明 | 使用場所（静的検出） | 由来 | 加工可否 | SHA-256 |
|---|---|---:|---|---|---|---|---|---|
| assets/audio/amb-craft.ogg | 音源 | 935,503 B | - | - | `tools/test-audio-transitions.mjs:58 (basename)`<br>`js/audio-scene-map.js:47 (basename)` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 2c29c50bd6d87ea721e5577b0281c0c429f23ac70c2f5ccd20096d48ccc54612 |
| assets/audio/amb-displayShop.ogg | 音源 | 690,138 B | - | - | `js/audio-scene-map.js:62 (basename)` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 746316abd2b0db2664c5fb6278f76e216ec4bb94d8f782c61e0a42803c8264c3 |
| assets/audio/amb-glab.ogg | 音源 | 935,503 B | - | - | `js/audio-scene-map.js:87 (basename)` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 2c29c50bd6d87ea721e5577b0281c0c429f23ac70c2f5ccd20096d48ccc54612 |
| assets/audio/amb-hospital-clock.wav | 音源 | 176,444 B | - | - | `sw.js:24` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 3f63dbe400e9c51c3183d14748bd4d5f354e1cfc8693248d8a5e0c4b78e53438 |
| assets/audio/amb-jewelryShop.ogg | 音源 | 690,138 B | - | - | `js/audio-scene-map.js:77 (basename)` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 5a2a8e4a00bb1a38a20f2931bd5c0d2a7fffb49027a6185dbad34803b1fcb472 |
| assets/audio/amb-looseShop.ogg | 音源 | 69,323 B | - | - | `js/audio-scene-map.js:72 (basename)` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 061258b3b0ec7934257862233c2fd31e5506d6a7448449ac46a9b7327f7d0017 |
| assets/audio/amb-main-clear.ogg | 音源 | 400,175 B | - | - | 直接参照未検出 | 由来記録なし | 要確認（明示許可がない限り加工しない） | dcd17223b186feb1fa710e1871a8697b101e017c930df96c025e09d7932db1a7 |
| assets/audio/amb-main-cloudy.ogg | 音源 | 899,087 B | - | - | `tools/test-audio-transitions.mjs:81 (basename)` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 4b8171e5ffd0fff412c2aae778c5bfacbba00d0d640cf79b26f376fe5c0d5fa2 |
| assets/audio/amb-main-rain.ogg | 音源 | 1,163,746 B | - | - | `tools/test-audio-transitions.mjs:51 (basename)` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 2fb156204ad03826811f594fc93a4591d08c9254ae8fc45926eaea291f068272 |
| assets/audio/amb-main-snow.ogg | 音源 | 1,074,444 B | - | - | `tools/test-audio-transitions.mjs:73 (basename)` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 4ea39368c6693ce7015a2549150036ef8036bf992f8ec0332105e3d9ca2e6e24 |
| assets/audio/amb-main.ogg | 音源 | 95,067 B | - | - | 直接参照未検出 | 由来記録なし | 要確認（明示許可がない限り加工しない） | 675dde35cf3f17853f6c2bd16dd7102d094427dbced54fb7460b0b9b3cf296ec |
| assets/audio/amb-materialShop.ogg | 音源 | 693,674 B | - | - | `js/audio-scene-map.js:67 (basename)` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 7ba06a6b82beaafc1600857139443c07a4f8b893ec5f441997d3525b76e16d4f |
| assets/audio/amb-meal-chinese.ogg | 音源 | 169,545 B | - | - | `js/audio-scene-map.js:189 (basename)` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 5280d635703dc799ddadc4466ed85c4b61a2bec467c4c4756c7039b15edfddf2 |
| assets/audio/amb-meal-convenience.ogg | 音源 | 165,051 B | - | - | `js/audio-scene-map.js:135 (basename)` | 由来記録なし | 要確認（明示許可がない限り加工しない） | c2fb1f2c7e7e2f7a6d7fb3ba30285a07dfaedcf61feca962f8ec4a7104205d21 |
| assets/audio/amb-meal-hamburger.ogg | 音源 | 174,971 B | - | - | `js/audio-scene-map.js:162 (basename)` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 3f766960081325ce17b538d4e48824a097d86e57ac5675c0c429195a183f8903 |
| assets/audio/amb-meal-ice.ogg | 音源 | 345,446 B | - | - | `js/app.js:2224` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 2a9ac419615a12f573ae9b310d94c8be811b70d39f0955a18377591c9f9a83d0 |
| assets/audio/amb-meal-indian.ogg | 音源 | 175,752 B | - | - | `js/audio-scene-map.js:171 (basename)` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 5607ad1d9309571ead152005130a66f08c2386f5a3bd79749ef5e8219a096566 |
| assets/audio/amb-meal-kebab.ogg | 音源 | 176,272 B | - | - | `js/audio-scene-map.js:198 (basename)` | 由来記録なし | 要確認（明示許可がない限り加工しない） | a910c6017e87a25f3b7a428b713416d744d6e607b1ec1920b73cf11946bbe59f |
| assets/audio/amb-meal-korean.ogg | 音源 | 186,398 B | - | - | `js/audio-scene-map.js:180 (basename)` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 04370b99cc3915e581985e52e2653ef0fb72244f4ee057958e6c5745b9658f08 |
| assets/audio/amb-meal-ramen.ogg | 音源 | 168,732 B | - | - | `tools/test-audio-transitions.mjs:73 (basename)`<br>`js/audio-scene-map.js:153 (basename)` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 2ab653455adbe3a6af34d099e9de65f04071b5941aa6d4e4fb307169a4457005 |
| assets/audio/amb-meal-soba.ogg | 音源 | 171,436 B | - | - | `js/audio-scene-map.js:144 (basename)` | 由来記録なし | 要確認（明示許可がない限り加工しない） | f87a3a02b1098ee0ade56fd89b12bfa3c7943c812b630895c5604b5d9bfbda8d |
| assets/audio/amb-meal.ogg | 音源 | 174,182 B | - | - | `js/audio-scene-map.js:126 (basename)` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 2eef4dc6621e17afd10e88253acb054d1a9bd44f6353229624b54c8e948aec71 |
| assets/audio/amb-mining.ogg | 音源 | 596,934 B | - | - | `js/audio-scene-map.js:37 (basename)` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 28dd19a2f5983987aecbca702e91eb0989db6114f3b951015d94e0d0cf12a4fb |
| assets/audio/amb-okachimachi-invasive-turtles-boombox.ogg | 音源 | 218,077 B | - | - | `js/app.js:296` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 3d7b42bb55fbb268cd103a689f6839bc1badfebd9b620b4e9fdc9db5da358f21 |
| assets/audio/amb-okachimachi.ogg | 音源 | 101,904 B | - | - | 直接参照未検出 | 由来記録なし | 要確認（明示許可がない限り加工しない） | a4b0e8383e505020be52808e1e3a98933e277834726799c02d4669358eb4801c |
| assets/audio/amb-phone.ogg | 音源 | 405,246 B | - | - | `tools/validate-audio-scenes.mjs:87` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 18a3b5fb1ed11d16ff3f4df2d47a960d55b62e56ce3e13d49c0de4394e1dc76d |
| assets/audio/amb-polishing.ogg | 音源 | 1,030,399 B | - | - | `tools/test-audio-transitions.mjs:59 (basename)`<br>`js/audio-scene-map.js:52 (basename)` | 由来記録なし | 要確認（明示許可がない限り加工しない） | dae957e605a172850d506178d8a2668a506bd5e6a244e8996080999de338423a |
| assets/audio/amb-realEstate.ogg | 音源 | 1,089,758 B | - | - | `js/audio-scene-map.js:82 (basename)` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 584ef7ba1f34680f04fa2a72da900d5a0d4b734e235da6ee82753282bd0b6fa2 |
| assets/audio/amb-sleep.ogg | 音源 | 92,236 B | - | - | `js/audio-scene-map.js:117 (basename)` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 224c7de498006a469c306f1de5b923abaef72c9c5ada7f34501fd107738342b7 |
| assets/audio/amb-store.ogg | 音源 | 690,138 B | - | - | `js/audio-scene-map.js:57 (basename)` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 5a2a8e4a00bb1a38a20f2931bd5c0d2a7fffb49027a6185dbad34803b1fcb472 |
| assets/audio/amb-street-crowd.ogg | 音源 | 770,782 B | - | - | `tools/test-audio-transitions.mjs:73 (basename)`<br>`js/audio-scene-map.js:92 (basename)` | 由来記録なし | 要確認（明示許可がない限り加工しない） | ea5866208a65d0fd471c7701cc301cd8e246449b93fb14dd6cf1ece68a7f10a0 |
| assets/audio/amb-tropical-fish-shop.wav | 音源 | 2,646,044 B | - | - | `js/audio-scene-map.js:98 (basename)` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 019aa21bae6451811b635387562e7e48a4123246852e1e0d7b476c632e7e109e |
| assets/audio/amb-workshop.ogg | 音源 | 94,064 B | - | - | `js/audio-scene-map.js:42 (basename)` | 由来記録なし | 要確認（明示許可がない限り加工しない） | f8ee8b5da7fb9e0dece529a8ed62229049b8262cfbf3a460249cafae31fb19e6 |
| assets/audio/amb-wrist-found-dark.ogg | 音源 | 798,688 B | - | - | `js/audio-scene-map.js:108 (basename)` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 5eb80177c74971c9b28222529568cb236b3424714ba666d38e633800dd31d6be |
| assets/audio/bgm-blues-juke.mp3 | 音源 | 842,648 B | - | - | `js/audio-scene-map.js:18 (basename)` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 54036e328cb1b12e0035acd8cc197afd436a70174cdab26a4f5cb68150e30150 |
| assets/audio/bgm-glab.ogg | 音源 | 222,413 B | - | - | `js/audio-scene-map.js:86 (basename)` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 8b67b31197421440261fe7bcac97886e7ccdf73beadf88d3b863d2e4a2a93473 |
| assets/audio/bgm-main.ogg | 音源 | 97,923 B | - | - | `tools/test-audio-transitions.mjs:50 (basename)`<br>`js/audio-scene-map.js:26 (basename)` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 44c72e2a7d946b9791ba22f4e74afe8b96fc7dd58f125e943ec047cedf7de36e |
| assets/audio/bgm-meal-chinese.ogg | 音源 | 163,587 B | - | - | `js/audio-scene-map.js:188 (basename)` | 由来記録なし | 要確認（明示許可がない限り加工しない） | bf43a80409291c145b5e1ea8d5e88704ccb0852fc1a58d7e41dee47f83598d70 |
| assets/audio/bgm-meal-convenience.ogg | 音源 | 149,384 B | - | - | `js/audio-scene-map.js:134 (basename)` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 62feb14ab24c1329e54245ffd5725679da587bcf0035c84147bdca42868d51e3 |
| assets/audio/bgm-meal-hamburger.ogg | 音源 | 186,979 B | - | - | `js/audio-scene-map.js:161 (basename)` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 7b7a86a4ee484029e1873e1dc34fde4787440879381d4977d6ac03d4c1a9266a |
| assets/audio/bgm-meal-ice.ogg | 音源 | 300,928 B | - | - | `js/app.js:2218` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 3a4834739ad764343486a8b48fa61b6efcf40e3b59751e0be44bcec041c306a5 |
| assets/audio/bgm-meal-indian.ogg | 音源 | 155,570 B | - | - | `js/audio-scene-map.js:170 (basename)` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 2c7a9d468f99828d4c8cf4b74e7554ca8b7e248749c163d5104598f17d42ecb0 |
| assets/audio/bgm-meal-kebab.ogg | 音源 | 153,013 B | - | - | `js/audio-scene-map.js:197 (basename)` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 007ce068f04cbcaf5e579ea2def8df30383cee0b2354994a72e5688ba6af7e3d |
| assets/audio/bgm-meal-korean.ogg | 音源 | 103,510 B | - | - | `js/audio-scene-map.js:179 (basename)` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 1f0c7ee1677d5e17aa14456b7d872f2ce806df2db5974efe7eabb646f4f59b83 |
| assets/audio/bgm-meal-ramen.ogg | 音源 | 165,743 B | - | - | `tools/test-audio-transitions.mjs:73 (basename)`<br>`js/audio-scene-map.js:152 (basename)` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 2fcca6da35b52d1107cb95193c27bef1cd62fbf11fdb4c2928d0eaf343815d0d |
| assets/audio/bgm-meal-soba.ogg | 音源 | 93,034 B | - | - | `js/audio-scene-map.js:143 (basename)` | 由来記録なし | 要確認（明示許可がない限り加工しない） | ab37e1cd68c43c0b2b1bb933731d027ec4559a3725cdecabddacfbd47ca710b4 |
| assets/audio/bgm-meal.ogg | 音源 | 168,641 B | - | - | `js/audio-scene-map.js:125 (basename)` | 由来記録なし | 要確認（明示許可がない限り加工しない） | b38b184cf6c99ff50c8ef0f663d24a48645b72bff7f333658b6592fd5c58aaf8 |
| assets/audio/bgm-mining.ogg | 音源 | 89,509 B | - | - | `js/audio-scene-map.js:36 (basename)` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 9087c169cc9c7c497a457a722c12710989ed7ac821b0fa0b85abdc293cf8875e |
| assets/audio/bgm-okachimachi.ogg | 音源 | 84,709 B | - | - | `tools/test-audio-transitions.mjs:67 (basename)`<br>`js/audio-scene-map.js:61 (basename)` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 8e5631c81a3cd02c93bd555e5fd39d794df68db608b99c4c4375407cf68c1c8f |
| assets/audio/bgm-phone.ogg | 音源 | 191,519 B | - | - | `tools/validate-audio-scenes.mjs:87` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 7409e4dcca324bd460d648d3a3346e8151b89b9b477eb0774aac12c162c081eb |
| assets/audio/bgm-sleep.ogg | 音源 | 102,204 B | - | - | `js/audio-scene-map.js:116 (basename)` | 由来記録なし | 要確認（明示許可がない限り加工しない） | dc2a393cf7c75b9717ee3f61aba63910205341c330e24d6a172cb5ece7af5ba2 |
| assets/audio/bgm-store.ogg | 音源 | 94,528 B | - | - | `js/audio-scene-map.js:56 (basename)` | 由来記録なし | 要確認（明示許可がない限り加工しない） | e3610f183238c9ebedd0521493eaf48b7e22cb2e7a9aae9d6f07c85c50542180 |
| assets/audio/bgm-tropical-fish-shop.wav | 音源 | 10,584,044 B | - | - | `js/audio-scene-map.js:97 (basename)` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 9a6e1682a947d0ce825750f8848c1a6dff63adc8c291e2061b963af1bd55e7f5 |
| assets/audio/bgm-white-bunny.ogg | 音源 | 655,091 B | - | - | `js/app.js:373` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 021017cd753cdd285133203ead78eeafd54f903d80287a3468cbc7132169e069 |
| assets/audio/bgm-workshop.ogg | 音源 | 92,301 B | - | - | `tools/test-audio-transitions.mjs:57 (basename)`<br>`js/audio-scene-map.js:41 (basename)` | 由来記録なし | 要確認（明示許可がない限り加工しない） | b0dde4f9a631a1f642c3ff258555b30bef8675aaacdcfb27de14b78e4812666c |
| assets/audio/bgm-wrist-found-dark.ogg | 音源 | 102,744 B | - | - | `js/audio-scene-map.js:107 (basename)` | 由来記録なし | 要確認（明示許可がない限り加工しない） | d0b916d1a7185b57a07446e373646e67077f3cfbe530642e26dfba8b0cc484c5 |
| assets/audio/quiz_correct_sfx.mp3 | 音源 | 41,421 B | - | - | `js/audio.js:579 (basename)` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 944c471ff4144bb150b47e2f92b98dbe2868541317abfda4d7a33d3fa34700d9 |
| assets/audio/quiz_incorrect_sfx.mp3 | 音源 | 36,405 B | - | - | `js/audio.js:580 (basename)` | 由来記録なし | 要確認（明示許可がない限り加工しない） | a5e7707df9212d5b3ba0fef92b94c59a383f79e30540b86d34fac5d4ed74f049 |
| assets/audio/quiz_show_thinking_bgm_60s_loop.mp3 | 音源 | 1,441,375 B | - | - | `js/audio-scene-map.js:112 (basename)` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 061ae5fd684212855f708e40b937070c1f8a7c50d7b3fb0743ba94b1e44a377f |
| assets/audio/sfx-alarm.ogg | 音源 | 14,991 B | - | - | 直接参照未検出 | 由来記録なし | 要確認（明示許可がない限り加工しない） | cdc4ef52d1fcf5ae2e58f36013454549ed1d2357654aabc2597ce18f929d2fd4 |
| assets/audio/sfx-barcode-beeps.ogg | 音源 | 5,336 B | - | - | 直接参照未検出 | 由来記録なし | 要確認（明示許可がない限り加工しない） | f48fc40cb46c4325398641915ef4c871f6e71cabd92701417eadc315bd37abf1 |
| assets/audio/sfx-blues-juke-cheer.wav | 音源 | 189,674 B | - | - | `js/audio.js:587 (basename)` | 由来記録なし | 要確認（明示許可がない限り加工しない） | d579f33c0934ba7113eba71b6b3dea50936c452ad957a080faec63f6bc5ba26b |
| assets/audio/sfx-bomb-jii-appear.ogg | 音源 | 14,413 B | - | - | 直接参照未検出 | 由来記録なし | 要確認（明示許可がない限り加工しない） | ae15b1cbf8934c396beed8cf1a8a7e40ba99130fc37feb137e43b939cc037ad0 |
| assets/audio/sfx-coin.ogg | 音源 | 8,498 B | - | - | 直接参照未検出 | 由来記録なし | 要確認（明示許可がない限り加工しない） | 00c558a7968fa54e70468eead72a4e66fa1c4a016fbaccef38855493d41ade48 |
| assets/audio/sfx-dig.ogg | 音源 | 7,782 B | - | - | 直接参照未検出 | 由来記録なし | 要確認（明示許可がない限り加工しない） | 560287d6d3bfc7c60ab7ec1f3d62c4278f556f39a7a5fe46bf941b3bf1448e47 |
| assets/audio/sfx-earth-dig.ogg | 音源 | 16,518 B | - | - | 直接参照未検出 | 由来記録なし | 要確認（明示許可がない限り加工しない） | ff214e3b78942023d513909a76d1d64ab33e0b5ac63de1ce4ef773f0e458e0d6 |
| assets/audio/sfx-eat.ogg | 音源 | 12,226 B | - | - | `js/app.js:15395 (basename)` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 3287c08b6612ad22dc6d6c04dd9b186a0f921a7c3eff0cc41899b156060cf401 |
| assets/audio/sfx-error.ogg | 音源 | 4,330 B | - | - | 直接参照未検出 | 由来記録なし | 要確認（明示許可がない限り加工しない） | fc3a5bbf11dd785e18c4602a8919a284f1a835ff0128b801a0a3b404e9461b97 |
| assets/audio/sfx-explosion.ogg | 音源 | 17,805 B | - | - | 直接参照未検出 | 由来記録なし | 要確認（明示許可がない限り加工しない） | 07f505b8f642cc76b5eccd164648d5c54fed62429891d9bd1f813579ed30db0f |
| assets/audio/sfx-ganesha-appear.ogg | 音源 | 18,137 B | - | - | 直接参照未検出 | 由来記録なし | 要確認（明示許可がない限り加工しない） | 817aa59a9f3d8b5e5d39747ade46b0138fe9a54950e763d1e78c46a05c7b2ba3 |
| assets/audio/sfx-ganesha-gift.ogg | 音源 | 9,254 B | - | - | 直接参照未検出 | 由来記録なし | 要確認（明示許可がない限り加工しない） | d0f1fa86bd8f9b436741bf42e00390f629cb7bea55afa97e60faaf4a42171f98 |
| assets/audio/sfx-haunting-appear.wav | 音源 | 123,522 B | - | - | `js/audio.js:581 (basename)` | 由来記録なし | 要確認（明示許可がない限り加工しない） | e8533fa76fd714258817e02ba8850b9eb1f6b3f0f51f79a68921838c72f3f1a2 |
| assets/audio/sfx-haunting-whisper.wav | 音源 | 75,014 B | - | - | `js/audio.js:582 (basename)` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 80f82575be6a1e2fec9d55beb3266172fc5e3f776f2518137a34fc0e62cad115 |
| assets/audio/sfx-impact.ogg | 音源 | 5,475 B | - | - | 直接参照未検出 | 由来記録なし | 要確認（明示許可がない限り加工しない） | 63c93a8ab3f4b900302a6c9dfa42209598d047decf5a8f725ec4c347b2c30c15 |
| assets/audio/sfx-jade-gift.wav | 音源 | 149,984 B | - | - | `js/audio.js:586 (basename)` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 6bb6abfdcac7c99928c3666da8bd06eb2edb9b05043f7ca480447fc28d77d26f |
| assets/audio/sfx-jewelry-complete.ogg | 音源 | 69,877 B | - | - | 直接参照未検出 | 由来記録なし | 要確認（明示許可がない限り加工しない） | fbfed4e8c6ae6380961d3b3652daad1bcb02b52663ec06c1a6dd315daadcb531 |
| assets/audio/sfx-kappa-appear.wav | 音源 | 101,472 B | - | - | `js/audio.js:585 (basename)` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 5d52cdf55a26f52769b242434dea327fc5a599c78367c385a4cd59bb008b0bd8 |
| assets/audio/sfx-levelup.ogg | 音源 | 8,287 B | - | - | 直接参照未検出 | 由来記録なし | 要確認（明示許可がない限り加工しない） | 122e255b643dff388e5d7521c2a096a70c028d8c07bbfcd55c39532a3d92038a |
| assets/audio/sfx-loose-sparkle.ogg | 音源 | 24,349 B | - | - | 直接参照未検出 | 由来記録なし | 要確認（明示許可がない限り加工しない） | 63eba0efd95d12426dad568e8e79576c1cf0db820d8552ef366000c44c0f89e8 |
| assets/audio/sfx-mermaid-splash.ogg | 音源 | 15,122 B | - | - | 直接参照未検出 | 由来記録なし | 要確認（明示許可がない限り加工しない） | 5e65e113e33230452f2dfb494d502429ae3c655581fb2b129b27d4a851a49262 |
| assets/audio/sfx-mining-miss.ogg | 音源 | 6,902 B | - | - | 直接参照未検出 | 由来記録なし | 要確認（明示許可がない限り加工しない） | cd0c3f666f3e03c90185a1cc7fdb02625ab05b87e9fd8b5bea6d25560ccdfc63 |
| assets/audio/sfx-mining-win.ogg | 音源 | 8,148 B | - | - | 直接参照未検出 | 由来記録なし | 要確認（明示許可がない限り加工しない） | ab5218a076ae65439c686bf368f7fac016577effad840de94d64d631eb1959fc |
| assets/audio/sfx-old-lady-appear.wav | 音源 | 97,064 B | - | - | `js/audio.js:583 (basename)` | 由来記録なし | 要確認（明示許可がない限り加工しない） | f11b126185f2e845ce889cafeec86e77a95866e666f4c5fd5db0a26c76ae18d7 |
| assets/audio/sfx-panda-music-event.ogg | 音源 | 140,865 B | - | - | `js/app.js:371` | 由来記録なし | 要確認（明示許可がない限り加工しない） | fd5de96d164c5895d313cbf60b377839b634a191678770878cb58adfad725dcd |
| assets/audio/sfx-police-siren.ogg | 音源 | 33,282 B | - | - | `js/audio.js:599 (basename)` | 由来記録なし | 要確認（明示許可がない限り加工しない） | c613f27e0b14c51d29cabf0dfc03557826bf16129ffc38a0e9d8cb9cfce9d1b6 |
| assets/audio/sfx-pyuu.wav | 音源 | 72,368 B | - | - | `js/audio.js:588 (basename)` | 由来記録なし | 要確認（明示許可がない限り加工しない） | c9b2bfb5ddc50038073e40ebcda5f0d7580f8e48e74f09d78825b1f415276d15 |
| assets/audio/sfx-quiz-intro.ogg | 音源 | 13,946 B | - | - | 直接参照未検出 | 由来記録なし | 要確認（明示許可がない限り加工しない） | 6b172a1e5c7c2f729ea73ad5f5b9c99df2aec433572f9e70b897e8bf62ce96fa |
| assets/audio/sfx-quiz-question.ogg | 音源 | 6,458 B | - | - | 直接参照未検出 | 由来記録なし | 要確認（明示許可がない限り加工しない） | c8956aeb57551a16a6f8a5942523a5b807e79cf213e14879af0e6db3d8ee2161 |
| assets/audio/sfx-sale.ogg | 音源 | 11,667 B | - | - | 直接参照未検出 | 由来記録なし | 要確認（明示許可がない限り加工しない） | b7e2f202665c47ae042bce355b21664c27e00ed13512cea289f93998db9fa216 |
| assets/audio/sfx-select.ogg | 音源 | 3,774 B | - | - | `js/audio.js:264 (basename)` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 96bf5cacca033ef597c59605e57306153a64d2f0aa28453ae1b6e47ff1b0ee8a |
| assets/audio/sfx-shoplift-steal.wav | 音源 | 83,834 B | - | - | `js/audio.js:584 (basename)` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 0ab578221930f2bec9f91ab45dd39a09d3d2a476aa7f8548973b19cbea8eb78a |
| assets/audio/sfx-sleep.ogg | 音源 | 18,620 B | - | - | 直接参照未検出 | 由来記録なし | 要確認（明示許可がない限り加工しない） | d009c7d066a55f1beb19a3f83e67053a6f1993c8258ef7064d5990b784d8a4a4 |
| assets/audio/sfx-success.ogg | 音源 | 4,720 B | - | - | 直接参照未検出 | 由来記録なし | 要確認（明示許可がない限り加工しない） | 60dac79dcc9b30f611c6a58973a39a048775012a365f33afe4614ce339b15f8a |
| assets/audio/sfx-western-union-arrival.ogg | 音源 | 21,102 B | - | - | 直接参照未検出 | 由来記録なし | 要確認（明示許可がない限り加工しない） | f2411126cc315c7dae49903f80ac20e1264c4363469dec2f40982d011c4c38ec |
| assets/audio/sfx-western-union-handover.ogg | 音源 | 12,109 B | - | - | 直接参照未検出 | 由来記録なし | 要確認（明示許可がない限り加工しない） | f015aed3a26a3467feff5917c37c00a677c774d739f0093aafc8d09359f79e03 |
| assets/audio/space-ambient.mp3 | 音源 | 1,441,375 B | - | - | `js/audio-scene-map.js:32 (basename)` | 由来記録なし | 要確認（明示許可がない限り加工しない） | ed23139672691156d19c1417a7d5660c8e91f9102249bb130c9c8a2c40723aaa |
| assets/audio/space-main-bgm.mp3 | 音源 | 1,441,375 B | - | - | `js/audio-scene-map.js:31 (basename)` | 由来記録なし | 要確認（明示許可がない限り加工しない） | bdd27f7dd0421651829b0f62776f4b7ba3e154c1e470a09db86bf6530e14d147 |
| assets/data/metal-prices.json | データ | 144 B | - | - | 直接参照未検出 | 由来記録なし | 要確認（明示許可がない限り加工しない） | 6dec5bbd8b752be0404055200976171fad3e66b7a89ce00010d47622e0fa45b2 |
| assets/data/storyteller-okachimachi-quiz.json | データ | 25,964 B | - | - | `js/app.js:411` | 由来記録なし | 要確認（明示許可がない限り加工しない） | cd726e43302f881ca11f058d2979ccaca606a143da6373f5091a9148b35a4955 |
| assets/icons/apple-touch-icon.png | 画像 | 180×180 | 正方形 | なし | `index.html:72`<br>`game.html:23` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 8921b6e30b95f24d0df8b10e4c1bedc8004bf6ca9ba27d9368d0e40506f35777 |
| assets/icons/favicon.png | 画像 | 64×64 | 正方形 | なし | `about.html:24`<br>`index.html:71`<br>`game.html:22` | 由来記録なし | 要確認（明示許可がない限り加工しない） | c44b9428e6b4965e2a4280efc717a965c4f5a441f9bc3de1af08817a2171429a |
| assets/icons/icon-192.png | 画像 | 192×192 | 正方形 | なし | `manifest.webmanifest:14` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 8d583eaf7c7c867b014274cde4baef4e9372535a939b1cee37603ef56d47945f |
| assets/icons/icon-512.png | 画像 | 512×512 | 正方形 | なし | `manifest.webmanifest:26` | 由来記録なし | 要確認（明示許可がない限り加工しない） | beb1bcebf7dc2da3accee3ff8a7e363e09642b7f332ea93f8f56868f2d4780f1 |
| assets/images/backgrounds/terry-hamburger-landscape.png | 画像 | 1536×864 | 横 | なし | `js/app.js:16543` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 2b16adcc1a0d7e0287ad80feb24194c77f9da5866dbfc38ad1583daa9f605fce |
| assets/images/backgrounds/terry-hamburger-portrait.png | 画像 | 928×1536 | 縦 | なし | `js/app.js:16542` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 3cbfa1535c34e0af0bc2ec2793ada1561d23471b27ce1737ae00b93175328294 |
| assets/images/blues-juke-exterior-portrait.webp | 画像 | 691×1536 | 縦 | なし | 直接参照未検出 | 由来記録なし | 要確認（明示許可がない限り加工しない） | 2c93e5f2fa68b371226b7a5d1460d7ad7ffd40885e84d3f5f3f6d1cc0d659e36 |
| assets/images/blues-juke-exterior.webp | 画像 | 1536×691 | 横 | なし | 直接参照未検出 | 由来記録なし | 要確認（明示許可がない限り加工しない） | 817ade7a3886be449c93fef43b0e75a6bb4774611b3ab7e674a226b9bbe968e8 |
| assets/images/blues-juke-interior-portrait.webp | 画像 | 691×1536 | 縦 | なし | 直接参照未検出 | 由来記録なし | 要確認（明示許可がない限り加工しない） | 86f94e647dc2bfe82bc1da015956087f0cac62a087fe57e304a44e6eff589980 |
| assets/images/blues-juke-interior.webp | 画像 | 1536×691 | 横 | なし | 直接参照未検出 | 由来記録なし | 要確認（明示許可がない限り加工しない） | c57299a484e148167d774ce1a8734e225c146d2d2ffb4de8b417e7b7b5bb1885 |
| assets/images/character-customize.webp | 画像 | 1536×1152 | 横 | なし | 直接参照未検出 | 由来記録なし | 要確認（明示許可がない限り加工しない） | 9787c527b989692d9d84ee441d0db7c843371a7fe1fb57fa5bfe0604583ffb42 |
| assets/images/cinema-event-portrait.webp | 画像 | 864×1536 | 縦 | なし | 直接参照未検出 | 由来記録なし | 要確認（明示許可がない限り加工しない） | 539bdb27789c990d6f3fc09bba81853e9f205a347498626697f074b12a12d806 |
| assets/images/cinema-event.webp | 画像 | 1536×691 | 横 | なし | 直接参照未検出 | 由来記録なし | 要確認（明示許可がない限り加工しない） | 22e63fdb584909ec736838ddfbfd9774394e072e5a1467ec762ac2d02220f508 |
| assets/images/craft-jewelry-landscape-v758.webp | 画像 | 1536×691 | 横 | なし | 直接参照未検出 | 由来記録なし | 要確認（明示許可がない限り加工しない） | 11e95b699673f972fdd688829e840118f8bec5ab39d86fb01966cf81af5e27be |
| assets/images/craft-portrait.webp | 画像 | 864×1536 | 縦 | なし | 直接参照未検出 | 由来記録なし | 要確認（明示許可がない限り加工しない） | dcec02168a33280fb14b4c8142e2f586d0ca9d454cb871beedc68f2cef6c2981 |
| assets/images/craft.webp | 画像 | 1536×864 | 横 | なし | 直接参照未検出 | 由来記録なし | 要確認（明示許可がない限り加工しない） | d2e2f4ae00806864e32d99657c852643bd6ce12c19b53003cb81de3a40abb74c |
| assets/images/customers/customer-placeholder.svg | 画像 | 1,444 B | - | - | `js/app.js:19499`<br>`js/game-data-core.js:6793` | 由来記録なし | 要確認（明示許可がない限り加工しない） | e241791c854d1e5c75d44292b67c3eef95272eea7c078dcd95a196fabe8b23f6 |
| assets/images/display-products/case.png | 画像 | 735×940 | 縦 | あり | `js/game-data-core.js:6728` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 4a53177b9ef044c6626756ea9d7ccf036a3a8216438fb6683ef076090041524c |
| assets/images/display-products/display-supplies.png | 画像 | 816×940 | 縦 | あり | `js/game-data-core.js:6724` | 由来記録なし | 要確認（明示許可がない限り加工しない） | e6be097a4c082a45c6ee1cce84a4819fb41767e1eb181d5e56a54007e3b865ec |
| assets/images/display-products/showcase.png | 画像 | 940×796 | 横 | あり | `js/game-data-core.js:6720` | 由来記録なし | 要確認（明示許可がない限り加工しない） | fb7585fc34a57131ff0970bf521d239d5aef07a42a1529ddc3d8c160d58e4d3d |
| assets/images/display-shop-portrait-v380.webp | 画像 | 864×1536 | 縦 | なし | 直接参照未検出 | 由来記録なし | 要確認（明示許可がない限り加工しない） | 81e902353fbd59e018d1412cbfb099f0940f26314cee1133cfad19e00df4259d |
| assets/images/display-shop-portrait.webp | 画像 | 864×1536 | 縦 | なし | 直接参照未検出 | 由来記録なし | 要確認（明示許可がない限り加工しない） | 81e902353fbd59e018d1412cbfb099f0940f26314cee1133cfad19e00df4259d |
| assets/images/display-shop-v380.webp | 画像 | 1600×900 | 横 | なし | 直接参照未検出 | 由来記録なし | 要確認（明示許可がない限り加工しない） | 38fc60f677d5fce98fc91aa0d9a1dd6aeea8f52d77837fa4a287af580685cbec |
| assets/images/display-shop.webp | 画像 | 1600×900 | 横 | なし | 直接参照未検出 | 由来記録なし | 要確認（明示許可がない限り加工しない） | 38fc60f677d5fce98fc91aa0d9a1dd6aeea8f52d77837fa4a287af580685cbec |
| assets/images/equipment/basic-pickaxe.png | 画像 | 1142×1480 | 縦 | あり | `js/game-data-core.js:3326` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 0e00c168643ddd3d5adf648208bde58d6371e1c437583fa9bf8fe6bcccac878c |
| assets/images/events/alien.png | 画像 | 1010×1448 | 縦 | あり | `js/app.js:16033`<br>`js/memories-screen.js:28` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 2ac00d2669a0f4103226a6f27e6c35fdeb94628ab401711be5162fb8688db54d |
| assets/images/events/amber.png | 画像 | 1024×1536 | 縦 | あり | `js/app.js:14658`<br>`js/memories-screen.js:11` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 63d10cc28105cdd3179892138e349b623aaa0d6e508466e182856912851bce75 |
| assets/images/events/antique-diamond.png | 画像 | 1069×859 | 横 | あり | `js/app.js:1225`<br>`js/memories-screen.js:9` | 由来記録なし | 要確認（明示許可がない限り加工しない） | b48b352feec35e0e8b050d4e08de2d10fefda4edbf9217c935d89bf57c0578a4 |
| assets/images/events/aquarium-tank.png | 画像 | 1132×684 | 横 | あり | `js/app.js:15838`<br>`js/memories-screen.js:18` | 由来記録なし | 要確認（明示許可がない限り加工しない） | d7e88de0b63dfd70fbb266dddd2d8b3d3227d6f0d81a2384552c1a31a63091f0 |
| assets/images/events/blues-juke/bluesman-serious.png | 画像 | 1100×1500 | 縦 | あり | `js/app.js:14547`<br>`js/memories-screen.js:29` | 由来記録なし | 要確認（明示許可がない限り加工しない） | d13497472b4607d56f2c71931c390430e2cd4dec6a199db6587270e47587a877 |
| assets/images/events/blues-juke/bluesman-smile.png | 画像 | 1100×1500 | 縦 | あり | `js/app.js:14548` | 由来記録なし | 要確認（明示許可がない限り加工しない） | c5344fdd38e75825ab8cceddb644a6eb6ae3f4090f192e4fb7102162b799c708 |
| assets/images/events/blues-juke/bluesman-stage1.png | 画像 | 1100×1500 | 縦 | あり | `js/app.js:14546` | 由来記録なし | 要確認（明示許可がない限り加工しない） | d5ccc50074ecdb72e3ff3794b1f52eb2186be3aa449c81e7968283e9489ee2bc |
| assets/images/events/cinema-apprentice.png | 画像 | 1024×1536 | 縦 | あり | `js/app.js:15017`<br>`js/memories-screen.js:12` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 7cc324a51c79aa45449a4d1389be38316fe6f95cf34ac482f49e3255205ad99e |
| assets/images/events/clock-tower-donation-old-woman.png | 画像 | 1003×1536 | 縦 | あり | `js/app.js:15143`<br>`js/memories-screen.js:32` | 由来記録なし | 要確認（明示許可がない限り加工しない） | ef0966831205ba8c553dc61b90df4bfe0a23e479f50460261980ffe86eaeab63 |
| assets/images/events/cyclops.png | 画像 | 1004×1440 | 縦 | あり | `js/app.js:15595`<br>`js/memories-screen.js:16` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 7455c1759e05194bb28c007b8fb9bb53b935a502da4c16fa583b38186be949a4 |
| assets/images/events/diamond-polishing-lap-reward.png | 画像 | 930×616 | 横 | あり | `js/app.js:16591`<br>`js/memories-screen.js:37` | 由来記録なし | 要確認（明示許可がない限り加工しない） | edda95693bbdfe37368253509496ce2adefe8fb8ff3734ae0c089d9048588b48 |
| assets/images/events/emerald-captain-loose-set.png | 画像 | 1447×1022 | 横 | あり | `js/app.js:16473`<br>`js/memories-screen.js:14` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 5b236022c2f71c150548afac024162180da821a0e1bbaf0236cb6889b6772dd5 |
| assets/images/events/emerald-captain.png | 画像 | 1024×1536 | 縦 | あり | `js/app.js:16472`<br>`js/memories-screen.js:14` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 7dc98b875f7b9fccb18dfdd6b69e2c767e1be44fb37aee18afb52ff6e105fdda |
| assets/images/events/found-wrist.png | 画像 | 1024×1536 | 縦 | なし | `js/app.js:17052` | 由来記録なし | 要確認（明示許可がない限り加工しない） | ab5e8c01a8d96b95ac85883471f623e3a546b6222bb62c9aced538bab5c00407 |
| assets/images/events/ganesha-tusk.png | 画像 | 1330×421 | 横 | あり | `js/app.js:15625`<br>`js/memories-screen.js:17` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 922f4f67cd80f9ed852204df409142fe6803ea9c4587394906aa79cbd68bfa0d |
| assets/images/events/ganesha.png | 画像 | 1500×1536 | 縦 | あり | `js/app.js:15622`<br>`js/memories-screen.js:17` | 由来記録なし | 要確認（明示許可がない限り加工しない） | e787a21d70ab58fe529946b92dfcaad3de02f5ab78153f235dad99799ad93951 |
| assets/images/events/glab-kawahara.png | 画像 | 1024×1536 | 縦 | あり | `js/app.js:427`<br>`js/memories-screen.js:30` | 由来記録なし | 要確認（明示許可がない限り加工しない） | c1b4ed7b7c77cd0aa05a9761cd581a254f835d11518aab5b00aaa013132bd698 |
| assets/images/events/gray-hood-aquarium.png | 画像 | 1024×1536 | 縦 | あり | `js/app.js:15837`<br>`js/memories-screen.js:18` | 由来記録なし | 要確認（明示許可がない限り加工しない） | a36a6018ee12d2e59fd4dde5514246cdc7f4a254aa8e72309541ec0e150103e4 |
| assets/images/events/haunting-ghost.png | 画像 | 796×1483 | 縦 | あり | `js/app.js:15979`<br>`js/memories-screen.js:20` | 由来記録なし | 要確認（明示許可がない限り加工しない） | c4c0b011386128ac872c241fce403c67d52f6d325c8dbb48eac1e5d171c86483 |
| assets/images/events/hospital-room-landscape.jpg | 画像 | 1536×691 | 横 | なし | `sw.js:24`<br>`scripts/generate-assets-manifest.py:45`<br>`js/app.js:12059` | ユーザー提供（直近引継ぎ記録あり） | 変更禁止（色・彩度・画風・再描画） | 2fefce1faaf179b70cd650256cccc71403cda42c23e71e47cf5380cecef30a20 |
| assets/images/events/hospital-room-portrait.jpg | 画像 | 864×1536 | 縦 | なし | `sw.js:24`<br>`scripts/generate-assets-manifest.py:46`<br>`js/app.js:12058` | ユーザー提供（直近引継ぎ記録あり） | 変更禁止（色・彩度・画風・再描画） | 28bed29c31f8f7ef8793db120fdd78bb8d56d00e28c05795255d6124318ac0f5 |
| assets/images/events/indian-restaurant-manager.png | 画像 | 1024×1536 | 縦 | あり | `js/app.js:16588`<br>`js/memories-screen.js:37` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 631f0ea12feead34d162fc6ea58a4f61d5daf2d9464d1d5ea0f6ae40aa0b8a7f |
| assets/images/events/ivory-loose.png | 画像 | 1071×660 | 横 | あり | 直接参照未検出 | 由来記録なし | 要確認（明示許可がない限り加工しない） | 380855753c68bef0a07755d327a53646bdbcad1e449b680c0d4b53f71ea4d810 |
| assets/images/events/kappa.png | 画像 | 966×1384 | 縦 | あり | `js/app.js:15646`<br>`js/memories-screen.js:23` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 631b59b7e43f81dfcfc10cc4eda42b934166fc7e0d3b5829702d9b16406df1c0 |
| assets/images/events/loose-shop-original-quiz-v745.png | 画像 | 1122×1402 | 縦 | あり | 直接参照未検出 | 由来記録なし | 要確認（明示許可がない限り加工しない） | 0dba109f376514229e843d88b4507e33dec6240f1afec50823ffde00e50032db |
| assets/images/events/loose-shop-original-quiz-v751.png | 画像 | 1229×1536 | 縦 | あり | `memories-event-image-overrides-v751.js:5`<br>`js/app.js:285`<br>`js/memories-screen.js:31` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 4d23546a6bcc448a1e242c1317c04b2a6c4022901649d1a8f5cd8dd267342325 |
| assets/images/events/loose-shop-original-quiz.png | 画像 | 1122×1402 | 縦 | あり | 直接参照未検出 | 由来記録なし | 要確認（明示許可がない限り加工しない） | 0dba109f376514229e843d88b4507e33dec6240f1afec50823ffde00e50032db |
| assets/images/events/mermaid.png | 画像 | 951×1353 | 縦 | あり | `scripts/check-regression-baseline.py:113`<br>`js/app.js:15538`<br>`js/memories-screen.js:10` | 由来記録なし | 要確認（明示許可がない限り加工しない） | be4da86134e7edf56f0628ed3270d66e8c21f21d773e23f57d06a4d4ba783b7a |
| assets/images/events/mystery-chinese-chef.png | 画像 | 1515×1529 | 縦 | あり | `js/app.js:15516`<br>`js/memories-screen.js:34` | 由来記録なし | 要確認（明示許可がない限り加工しない） | ab16d5ba8bd38f8860952096d81ee5d07351bc9774d589527705aa1d7a5e4b6d |
| assets/images/events/mystery-chinese-food-01.png | 画像 | 1282×688 | 横 | あり | `js/app.js:399 (basename)` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 5caa89f04bd8ec49a0b221efe1d2028abcdadb1c132eab062016d550f7479175 |
| assets/images/events/mystery-chinese-food-02.png | 画像 | 903×1429 | 縦 | あり | `js/app.js:399 (basename)` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 469771d2919fdf617373bdd5a0abf1cb8a5bd1cb10801cbb9a59b84e4c885010 |
| assets/images/events/mystery-chinese-food-03.png | 画像 | 1502×1344 | 横 | あり | `scripts/generate-assets-manifest.py:47` | ユーザー提供（直近引継ぎ記録あり） | 変更禁止（色・彩度・画風・再描画） | 10fcd92ba4b362ee0af613556205e810164cb47c7b103370772dd28c9638926f |
| assets/images/events/mystery-chinese-food-04.png | 画像 | 1528×976 | 横 | あり | `scripts/generate-assets-manifest.py:48` | ユーザー提供（直近引継ぎ記録あり） | 変更禁止（色・彩度・画風・再描画） | 55a2352b8dfb90696d8313d0e9d82b6d8090337acdc8485fd92934572d2b5d31 |
| assets/images/events/okachimachi-invasive-turtles.png | 画像 | 1536×1024 | 横 | あり | `js/app.js:294`<br>`js/memories-screen.js:38` | 由来記録なし | 要確認（明示許可がない限り加工しない） | eae0008b74f4090282d55a69c7bddc10300d7cde2c3b032e6be1c65304fb2159 |
| assets/images/events/okachimachi-toll-frog.png | 画像 | 1024×1536 | 縦 | あり | `js/app.js:17180`<br>`js/memories-screen.js:35` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 9ed4904933a49fcd449d3b08c76a72609ccae135c3c5e53ed1acdcd291313242 |
| assets/images/events/one-love.png | 画像 | 1024×1536 | 縦 | あり | `sw.js:23`<br>`js/app.js:438` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 2f2fa7209feed45765b9938ef98dd2d746e30bc60d1757411e2cd72458735fa8 |
| assets/images/events/oyatsu-daisuki.png | 画像 | 615×978 | 縦 | あり | `js/app.js:11238`<br>`js/memories-screen.js:25` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 3767c8b114192bce348d45fb057c46dd122f3dd4f4796387afaafa14977810c2 |
| assets/images/events/panda-music-band-alien.png | 画像 | 1536×941 | 横 | あり | `js/app.js:376 (basename)` | 由来記録なし | 要確認（明示許可がない限り加工しない） | b9110f9ef0aae98ebc332290a245c28bc5c2cc19118879433c12fc709c3f8ce3 |
| assets/images/events/panda-music-band-cats.png | 画像 | 1536×984 | 横 | あり | `js/app.js:377 (basename)` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 4691f4ae9d35b51945e89f9239431b9608ba34e723f7d27453d0d6a611bdeba2 |
| assets/images/events/panda-music-band-horror.png | 画像 | 1536×1024 | 横 | あり | `js/app.js:378 (basename)` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 63a65971e5c89075f079aa1218ad6e7a926190dfdc0f9219f1a7c6eed1cc0446 |
| assets/images/events/pazupan-miner.png | 画像 | 1229×1536 | 縦 | あり | `js/app.js:14609`<br>`js/memories-screen.js:22` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 51d8d6c050af2d39bea25cb964ce98fed6d4b3622d75ed837296330f6ccd32c4 |
| assets/images/events/pazupan.png | 画像 | 1323×945 | 横 | あり | `js/app.js:14611`<br>`js/game-data-core.js:3303` | 由来記録なし | 要確認（明示許可がない限り加工しない） | fcbbd2acf74ace29640beb494112d4b42086bb148ef812a06ccca49f0e61c3c7 |
| assets/images/events/pearl-human.png | 画像 | 386×602 | 縦 | あり | `js/app.js:11207`<br>`js/memories-screen.js:24` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 586482842184581075c0c216328fb3adb3821972e06bd935478be47bff501274 |
| assets/images/events/pearl.png | 画像 | 1181×1170 | 横 | あり | `js/app.js:1231`<br>`js/memories-screen.js:10` | 由来記録なし | 要確認（明示許可がない限り加工しない） | aa78c4aab2d7b3ec7f95708f56cc57b00be06bd5bdeac691a0bb961c05830454 |
| assets/images/events/ridley-okazaki.png | 画像 | 1500×1024 | 横 | あり | `js/app.js:16093`<br>`js/memories-screen.js:13` | 由来記録なし | 要確認（明示許可がない限り加工しない） | f55f05124a481cf78046966c8c742e9c88957e00b251b177ac49dbb9a5e4bcce |
| assets/images/events/speed-star.png | 画像 | 1024×1536 | 縦 | あり | `js/app.js:11249`<br>`js/memories-screen.js:26` | 由来記録なし | 要確認（明示許可がない限り加工しない） | f1af4a0a1f82cc36f19a48ca72a95c4f7dbe6d04dc624dc96ef7869c6e90ef92 |
| assets/images/events/store-thief-old-woman.png | 画像 | 995×1408 | 縦 | あり | `js/app.js:18997`<br>`js/memories-screen.js:21` | 由来記録なし | 要確認（明示許可がない限り加工しない） | e9720b4c6052237dcead769807d760324af6fff3100f0e84fc2ec10ef3d62bc2 |
| assets/images/events/storyteller-v745.png | 画像 | 934×1010 | 縦 | あり | 直接参照未検出 | 由来記録なし | 要確認（明示許可がない限り加工しない） | 91745c970c5524778e97e2e03037bd4bea4498f503fb24279dbfc8a10dac4458 |
| assets/images/events/storyteller-v751.png | 画像 | 720×610 | 横 | あり | `memories-event-image-overrides-v751.js:6`<br>`js/app.js:11298`<br>`js/memories-screen.js:27` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 1647c369f85be086172dad41a7a8dfe96f0362d194acd92327a029c154d46cdf |
| assets/images/events/storyteller.png | 画像 | 934×1010 | 縦 | あり | 直接参照未検出 | 由来記録なし | 要確認（明示許可がない限り加工しない） | 91745c970c5524778e97e2e03037bd4bea4498f503fb24279dbfc8a10dac4458 |
| assets/images/events/sushi-chef.png | 画像 | 1011×1458 | 縦 | あり | `scripts/check-regression-baseline.py:114`<br>`js/app.js:15570`<br>`js/memories-screen.js:15` | 由来記録なし | 要確認（明示許可がない限り加工しない） | b3351ff244191b035ba94a2bc68773d09f9f25df6f23ccca1d1532f8ad48d3cd |
| assets/images/events/tattoo-woman.png | 画像 | 1024×1536 | 縦 | あり | `js/app.js:14655`<br>`js/memories-screen.js:11` | 由来記録なし | 要確認（明示許可がない限り加工しない） | d380a9acc450a4afd7b658fe77c23f14efef23077f043f099ab1d3ccdec1ef0a |
| assets/images/events/terry-california.png | 画像 | 1024×1536 | 縦 | あり | `js/app.js:16544`<br>`js/memories-screen.js:19` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 6405f7a63b565a59776eb3de264620a2d2b2e26282b2351adaf4a9a48d8f6d04 |
| assets/images/events/tourist.png | 画像 | 1024×1536 | 縦 | あり | `js/app.js:16010`<br>`js/memories-screen.js:33` | 由来記録なし | 要確認（明示許可がない限り加工しない） | a2e3c5edae6e61f2d2ab8bb6ba1cdd3a68ac364cb8628efadb046c600adc8eb6 |
| assets/images/events/western-union-messenger.png | 画像 | 1000×1536 | 縦 | あり | `scripts/check-regression-baseline.py:112`<br>`js/app.js:14533`<br>`js/memories-screen.js:9` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 7c974adc83fafaa8a109aea6ba8eb48457b4dba7010c2e2de083130d30eae113 |
| assets/images/events/white-bunny.png | 画像 | 1007×1283 | 縦 | あり | `js/app.js:16120`<br>`js/memories-screen.js:36` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 63bdc7446fb2fa885b6a61f60553268d8cdb9248da1d5eea735efa2213266b99 |
| assets/images/events/workshop-kappa-jade-rough.png | 画像 | 1254×1254 | 正方形 | あり | `js/app.js:15733`<br>`js/memories-screen.js:23` | 由来記録なし | 要確認（明示許可がない限り加工しない） | a5a650e96d46f26c435b43bc96a5d21b9497779750a98d051c10093e78e79e0d |
| assets/images/events/workshop-kappa-jade.png | 画像 | 1122×1402 | 縦 | あり | `js/app.js:15741` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 02621dd81e10b9f1c272123c842c772bfa86524261820ee6824614455f2c5bc6 |
| assets/images/events/yowamushi.png | 画像 | 500×600 | 縦 | あり | `sw.js:23`<br>`js/app.js:8314` | 由来記録なし | 要確認（明示許可がない限り加工しない） | c7c4d0eafb7180a57e29ef62d79eed2d0e728b119cfa70e2f941b08129c61bed |
| assets/images/foods/chinese.png | 画像 | 1473×965 | 横 | あり | `js/app.js:2201` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 1d765d93379fa7c00838fceb04b6fc2d451a69504b6cff3a795e9b5f7ca139c6 |
| assets/images/foods/convenience-christmas-v776.png | 画像 | 1184×1504 | 縦 | あり | `js/app.js:2200` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 69be1c85e0bcf0b5631f6cc57adf72512d611b889afbd1ac8d61bfa7b1451ea8 |
| assets/images/foods/convenience.png | 画像 | 1510×1443 | 横 | あり | `js/app.js:2199` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 65f4f1f430e5cea2db8ee4e441c4c2080898a125339e13ed023af1a90148a4b4 |
| assets/images/foods/hamburger.png | 画像 | 1508×1445 | 横 | あり | `js/app.js:2211` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 46aa934a0e7d3848cbed4d972dc1ae4c4f255bde43407775281d74e5136b4be1 |
| assets/images/foods/ice-chocomint.png | 画像 | 511×1485 | 縦 | あり | `js/app.js:2198` | 由来記録なし | 要確認（明示許可がない限り加工しない） | c69a57893a873c363c8f99bbf18de5589f77ec276e3ec9b0dd1e81342ec16909 |
| assets/images/foods/indian-v777.png | 画像 | 1488×1016 | 横 | あり | `js/app.js:2204` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 16571a2c6e9f208c12cecb26e0e650a5242201f0de428c73d73f80a737ef495d |
| assets/images/foods/indian.png | 画像 | 1428×785 | 横 | あり | 直接参照未検出 | 由来記録なし | 要確認（明示許可がない限り加工しない） | 21077fb6916a340bf4dbeecc8db0705a0f558dda58fc373249a8370e0c3a308f |
| assets/images/foods/kebab.png | 画像 | 1510×1311 | 横 | あり | `js/app.js:2205` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 8a73a6616c1cd3d02f5acec6b0402332d36b3b4847bb2b5021c8dd51bd9bd356 |
| assets/images/foods/korean-bibimbap-v781.png | 画像 | 1526×1334 | 横 | あり | `js/app.js:2202` | 由来記録なし | 要確認（明示許可がない限り加工しない） | b6931132f968101b21f85ead4a29f5731c5168dd508825444eba5384a91e71a4 |
| assets/images/foods/korean-stone-bibimbap-v782.png | 画像 | 1520×1320 | 横 | あり | `js/app.js:2203` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 18de46819e7eca2e54a0e333cd311f0316d2f49e2049ffe6c5980c4ccee1ca53 |
| assets/images/foods/korean.png | 画像 | 1326×1025 | 横 | あり | 直接参照未検出 | 由来記録なし | 要確認（明示許可がない限り加工しない） | e230168e52d65d62ada6cf4fa3a09d9df9fbba4cdee229a56ad6dbd2b94ee52d |
| assets/images/foods/ramen.png | 画像 | 987×889 | 横 | あり | `js/app.js:2206` | 由来記録なし | 要確認（明示許可がない限り加工しない） | a22f39a43001bb776f07e9664db3ece3f46e958dd233dba52efb3773131bd10d |
| assets/images/foods/soba-croquette-v780.png | 画像 | 1501×1394 | 横 | あり | `js/app.js:2210` | 由来記録なし | 要確認（明示許可がない限り加工しない） | f3deec55dfaefa766fed0272a2fab5d4ade98d5d6fa36f815886aacc31fdbfdc |
| assets/images/foods/soba-kake-curry-v779.png | 画像 | 1527×1007 | 横 | あり | `js/app.js:2209` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 63fab04ea777a5dbba2d2e4ef3a8ad71ec33f4a2eb2dc34154411e7fdbfda3f9 |
| assets/images/foods/soba-mori-v778.png | 画像 | 1521×984 | 横 | あり | `js/app.js:2208` | 由来記録なし | 要確認（明示許可がない限り加工しない） | a1b8a53c00b666d842e77fb80e5306117e146dcd5e8f203b8d25e3add68898b7 |
| assets/images/foods/soba.png | 画像 | 1490×1298 | 横 | あり | `js/app.js:2207` | 由来記録なし | 要確認（明示許可がない限り加工しない） | ebea3af9d48fc842849e09f908a86467fba6d37b4f3e7c9e3e1a7578eb35af37 |
| assets/images/gems/amethyst.png | 画像 | 1425×1346 | 横 | あり | 直接参照未検出 | 由来記録なし | 要確認（明示許可がない限り加工しない） | 52b60b537e522d9a06107436c6cb591fa82c9eace45a91751e535e657a40d6da |
| assets/images/gems/aquamarine.png | 画像 | 473×1256 | 縦 | あり | 直接参照未検出 | 由来記録なし | 要確認（明示許可がない限り加工しない） | 704c9b77401c452c0b950c475273c861fe56e4064f67bc6ae7a409aa298edad8 |
| assets/images/gems/benitoite.png | 画像 | 1024×1024 | 正方形 | あり | 直接参照未検出 | 由来記録なし | 要確認（明示許可がない限り加工しない） | 29236bdc778bfbcf2cc7ecd2a62ccadf54febe5342ff1e9343501c9b2c0963de |
| assets/images/gems/citrine.png | 画像 | 1086×1354 | 縦 | あり | 直接参照未検出 | 由来記録なし | 要確認（明示許可がない限り加工しない） | b2186d9a7fb8a15b34ccf927f2e9a647b75fbe99b122c059f4f780376de2f9aa |
| assets/images/gems/diamond.png | 画像 | 1386×1064 | 横 | あり | `js/app.js:1225 (basename)`<br>`js/memories-screen.js:9 (basename)`<br>`js/game-data-core.js:3233 (basename)` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 587e5de68d4c8b1545d9787b7ce59dac4ccc8ba75402631fc17a778f81713eb2 |
| assets/images/gems/emerald.png | 画像 | 1354×1247 | 横 | あり | `js/app.js:1171 (basename)`<br>`js/game-data-core.js:3229 (basename)` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 61688ec0575f2ab4bb9e5679d5b8a3daba0de3f33f44fe55b7f007a9df22da94 |
| assets/images/gems/garnet.png | 画像 | 1367×1212 | 横 | あり | 直接参照未検出 | 由来記録なし | 要確認（明示許可がない限り加工しない） | 2147a9d4d5c2becdf1469e24f44c6696a060a82739e8d3bcea6d705d4af176b6 |
| assets/images/gems/imperialtopaz.png | 画像 | 609×1196 | 縦 | あり | 直接参照未検出 | 由来記録なし | 要確認（明示許可がない限り加工しない） | f00f3e529271e3ebbe47864acbb637287f7bf21dd9c3bfc3e27476b3e93b5cdd |
| assets/images/gems/ivory.png | 画像 | 1330×421 | 横 | あり | 直接参照未検出 | 由来記録なし | 要確認（明示許可がない限り加工しない） | 922f4f67cd80f9ed852204df409142fe6803ea9c4587394906aa79cbd68bfa0d |
| assets/images/gems/jade.png | 画像 | 1404×1139 | 横 | あり | `js/app.js:15649`<br>`js/memories-screen.js:35` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 7709db494758397c6f77e10352f2bb9db7ccf01bdd3350d5ca5f121f5f9b489e |
| assets/images/gems/lapislazuli.png | 画像 | 1361×1017 | 横 | あり | 直接参照未検出 | 由来記録なし | 要確認（明示許可がない限り加工しない） | e80da1d424a5d7ffdf3dcc16c94e61d93c7174142542f93546e0e0786bfbb06e |
| assets/images/gems/moonstone.png | 画像 | 1445×1096 | 横 | あり | 直接参照未検出 | 由来記録なし | 要確認（明示許可がない限り加工しない） | a746461111467a4f06b678e199b2002ea7227d1e40779354ff660ad968031b99 |
| assets/images/gems/opal.png | 画像 | 1360×1163 | 横 | あり | 直接参照未検出 | 由来記録なし | 要確認（明示許可がない限り加工しない） | e41ce87609d3bbdc73173ed1e11bbefb8643014b9975c0678683b5f291e75b9a |
| assets/images/gems/paraibatourmaline.png | 画像 | 1108×1457 | 縦 | あり | 直接参照未検出 | 由来記録なし | 要確認（明示許可がない限り加工しない） | e84b9cb4ca30f1565ed847427cec9a19807f9c07024d0b5e9fa26c2a16d27d6c |
| assets/images/gems/peridot.png | 画像 | 1391×1365 | 横 | あり | 直接参照未検出 | 由来記録なし | 要確認（明示許可がない限り加工しない） | 33376941d569b6425cc1109951fe0145b113e50d4e0748a3b7677bf7267c0a31 |
| assets/images/gems/ruby.png | 画像 | 1395×1209 | 横 | あり | 直接参照未検出 | 由来記録なし | 要確認（明示許可がない限り加工しない） | 2338cbfdc4a5479fb83e826f5978cb5684b269b06c1e6fd04cfadc16964ca18c |
| assets/images/gems/sapphire.png | 画像 | 1466×1130 | 横 | あり | 直接参照未検出 | 由来記録なし | 要確認（明示許可がない限り加工しない） | f4aac6ae3dd2d210ad6f6809cf7e371f79b94d257f25b74109bf7421a9d06ec6 |
| assets/images/gems/tanzanite.png | 画像 | 769×1058 | 縦 | あり | 直接参照未検出 | 由来記録なし | 要確認（明示許可がない限り加工しない） | 51df4fb475733a5bdb3bd7111dbfe0ed68fa7cbc34a14de70e5db731849ee4ae |
| assets/images/gems/tourmaline.png | 画像 | 763×1202 | 縦 | あり | 直接参照未検出 | 由来記録なし | 要確認（明示許可がない限り加工しない） | cd746165c53c893b2ecc965caa454369fda7d45f79cd768853c6889c38a9e0d9 |
| assets/images/gems/turquoise.png | 画像 | 1442×1144 | 横 | あり | 直接参照未検出 | 由来記録なし | 要確認（明示許可がない限り加工しない） | 5aa51846e1410bb7e4c1670b8be16a34110d8025e7a559eeb95119b75e3bf283 |
| assets/images/glab-portrait.webp | 画像 | 864×1536 | 縦 | なし | 直接参照未検出 | 由来記録なし | 要確認（明示許可がない限り加工しない） | 6a4540f637ad5190f086840a29adedc4a2870eead8fa48fed54eae46b4a6fef1 |
| assets/images/glab.webp | 画像 | 1536×691 | 横 | なし | 直接参照未検出 | 由来記録なし | 要確認（明示許可がない限り加工しない） | 7d85371c6f18d62bfcdb2365367d7136acdc073d453b84c756698b5efe5b0270 |
| assets/images/items/body-chip.png | 画像 | 1176×564 | 横 | あり | `js/app.js:16076`<br>`js/game-data-core.js:3319` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 11dff7a83291fbb7990f291ae3d3666c222c0f79f2e216524c4f2f78c919d525 |
| assets/images/items/bokuto.png | 画像 | 1536×1024 | 横 | あり | `js/app.js:16015`<br>`js/game-data-core.js:3311` | 由来記録なし | 要確認（明示許可がない限り加工しない） | b90f195bab69a2748f68eb356f6faa6ffc18c761dc36a74375189c6617e8ead4 |
| assets/images/items/burari-okachimachi-sticker.png | 画像 | 1254×1254 | 正方形 | あり | `js/app.js:11311`<br>`js/game-data-core.js:3315` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 0072021a8226a1a9b95f978ecb173e57b1df70c1de40557d8408fa98d1dc8928 |
| assets/images/items/energy-drink.png | 画像 | 584×1317 | 縦 | あり | `js/app.js:15597`<br>`js/game-data-core.js:3307` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 8bf366eddcfded0681a9afc485cbd520e61ed7173be461cf3544a24049536e6e |
| assets/images/jewelry-items/earrings.png | 画像 | 1270×1260 | 横 | あり | `styles.css:133` | 由来記録なし | 要確認（明示許可がない限り加工しない） | a0cdf733ad1c4517f09aaf58db21720e7b68498e53ce528e9de1ca70e052047a |
| assets/images/jewelry-items/pendant.png | 画像 | 569×1010 | 縦 | あり | `styles.css:132` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 9687fe1da2033391ca00d9be4f525b194652daf9f2491e8d0aab30dbe1512c08 |
| assets/images/jewelry-items/ring-plain.png | 画像 | 1328×1352 | 縦 | あり | `styles.css:131` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 4b8e1fd8d4c686d842a4d47710955551ec1da1c2bc8e84d65a8da450a98eb49e |
| assets/images/jewelry-items/ring.png | 画像 | 897×1088 | 縦 | あり | `styles.css:130` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 359d2ac2a8d255b03df3037e5975b69fe6682e1affc4e9fff99149c1f62a6f8c |
| assets/images/jewelry-shop-buy-character.png | 画像 | 986×1404 | 縦 | あり | `js/app.js:17546` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 320fbfef539fc0a152a78c9f3a8e9a16710fa3651d30529b1b604cb97835ce91 |
| assets/images/jewelry-shop-portrait.webp | 画像 | 691×1536 | 縦 | なし | 直接参照未検出 | 由来記録なし | 要確認（明示許可がない限り加工しない） | 246b245241e5a40f5df3cd78ca480d491dbc5f333bec73b12aa5c5ebf3bdb00d |
| assets/images/jewelry-shop-sell-character.png | 画像 | 1369×1524 | 縦 | あり | `js/app.js:17548` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 1be41b5bf1591c4f813196d6b697898a7beab23bd23c4f855d3647969f6777c0 |
| assets/images/jewelry-shop.webp | 画像 | 1536×691 | 横 | なし | 直接参照未検出 | 由来記録なし | 要確認（明示許可がない限り加工しない） | a6fe84c6c1d57d02eacad10e24d87a3d3c0c09b9667e5fc55ba24d9500181c44 |
| assets/images/loose/amber/amber.png | 画像 | 1024×1536 | 縦 | あり | `js/app.js:1389` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 63d10cc28105cdd3179892138e349b623aaa0d6e508466e182856912851bce75 |
| assets/images/loose/amethyst/emerald.png | 画像 | 232×270 | 縦 | あり | `js/app.js:1184` | 由来記録なし | 要確認（明示許可がない限り加工しない） | a195922bea5133d3a760d10a6863f20207d8d4d8a47fa45df8c0dce40ab2ef49 |
| assets/images/loose/amethyst/marquise.png | 画像 | 181×309 | 縦 | あり | `js/app.js:1183` | 由来記録なし | 要確認（明示許可がない限り加工しない） | f6cc6b4cf83de2a3f087103a6cb14f56fd9213e2cc570ba2395738be2ab795cc |
| assets/images/loose/amethyst/oval-cabochon.png | 画像 | 241×289 | 縦 | あり | `js/app.js:1187` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 86b9ce8c850ca4cbbef69a7374cce591f5899eccc3420ea1f489a8b2d51b753e |
| assets/images/loose/amethyst/oval.png | 画像 | 243×275 | 縦 | あり | `js/app.js:1181` | 由来記録なし | 要確認（明示許可がない限り加工しない） | c0225aabc7b46af02840d3bad01283fddfe36c000043abec7aead7f076224a33 |
| assets/images/loose/amethyst/pear.png | 画像 | 216×282 | 縦 | あり | `js/app.js:1182` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 898607ee1ec1227ebeb958635688a58a136d5592b85c9743814e95296c6eafd8 |
| assets/images/loose/amethyst/round-cabochon.png | 画像 | 286×294 | 縦 | あり | `js/app.js:1186` | 由来記録なし | 要確認（明示許可がない限り加工しない） | e93d821b019eabb32735fa46d34b25f33aa3c2cc3ee5f024a0b10123218d08b3 |
| assets/images/loose/amethyst/round.png | 画像 | 283×287 | 縦 | あり | `js/app.js:1180` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 6ede864b4b116a82b70c6c57c9b0b17b40f8294039ad753285149fa10ef1b55c |
| assets/images/loose/amethyst/trilliant.png | 画像 | 341×353 | 縦 | あり | `js/app.js:1185` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 7d438efc43a70c892a74f6b29b6526d7992b1477576020a1f306485ebdadde39 |
| assets/images/loose/aquamarine/emerald.png | 画像 | 288×303 | 縦 | あり | `js/app.js:1197` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 5cffa78a6336789105d57766b2cc38e0ad275575f7c8363c0994a5402c9031b7 |
| assets/images/loose/aquamarine/marquise.png | 画像 | 216×362 | 縦 | あり | `js/app.js:1196` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 0838558c3293da65b37d93860efa606521912e9427353da7640129171b404693 |
| assets/images/loose/aquamarine/oval-cabochon.png | 画像 | 266×326 | 縦 | あり | `js/app.js:1200` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 34a0c2f5a896e89bf8e9255423d5d814a07e04dea758ec23bf9d890f5ff2434b |
| assets/images/loose/aquamarine/oval.png | 画像 | 266×311 | 縦 | あり | `js/app.js:1194` | 由来記録なし | 要確認（明示許可がない限り加工しない） | f07a0f8216a896ed619af003e34db1a90d230606ef232edbfe9f6ea87ea02374 |
| assets/images/loose/aquamarine/pear.png | 画像 | 263×336 | 縦 | あり | `js/app.js:1195` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 535bc187a7179c6f5dbdf511a25b6a506a5cd00d5198ec02478288be0c773c20 |
| assets/images/loose/aquamarine/round-cabochon.png | 画像 | 324×333 | 縦 | あり | `js/app.js:1199` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 6701174e1bba7c065a75345e908aab8a3b33646658fe3153886e52fcee675882 |
| assets/images/loose/aquamarine/round.png | 画像 | 356×345 | 横 | あり | `js/app.js:1193` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 1602c36e215afcde5eec031b8913e25c70670995a770170196db412cefe809a7 |
| assets/images/loose/aquamarine/trilliant.png | 画像 | 365×403 | 縦 | あり | `js/app.js:1198` | 由来記録なし | 要確認（明示許可がない限り加工しない） | c9e89119bd32323c3328cc7ddb4c371f0916f1b26dc5bba2b2b78920eb21204d |
| assets/images/loose/arabesque-peridot/oval.png | 画像 | 1098×1417 | 縦 | あり | `js/app.js:1424` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 2f4e778c808c97dfabb3ef11fe41259bc258bc81748ee6ace413fbe5e2d5af53 |
| assets/images/loose/atelier-amethyst/oval.png | 画像 | 1247×1037 | 横 | あり | `js/app.js:1429` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 446681ec115c1127f6cdb81568ed3e27ad7c2a0678424c47fa73701a45c446d0 |
| assets/images/loose/benitoite/oval.png | 画像 | 1024×1024 | 正方形 | あり | `js/app.js:1414` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 29236bdc778bfbcf2cc7ecd2a62ccadf54febe5342ff1e9343501c9b2c0963de |
| assets/images/loose/bite-mecha-moon/oval.png | 画像 | 160×168 | 縦 | あり | `js/app.js:1431` | 由来記録なし | 要確認（明示許可がない限り加工しない） | b14e4ba37de739af5b500514684a248e3490312e2c28e40722b3ca1f0f6f4c38 |
| assets/images/loose/blackDiamond/round.png | 画像 | 1395×1110 | 横 | あり | `js/app.js:1219` | 由来記録なし | 要確認（明示許可がない限り加工しない） | c7d484e280a5e9c9f8040ce7cb0a07e626ec9bb503e17362e4d2eeb3de8cef71 |
| assets/images/loose/burst-opal/oval.png | 画像 | 1221×1280 | 縦 | あり | `js/app.js:1421` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 5b35e69927c520d20f45c73a3243c6ac731cde60cd2534adba30560cb0aa449c |
| assets/images/loose/citrine/emerald.png | 画像 | 283×286 | 縦 | あり | `js/app.js:1405` | 由来記録なし | 要確認（明示許可がない限り加工しない） | a1c62a35d0219791dbb2f12fcb2e02613ef00e7bc65067324d23c56b4a7e427a |
| assets/images/loose/citrine/marquise.png | 画像 | 230×357 | 縦 | あり | `js/app.js:1404` | 由来記録なし | 要確認（明示許可がない限り加工しない） | e4d58513101c6b688884c741bb4af0b75cfb722a7213b05267ed01e1cad69688 |
| assets/images/loose/citrine/oval-cabochon.png | 画像 | 275×318 | 縦 | あり | `js/app.js:1408` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 19f5a93be187bbdd2a50d76a7332ddd7b51ce2d1caaea3c4d6033d714db70556 |
| assets/images/loose/citrine/oval.png | 画像 | 268×317 | 縦 | あり | `js/app.js:1402` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 848c68a076fc4d73db6afcc4e2ebc9e5d2ea474815ade446ba22ed408048e50b |
| assets/images/loose/citrine/pear.png | 画像 | 271×343 | 縦 | あり | `js/app.js:1403` | 由来記録なし | 要確認（明示許可がない限り加工しない） | dd6f8a8caf88dbc5a8548587dba0ac36d92bb9a1fe3e07fd88d17bcbccbbd1d9 |
| assets/images/loose/citrine/round-cabochon.png | 画像 | 302×308 | 縦 | あり | `js/app.js:1407` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 4ea370dcc1c959d208660a28f4abdec6ab50a81dc7f0bdd00898ba1e8ae48635 |
| assets/images/loose/citrine/round.png | 画像 | 362×362 | 正方形 | あり | `js/app.js:1401` | 由来記録なし | 要確認（明示許可がない限り加工しない） | b9753a86b2ac44e9256b5f794ecf5d90b8d03e4e1bc443d5dec79fb961af6fc4 |
| assets/images/loose/citrine/trilliant.png | 画像 | 330×341 | 縦 | あり | `js/app.js:1406` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 9af7a16b4672a05e4bd00a15d094a3f89324ea4fae525d609de5c025a8bc674d |
| assets/images/loose/cubist-ruby/pear.png | 画像 | 1024×1506 | 縦 | あり | `js/app.js:1418` | 由来記録なし | 要確認（明示許可がない限り加工しない） | d6f50667926797199019c48f03eec3c1067a0e0fb3dd990d684c301d4ab10c81 |
| assets/images/loose/diamond/emerald.png | 画像 | 317×338 | 縦 | あり | `js/app.js:1210` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 9098a813c4f68583e134a35b4754da00408539208d63bee25b244f478996ece7 |
| assets/images/loose/diamond/marquise.png | 画像 | 211×369 | 縦 | あり | `js/app.js:1209` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 20e80d3df157c7b07b18e9e1bc141c7961138b7945035e2e0e7ae54f12e48112 |
| assets/images/loose/diamond/oval-cabochon.png | 画像 | 229×340 | 縦 | あり | `js/app.js:1213` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 84ecb2213d27b177494a2733bb388b1f73229687d3897ecb38b7662593fc11b2 |
| assets/images/loose/diamond/oval.png | 画像 | 307×368 | 縦 | あり | `js/app.js:1207` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 03b84c670f9fb045415e3d420c87ac3d427f6634f9656d58eb4389ab33276b1c |
| assets/images/loose/diamond/pear.png | 画像 | 265×368 | 縦 | あり | `js/app.js:1208` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 19824cf6d685b4f99b4b880d1a95d592f812d3c6bebb51a71adf40ddb0088df9 |
| assets/images/loose/diamond/round-cabochon.png | 画像 | 283×347 | 縦 | あり | `js/app.js:1212` | 由来記録なし | 要確認（明示許可がない限り加工しない） | eab7b436888f28733673197b5399ef27bb4358855a14723f7bc1e15396e84152 |
| assets/images/loose/diamond/round.png | 画像 | 353×354 | 縦 | あり | `js/app.js:1206` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 02c4f8653213378ce05d3cd8fa3359486ea5b9a4193e8028c962abb29480c1be |
| assets/images/loose/diamond/trilliant.png | 画像 | 379×381 | 縦 | あり | `js/app.js:1211` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 5491660775d2edfe3d8c568ca967af1f8346970ef53352ea2094c889f7c16135 |
| assets/images/loose/emerald/emerald.png | 画像 | 297×278 | 横 | あり | `js/app.js:1248` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 541f81549f4bd7ea6b3c6cd11e81717695304d7a7c224e0cfa670a930f7c3e2c |
| assets/images/loose/emerald/marquise.png | 画像 | 185×336 | 縦 | あり | `js/app.js:1247` | 由来記録なし | 要確認（明示許可がない限り加工しない） | e85350ef2a7a6dbd4a2f843f48ae8a53184d4af670631fc596b62af1cf340578 |
| assets/images/loose/emerald/oval-cabochon.png | 画像 | 278×300 | 縦 | あり | `js/app.js:1251` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 72b3614c670133584dd4902f2b6874eae908ee114e162fdb48e76cee4dc6d214 |
| assets/images/loose/emerald/oval.png | 画像 | 255×305 | 縦 | あり | `js/app.js:1245` | 由来記録なし | 要確認（明示許可がない限り加工しない） | e3395e5b2f351727568d9e02a23640e26f2b96d6acbb110a85b1096b0da99c2c |
| assets/images/loose/emerald/pear.png | 画像 | 259×327 | 縦 | あり | `js/app.js:1246` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 5555ea7a6fa19ca6d39979b3fd5ce9f8624069e47ea24e488088af990a0c53c5 |
| assets/images/loose/emerald/round-cabochon.png | 画像 | 351×372 | 縦 | あり | `js/app.js:1250` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 196694745e233ecfe92a6ad308c7a2a792078c350fe2b7723ea0b6d33bdf88d2 |
| assets/images/loose/emerald/round.png | 画像 | 335×333 | 横 | あり | `js/app.js:1244` | 由来記録なし | 要確認（明示許可がない限り加工しない） | b0bd05574e9d4ce66e84049a382a861f082a9b1fa154948aa076fcf4445022e8 |
| assets/images/loose/emerald/trilliant.png | 画像 | 339×333 | 横 | あり | `js/app.js:1249` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 45ecfb09505bda5059e413712f260780a6b0cf9e565a6f03015f85e3093562ed |
| assets/images/loose/garnet/emerald.png | 画像 | 229×275 | 縦 | あり | `js/app.js:1171` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 8e5153d273dded3dc98174c01f1abd81c4e91b89fa4d829d778bb4bfd554776c |
| assets/images/loose/garnet/marquise.png | 画像 | 187×318 | 縦 | あり | `js/app.js:1170` | 由来記録なし | 要確認（明示許可がない限り加工しない） | b7ffd56e4d387729b97c9aac3c968a461e1a640e9e7a192547e0cdd50e136faf |
| assets/images/loose/garnet/oval-cabochon.png | 画像 | 227×285 | 縦 | あり | `js/app.js:1174` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 15eb2e22bc700adc6e34b14584b9ab3ca2e43da232fcb7ff0552572e908b032c |
| assets/images/loose/garnet/oval.png | 画像 | 253×289 | 縦 | あり | `js/app.js:1168` | 由来記録なし | 要確認（明示許可がない限り加工しない） | ab13f5293cb81d69547fef3b8089b36e34ba0ce68574c7766e9db04c4bf95c26 |
| assets/images/loose/garnet/pear.png | 画像 | 246×302 | 縦 | あり | `js/app.js:1169` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 0ce2b83066a44f5551c3f75c607a7f139e02c6ccebae6ad0ad476b7b85c1b0a8 |
| assets/images/loose/garnet/round-cabochon.png | 画像 | 280×286 | 縦 | あり | `js/app.js:1173` | 由来記録なし | 要確認（明示許可がない限り加工しない） | a02b2eebf15f2b39d9a0eee720f51dcae27e87e9fdeec40d8e9f954f3d24e174 |
| assets/images/loose/garnet/round.png | 画像 | 329×330 | 縦 | あり | `js/app.js:1167` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 38e3da18fedde57b156e76024dd05412963bd3f4be88a522a6337bc8ad238f8b |
| assets/images/loose/garnet/trilliant.png | 画像 | 306×307 | 縦 | あり | `js/app.js:1172` | 由来記録なし | 要確認（明示許可がない限り加工しない） | e7ef85b7fdfcd5c3c15e36fe385d109ba48bc6bbb9de4a6313275229c1ce39e7 |
| assets/images/loose/imperialtopaz/emerald.png | 画像 | 234×262 | 縦 | あり | `js/app.js:1373` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 1019fb1409fb4359c82d609c25fe96751315b621ceb4a415b9bf097ca5221100 |
| assets/images/loose/imperialtopaz/marquise.png | 画像 | 185×307 | 縦 | あり | `js/app.js:1372` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 0a999cd590a880ac012757f460d4eb53e33121b66b58f0b245814f101ae9c5a8 |
| assets/images/loose/imperialtopaz/oval-cabochon.png | 画像 | 250×289 | 縦 | あり | `js/app.js:1376` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 67aab934a9f7bf37d1d7640e61c736d5e67111126763e02d302562557116b9d1 |
| assets/images/loose/imperialtopaz/oval.png | 画像 | 244×284 | 縦 | あり | `js/app.js:1370` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 43e279436b016e3682a89273d771b6d6d327ddf526e9165c4db8fb00ad643ad3 |
| assets/images/loose/imperialtopaz/pear.png | 画像 | 230×300 | 縦 | あり | `js/app.js:1371` | 由来記録なし | 要確認（明示許可がない限り加工しない） | c62c4611285fa060b2594cf9f9639cabb452e5fbe76bed30583b1a72b89c23ff |
| assets/images/loose/imperialtopaz/round-cabochon.png | 画像 | 298×299 | 縦 | あり | `js/app.js:1375` | 由来記録なし | 要確認（明示許可がない限り加工しない） | ddeabda2b171698ae0f7d46c514c0d3bf53e84147338d3c5754be81dde7b5da3 |
| assets/images/loose/imperialtopaz/round.png | 画像 | 300×302 | 縦 | あり | `js/app.js:1369` | 由来記録なし | 要確認（明示許可がない限り加工しない） | f53909b23766cfdb31ecb4c444c5893926ecc50b8f130b00ea84acd839bff475 |
| assets/images/loose/imperialtopaz/trilliant.png | 画像 | 313×310 | 横 | あり | `js/app.js:1374` | 由来記録なし | 要確認（明示許可がない限り加工しない） | e0674dbe777ceb21b5251563606fa08ab0a41f529aea114e7025971bd1b553c5 |
| assets/images/loose/ivory/oval-cabochon.png | 画像 | 467×644 | 縦 | あり | `js/app.js:1238` | 由来記録なし | 要確認（明示許可がない限り加工しない） | ab5b28e9205f9e2122223060d5a17f5f4574eabd83ca7734bd8a6a38bd84c641 |
| assets/images/loose/ivory/round-cabochon.png | 画像 | 506×490 | 横 | あり | `js/app.js:1237` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 887d9d85eca69f47469f8946e9d0003a245ee9bd7036a0dc74881a7e33b05787 |
| assets/images/loose/jade/oval-cabochon.png | 画像 | 359×504 | 縦 | あり | `js/app.js:1383` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 482335cda3cf485c7b1b4dedf142ab0530bfa97c3222316a5387acc4d9a842f2 |
| assets/images/loose/jade/round-cabochon.png | 画像 | 465×471 | 縦 | あり | `js/app.js:1382` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 5b53fb28a3d697b18cf35ff5d60c1cdf4bad3b1c4b50fe0ed3bb9495d6985414 |
| assets/images/loose/lapislazuli/oval-cabochon.png | 画像 | 509×695 | 縦 | あり | `js/app.js:1272` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 1b38b5a5a89dab24b92917baebbdde4d11bc7245283439d276fc20abc00ac17f |
| assets/images/loose/lapislazuli/round-cabochon.png | 画像 | 700×718 | 縦 | あり | `js/app.js:1271` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 6987482ea87f33c9d7840a2b20a1d3f90c94e2a81c85cd6160c5708ce509e7e6 |
| assets/images/loose/marble-diamond/round.png | 画像 | 1337×995 | 横 | あり | `js/app.js:1422` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 401ca7498c0a4dde5fedef433d5223ec117c46e6a943c97ee9b6adbb710753d1 |
| assets/images/loose/melting-topaz/round.png | 画像 | 980×1348 | 縦 | あり | `js/app.js:1420` | 由来記録なし | 要確認（明示許可がない限り加工しない） | cf56b4706af069212af68e4a5c94f62170e0222673c2c0f3f24f69979c77bea5 |
| assets/images/loose/moonstone/emerald.png | 画像 | 258×286 | 縦 | あり | `js/app.js:1282` | 由来記録なし | 要確認（明示許可がない限り加工しない） | f1fcb3f6a3f55b337e3dd5bb947de5bb16ece05057559227a2240679a4476b71 |
| assets/images/loose/moonstone/marquise.png | 画像 | 208×340 | 縦 | あり | `js/app.js:1281` | 由来記録なし | 要確認（明示許可がない限り加工しない） | a646c964ef2227d3427f4cd627c6321e69f15e039dac005f5300ea5538e14f59 |
| assets/images/loose/moonstone/oval-cabochon.png | 画像 | 274×298 | 縦 | あり | `js/app.js:1285` | 由来記録なし | 要確認（明示許可がない限り加工しない） | e794f062e6d3ecbd3031d3824b735e1c12cc90aa2c2cd6648968ea29386659f9 |
| assets/images/loose/moonstone/oval.png | 画像 | 262×309 | 縦 | あり | `js/app.js:1279` | 由来記録なし | 要確認（明示許可がない限り加工しない） | bd75345af45bda2772355fe300ad9c6602ea026d314a45bceadee2fc19efa24c |
| assets/images/loose/moonstone/pear.png | 画像 | 261×341 | 縦 | あり | `js/app.js:1280` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 369493a9b4ad5fa89df13bf8983f9277585de5250f892340c82070e7fac4ab7f |
| assets/images/loose/moonstone/round-cabochon.png | 画像 | 319×333 | 縦 | あり | `js/app.js:1284` | 由来記録なし | 要確認（明示許可がない限り加工しない） | b88b8ba538c49ba31f038b246595e0798c358a64e3503bdb073a0b3c4f8db509 |
| assets/images/loose/moonstone/round.png | 画像 | 324×328 | 縦 | あり | `js/app.js:1278` | 由来記録なし | 要確認（明示許可がない限り加工しない） | a87618287532e6da101d052c85ba1b5ce5693670d1d8b65c706ec64b24fd466a |
| assets/images/loose/moonstone/trilliant.png | 画像 | 308×334 | 縦 | あり | `js/app.js:1283` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 3ff102aaeca0c25acf108109dc6fc4361a102104377f3f19618436928d8204cf |
| assets/images/loose/morning-pearl/pearl.png | 画像 | 14,997 B | - | - | `js/app.js:1427` | 由来記録なし | 要確認（明示許可がない限り加工しない） | f99d38dccec742deebb25daaf2ac4d3e1b28fb70dd76f5666d17363791ee5c1d |
| assets/images/loose/opal/oval-cabochon.png | 画像 | 539×663 | 縦 | あり | `js/app.js:1258` | 由来記録なし | 要確認（明示許可がない限り加工しない） | a00c575cae6fc543ebcaccc1e6afaaeeafb6d82fd2bf28ae8094c22d55775438 |
| assets/images/loose/opal/round-cabochon.png | 画像 | 688×698 | 縦 | あり | `js/app.js:1257` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 385e1908745442478be17e3bfc8ac20796e9b3ef25ff774f270d9fabca753467 |
| assets/images/loose/outside-diamond/round.png | 画像 | 1381×1360 | 横 | あり | `js/app.js:1426` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 598a90964a4ac7eafea69948a6d9553fbfe9866de6240d3d2a18a48659271903 |
| assets/images/loose/paraibatourmaline/emerald.png | 画像 | 281×267 | 横 | あり | `js/app.js:1334` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 36f0a92c95fc3ba9167294b43589d939adbadbf57ed453fbb5087fd03a7ee34c |
| assets/images/loose/paraibatourmaline/marquise.png | 画像 | 197×380 | 縦 | あり | `js/app.js:1333` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 27a735bad71e2388b35542137181bb35af096ab19b2433732947c52deb3945b1 |
| assets/images/loose/paraibatourmaline/oval-cabochon.png | 画像 | 243×299 | 縦 | あり | `js/app.js:1337` | 由来記録なし | 要確認（明示許可がない限り加工しない） | ccb335aa81bb58fcb40838419efb446b57abb889fc43def7830ca91988a8f6b2 |
| assets/images/loose/paraibatourmaline/oval.png | 画像 | 293×371 | 縦 | あり | `js/app.js:1331` | 由来記録なし | 要確認（明示許可がない限り加工しない） | b0dae87a06127b296cdd261f7a60dffda300bc996980c00cb631792717e5535f |
| assets/images/loose/paraibatourmaline/pear.png | 画像 | 277×384 | 縦 | あり | `js/app.js:1332` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 8caa7e2eb435f900412f50eea65dc26f8a613dc35af111d96797aedba755bb68 |
| assets/images/loose/paraibatourmaline/round-cabochon.png | 画像 | 301×316 | 縦 | あり | `js/app.js:1336` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 9445391ffa01e1eb55f5bfa79cc962983f064163dd4b4528df7f97807ae76ad0 |
| assets/images/loose/paraibatourmaline/round.png | 画像 | 391×388 | 横 | あり | `js/app.js:1330` | 由来記録なし | 要確認（明示許可がない限り加工しない） | c6351e5c47ef7a528162ba5f780d1b9f11fdb4ab0f58780ad9a70a0baf330c76 |
| assets/images/loose/paraibatourmaline/trilliant.png | 画像 | 369×332 | 横 | あり | `js/app.js:1335` | 由来記録なし | 要確認（明示許可がない限り加工しない） | a43278e73d09375578aa0008ecdc4fedb46c2a3a8c25fd4ab5a049382c41deac |
| assets/images/loose/peridot/emerald.png | 画像 | 279×280 | 縦 | あり | `js/app.js:1321` | 由来記録なし | 要確認（明示許可がない限り加工しない） | ef2b9195dd0c0e434a2ce4be2e5880394b3d6df0ab2bcb7b81f62b7268f29816 |
| assets/images/loose/peridot/marquise.png | 画像 | 210×349 | 縦 | あり | `js/app.js:1320` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 35c3985cbce7fc635f41166c9657a25b018bbad95f1f5e5a2e43b326522f38b9 |
| assets/images/loose/peridot/oval-cabochon.png | 画像 | 240×291 | 縦 | あり | `js/app.js:1324` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 1c7e90ce01a79d9a6a70f3a11d27fa4295b236789c5494e4b28e4e4a463cfb61 |
| assets/images/loose/peridot/oval.png | 画像 | 265×306 | 縦 | あり | `js/app.js:1318` | 由来記録なし | 要確認（明示許可がない限り加工しない） | a4b6283ff09c89b40c21fcd68a85db75f7705c009290d3f7310bb1f33c71821b |
| assets/images/loose/peridot/pear.png | 画像 | 254×322 | 縦 | あり | `js/app.js:1319` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 4e370b6c633eb24ba11be0381a381b7a82d8926b14736e58b434960c7aa1aafe |
| assets/images/loose/peridot/round-cabochon.png | 画像 | 303×306 | 縦 | あり | `js/app.js:1323` | 由来記録なし | 要確認（明示許可がない限り加工しない） | b598bf57c5275c99a9107639dd40455876b1db7219a22269d04ebb07cd53c3e7 |
| assets/images/loose/peridot/round.png | 画像 | 326×331 | 縦 | あり | `js/app.js:1317` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 291b8acedc9f40d917485c6693a7d0af453ce6df8e1ddcf288d6fbb3b959bebe |
| assets/images/loose/peridot/trilliant.png | 画像 | 345×363 | 縦 | あり | `js/app.js:1322` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 53b02cb76a43723f22f56427b1da39468d1fc58150e418602089f3df0d0b40b4 |
| assets/images/loose/pop-diamond/round.png | 画像 | 1446×1122 | 横 | あり | `js/app.js:1423` | 由来記録なし | 要確認（明示許可がない限り加工しない） | d2ff79750ac1b82649c7575f6ce06c166c57eae9eb80035f2e5123007a495957 |
| assets/images/loose/rosequartz/oval-cabochon.png | 画像 | 384×384 | 正方形 | あり | `sw.js:23`<br>`js/app.js:1395` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 45f9b629b6505f7241d39e3468496c31b0fa78603fd803234e9777c1452f45a4 |
| assets/images/loose/ruby/emerald.png | 画像 | 281×332 | 縦 | あり | `js/app.js:1295` | 由来記録なし | 要確認（明示許可がない限り加工しない） | c4d2c29d7f831f2a11beb9baef883b1022614a03411027d2257c962647656bd3 |
| assets/images/loose/ruby/marquise.png | 画像 | 228×402 | 縦 | あり | `js/app.js:1294` | 由来記録なし | 要確認（明示許可がない限り加工しない） | b75cc32ef13dcbf46fe1ef8f4c54881cabae5e97ebbd115da1208d82b2660f4f |
| assets/images/loose/ruby/oval-cabochon.png | 画像 | 283×339 | 縦 | あり | `js/app.js:1298` | 由来記録なし | 要確認（明示許可がない限り加工しない） | b0c151c5189664d5a6c3ac7ce8d7084b8dc77ec886edbd26212d62b5bccf7a52 |
| assets/images/loose/ruby/oval.png | 画像 | 293×350 | 縦 | あり | `js/app.js:1292` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 0930ef8eeffc1e1e6586a83e48f4a8f78dcba0a921296a12dfd632eda50957f5 |
| assets/images/loose/ruby/pear.png | 画像 | 296×391 | 縦 | あり | `js/app.js:1293` | 由来記録なし | 要確認（明示許可がない限り加工しない） | cf8b1e95df47256c94ed8583faa66d617d83fa571a1619abf6d5b325aa2f0b78 |
| assets/images/loose/ruby/round-cabochon.png | 画像 | 350×364 | 縦 | あり | `js/app.js:1297` | 由来記録なし | 要確認（明示許可がない限り加工しない） | b835ded4da98f1f3fbecdbbbd6a59d98379d21854d1ae0cce94b5c6c08e8faea |
| assets/images/loose/ruby/round.png | 画像 | 399×427 | 縦 | あり | `js/app.js:1291` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 2c36f48838f5828d2c27f121efddb3acc9439c3806f36af391972d913cf6f8ac |
| assets/images/loose/ruby/trilliant.png | 画像 | 360×389 | 縦 | あり | `js/app.js:1296` | 由来記録なし | 要確認（明示許可がない限り加工しない） | eec517424d7a33f0e822479f5a9ff68acfab8289e8f5dccddd97369c86b362bb |
| assets/images/loose/sapphire/emerald.png | 画像 | 249×280 | 縦 | あり | `js/app.js:1308` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 1dc9c60171694479b480ee103c04f0c05c87cb174c2d087f6ba061e66042b8b5 |
| assets/images/loose/sapphire/marquise.png | 画像 | 197×352 | 縦 | あり | `js/app.js:1307` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 73eaf8882c6651131fcd34d89e4293c3630d50f2d54cffe4228c592f91f85671 |
| assets/images/loose/sapphire/oval-cabochon.png | 画像 | 249×289 | 縦 | あり | `js/app.js:1311` | 由来記録なし | 要確認（明示許可がない限り加工しない） | ed9a6aa295af3ae25ef5b17b043ab7b87f58647e124d52c598980095e3386dcc |
| assets/images/loose/sapphire/oval.png | 画像 | 267×284 | 縦 | あり | `js/app.js:1305` | 由来記録なし | 要確認（明示許可がない限り加工しない） | a7d7a398300eed338aec719c475624c3cf441db4542047028e2fbfe6687ef611 |
| assets/images/loose/sapphire/pear.png | 画像 | 243×315 | 縦 | あり | `js/app.js:1306` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 6142dcc64cdba52cf8f504657f7e251056c4d22d31772ae4b3c4f4c2af4b6ee8 |
| assets/images/loose/sapphire/round-cabochon.png | 画像 | 289×294 | 縦 | あり | `js/app.js:1310` | 由来記録なし | 要確認（明示許可がない限り加工しない） | a6797bfadd1b2ce81e6acc21a93b0a748e86eafc56abc3b18e048400f648a751 |
| assets/images/loose/sapphire/round.png | 画像 | 301×315 | 縦 | あり | `js/app.js:1304` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 38ea3f96f4cd8bbd20bf73f86eb5c99a647b7a68f6bf1319fc9696c80bf884e6 |
| assets/images/loose/sapphire/trilliant.png | 画像 | 318×315 | 横 | あり | `js/app.js:1309` | 由来記録なし | 要確認（明示許可がない限り加工しない） | b30852d5a58508bba339315bce834f853804830f816f9616fc5827e84fa2dda1 |
| assets/images/loose/sky-tourmaline/emerald.png | 画像 | 1251×1295 | 縦 | あり | `js/app.js:1425` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 43ca821e5089f76d1db1096b0638def256c19218694c1e30e17844191c028c9e |
| assets/images/loose/starry-sapphire/oval.png | 画像 | 1371×1024 | 横 | あり | `js/app.js:1417` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 66b713464c3fdbf723e2642b1f7ae44af53a36e7af0ffc86f1e443ae71035455 |
| assets/images/loose/street-stone/oval.png | 画像 | 1057×1529 | 縦 | あり | `js/app.js:1430` | 由来記録なし | 要確認（明示許可がない限り加工しない） | f5f51fe22b2e6653575f606c40bc30a2a6fc42af4b7342092c0a3dea2a60a754 |
| assets/images/loose/tanzanite/emerald.png | 画像 | 242×273 | 縦 | あり | `js/app.js:1360` | 由来記録なし | 要確認（明示許可がない限り加工しない） | b5ea68abc9f81f5b0e7f2a597f4aff54fe30ab170056363463b513d82ef28202 |
| assets/images/loose/tanzanite/marquise.png | 画像 | 187×330 | 縦 | あり | `js/app.js:1359` | 由来記録なし | 要確認（明示許可がない限り加工しない） | be9bcbd2cf4cb3dd8f7f3b853bd40aa245e401682af23069b4821da807f02779 |
| assets/images/loose/tanzanite/oval-cabochon.png | 画像 | 238×288 | 縦 | あり | `js/app.js:1363` | 由来記録なし | 要確認（明示許可がない限り加工しない） | fef342c4a9da9cf0615e705d9150db04815667583520008a2f530bfce0b7bc52 |
| assets/images/loose/tanzanite/oval.png | 画像 | 249×316 | 縦 | あり | `js/app.js:1357` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 77aa663876a9f8b5a97c4c8346f7466dd302f976c353cb1e22b92688d71c6e28 |
| assets/images/loose/tanzanite/pear.png | 画像 | 247×313 | 縦 | あり | `js/app.js:1358` | 由来記録なし | 要確認（明示許可がない限り加工しない） | d33293622380273e7675138d4c68d6265a3f16b873439c63f56647f7da980f02 |
| assets/images/loose/tanzanite/round-cabochon.png | 画像 | 298×302 | 縦 | あり | `js/app.js:1362` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 62eb071e41ab0f333ac4f408b8149a8f6da29840ea4dac9f13d4ab6859749fe9 |
| assets/images/loose/tanzanite/round.png | 画像 | 313×316 | 縦 | あり | `js/app.js:1356` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 1d87cb681a152b4d394525c6fa953ecbcb31e896f8916fc6f79914ddc782ff30 |
| assets/images/loose/tanzanite/trilliant.png | 画像 | 299×312 | 縦 | あり | `js/app.js:1361` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 533ce2875830da340e03af8dca4682297a582af8c438e12f1a3a57fb432954ba |
| assets/images/loose/tourmaline/emerald.png | 画像 | 268×324 | 縦 | あり | `js/app.js:1347` | 由来記録なし | 要確認（明示許可がない限り加工しない） | fe930f6b38647f7c7da33f9ad92c92ba4789e2ec674ea83d5688c0238bf8a11b |
| assets/images/loose/tourmaline/marquise.png | 画像 | 214×382 | 縦 | あり | `js/app.js:1346` | 由来記録なし | 要確認（明示許可がない限り加工しない） | a587d1b202c008bc5227e8569efa266cca9dfbe07438a8f58528b3c08e9a5fcd |
| assets/images/loose/tourmaline/oval-cabochon.png | 画像 | 282×343 | 縦 | あり | `js/app.js:1350` | 由来記録なし | 要確認（明示許可がない限り加工しない） | bdb2b27d95220c9b5848d1d0b2bf4ffa8a0a8bfad5a780fd19617c7a90a1ea87 |
| assets/images/loose/tourmaline/oval.png | 画像 | 297×342 | 縦 | あり | `js/app.js:1344` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 883b60a3e175b5e30f5c36373a5cff9cb34b4a8823e41b9a8c5bb7b529ee5f1d |
| assets/images/loose/tourmaline/pear.png | 画像 | 292×365 | 縦 | あり | `js/app.js:1345` | 由来記録なし | 要確認（明示許可がない限り加工しない） | dda18cbd368fb1da6ca03d9d1aed4a1c9a3d1d1b220f990c13723be7a41e15a2 |
| assets/images/loose/tourmaline/round-cabochon.png | 画像 | 338×360 | 縦 | あり | `js/app.js:1349` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 47b3ce3ffe9abd6710636ca25326b379c2cd6b69804d933833f99e3210b352d7 |
| assets/images/loose/tourmaline/round.png | 画像 | 389×396 | 縦 | あり | `js/app.js:1343` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 8206bd38c0ee387d57e4414601c9afdce9966ef315fb95e10cab490e316d4431 |
| assets/images/loose/tourmaline/trilliant.png | 画像 | 351×363 | 縦 | あり | `js/app.js:1348` | 由来記録なし | 要確認（明示許可がない限り加工しない） | be6b69e8ecae99681d63084f07fd008c1d440d376fed1395c534beae317bcc3f |
| assets/images/loose/turquoise/oval-cabochon.png | 画像 | 478×658 | 縦 | あり | `js/app.js:1265` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 7015209fdb193f7f42391478a1eb761f39bb2df86399bd92131eb34a966f2afc |
| assets/images/loose/turquoise/round-cabochon.png | 画像 | 667×687 | 縦 | あり | `js/app.js:1264` | 由来記録なし | 要確認（明示許可がない限り加工しない） | ec3e16835edb83474b2ff8256e409dc11eefe04ea6171104b6ca50d694270d56 |
| assets/images/loose/water-garden-emerald/emerald.png | 画像 | 624×774 | 縦 | あり | `js/app.js:1419` | 由来記録なし | 要確認（明示許可がない限り加工しない） | bd945cfa002a7aad04a3face2c4d050ce22192c78e829b32d61b3e648b7e1251 |
| assets/images/loose/wave-aquamarine/oval.png | 画像 | 1187×1000 | 横 | あり | `js/app.js:1428` | 由来記録なし | 要確認（明示許可がない限り加工しない） | e683170c4d43bd67399b399427ba2b23f118b93f5ff0558071fabb2b5f9a67f5 |
| assets/images/loose-shop-portrait-v385.webp | 画像 | 874×1536 | 縦 | なし | `memories-event-image-overrides-v751.js:9` | 由来記録なし | 要確認（明示許可がない限り加工しない） | d593d390215b58b55cdfc78399fe381b49e0c29b6a7aa59ecc5cf368b3ff63d1 |
| assets/images/loose-shop-v380.webp | 画像 | 1536×864 | 横 | なし | 直接参照未検出 | 由来記録なし | 要確認（明示許可がない限り加工しない） | 7e1b6bdc7ee5ebf740ca381c2da662b0135a85cd1c208ff92879f8b3c919f2a8 |
| assets/images/loose-shop-v385.webp | 画像 | 1600×900 | 横 | なし | `memories-event-image-overrides-v751.js:10` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 30c40ae707e24baf3619efe5e31b68620ac95af726d82d3f6237745b6c5325a6 |
| assets/images/loose-shop.webp | 画像 | 1536×864 | 横 | なし | 直接参照未検出 | 由来記録なし | 要確認（明示許可がない限り加工しない） | 7e1b6bdc7ee5ebf740ca381c2da662b0135a85cd1c208ff92879f8b3c919f2a8 |
| assets/images/main-menu-christmas-portrait.webp | 画像 | 855×1536 | 縦 | なし | `sw.js:21` | 由来記録なし | 要確認（明示許可がない限り加工しない） | a8b1337d9e109358ec6014025d3e3b2e9b70badb483925f60e605c1c57dc1d0b |
| assets/images/main-menu-christmas.webp | 画像 | 1536×692 | 横 | なし | `sw.js:21` | 由来記録なし | 要確認（明示許可がない限り加工しない） | f7ebaef81d0fc23757d0641d3472c73ed690ec6a6630be18144d2c60cedb5eb0 |
| assets/images/main-menu-halloween-portrait.webp | 画像 | 675×1200 | 縦 | なし | `sw.js:19` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 504cfcb3be0d1b65d6a32e3737861f025a9f6974816b690f8bdf2f7245e00f92 |
| assets/images/main-menu-halloween.webp | 画像 | 1100×495 | 横 | なし | `sw.js:19` | 由来記録なし | 要確認（明示許可がない限り加工しない） | a63f5bc40b6b90d89ae1c583aa31c2323d64c37d7814fed8cb3eafc56ab92400 |
| assets/images/main-menu-late-autumn-portrait.webp | 画像 | 667×1200 | 縦 | なし | `sw.js:20` | 由来記録なし | 要確認（明示許可がない限り加工しない） | a493c6d0c9bef4ecc1f09949d00213428ac980d5851ee6052a0ba19ad7e0450d |
| assets/images/main-menu-late-autumn.webp | 画像 | 1100×496 | 横 | なし | `sw.js:20` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 821a1fcd9d2a85fa88ebde8c59a3914639a44d5b63a656b3d4af5b30e76ff46b |
| assets/images/main-menu-late-summer-portrait.webp | 画像 | 959×1536 | 縦 | なし | `sw.js:18` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 0588b1f53f3887aad88c14b7dff2932f6286057b1af7d29c51af4781b085123b |
| assets/images/main-menu-late-summer.webp | 画像 | 1536×722 | 横 | なし | `sw.js:18` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 4bd8334288332b57a94a349f5945c808aea27aa9097b7f03979f2bb46c188ab1 |
| assets/images/main-menu-new-year-portrait.webp | 画像 | 1024×1536 | 縦 | なし | `sw.js:14` | 由来記録なし | 要確認（明示許可がない限り加工しない） | b3fc2ae481c8019879dcf136c521f09cd6a2a01ae8b66f316da5989f52152f18 |
| assets/images/main-menu-new-year.webp | 画像 | 1536×691 | 横 | なし | `sw.js:14` | 由来記録なし | 要確認（明示許可がない限り加工しない） | cfa2f361ff4bace2bf58337cf5e63e6ad2008d639ff254af8b179a8e247c5561 |
| assets/images/main-menu-obon-portrait.webp | 画像 | 854×1536 | 縦 | なし | `sw.js:17` | 由来記録なし | 要確認（明示許可がない限り加工しない） | c70bf812615e657f7d9763fc67416c0a6d45b4b1464f8ace9ad61dd1690943e2 |
| assets/images/main-menu-obon.webp | 画像 | 1536×658 | 横 | なし | `sw.js:17` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 978caf7b5d8068d68625ab9a41d09c094cfe30a3d0151d6721a04ceba7f2134f |
| assets/images/main-menu-portrait.webp | 画像 | 864×1536 | 縦 | なし | `index.html:53`<br>`scripts/check-regression-baseline.py:104` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 67c66c36b52adfbf67e535a1806ee42d043669c8f1e72eeb741166a6b53f70cc |
| assets/images/main-menu-snow-portrait.webp | 画像 | 667×1200 | 縦 | なし | `sw.js:22` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 0d736985f4498cd89fc59f11ad6b01f85c66fd761a0d791bbcaefdd3724512be |
| assets/images/main-menu-snow.webp | 画像 | 1100×496 | 横 | なし | `sw.js:22` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 112f7960f406c4ca5d5075045335cefea346be14c4551abe2eed9d3e2afbc36b |
| assets/images/main-menu-spring-portrait.webp | 画像 | 864×1536 | 縦 | なし | `sw.js:15` | 由来記録なし | 要確認（明示許可がない限り加工しない） | f6dc7a1b985e0c2f711ccaa6fda5a9abb9f5e570a2ebaa1ad2d9c4cc437d80ea |
| assets/images/main-menu-spring.webp | 画像 | 1536×692 | 横 | なし | `sw.js:15` | 由来記録なし | 要確認（明示許可がない限り加工しない） | c8aec3d6dd83ef37e3d89abbdab88752947aada66616608fa1a8c420fdedd2fb |
| assets/images/main-menu-tanabata-portrait.webp | 画像 | 864×1536 | 縦 | なし | `sw.js:16` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 428150f6ee7d4ac16db86607ec354d2b098fb5577099d9106b89c16b8ae31554 |
| assets/images/main-menu-tanabata.webp | 画像 | 1536×693 | 横 | なし | `sw.js:16` | 由来記録なし | 要確認（明示許可がない限り加工しない） | e1e6f46a0f38af254fd5e182130e96aed3a3e23a5e1929cd4a8cda8ae8b9dd1c |
| assets/images/main-menu.webp | 画像 | 1672×941 | 横 | なし | `about.html:18`<br>`index.html:26`<br>`scripts/check-regression-baseline.py:103`<br>`scripts/check-pages-publish-policy.py:42` | 由来記録なし | 要確認（明示許可がない限り加工しない） | e91f1fd77e723ff49a0f6fc8512d170f15795a42f897ea845d928be647a64cda |
| assets/images/main-portrait.webp | 画像 | 864×1536 | 縦 | なし | 直接参照未検出 | 由来記録なし | 要確認（明示許可がない限り加工しない） | 67c66c36b52adfbf67e535a1806ee42d043669c8f1e72eeb741166a6b53f70cc |
| assets/images/main.webp | 画像 | 1536×864 | 横 | なし | `styles.css:10` | 由来記録なし | 要確認（明示許可がない限り加工しない） | be4b239e590bc9152c53138d450130f6f85694d5d4bed8eb10ffe43a28e1f24f |
| assets/images/meal-after18-portrait-v727.webp | 画像 | 540×960 | 縦 | なし | `sw.js:12` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 46b249f9c5bf68e82c9a9ddbd77e1e4f03044f8a7275c555a8b7aa923443078f |
| assets/images/meal-after18-v727.webp | 画像 | 960×412 | 横 | なし | `sw.js:12` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 2a704b6ec5a4355d6957ca318cc488461de60182534fe23f2facb582594fb7e5 |
| assets/images/meal-chinese-portrait.webp | 画像 | 864×1536 | 縦 | なし | 直接参照未検出 | 由来記録なし | 要確認（明示許可がない限り加工しない） | 221845c838603b64355b032cc85fff9b9804874549128ecd25a9448555bc63d0 |
| assets/images/meal-chinese.webp | 画像 | 1536×691 | 横 | なし | 直接参照未検出 | 由来記録なし | 要確認（明示許可がない限り加工しない） | 974a4c58d44200c7cfd2ced23ad2e299c6e8980cfcb8b667b837c755fc0e75df |
| assets/images/meal-convenience-portrait.webp | 画像 | 864×1536 | 縦 | なし | 直接参照未検出 | 由来記録なし | 要確認（明示許可がない限り加工しない） | ad3e78335113c296fbc08bd17f794ebfb4def5616ba02a711a37160d5a992233 |
| assets/images/meal-convenience.webp | 画像 | 1536×691 | 横 | なし | 直接参照未検出 | 由来記録なし | 要確認（明示許可がない限り加工しない） | 48887891cc037eca99b5745e41b7638a1aad13a47e6b4f894d7caab495c8c51c |
| assets/images/meal-hamburger-portrait.webp | 画像 | 929×1536 | 縦 | なし | 直接参照未検出 | 由来記録なし | 要確認（明示許可がない限り加工しない） | cd3a86d716b1ca3d709d17edbeee3e479cc0fe999a78268741df48b864fb9026 |
| assets/images/meal-hamburger.webp | 画像 | 1600×900 | 横 | なし | 直接参照未検出 | 由来記録なし | 要確認（明示許可がない限り加工しない） | af5638d8d383c5f78b4fa392dcfbc7845d7c9ca04a626d0d65b7c1269fa01c8b |
| assets/images/meal-ice-portrait.webp | 画像 | 864×1536 | 縦 | なし | 直接参照未検出 | 由来記録なし | 要確認（明示許可がない限り加工しない） | b7d0b8719dfe2a6a85421c5735ac3a26bdca131df486d5a856f443d46941c61c |
| assets/images/meal-ice.webp | 画像 | 1536×864 | 横 | なし | 直接参照未検出 | 由来記録なし | 要確認（明示許可がない限り加工しない） | 2026ef5740434e4a27fab3e3cd27c402671d96a2dc58f7e4de3102df1b2bb66d |
| assets/images/meal-indian-portrait.webp | 画像 | 864×1536 | 縦 | なし | 直接参照未検出 | 由来記録なし | 要確認（明示許可がない限り加工しない） | ab32a9776e1d54b25a41b9ad05720041b30567eec6de71ef8801f88804100b41 |
| assets/images/meal-indian.webp | 画像 | 1536×691 | 横 | なし | 直接参照未検出 | 由来記録なし | 要確認（明示許可がない限り加工しない） | 4e1d902b8ac0039404474e65c713cc98bb399944e00b8be1ee7b77397ce29be3 |
| assets/images/meal-kaitenzushi-event.webp | 画像 | 1536×691 | 横 | なし | 直接参照未検出 | 由来記録なし | 要確認（明示許可がない限り加工しない） | 8a72f1e8ee635d0570669bee857df16f31fc1d2fd5868f6e6472a59550a40c99 |
| assets/images/meal-kebab-portrait.webp | 画像 | 864×1536 | 縦 | なし | 直接参照未検出 | 由来記録なし | 要確認（明示許可がない限り加工しない） | 4d0074b93910546e8f93f02dffb12dbf7243b797f01458bc1ab00c6c6863383d |
| assets/images/meal-kebab.webp | 画像 | 1536×691 | 横 | なし | 直接参照未検出 | 由来記録なし | 要確認（明示許可がない限り加工しない） | f0a113910cc4d6d5afccefe56bcf90c61e341ceefa54f93033acf773bf93b858 |
| assets/images/meal-korean-portrait.webp | 画像 | 1024×1536 | 縦 | なし | 直接参照未検出 | 由来記録なし | 要確認（明示許可がない限り加工しない） | 2d904a15db99c9fdd6f53139c2b85c83d01a8becd8449d5b9009c2d924c0896c |
| assets/images/meal-korean.webp | 画像 | 1536×691 | 横 | なし | 直接参照未検出 | 由来記録なし | 要確認（明示許可がない限り加工しない） | 70b0a3fe946bcddd0d42615e937e082f8de9ac538b8c5429b94efae195ce2413 |
| assets/images/meal-menu-portrait.webp | 画像 | 863×1536 | 縦 | なし | `scripts/check-regression-baseline.py:109` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 760808e6aac7fa0955748e5d31b26f391561f15993f39f4e88848070b1f3b151 |
| assets/images/meal-menu.webp | 画像 | 1536×658 | 横 | なし | 直接参照未検出 | 由来記録なし | 要確認（明示許可がない限り加工しない） | baf3328cf15b1b54c846413693ef9a38432d2f0f0b63f703b9efc6885cb2e091 |
| assets/images/meal-ramen-portrait-v386.webp | 画像 | 1024×1536 | 縦 | なし | 直接参照未検出 | 由来記録なし | 要確認（明示許可がない限り加工しない） | 09972a01c31c09a48617d19c9f747516118b63aa99e4e28f88da76316cffc9d5 |
| assets/images/meal-ramen-portrait.webp | 画像 | 1024×1536 | 縦 | なし | 直接参照未検出 | 由来記録なし | 要確認（明示許可がない限り加工しない） | 09972a01c31c09a48617d19c9f747516118b63aa99e4e28f88da76316cffc9d5 |
| assets/images/meal-ramen-reunion-portrait-v387.webp | 画像 | 900×1600 | 縦 | なし | 直接参照未検出 | 由来記録なし | 要確認（明示許可がない限り加工しない） | 83b1b336369f2bd16b646addc69c88a427d533577003f7b14be248e4be450ae1 |
| assets/images/meal-ramen-reunion-portrait-v696.webp | 画像 | 864×1536 | 縦 | なし | 直接参照未検出 | 由来記録なし | 要確認（明示許可がない限り加工しない） | 060592c360635ab96468fe40d30d8d00ad0f362a670f9b1e15e9d95af0b7880a |
| assets/images/meal-ramen-reunion-v387.webp | 画像 | 1600×900 | 横 | なし | `js/memories-screen.js:39` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 8aad53e4c1885970566b066169a393e89161f2bdfbdc0baf90d8621df4bec1e1 |
| assets/images/meal-ramen-v386.webp | 画像 | 1600×900 | 横 | なし | 直接参照未検出 | 由来記録なし | 要確認（明示許可がない限り加工しない） | c45a701d7089323f511aee33b3b5faf5fc9a5be4e5773604cf6013219e8e5c96 |
| assets/images/meal-ramen.webp | 画像 | 1536×691 | 横 | なし | 直接参照未検出 | 由来記録なし | 要確認（明示許可がない限り加工しない） | d3da36c7938223df67e5d1112d5063f18455c2dffef5cfa7e014536863fda6a2 |
| assets/images/meal-soba-portrait.webp | 画像 | 864×1536 | 縦 | なし | 直接参照未検出 | 由来記録なし | 要確認（明示許可がない限り加工しない） | c413239337c47e8ce8b20f8ee4f1ba868b415efb204a1150c9bca9a93f961378 |
| assets/images/meal-soba.webp | 画像 | 1536×691 | 横 | なし | 直接参照未検出 | 由来記録なし | 要確認（明示許可がない限り加工しない） | a432f37be3826c6a185dcebab0fa9ed9be2e14fb9ca7ca677a720a83586db444 |
| assets/images/metals/k18yg.png | 画像 | 1369×319 | 横 | あり | `js/app.js:5192` | 由来記録なし | 要確認（明示許可がない限り加工しない） | ddd298d5e0fb28ed064ab93035cf2bcc67cc834b19b22306042916c94504535d |
| assets/images/metals/pt900.png | 画像 | 1234×643 | 横 | あり | `js/app.js:5193` | 由来記録なし | 要確認（明示許可がない限り加工しない） | bdadf406785ffd1fd7b647f8fb2a4dfadacb385765203a24debb3c7b8032ecb6 |
| assets/images/metals/sv925.png | 画像 | 1422×1142 | 横 | あり | `js/app.js:5194` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 24d28f7cf6b6bf5dc1481ec4c6890921e5c5bab380934912d961f37e28612a7e |
| assets/images/metalshop-portrait.webp | 画像 | 1024×1536 | 縦 | なし | 直接参照未検出 | 由来記録なし | 要確認（明示許可がない限り加工しない） | 01def48f984140ba70ee1cea43d461a03d6e7660fc69a0bb967387e01785e021 |
| assets/images/metalshop.webp | 画像 | 1536×691 | 横 | なし | 直接参照未検出 | 由来記録なし | 要確認（明示許可がない限り加工しない） | a12d9b65e3532d04b72a89a5e3729430612c6bddd15592511788b8e6c0786f3f |
| assets/images/mining-portrait.webp | 画像 | 864×1536 | 縦 | なし | `scripts/check-regression-baseline.py:106` | 由来記録なし | 要確認（明示許可がない限り加工しない） | ea6ebfce4ee04b7a9616247b1b92d5b9f62d804b78fd178dabfc1fd9026731a3 |
| assets/images/mining-rock.png | 画像 | 600×480 | 横 | あり | `js/app.js:16730` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 0014187199bf4d6aed0970f7d81550e451f6e06c4964ec9056c007906022001f |
| assets/images/mining-rocks/rock-01.png | 画像 | 1024×923 | 横 | あり | `js/app.js:1143` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 2e48329a0c6a367492bc95910a61cdec72865b4b92e23751d182b0bbede7c802 |
| assets/images/mining-rocks/rock-02.png | 画像 | 1024×926 | 横 | あり | `js/app.js:1144` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 6222682b4c9ed5f0711440f53a507c8e2cce32b771af7735447724d1b856a77b |
| assets/images/mining-rocks/rock-03.png | 画像 | 1024×601 | 横 | あり | `js/app.js:1145` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 02faf71f76db25e6019a5995cc121d85569a438198dc41f83cd79b88bcb9f7c4 |
| assets/images/mining-rocks/rock-04.png | 画像 | 1024×874 | 横 | あり | `js/app.js:1146` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 639a034a371050fb1fa46cd45bb18de2b1a190884ba6b341d4f9057eb58b836e |
| assets/images/mining-rocks/rock-05.png | 画像 | 1024×907 | 横 | あり | `js/app.js:1147` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 898227f9f9990a01f44d77f19a2502cea71b2be4008f1131ac2a5a5c686b81ce |
| assets/images/mining-rocks/rock-06.png | 画像 | 1024×881 | 横 | あり | `js/app.js:1148` | 由来記録なし | 要確認（明示許可がない限り加工しない） | d76284c78459531bcdf4f3b0f8645b18f63ee405c8e1a7742b07d67b386ce270 |
| assets/images/mining-rocks/rock-07.png | 画像 | 1024×727 | 横 | あり | `js/app.js:1149` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 1e2b21ef55b5c018b679858610f35eddfed37c9f279ea7ce86d5b5b4f11bf6e9 |
| assets/images/mining-rocks/rock-08.png | 画像 | 1024×861 | 横 | あり | `js/app.js:1150` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 917123c66b4046254bfbcfa5141e88886a0193275d5b2ad7049585f24b54bc60 |
| assets/images/mining-rocks/rock-09.png | 画像 | 1024×571 | 横 | あり | `js/app.js:1151` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 10918ae6c3884a622e7f2e3741bc07cbc673d3c5a50833d895ba106be00a4562 |
| assets/images/mining-rocks/rock-10.png | 画像 | 1024×826 | 横 | あり | `js/app.js:1152` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 01b5d33c02ce04bed4024e157328a7f766982a28d3bb49404250677d62e56384 |
| assets/images/mining-rocks-broken/broken-01.png | 画像 | 1024×989 | 横 | あり | `js/app.js:1156` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 54369904b76fc44d289a6122c4f71eeb569af1159c78d141675b2f2679989bd2 |
| assets/images/mining-rocks-broken/broken-02.png | 画像 | 1024×983 | 横 | あり | `js/app.js:1157` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 788c41685e3660f4e29774c7bb6e5a0663c3fd63ee4b6be3af02a07187d26b0f |
| assets/images/mining-rocks-broken/broken-03.png | 画像 | 974×1024 | 縦 | あり | `js/app.js:1158` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 5a1dafd5d186cca1c0fd202a1b1af2040cf4f99af432f5aaca8cba7da8f4c65f |
| assets/images/mining-rocks-broken/broken-04.png | 画像 | 1024×976 | 横 | あり | `js/app.js:1159` | 由来記録なし | 要確認（明示許可がない限り加工しない） | cbc50580c23c182a923c46f99841a54f11c164e939175aef17f152386c5dc7b1 |
| assets/images/mining-rocks-broken/broken-05.png | 画像 | 1024×1012 | 横 | あり | `js/app.js:1160` | 由来記録なし | 要確認（明示許可がない限り加工しない） | ad9f7e169bc229d790d2c9f95dd8214dd0d8fee8cd4bff15396eacb203be71cf |
| assets/images/mining.webp | 画像 | 1536×691 | 横 | なし | 直接参照未検出 | 由来記録なし | 要確認（明示許可がない限り加工しない） | e89c13a888563b7e319781e8599cc7e8dc567ff86205c81a21a7d426abe301b2 |
| assets/images/okachimachi-night-portrait.webp | 画像 | 1024×1536 | 縦 | なし | `sw.js:11`<br>`scripts/check-okachimachi-night-background.py:23` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 10292b3f85930a4bff01bdf68399fc87a863fcf2a50c75b62082ed9579d9def6 |
| assets/images/okachimachi-night.webp | 画像 | 1536×768 | 横 | なし | `sw.js:11`<br>`scripts/check-okachimachi-night-background.py:22` | 由来記録なし | 要確認（明示許可がない限り加工しない） | b926ee089a26f6c180e650b4dc6d10e504ec5ca9ba322df0322ad572066a2f56 |
| assets/images/okachimachi-portrait.webp | 画像 | 864×1536 | 縦 | なし | `scripts/check-okachimachi-night-background.py:29` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 8e98c290728642c38f98ac8f94e2f7f2914d3b02c2076b26a4b71386eb53ea29 |
| assets/images/okachimachi.webp | 画像 | 1536×691 | 横 | なし | `scripts/check-okachimachi-night-background.py:28`<br>`scripts/check-regression-baseline.py:105` | 由来記録なし | 要確認（明示許可がない限り加工しない） | cf95f05dbcace294e04afebbe0b06fc1378d26a3fc1109953aae1f2b05da1505 |
| assets/images/panda-hiroba-portrait.webp | 画像 | 971×1536 | 縦 | なし | 直接参照未検出 | 由来記録なし | 要確認（明示許可がない限り加工しない） | 62a82ad70f56ff456a9297e8cc9860b231438d7ada65c1c9f812a489ace990c1 |
| assets/images/panda-hiroba.webp | 画像 | 1536×691 | 横 | なし | 直接参照未検出 | 由来記録なし | 要確認（明示許可がない限り加工しない） | ee337aeeb899b8b8c2c41155d19e7552dde540d8c053e1fec2cda92922344b7a |
| assets/images/phone.webp | 画像 | 864×1536 | 縦 | なし | 直接参照未検出 | 由来記録なし | 要確認（明示許可がない限り加工しない） | a95c7e448c0c030d077a3942471f45cc7279adf0f9134dc6a2afcb7c8a0b02a0 |
| assets/images/quiz/quiz-king-normal.png | 画像 | 992×1519 | 縦 | あり | `quiz-layout-test.html:4`<br>`scripts/check-regression-baseline.py:111`<br>`js/app.js:11748`<br>`js/memories-screen.js:40` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 1e51932752a2e448b141b4bea7434ee8d78a054edfa00dacd3a0cb262936c312 |
| assets/images/quiz/quiz-king-player-correct.png | 画像 | 1012×1332 | 縦 | あり | `js/app.js:11746` | 由来記録なし | 要確認（明示許可がない限り加工しない） | bec7a3b1ba18b2dde416795a11261ccc82a7a3bdfe359bdd494cef46eef9b3b3 |
| assets/images/quiz/quiz-king-player-incorrect.png | 画像 | 1113×1519 | 縦 | あり | `js/app.js:11747` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 2e7c472de743066b8ed155f8d3c19eb9b7d27c9ee21be3d1276d8afed0870cff |
| assets/images/real-estate-portrait.webp | 画像 | 1022×1536 | 縦 | なし | 直接参照未検出 | 由来記録なし | 要確認（明示許可がない限り加工しない） | ba9f27d980eb2637a7a8d03a257616d9ce2942e8a7fa3361d523bded87da9ecf |
| assets/images/real-estate.webp | 画像 | 1536×691 | 横 | なし | 直接参照未検出 | 由来記録なし | 要確認（明示許可がない限り加工しない） | e69e27edea2254cbfdf3835c59e8b2cd75cd6f8ed42d626eb6e94e9705b81e11 |
| assets/images/robbery-newspaper.webp | 画像 | 1536×1087 | 横 | なし | `js/app.js:14387` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 99762942cc28691c5aed3c2c4832f3cbad5b90335aab6f148af1dfe6d7b60339 |
| assets/images/sleep-portrait.webp | 画像 | 864×1536 | 縦 | なし | 直接参照未検出 | 由来記録なし | 要確認（明示許可がない限り加工しない） | c82b45cb7d60701703733d966784ecd1b85525e55ea733fb3c6c25af63ce9f1b |
| assets/images/sleep.webp | 画像 | 1536×691 | 横 | なし | 直接参照未検出 | 由来記録なし | 要確認（明示許可がない限り加工しない） | 26b311327c2681b303b4ca059f8573af3723379165a5c501266ecbd15293e147 |
| assets/images/space-portrait.webp | 画像 | 711×1536 | 縦 | なし | `scripts/check-regression-baseline.py:110` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 32cd95dd2f71a062d8a682ef7b06c91b2273807345249a35262f6013385f1a9a |
| assets/images/space.webp | 画像 | 1536×688 | 横 | なし | 直接参照未検出 | 由来記録なし | 要確認（明示許可がない限り加工しない） | 7e0a14b374193885ac01244a356ba37883a021adab5ca9d8fef844ca0df586d9 |
| assets/images/store-portrait.webp | 画像 | 864×1536 | 縦 | なし | `scripts/check-regression-baseline.py:108` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 667e2750d7640e006fe9ced9d0753d21d0ae3e692a274dca1ac9d81ae11f5665 |
| assets/images/store.webp | 画像 | 1536×691 | 横 | なし | 直接参照未検出 | 由来記録なし | 要確認（明示許可がない限り加工しない） | 5b74c1131a116a22c6a50349a2975ab0e0d9efb469e3b2005d44c8d1f631630e |
| assets/images/today-gem-portrait.webp | 画像 | 864×1536 | 縦 | なし | 直接参照未検出 | 由来記録なし | 要確認（明示許可がない限り加工しない） | 9983b93a5d621b423ca6f488940ce0a30e8cfde454368a9ef527a26bdfcefe8f |
| assets/images/today-gem.webp | 画像 | 1536×864 | 横 | なし | 直接参照未検出 | 由来記録なし | 要確認（明示許可がない限り加工しない） | 406168b5a747d7607dd75749ef2e095e346beac9472ea76ba4314f431638ed83 |
| assets/images/tools/bench-peg.png | 画像 | 1156×528 | 横 | あり | `js/game-data-core.js:3603` | 受領アセット（TOOL_IMAGE_INTAKE_MANIFEST_v0.10.484.json, source=1000019139.png） | 変更禁止（原本由来。明示許可時のみ加工） | f163464054cdab75c42f88239d6c5a6f6c60ec832051254430d1fa4042bbd263 |
| assets/images/tools/buffer.png | 画像 | 1167×870 | 横 | あり | `js/game-data-core.js:3908` | 受領アセット（TOOL_IMAGE_INTAKE_MANIFEST_v0.10.484.json, source=9a7fa51c-2e12-5518-8882-03be6e45abbb.png） | 変更禁止（原本由来。明示許可時のみ加工） | 633edd0b6d8a34166b83ee095fa312d9967c4a0af1c583f0df8d7ab2f58833ad |
| assets/images/tools/diamond-polishing-lap.png | 画像 | 1403×906 | 横 | あり | `js/game-data-core.js:3403` | 由来記録なし | 要確認（明示許可がない限り加工しない） | e7933d260371f70871acbc57b119d6e894fc4d7e078bc2ca8061e46670ed1fb8 |
| assets/images/tools/dividers.png | 画像 | 1299×950 | 横 | あり | `js/game-data-core.js:3897` | 受領アセット（TOOL_IMAGE_INTAKE_MANIFEST_v0.10.484.json, source=1000019173.png） | 変更禁止（原本由来。明示許可時のみ加工） | 74cfa414b60951cea2194cae5d612413c1df76ac2b58af7fb001bc974a056952 |
| assets/images/tools/electronic-scale.png | 画像 | 910×838 | 横 | あり | `js/game-data-core.js:3829` | 受領アセット（TOOL_IMAGE_INTAKE_MANIFEST_v0.10.484.json, source=1000019142.png） | 変更禁止（原本由来。明示許可時のみ加工） | 73dd8f973f2fffe208f614abffb7703ca5d7d4ae3f74cc47cadca53db508add6 |
| assets/images/tools/engraving-block.png | 画像 | 956×1207 | 縦 | あり | `js/game-data-core.js:3667` | 受領アセット（TOOL_IMAGE_INTAKE_MANIFEST_v0.10.484.json, source=1000019166.png） | 変更禁止（原本由来。明示許可時のみ加工） | a66f08999287f70ed06cb54786c7db4492a67f804aa190bf27f574cb0f596e47 |
| assets/images/tools/file.png | 画像 | 1462×812 | 横 | あり | `js/game-data-core.js:3410` | 受領アセット（TOOL_IMAGE_INTAKE_MANIFEST_v0.10.484.json, source=1000019171.png） | 変更禁止（原本由来。明示許可時のみ加工） | f1bdf44b45e670772fb1968933ea1110d96fbb40f13c3869980008d8801a4918 |
| assets/images/tools/gem-polishing-machine.png | 画像 | 1376×1135 | 横 | あり | `js/game-data-core.js:3366` | 由来記録なし | 要確認（明示許可がない限り加工しない） | e798727fb7c8be0e26d4ea2f96076df88a8633a76476ce38e78c89912e4ed4d0 |
| assets/images/tools/graver.png | 画像 | 94×1194 | 縦 | あり | `js/game-data-core.js:3635` | 受領アセット（TOOL_IMAGE_INTAKE_MANIFEST_v0.10.484.json, source=1000019134.png） | 変更禁止（原本由来。明示許可時のみ加工） | 1dca8e5c9583c75f719c89c61e1ed852c6de790ccf369a6312404728c6d657be |
| assets/images/tools/hammer.png | 画像 | 1362×744 | 横 | あり | `js/game-data-core.js:3506` | 受領アセット（TOOL_IMAGE_INTAKE_MANIFEST_v0.10.484.json, source=1000019167.png） | 変更禁止（原本由来。明示許可時のみ加工） | e11df073fbab11666ee705b12f77377f135df57e0aeb6f0a7512cfc0073f415a |
| assets/images/tools/jewelry-bench.png | 画像 | 1516×1051 | 横 | あり | `js/game-data-core.js:3334` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 295324fe319f96152f5ea10532eb99f7bdba4f47e3e21048252782d1bcb45479 |
| assets/images/tools/loupe.png | 画像 | 1420×758 | 横 | あり | `js/game-data-core.js:3571` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 94206312968c89baeb72f17897f185119a160f59145509d2d88e4266b63bc126 |
| assets/images/tools/magnifier.png | 画像 | 1499×1426 | 横 | あり | `js/game-data-core.js:3538` | 受領アセット（TOOL_IMAGE_INTAKE_MANIFEST_v0.10.484.json, source=1000019169.png） | 変更禁止（原本由来。明示許可時のみ加工） | e9d35a086e560f0f56795a219b93e621d0b3bfa8cbb007ded5e4fbd50cd9b4e9 |
| assets/images/tools/milgrain-tool.png | 画像 | 1487×815 | 横 | あり | `js/game-data-core.js:3885` | 受領アセット（TOOL_IMAGE_INTAKE_MANIFEST_v0.10.484.json, source=1000019172.png） | 変更禁止（原本由来。明示許可時のみ加工） | 8eb2587fed26101ffc9e476119e51b77b4e1d03a52c8ad81b90a5ca1cdcf9d16 |
| assets/images/tools/nipper.png | 画像 | 1112×594 | 横 | あり | `js/game-data-core.js:3797` | 受領アセット（TOOL_IMAGE_INTAKE_MANIFEST_v0.10.484.json, source=1000019138.png） | 変更禁止（原本由来。明示許可時のみ加工） | d9c87eb2ff84fa6312f7272438822fce854c829b7d3867cb1d54d7fa5111fbdd |
| assets/images/tools/piercing-saw.png | 画像 | 1285×522 | 横 | あり | `js/game-data-core.js:3765` | 受領アセット（TOOL_IMAGE_INTAKE_MANIFEST_v0.10.484.json, source=1000019136.png） | 変更禁止（原本由来。明示許可時のみ加工） | 6adcfe27b025863abfd84a9a93ffb3e65af68e1530977280b34f6f1399ec3e59 |
| assets/images/tools/placeholder.svg | 画像 | 1,082 B | - | - | `js/app.js:5788` | 由来記録なし | 要確認（明示許可がない限り加工しない） | cc10efb7ab22dbc9050cf29bd8cb018ece31c22e96e356062e18904acbcbf7d2 |
| assets/images/tools/pliers.png | 画像 | 750×1511 | 縦 | あり | `js/game-data-core.js:3442` | 受領アセット（TOOL_IMAGE_INTAKE_MANIFEST_v0.10.484.json, source=1000019135.png） | 変更禁止（原本由来。明示許可時のみ加工） | 7aa16c10e635f06cfc22fb44374acd365657f05a123cefff0755bcdbea7b02d6 |
| assets/images/tools/rolling-mill.png | 画像 | 1408×1413 | 縦 | あり | `js/game-data-core.js:3873` | 受領アセット（TOOL_IMAGE_INTAKE_MANIFEST_v0.10.484.json, source=1000019170.png） | 変更禁止（原本由来。明示許可時のみ加工） | d09a579280ee4bc1d2bcb143f72d88aba43b7f003e97909deed9e2856bcc10eb |
| assets/images/tools/rotary-tool.png | 画像 | 1350×1314 | 横 | あり | `js/game-data-core.js:3733` | 受領アセット（TOOL_IMAGE_INTAKE_MANIFEST_v0.10.484.json, source=1000019141.png） | 変更禁止（原本由来。明示許可時のみ加工） | 44925cbd9ad46ee9880ab1d366dffa758bbe2d8b550deef9e63e9644e33ad9d5 |
| assets/images/tools/stamps.png | 画像 | 1447×380 | 横 | あり | `js/game-data-core.js:3700` | 受領アセット（TOOL_IMAGE_INTAKE_MANIFEST_v0.10.484.json, source=1000019165.png） | 変更禁止（原本由来。明示許可時のみ加工） | fc82276a36714bf0ddf9c200f2f6506b943c370b15c703d6f74917fb29a0bf6c |
| assets/images/tools/torch.png | 画像 | 1445×484 | 横 | あり | `js/game-data-core.js:3474` | 受領アセット（TOOL_IMAGE_INTAKE_MANIFEST_v0.10.484.json, source=1000019140.png） | 変更禁止（原本由来。明示許可時のみ加工） | 18f246d71bb72b4da82a7ae436be12684f076468f8da5838df9068cf7bc039f2 |
| assets/images/tools/ultrasonic-cleaner.png | 画像 | 1276×1185 | 横 | あり | `js/game-data-core.js:3941` | 受領アセット（TOOL_IMAGE_INTAKE_MANIFEST_v0.10.484.json, source=1000019137.png） | 変更禁止（原本由来。明示許可時のみ加工） | 35ca8a1c8debfd11065332d1738cda7b290d1946db970560806939752820929a |
| assets/images/tools/wood-block.png | 画像 | 728×1440 | 縦 | あり | `js/game-data-core.js:3862` | 受領アセット（TOOL_IMAGE_INTAKE_MANIFEST_v0.10.484.json, source=1000019168.png） | 変更禁止（原本由来。明示許可時のみ加工） | 4a599ba5e6c3232db80eb85b590500a18f6b84c0d58f2f1ed15e1a0ae8aca4ce |
| assets/images/tropical-fish-shop-portrait.webp | 画像 | 864×1536 | 縦 | なし | 直接参照未検出 | 由来記録なし | 要確認（明示許可がない限り加工しない） | 06c12c0c6459b14de944f22a08e01b2638a4d0668c387a033908c001e841dcd0 |
| assets/images/tropical-fish-shop.webp | 画像 | 1536×691 | 横 | なし | 直接参照未検出 | 由来記録なし | 要確認（明示許可がない限り加工しない） | d2fe5c3354d5af395c34ddd7eb35616b495a1fb79c666f992933c1ee522f35d5 |
| assets/images/tropical-shop/fish-african-lampeye.png | 画像 | 1173×447 | 横 | あり | `js/app.js:414 (basename)` | 由来記録なし | 要確認（明示許可がない限り加工しない） | e85b80a56202830bfc204533c1beacdbf855b9068dabd772307ebdf390985a57 |
| assets/images/tropical-shop/fish-altum-angelfish.png | 画像 | 613×1005 | 縦 | あり | `js/app.js:414 (basename)` | 由来記録なし | 要確認（明示許可がない限り加工しない） | dcf3295642568276a42c5b908d6389d44ea90feab0f7f88c62aeaaf4d75c9052 |
| assets/images/tropical-shop/fish-black-molly.png | 画像 | 1200×823 | 横 | あり | `js/app.js:414 (basename)` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 9a8a1fe57701354850e748368803090516a843efed53950301c99d8cfea9ab59 |
| assets/images/tropical-shop/fish-corydoras.webp | 画像 | 340×164 | 横 | あり | `js/app.js:414 (basename)` | 由来記録なし | 要確認（明示許可がない限り加工しない） | b8cef9dc3fb20113ef7b02bc20c5cf4336eba6caa0a2e4bc6303549f04d27b11 |
| assets/images/tropical-shop/fish-discus-blue-diamond.webp | 画像 | 440×396 | 横 | あり | `js/app.js:414 (basename)` | 由来記録なし | 要確認（明示許可がない限り加工しない） | e0eb086a9fadf7d7cc91ef0d6979c22ec2778b06d18021c0479c8a00633c7775 |
| assets/images/tropical-shop/fish-discus-red-map.webp | 画像 | 440×393 | 横 | あり | `js/app.js:414 (basename)` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 857b9b129c23b594a6b3a76495a5769239f6dafd6e7bd85a33dc3b783c699146 |
| assets/images/tropical-shop/fish-dwarf-gourami.png | 画像 | 1087×769 | 横 | あり | `js/app.js:414 (basename)` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 2b20b7da9147a3699558c45a7491eca9eefe71a7050232415129cb22a59c2663 |
| assets/images/tropical-shop/fish-neon-tetra.webp | 画像 | 280×141 | 横 | あり | `js/app.js:414 (basename)` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 7e6d0847737dc088394dd284c2cf7040fe884a1c5ff55288b02515114b060a87 |
| assets/images/tropical-shop/fish-platy.webp | 画像 | 300×175 | 横 | あり | `js/app.js:414 (basename)` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 9344dd5803414f40a6d24703947c4740f934c6e847d15873d0d16727a64ba589 |
| assets/images/tropical-shop/fish-red-phantom-tetra.webp | 画像 | 300×187 | 横 | あり | `js/app.js:414 (basename)` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 356d3dd9bf1e04984016994efe5937df0e4282a6962ce1d289f0583170fe4285 |
| assets/images/tropical-shop/fish-rummy-nose-tetra.webp | 画像 | 280×133 | 横 | あり | `js/app.js:414 (basename)` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 118018e5e07398c590f3daab50f18ae5a017558f362e8803016be8a6eb0be64e |
| assets/images/tropical-shop/plant-amazon-pennywort.png | 画像 | 1275×1211 | 横 | あり | `js/app.js:417 (basename)` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 148a10e4737c9b109aa70ccacd82e58a778fef24e208d9af53d906e324a81533 |
| assets/images/tropical-shop/plant-amazon-sword.webp | 画像 | 951×992 | 縦 | あり | `js/app.js:417 (basename)` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 6b205b4914e7d3a50d89482007c39cefdbd888eb07f730fc54025f824792e45f |
| assets/images/tropical-shop/plant-anacharis.webp | 画像 | 541×1160 | 縦 | あり | `js/app.js:417 (basename)` | 由来記録なし | 要確認（明示許可がない限り加工しない） | e19a817f5195953a506ab6d40e985244597eb7f1e06098e9f76b449068d0a653 |
| assets/images/tropical-shop/plant-anubias-nana.webp | 画像 | 1483×1003 | 横 | あり | `js/app.js:417 (basename)` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 47f4e54a751402998cf0f6728b5260b2ac461260f20454ec127cc779fb6c620a |
| assets/images/tropical-shop/plant-cabomba.png | 画像 | 999×1492 | 縦 | あり | `js/app.js:417 (basename)` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 38767c08d24653c62b981e1619458200fa4a1e475e1b88c62cc7ba1c1c8d8f70 |
| assets/images/tropical-shop/plant-cryptocoryne.png | 画像 | 1499×1035 | 横 | あり | `js/app.js:417 (basename)` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 415138ff66111d9f61a015f96267b385ed6d74aef65b410c3311c5cda597b028 |
| assets/images/tropical-shop/plant-hygrophila.png | 画像 | 847×1006 | 縦 | あり | `js/app.js:417 (basename)` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 124be27a8b961fa1a7a209924764c4ed1e0b5695afa93bd9116b07b2603463bd |
| assets/images/tropical-shop/plant-microsorum.webp | 画像 | 1473×1203 | 横 | あり | `js/app.js:417 (basename)` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 9cd8ddec4ee1489c670c9f4d41bfab209be941ebceb512b12e5290ecd98e64e0 |
| assets/images/tropical-shop/plant-vallisneria.png | 画像 | 651×1501 | 縦 | あり | `js/app.js:417 (basename)` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 7ef8541c429d440d5854ded6b05519a3dbe4df9f2bfdb70a535e796a0c07b149 |
| assets/images/tropical-shop/plant-willow-moss.webp | 画像 | 1492×838 | 横 | あり | `js/app.js:417 (basename)` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 38b1090623377a1257bf5beac949bd02960454332c1fa0bd3c1d826759d56601 |
| assets/images/tropical-shop/stone_a.png | 画像 | 1200×817 | 横 | あり | `js/app.js:421 (basename)` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 68d5f0d9b9bfdbc8a8994b107c3daa97f0fd8a0b7efe882d59c56ca9d841734a |
| assets/images/tropical-shop/stone_b.png | 画像 | 1200×812 | 横 | あり | `js/app.js:421 (basename)` | 由来記録なし | 要確認（明示許可がない限り加工しない） | e50502ac81c6de715115838c2f979c09c4158d54ffe2168647f72c32c48e0bb6 |
| assets/images/tropical-shop/stone_c.png | 画像 | 1200×736 | 横 | あり | `js/app.js:421 (basename)` | 由来記録なし | 要確認（明示許可がない限り加工しない） | b87754a8b725dda9f88540f988cb8e18bd958f036fbf38063f33bdf79231259a |
| assets/images/tropical-shop/wood_large_a.png | 画像 | 1200×578 | 横 | あり | `js/app.js:420 (basename)` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 7d2877bb91db5fad8591d4e417ae57040de95501a09f71eec98a57fe587c40b6 |
| assets/images/tropical-shop/wood_large_b.png | 画像 | 1200×710 | 横 | あり | `js/app.js:420 (basename)` | 由来記録なし | 要確認（明示許可がない限り加工しない） | e84b9b10a05d1fef3a3e14aa13f2734e1e24332596bd848716a34b59a30f582a |
| assets/images/tropical-shop/wood_medium_a.png | 画像 | 1200×1190 | 横 | あり | `js/app.js:420 (basename)` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 71b33eb9bcd50013f7ee2d2f0eb1bd628ed7cb266a768fd47a37c90395cb8de2 |
| assets/images/tropical-shop/wood_medium_b.png | 画像 | 957×563 | 横 | あり | `js/app.js:420 (basename)` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 064a57d75297b2c8d04f849c46f29a11999ae5c815c049f011cf52c8eea57328 |
| assets/images/tropical-shop/wood_small_a.png | 画像 | 1200×373 | 横 | あり | `js/app.js:420 (basename)` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 5cb139e73e44cb44b1ade56ea2b48c88a6cf0509af6a3921ef5616846e3125d2 |
| assets/images/tropical-shop/wood_small_b.png | 画像 | 1121×580 | 横 | あり | `js/app.js:420 (basename)` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 44812724c81d82354d96bcf33e3abbf1ddd206a85aa07f8124c8b60ac7c2e612 |
| assets/images/ui/memories-bg-landscape-v738.webp | 画像 | 960×432 | 横 | なし | `js/memories-backgrounds.js:1` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 64a384b075d935ea52ca6e32518e583f36f790dda1ef99a2c28ab6d546e91023 |
| assets/images/ui/memories-bg-portrait-v738.webp | 画像 | 432×768 | 縦 | なし | 直接参照未検出 | 由来記録なし | 要確認（明示許可がない限り加工しない） | 08fd7cf99dce71b4a4d4eed7d03e2a77d535cc88fb889e4063482d88522a876e |
| assets/images/ui/memories-bg-portrait-v746.webp | 画像 | 432×768 | 縦 | なし | 直接参照未検出 | 由来記録なし | 要確認（明示許可がない限り加工しない） | 08fd7cf99dce71b4a4d4eed7d03e2a77d535cc88fb889e4063482d88522a876e |
| assets/images/ui/memories-bg-portrait-v748.webp | 画像 | 360×640 | 縦 | なし | `js/memories-backgrounds.js:2` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 5bf9215c04862d31e673d2c0d8aa84c01d6e027c60e8af447bbf55b2251fd777 |
| assets/images/workshop-portrait.webp | 画像 | 864×1536 | 縦 | なし | `scripts/check-regression-baseline.py:107` | 由来記録なし | 要確認（明示許可がない限り加工しない） | abc31e3aafd5340e32422f52189e1672ee4bcbd14823d81ecfaabb532854e433 |
| assets/images/workshop-staff-apprentice-v754.base64.txt | データ | 19,523 B | - | - | `workshop-staff-images-v754.js:8` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 8048f1acae0f2794031a006ce89fe292000007510ba40ae924749ef96e1c6e62 |
| assets/images/workshop-staff-skilled-v754.base64.txt | データ | 10,852 B | - | - | `workshop-staff-images-v754.js:9` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 34d1ac20a4d486bf71c140be2b9539b69edeb7ce3c33f2e599c340ef444a68e2 |
| assets/images/workshop.webp | 画像 | 1536×691 | 横 | なし | 直接参照未検出 | 由来記録なし | 要確認（明示許可がない限り加工しない） | 814aadc3f086d7caa483545b800522fe8329f6e80327874a8d9066a5cc096992 |
| assets/minigames/aquarium/aquarium_config.json | データ | 9,865 B | - | - | 直接参照未検出 | 由来記録なし | 要確認（明示許可がない限り加工しない） | 0cffdd0693ce953b401c95c4baddc215a3c19728c36af70be1de5d52ea38ede9 |
| assets/minigames/aquarium/aquarium_initial_state.json | データ | 3,259 B | - | - | 直接参照未検出 | 由来記録なし | 要確認（明示許可がない限り加工しない） | 81dc2cc2ffd00c83a013f2084138b05a22452b11814ea1283184855b5d55b9f6 |
| assets/minigames/aquarium/aquarium_state_manager.js | ミニゲーム/コード | 2,864 B | - | - | 直接参照未検出 | 由来記録なし | 要確認（明示許可がない限り加工しない） | 882150b33c2b0dfe942acf1c3d9b9e3cb8aa63c073bad156aac41db384f3c14a |
| assets/minigames/aquarium/assets/fish/black_molly.png | 画像 | 1200×823 | 横 | あり | 直接参照未検出 | 由来記録なし | 要確認（明示許可がない限り加工しない） | 9a8a1fe57701354850e748368803090516a843efed53950301c99d8cfea9ab59 |
| assets/minigames/aquarium/index.html | ミニゲーム/コード | 5,947,695 B | - | - | `scripts/check-aquarium-runtime.py:8`<br>`scripts/check-browser-smoke.py:231`<br>`js/app.js:15909`<br>`scripts/check-aquarium-portrait-center.py:6` | 由来記録なし | 要確認（明示許可がない限り加工しない） | a2e9d5db6b5cae879de876d7eab03b80297586cb361b6fef65e3198088c52a98 |
| assets/minigames/kaitenzushi/assets/audio/eat_sfx.ogg | 音源 | 12,226 B | - | - | `js/kaitenzushi-embedded.js:3` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 3287c08b6612ad22dc6d6c04dd9b186a0f921a7c3eff0cc41899b156060cf401 |
| assets/minigames/kaitenzushi/assets/audio/enka_bgm.ogg | 音源 | 907,318 B | - | - | `js/kaitenzushi-embedded.js:3` | 由来記録なし | 要確認（明示許可がない限り加工しない） | d4863f10f767ff83327e2dfdd1331c2d44e805311d6b019978761b38e083cf03 |
| assets/minigames/kaitenzushi/assets/audio/izakaya_ambient.ogg | 音源 | 981,583 B | - | - | `js/kaitenzushi-embedded.js:3` | 由来記録なし | 要確認（明示許可がない限り加工しない） | e7d4be5ed5860639286901ca4fd92b2f5e8bd8bbf592d747c5cb70ec7ed153a4 |
| assets/minigames/kaitenzushi/assets/background/kaitenzushi_counter_background.png | 画像 | 1536×691 | 横 | なし | `js/kaitenzushi-embedded.js:3` | 由来記録なし | 要確認（明示許可がない限り加工しない） | a019f71107b92f336b58aeace2c398f8b51ba358451385b6afd3715cf309270d |
| assets/minigames/kaitenzushi/assets/plates/plate_black_850.png | 画像 | 720×295 | 横 | あり | `js/kaitenzushi-embedded.js:3` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 7bca274a99d48a92f8aaac8f137f0d8409d0cadea794ab2abf6c480be5441a8e |
| assets/minigames/kaitenzushi/assets/plates/plate_blue_190.png | 画像 | 720×227 | 横 | あり | `js/kaitenzushi-embedded.js:3` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 7d02eb2d75589927990a18c1e7904337b433094df5ef797eab892f4550d1777b |
| assets/minigames/kaitenzushi/assets/plates/plate_purple_350.png | 画像 | 720×251 | 横 | あり | `js/kaitenzushi-embedded.js:3` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 2eaa6dbafc7d71d143b4f692fc3ad8f164bbbacf941defe5c6549f63dd2ed733 |
| assets/minigames/kaitenzushi/assets/plates/plate_red_250.png | 画像 | 720×252 | 横 | あり | `js/kaitenzushi-embedded.js:3` | 由来記録なし | 要確認（明示許可がない限り加工しない） | bd94a68db62c920d9d3d0ec8a724dc21fffd78400544a52d01743e73c22e619e |
| assets/minigames/kaitenzushi/assets/sushi/black_850/kani.png | 画像 | 533×248 | 横 | あり | `js/kaitenzushi-embedded.js:3` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 1e6782fb38017b69a8f8ed63a64bcdaf69379d75f00971caed38db901fea9b11 |
| assets/minigames/kaitenzushi/assets/sushi/black_850/otoro.png | 画像 | 553×244 | 横 | あり | `js/kaitenzushi-embedded.js:3` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 05a14de46fb307b769b496f353fe1f1ec9efb253c6e7f153ee27641be294b505 |
| assets/minigames/kaitenzushi/assets/sushi/blue_190/ebi.png | 画像 | 555×190 | 横 | あり | `js/kaitenzushi-embedded.js:3` | 由来記録なし | 要確認（明示許可がない限り加工しない） | bc8c463b2dddfb6ab9081b3709b3fc760a984c6d9663990164393af0bbc51026 |
| assets/minigames/kaitenzushi/assets/sushi/blue_190/ika.png | 画像 | 640×227 | 横 | あり | `js/kaitenzushi-embedded.js:3` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 4ca5142bf4183f465c05b727a5a24d7c7a1bb7b90fba3ccbab41ffe501220d78 |
| assets/minigames/kaitenzushi/assets/sushi/blue_190/iwashi.png | 画像 | 560×191 | 横 | あり | `js/kaitenzushi-embedded.js:3` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 77b4dbce73b33d3e7ed01857ad4b3b8532aa2716dbd14212a91f136177b9652d |
| assets/minigames/kaitenzushi/assets/sushi/blue_190/salmon.png | 画像 | 553×224 | 横 | あり | `js/kaitenzushi-embedded.js:3` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 54fcadde5c003bf0780929721b39945ce9c1da128e982e3bd6d397ac4efa18f2 |
| assets/minigames/kaitenzushi/assets/sushi/blue_190/shimesaba.png | 画像 | 560×238 | 横 | あり | `js/kaitenzushi-embedded.js:3` | 由来記録なし | 要確認（明示許可がない限り加工しない） | cb1ef3c65b20cfef9b7379ac267d4a5a8bfeb35e0009c483786333296c959549 |
| assets/minigames/kaitenzushi/assets/sushi/blue_190/tako.png | 画像 | 555×191 | 横 | あり | `js/kaitenzushi-embedded.js:3` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 7db318f6b46304285b28c90bff314de956dc9955f9ff2eb2fa2b30538b4434b3 |
| assets/minigames/kaitenzushi/assets/sushi/purple_350/chutoro.png | 画像 | 520×194 | 横 | あり | `js/kaitenzushi-embedded.js:3` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 812a936e455d4105f79c99ba81fc1985b6f52c0f44b90858d087c56ae65a72a0 |
| assets/minigames/kaitenzushi/assets/sushi/purple_350/ikura.png | 画像 | 517×213 | 横 | あり | `js/kaitenzushi-embedded.js:3` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 847041f1d77c7be98ec1f7a42c320d0b4cf86b6c5ba906a690cc51c17f36ef7e |
| assets/minigames/kaitenzushi/assets/sushi/purple_350/uni.png | 画像 | 517×226 | 横 | あり | `js/kaitenzushi-embedded.js:3` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 4c4ff99d959bbac6c52cc48866091030c3683a205ca9113107b028021c6468ae |
| assets/minigames/kaitenzushi/assets/sushi/red_250/anago.png | 画像 | 517×216 | 横 | あり | `js/kaitenzushi-embedded.js:3` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 9cc6e7700bdf1deaa885735c851ba5bd61b601b4a15ff41bff6deb4c846937fe |
| assets/minigames/kaitenzushi/assets/sushi/red_250/maguro.png | 画像 | 519×195 | 横 | あり | `js/kaitenzushi-embedded.js:3` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 207747209d5be5efbf85b5e6d3e756ccb52455085abbabfaec599fd577bd883a |
| assets/minigames/kaitenzushi/assets/sushi/red_250/melon_sign.png | 画像 | 515×431 | 横 | あり | `js/kaitenzushi-embedded.js:3` | 由来記録なし | 要確認（明示許可がない限り加工しない） | c30921a234e1ea08ca5faecd0a677ff60cbd21c2db9091f54a8bea9da088b609 |
| assets/minigames/kaitenzushi/assets/sushi/red_250/shiromi.png | 画像 | 517×187 | 横 | あり | `js/kaitenzushi-embedded.js:3` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 7798061afc56f63fa3a395beb188f04f495d518bb2b20461fb769bd979dbd3ed |
| assets/minigames/kaitenzushi/data/game_rules.json | データ | 666 B | - | - | 直接参照未検出 | 由来記録なし | 要確認（明示許可がない限り加工しない） | 0645627b2dbadc1b16f76812782729df5ca3b4f6e50bb381346dd2d9089c3b99 |
| assets/minigames/kaitenzushi/data/sushi_catalog.json | データ | 2,723 B | - | - | 直接参照未検出 | 由来記録なし | 要確認（明示許可がない限り加工しない） | fa8421c136d8db8809847a7b026e3b3e9c4fbfb7ec03d8eae01505c36727ba0e |
| assets/minigames/kaitenzushi/game/index.html | ミニゲーム/コード | 59,861 B | - | - | `sw.js:63`<br>`js/app.js:19679`<br>`js/kaitenzushi-embedded.js:2` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 62a9164b12552b147b77714fc057ce7c2032768b49c0cb7db10907bb825dd81a |
| assets/minigames/retro-battle/index.html | ミニゲーム/コード | 18,690,587 B | - | - | `js/app.js:293` | 由来記録なし | 要確認（明示許可がない限り加工しない） | d8332ba68b6a4ce9634ac1f7746fd146b0b4cff089aeaeb5e801580c9dcd1c5b |
| assets/videos/cinema/.gitkeep | その他 | 0 B | - | - | 直接参照未検出 | 由来記録なし | 要確認（明示許可がない限り加工しない） | e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855 |
| assets/videos/cinema/cinema-film-01.mp4 | 動画 | 5,040,480 B | - | - | `data/cinema-event-videos.json:3 (basename)` | 由来記録なし | 要確認（明示許可がない限り加工しない） | c3dcdca3865cd5a104ee9ac9169dbeebf44616f748aed20557619a685bf5eccb |
| assets/videos/cinema/cinema-film-02.mp4 | 動画 | 3,714,087 B | - | - | `data/cinema-event-videos.json:4 (basename)` | 由来記録なし | 要確認（明示許可がない限り加工しない） | f158a2fe9dd0e459e1386a27cc5d22cd97e1ab2360dd795c2404957d054d1c36 |
| assets/videos/events/glab-kawahara-intro.mp4 | 動画 | 5,622,013 B | - | - | `js/app.js:428` | 由来記録なし | 要確認（明示許可がない限り加工しない） | be99c832b0b01fa63e4b9ff879354f4f65169f944403446f804dbe15f740bc65 |
| assets/videos/events/glab-visit-random.mp4 | 動画 | 2,525,694 B | - | - | `js/app.js:425` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 791db307a7b174c5149964378e0735824f1751d244da665a341360658de3be23 |
| assets/videos/events/gray-hood-aquarium-intro.mp4 | 動画 | 5,500,116 B | - | - | `js/app.js:396` | 由来記録なし | 要確認（明示許可がない限り加工しない） | badfe22a4c294bfa6124054320a421ef508f25eabfb31ba500013492fb2e6c09 |
| assets/videos/events/mystery-chinese-meal-intro.mp4 | 動画 | 5,078,384 B | - | - | `js/app.js:400` | 由来記録なし | 要確認（明示許可がない限り加工しない） | f0cc7816264699a7a55a731a097083ab8981cbf1e427ba121552b1740c321dcc |
| assets/videos/events/okachimachi-invasive-turtles-intro.mp4 | 動画 | 3,115,136 B | - | - | `js/app.js:295` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 42300e9803ccedc9d5ec843a1715bc5e1fab51c2f6823f03ec47054566cfe459 |
| assets/videos/events/okachimachi-quiz-king-intro.mp4 | 動画 | 3,163,385 B | - | - | `js/app.js:279` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 9e0d5e33711ca52b34ae171f419cea09267f276bb0567401d000841dc94a7519 |
| assets/videos/events/oyatsu-tropical-shop-intro.mp4 | 動画 | 5,500,558 B | - | - | `js/app.js:407` | 由来記録なし | 要確認（明示許可がない限り加工しない） | acd490ac696cdb8b9d63d49da26d427b47591dedbeb119eda80b31691385e0f7 |
| assets/videos/events/tattoo-woman-amber-intro.mp4 | 動画 | 5,977,611 B | - | - | `js/app.js:397` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 18d2431c7f3359a5f47307fc6892622ef93379db4efa2695fe58a228554c97ee |
| assets/videos/events/terry-california-intro.mp4 | 動画 | 5,391,328 B | - | - | `js/app.js:9444` | 由来記録なし | 要確認（明示許可がない限り加工しない） | bd2bb97b9fb2f8a74daf1fe6a4db585f15798da23c15d5747d0fea6b0dbdee4e |
| assets/videos/events/western-union-antique-diamond-intro.mp4 | 動画 | 3,324,190 B | - | - | `js/app.js:304` | 由来記録なし | 要確認（明示許可がない限り加工しない） | 35570fc0b8c47b949efb5d942c663f94d64c9856123682b32141b6e82472a2be |
