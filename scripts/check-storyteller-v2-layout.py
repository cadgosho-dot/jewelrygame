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
loose_override = (ROOT / 'memories-event-image-overrides-v751.js').read_text(encoding='utf-8')

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

    # 3Dメガネはユーザー確認済みUI。明示的な再承認なしに下記の専用値を変更しない。
    '3Dメガネ専用上書き識別子': "const LOOSE_QUIZ_STYLE_ID = 'loose-quiz-display-fix-v937';" in loose_override,
    '3Dメガネ画像固定': "glasses: './assets/images/events/loose-shop-original-quiz-v751.png'" in loose_override,
    '3Dメガネ背景固定': all(token in loose_override for token in [
        "portrait: './assets/images/loose-shop-portrait-v385.webp'",
        "landscape: './assets/images/loose-shop-v385.webp'",
    ]),
    '3Dメガネ縦4択ステージ固定': all(token in loose_override for token in [
        'html[data-loose-quiz-orientation="portrait"] body[data-screen="looseShopOriginalQuizEvent"] .jxj-quiz-loose-v2.jxj-quiz-stage-question-v2{',
        'grid-template-rows:minmax(0,1fr) auto!important;gap:4px!important;',
    ]),
    '3Dメガネ縦4択人物領域固定': all(token in loose_override for token in [
        'display:flex!important;align-items:flex-start!important;justify-content:center!important;',
        'padding:clamp(38px,5vh,64px) 0 0!important;overflow:hidden!important;transform:none!important;pointer-events:none!important',
    ]),
    '3Dメガネ縦4択人物最終位置固定': all(token in loose_override for token in [
        'width:auto!important;height:auto!important;max-width:96vw!important;max-height:100%!important;',
        'margin:0 auto!important;transform:translateY(clamp(60px,7dvh,100px))!important;object-fit:contain!important;object-position:center bottom!important',
    ]),
    '3Dメガネ縦4択パネル固定': all(token in loose_override for token in [
        'grid-column:1!important;grid-row:2!important;align-self:end!important;',
        'width:auto!important;height:auto!important;min-height:0!important;max-height:46dvh!important;',
        'margin:0!important;padding:8px!important;gap:5px!important;overflow-y:auto!important;',
    ]),
    '3Dメガネ縦4択2列固定': 'grid-template-columns:repeat(2,minmax(0,1fr))!important;' in loose_override,
    '3Dメガネ縦会話固定': all(token in loose_override for token in [
        'html[data-loose-quiz-orientation="portrait"] body[data-screen="looseShopOriginalQuizEvent"] .jxj-quiz-loose-v2.jxj-quiz-stage-dialogue-v2>.jxj-quiz-dialogue-panel-v2{',
        'left:7px!important;right:7px!important;',
        'top:auto!important;bottom:max(14px,calc(env(safe-area-inset-bottom,0px) + 9px))!important;',
        'width:auto!important;height:auto!important;max-height:34dvh!important;margin:0!important;',
        'border-radius:18px!important;background:transparent!important;box-shadow:0 6px 20px rgba(0,0,0,.22)!important',
    ]),
    '3Dメガネ横4択固定': all(token in loose_override for token in [
        'html[data-loose-quiz-orientation="landscape"] body[data-screen="looseShopOriginalQuizEvent"] .jxj-quiz-loose-v2.jxj-quiz-stage-question-v2{',
        'grid-template-columns:minmax(0,43%) minmax(0,57%)!important;',
        'grid-column:2!important;grid-row:1!important;align-self:center!important;',
        'max-width:min(100%,430px)!important;max-height:calc(100dvh - 28px)!important;',
    ]),
    '3Dメガネ横会話固定': all(token in loose_override for token in [
        'html[data-loose-quiz-orientation="landscape"] body[data-screen="looseShopOriginalQuizEvent"] .jxj-quiz-loose-v2.jxj-quiz-stage-dialogue-v2>.jxj-quiz-dialogue-panel-v2{',
        'bottom:max(6px,env(safe-area-inset-bottom,0px))!important;width:min(92vw,980px)!important;max-height:min(28vh,150px)!important;',
        'margin:0!important;padding:8px 12px 7px!important;transform:translateX(-50%)!important;overflow-y:auto!important',
    ]),
    '3Dメガネ上書き再適用保護': all(token in loose_override for token in [
        'repairLooseQuizDisplay();',
        'new MutationObserver(schedule).observe(document.documentElement, {',
        "attributeFilter: ['src', 'data-screen']",
        "window.addEventListener('resize', schedule, { passive: true });",
        "window.addEventListener('orientationchange', () => window.setTimeout(schedule, 120), { passive: true });",
        "if (document.body?.dataset?.screen === 'looseShopOriginalQuizEvent') schedule();",
    ]),
}

failed = [name for name, ok in checks.items() if not ok]
for name, ok in checks.items():
    print(('OK' if ok else 'NG') + ': ' + name)
if failed:
    print('NG: 3種クイズV2共通レイアウト / 3Dメガネ専用UI固定の回帰検査に失敗しました。')
    for name in failed:
        print('- ' + name)
    sys.exit(1)
print('OK: ストーリーテラー / 通りすがりのクイズ王 / 3Dメガネの共通V2表示と、3Dメガネ専用UI固定を確認しました。')
