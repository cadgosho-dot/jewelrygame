from pathlib import Path
import subprocess

EXPECTED_VERSION = '0.10.937'
NEXT_VERSION = '0.10.938'

version_path = Path('VERSION')
if version_path.read_text(encoding='utf-8').strip() != EXPECTED_VERSION:
    raise SystemExit(f'Expected VERSION {EXPECTED_VERSION}')

app_path = Path('js/app.js')
app = app_path.read_text(encoding='utf-8')
start_marker = 'function answerLooseShopOriginalQuiz(index) {'
end_marker = '\nfunction grantLooseShopOriginalQuizReward'
start = app.find(start_marker)
if start < 0:
    raise SystemExit('answerLooseShopOriginalQuiz not found')
end = app.find(end_marker, start)
if end < 0:
    raise SystemExit('grantLooseShopOriginalQuizReward boundary not found')
block = app[start:end]
if block.count('grantLooseShopOriginalQuizReward();') != 1:
    raise SystemExit('unexpected correct reward call count in answer block')
if block.count("session.stage = 'incorrectAnswer';") != 1:
    raise SystemExit('unexpected incorrectAnswer stage count in answer block')
block = block.replace('grantLooseShopOriginalQuizReward();', 'render();', 1)
block = block.replace("session.stage = 'incorrectAnswer';", "session.stage = 'incorrect';", 1)
app = app[:start] + block + app[end:]
app_path.write_text(app, encoding='utf-8')

override_path = Path('memories-event-image-overrides-v751.js')
override = override_path.read_text(encoding='utf-8')
old_id = "const LOOSE_QUIZ_STYLE_ID = 'loose-quiz-display-fix-v937';"
new_id = "const LOOSE_QUIZ_STYLE_ID = 'loose-quiz-display-fix-v938';"
if old_id not in override:
    raise SystemExit('expected v937 loose quiz style id not found')
override = override.replace(old_id, new_id, 1)
marker = "      }`;\n    document.head?.appendChild(style);"
if marker not in override:
    raise SystemExit('loose quiz CSS tail marker not found')
css = r'''

      /* v0.10.938 3Dメガネ承認済み横画面4択UI */
      html[data-loose-quiz-orientation="landscape"] body[data-screen="looseShopOriginalQuizEvent"] .jxj-quiz-loose-v2.jxj-quiz-stage-question-v2>.jxj-quiz-question-panel-v2{
        align-self:stretch!important;height:100%!important;max-height:none!important;
        display:grid!important;grid-template-columns:1fr auto auto 1fr!important;
        grid-template-rows:auto auto auto!important;align-content:center!important;
        column-gap:clamp(10px,1.2vw,20px)!important;row-gap:clamp(8px,1.4vh,14px)!important;
        padding:clamp(14px,2vh,22px) clamp(14px,1.5vw,24px)!important;overflow-y:auto!important
      }
      html[data-loose-quiz-orientation="landscape"] body[data-screen="looseShopOriginalQuizEvent"] .jxj-quiz-loose-v2 .jxj-quiz-question-panel-v2>.jxj-quiz-name-v2{
        grid-column:2!important;grid-row:1!important;justify-self:end!important;align-self:center!important;
        font-size:clamp(1.15rem,2.4vw,1.65rem)!important;line-height:1.1!important
      }
      html[data-loose-quiz-orientation="landscape"] body[data-screen="looseShopOriginalQuizEvent"] .jxj-quiz-loose-v2 .jxj-quiz-question-panel-v2>.jxj-quiz-kicker-v2{
        grid-column:3!important;grid-row:1!important;justify-self:start!important;align-self:center!important;
        margin:0!important;padding:.34rem .78rem!important;font-size:clamp(.92rem,1.75vw,1.22rem)!important;line-height:1.1!important
      }
      html[data-loose-quiz-orientation="landscape"] body[data-screen="looseShopOriginalQuizEvent"] .jxj-quiz-loose-v2 .jxj-quiz-question-panel-v2>.jxj-quiz-question-v2{
        grid-column:1/-1!important;grid-row:2!important;margin:0!important;text-align:center!important;
        font-size:clamp(1.08rem,2.05vw,1.48rem)!important;line-height:1.35!important
      }
      html[data-loose-quiz-orientation="landscape"] body[data-screen="looseShopOriginalQuizEvent"] .jxj-quiz-loose-v2 .jxj-quiz-question-panel-v2>.jxj-quiz-answer-grid-v2{
        grid-column:1/-1!important;grid-row:3!important;margin-top:clamp(5px,1vh,10px)!important;
        gap:clamp(8px,1.3vh,14px) clamp(10px,1vw,16px)!important
      }
      html[data-loose-quiz-orientation="landscape"] body[data-screen="looseShopOriginalQuizEvent"] .jxj-quiz-loose-v2 .jxj-quiz-answer-v2{
        min-height:clamp(60px,12vh,92px)!important;
        grid-template-columns:clamp(2.05rem,3.8vw,2.8rem) minmax(0,1fr)!important;
        gap:clamp(.5rem,1vw,.8rem)!important;padding:clamp(.52rem,1.3vh,.82rem) clamp(.65rem,1vw,.95rem)!important;
        border-radius:14px!important
      }
      html[data-loose-quiz-orientation="landscape"] body[data-screen="looseShopOriginalQuizEvent"] .jxj-quiz-loose-v2 .jxj-quiz-answer-v2>span{
        width:clamp(2.05rem,3.8vw,2.8rem)!important;height:clamp(2.05rem,3.8vw,2.8rem)!important;
        font-size:clamp(.95rem,1.7vw,1.28rem)!important
      }
      html[data-loose-quiz-orientation="landscape"] body[data-screen="looseShopOriginalQuizEvent"] .jxj-quiz-loose-v2 .jxj-quiz-answer-v2 strong{
        font-size:clamp(1.02rem,1.85vw,1.34rem)!important;line-height:1.3!important
      }
      body[data-screen="looseShopOriginalQuizEvent"] .jxj-quiz-loose-v2 .jxj-quiz-dialogue-panel-v2.is-answer-reveal strong{
        color:#4fc56a!important
      }
'''
override = override.replace(marker, '      }' + css + '`;\n    document.head?.appendChild(style);', 1)
override_path.write_text(override, encoding='utf-8')

