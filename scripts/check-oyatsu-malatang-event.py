#!/usr/bin/env python3
from pathlib import Path
import hashlib
import subprocess
import sys
ROOT=Path(__file__).resolve().parents[1]
m=(ROOT/'js/events/oyatsu-malatang-event.js').read_text(encoding='utf-8')
c=(ROOT/'oyatsu-malatang-event.css').read_text(encoding='utf-8')
h=(ROOT/'js/events/event-state-helpers.js').read_text(encoding='utf-8')
b=(ROOT/'js/event-bootstrap.js').read_text(encoding='utf-8')
unit=ROOT/'tools/test-event-state-helpers.mjs'

ASSETS = {
    'おやつ大好き正式PNG': ('assets/images/events/oyatsu-daisuki.png', '4b8ad7367110cab91dc1cef175987f407218809b6fd41586cafec45d31f4c8bc'),
    '麻辣湯正式PNG': ('assets/images/foods/oyatsu-malatang.png', '71c1aa0ec382076a2b8c7f18aa774f9b640885ed85f23db59dfa7c194e777e2d'),
    '麻辣湯店内横正式JPEG': ('assets/images/backgrounds/oyatsu-malatang-shop.jpg', '6405918690c99b883987a23e608dbfad37bc2b7657b20b95dd0c666f261a788a'),
    '麻辣湯店内縦正式JPEG': ('assets/images/backgrounds/oyatsu-malatang-shop-portrait.jpg', '1b3709afeb28a15e1c4103256fcb21782d554803c09ddeaa644f400c336fc5c8'),
    '麻辣湯正式動画': ('assets/videos/events/oyatsu-malatang-event.mp4', '4bfb929884cff665252d9b2431e12029a30d9d25a73ed0786a27c07bd85f7eec'),
}

def exact_asset(path, expected_sha256):
    target = ROOT / path
    if not target.is_file():
        return False
    return hashlib.sha256(target.read_bytes()).hexdigest() == expected_sha256
checks={
'発生率1.5%':'const OYATSU_MALATANG_EVENT_CHANCE=0.015;' in m,
'所持金3500円以上':'const PRICE=3500;' in m and 'money<PRICE' in m,
'食事ボタン押下時抽選':"dataset?.screen||'')!=='main'" in m and 'onCapture' in m,
'既存おやつ大好き画像':"const CHARACTER='./assets/images/events/oyatsu-daisuki.png?v=0.10.961-oyatsu23-image';" in m,
'キャラクター位置ロック競合なし':'jxj-new-event-character' not in m,
'初回描画前に専用CSS読込':'ensureStyle();\ndocument.addEventListener' in m,
'登録済みセリフ':all(x in m for x in ('Hey、へい！${name}、、、ハイホー！','麻辣湯いこーよっ、、、最近流行ってるよねぇ、、、、','美味しかったね！、、次は激辛たのもっと！','ばいびー、、、')),
'食事BGM':"const BGM='./assets/audio/bgm-meal.ogg';" in m,
'1.5秒暗転動画':'const SKIP_DELAY=1500;' in m,
'MOVIEスキップ右上':'right:6px!important' in c,
'横動画全高':'height:100%!important' in c and 'object-fit:contain!important' in c,
'縦キャラクター中央固定':'malatang-character-shell' in m and 'width:min(76vw,420px)!important' in c and 'margin:0 auto!important' in c and 'centerPortraitCharacter' in m and 'getImageData' in m and "translateX(${dx.toFixed(2)}px)" in m,
'横キャラクター承認サイズ':'height:min(86dvh,540px)!important' in c and 'max-width:82vw!important' in c,
'横麻辣湯画像全体表示':'width:min(88vw,1050px)!important' in c and 'height:100%!important' in c and 'max-width:min(76vw,900px)!important' in c and 'object-position:center top!important' in c,
'横もぐもぐ文字縮小':'font-size:clamp(18px,2.4vw,26px)!important' in c,
'もぐもぐタップで決済':'startMealPayment()' in m and "a==='meal-finish'&&stage==='meal')startMealPayment()" in m,
'所持金減少アニメ':'money-change-active' in m and 'header-money-change loss' in m and 'PAYMENT_DURATION=1200' in m,
'3500円一度だけ決済':'settleEventMeal' in h and 'if (current.charged)' in h and 'state.game.money = money - price;' in h,
'食後空腹度最大':'state.wellbeing.hunger = maxHunger;' in h,
'独立モジュール':"import './events/oyatsu-malatang-event.js?v=" in b,
'同日複数回発生なし':'lastTriggeredDay' in m and 'Number(snapshot?.event?.lastTriggeredDay)===currentDay' in m,
'通常食事1時間を使用':'eventServices.spendMealTime?.();' in h,
'食事収支を記録':'eventServices.addFinance?.' in h and 'state.daily.meals.push' in h,
'食後共通空腹回復UI':'completeEventMealUi' in h and 'eventServices.setMealFeedback?.' in h and 'eventServices.render?.' in h and "showToast?.('ごちそうさまでした', 'meal-complete', false)" in h,
**{name: exact_asset(path, sha) for name, (path, sha) in ASSETS.items()},
}
failed=[k for k,v in checks.items() if not v]
for k,v in checks.items():print(('OK' if v else 'NG')+': '+k)
if failed:
 print('NG: 麻辣湯イベント回帰検査に失敗');sys.exit(1)
proc=subprocess.run(['node',str(unit)],cwd=ROOT,text=True,capture_output=True)
if proc.stdout: print(proc.stdout,end='')
if proc.stderr: print(proc.stderr,end='',file=sys.stderr)
if proc.returncode != 0:
 print('NG: 麻辣湯イベント食事確定の実動検査に失敗');sys.exit(1)
print('OK: 承認済みv23仕様を固定')
