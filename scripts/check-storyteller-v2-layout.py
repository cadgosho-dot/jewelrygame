#!/usr/bin/env python3
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
version = (ROOT / 'VERSION').read_text(encoding='utf-8').strip()
app = (ROOT / 'js/app.js').read_text(encoding='utf-8')
base_css = (ROOT / 'styles.css').read_text(encoding='utf-8')
quiz_css_path = ROOT / 'quiz-event-v2.css'
quiz_css = quiz_css_path.read_text(encoding='utf-8') if quiz_css_path.is_file() else ''
css = base_css + '\n' + quiz_css

checks = {
    'V2共通描画ヘルパー': all(token in app for token in ['renderQuizLayoutV2Question', 'renderQuizLayoutV2Dialogue', 'renderQuizLayoutV2Reward']),
    'ストーリーテラーV2': "eventClass='jxj-quiz-storyteller-v2'" in app,
    '通りすがりのクイズ王V2': "eventClass = 'jxj-quiz-king-v2'" in app,
    '3DメガネV2': "eventClass = 'jxj-quiz-loose-v2'" in app,
    '3イベント共通CSS': '2026-08-31 SHARED QUIZ V2 APPROVED LAYOUT' in css,
    'V2 CSSをゲームへ読込': f'./quiz-event-v2.css?v={version}' in (ROOT / 'game.html').read_text(encoding='utf-8'),
    'V2 CSSをPWAキャッシュ': f'./quiz-event-v2.css?v={version}' in (ROOT / 'sw.js').read_text(encoding='utf-8'),
    '縦会話キャラ中央寄せ': 'inset:clamp(34px,7vh,86px) 0 clamp(150px,27vh,250px) 0!important;' in css and 'transform:translateY(clamp(12px,2.2vh,26px))!important;' in css,
    '会話タップ右詰め': 'text-align:right!important;' in css,
    '縦クイズ下詰め': 'grid-template-rows:minmax(0,1fr) auto!important;' in css and 'align-self:end!important;' in css and 'align-content:end!important;' in css,
    '縦クイズ人物中央': 'top:clamp(110px,18vh,220px)!important;' in css and 'bottom:clamp(300px,38vh,540px)!important;' in css,
    '横クイズ左右分離': 'grid-template-columns:minmax(0,43%) minmax(0,57%)!important;' in css,
    '横会話全幅': 'left:max(10px,var(--safe-left))!important;' in css and 'right:max(10px,var(--safe-right))!important;' in css,
    '横報酬中央48%': 'top:48%!important;' in css and 'transform:translate(-50%,-50%)!important;' in css,
    '報酬小さく上下動': '@keyframes jxjQuizRewardFloatShared' in css and 'animation:jxjQuizRewardFloatShared 2.6s ease-in-out infinite!important;' in css,
    '4択タップ領域': 'pointer-events:auto!important;' in css and 'touch-action:manipulation!important;' in css,
    'いいとも時セリフ非表示': '.jxj-quiz-dialogue-panel-v2.is-storyteller-ittomo-hidden{' in css and 'display:none!important;' in css,
}

failed = [name for name, ok in checks.items() if not ok]
for name, ok in checks.items():
    print(('OK' if ok else 'NG') + ': ' + name)
if failed:
    print('NG: 3種クイズV2共通レイアウト回帰検査に失敗しました。')
    for name in failed:
        print('- ' + name)
    sys.exit(1)
print('OK: ストーリーテラー / 通りすがりのクイズ王 / 3Dメガネの共通V2表示を確認しました。')