changelog_path = Path('CHANGELOG.md')
changelog = changelog_path.read_text(encoding='utf-8')
heading = '# 変更履歴\n\n'
if heading not in changelog:
    raise SystemExit('CHANGELOG heading not found')
entry = (
    '## v0.10.938\n'
    '- 3Dメガネイベントの承認済み携帯確認内容を本番へ反映。正解・不正解時のセリフ進行を復帰し、横画面4択UIの中央配置・横並び見出し・文字拡大・正答表示色を調整。\n\n'
)
if '## v0.10.938\n' in changelog:
    raise SystemExit('v0.10.938 changelog already exists')
changelog_path.write_text(changelog.replace(heading, heading + entry, 1), encoding='utf-8')

subprocess.run(['python3', 'scripts/version-sync.py', '--set', NEXT_VERSION], check=True)
subprocess.run(['python3', 'scripts/version-sync.py', '--check'], check=True)

app = app_path.read_text(encoding='utf-8')
s = app.index(start_marker)
e = app.index(end_marker, s)
answer = app[s:e]
assert "session.stage = 'correct';" in answer
assert 'grantLooseShopOriginalQuizReward();' not in answer
assert 'render();' in answer
assert "session.stage = 'incorrect';" in answer
assert "session.stage = 'incorrectAnswer';" not in answer

s2 = app.index('function advanceLooseShopOriginalQuizDialogue')
e2 = app.find('\nfunction ', s2 + 20)
advance = app[s2:e2 if e2 > 0 else len(app)]
assert "session.stage === 'correct'" in advance
assert 'grantLooseShopOriginalQuizReward();' in advance
assert "session.stage === 'incorrect'" in advance
assert "session.stage = 'incorrectAnswer';" in advance

override = override_path.read_text(encoding='utf-8')
assert 'loose-quiz-display-fix-v938' in override
assert 'grid-template-columns:1fr auto auto 1fr' in override
assert '.jxj-quiz-answer-grid-v2' in override
assert 'color:#4fc56a!important' in override
assert version_path.read_text(encoding='utf-8').strip() == NEXT_VERSION
print('3D glasses v0.10.938 implementation assertions: PASS')
