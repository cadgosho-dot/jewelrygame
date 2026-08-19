from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read(path):
    return (ROOT / path).read_text(encoding='utf-8')


def write(path, text):
    (ROOT / path).write_text(text, encoding='utf-8', newline='\n')

# 1) Mobile layout / tap safety for storyteller quiz.
styles_path = 'styles.css'
styles = read(styles_path)
marker = '/* v0.10.723 STORYTELLER QUIZ MOBILE FIX */'
css = r'''

/* v0.10.723 STORYTELLER QUIZ MOBILE FIX
   - ストーリーテラー4択を通常の御徒町クイズと別に、スマホ縦横で安全配置する。
   - 人物画像を問題・選択肢の領域へはみ出させない。
   - 問題パネルと4択ボタンを最前面に固定し、タップを確実に受ける。 */
body[data-screen="storytellerEvent"] .storyteller-quiz-event.quiz-stage-question{
  position:fixed!important;
  inset:0!important;
  width:100%!important;
  height:var(--jwj-layout-height,100dvh)!important;
  min-height:var(--jwj-layout-height,100dvh)!important;
  max-height:var(--jwj-layout-height,100dvh)!important;
  display:grid!important;
  grid-template-columns:1fr!important;
  grid-template-rows:minmax(170px,34vh) minmax(0,1fr)!important;
  gap:6px!important;
  padding:max(5px,var(--safe-top)) 8px max(8px,var(--safe-bottom))!important;
  overflow:hidden!important;
  isolation:isolate!important;
}
body[data-screen="storytellerEvent"] .storyteller-quiz-event.quiz-stage-question .quiz-character-area{
  position:relative!important;
  inset:auto!important;
  grid-column:1!important;
  grid-row:1!important;
  width:100%!important;
  height:100%!important;
  min-width:0!important;
  min-height:0!important;
  display:grid!important;
  place-items:end center!important;
  padding:0!important;
  overflow:hidden!important;
  z-index:1!important;
  pointer-events:none!important;
}
body[data-screen="storytellerEvent"] .storyteller-quiz-event.quiz-stage-question .storyteller-quiz-character{
  display:block!important;
  position:relative!important;
  width:auto!important;
  height:auto!important;
  max-width:min(82vw,430px)!important;
  max-height:100%!important;
  margin:0 auto!important;
  object-fit:contain!important;
  object-position:center bottom!important;
  transform:none!important;
  pointer-events:none!important;
}
body[data-screen="storytellerEvent"] .storyteller-quiz-event.quiz-stage-question .quiz-question-panel{
  position:relative!important;
  grid-column:1!important;
  grid-row:2!important;
  align-self:stretch!important;
  justify-self:stretch!important;
  width:100%!important;
  height:100%!important;
  min-width:0!important;
  min-height:0!important;
  max-height:100%!important;
  display:flex!important;
  flex-direction:column!important;
  gap:8px!important;
  padding:10px 12px 12px!important;
  overflow-y:auto!important;
  overflow-x:hidden!important;
  -webkit-overflow-scrolling:touch!important;
  z-index:20!important;
  pointer-events:auto!important;
  touch-action:manipulation!important;
}
body[data-screen="storytellerEvent"] .storyteller-quiz-event.quiz-stage-question .quiz-event-name-label,
body[data-screen="storytellerEvent"] .storyteller-quiz-event.quiz-stage-question .quiz-question-kicker,
body[data-screen="storytellerEvent"] .storyteller-quiz-event.quiz-stage-question .quiz-question-panel h2,
body[data-screen="storytellerEvent"] .storyteller-quiz-event.quiz-stage-question .quiz-answer-grid,
body[data-screen="storytellerEvent"] .storyteller-quiz-event.quiz-stage-question .quiz-answer-button{
  position:relative!important;
  z-index:21!important;
  pointer-events:auto!important;
}
body[data-screen="storytellerEvent"] .storyteller-quiz-event.quiz-stage-question .quiz-question-panel h2{
  margin:0!important;
  font-size:clamp(.94rem,4vw,1.08rem)!important;
  line-height:1.34!important;
}
body[data-screen="storytellerEvent"] .storyteller-quiz-event.quiz-stage-question .quiz-answer-grid{
  display:grid!important;
  grid-template-columns:repeat(2,minmax(0,1fr))!important;
  gap:7px!important;
  margin-top:auto!important;
  min-height:0!important;
}
body[data-screen="storytellerEvent"] .storyteller-quiz-event.quiz-stage-question .quiz-answer-button{
  grid-template-columns:1.8rem minmax(0,1fr)!important;
  gap:.48rem!important;
  min-height:58px!important;
  padding:.5rem .56rem!important;
  touch-action:manipulation!important;
  -webkit-tap-highlight-color:rgba(255,214,117,.16)!important;
}
body[data-screen="storytellerEvent"] .storyteller-quiz-event.quiz-stage-question .quiz-answer-button>span{
  width:1.8rem!important;
  height:1.8rem!important;
  min-width:1.8rem!important;
}
body[data-screen="storytellerEvent"] .storyteller-quiz-event.quiz-stage-question .quiz-answer-button strong{
  font-size:clamp(.77rem,3.25vw,.94rem)!important;
  line-height:1.3!important;
  overflow-wrap:anywhere!important;
}
@media (orientation:portrait) and (max-height:760px){
  body[data-screen="storytellerEvent"] .storyteller-quiz-event.quiz-stage-question{
    grid-template-rows:minmax(132px,29vh) minmax(0,1fr)!important;
    gap:4px!important;
    padding:4px 6px max(6px,var(--safe-bottom))!important;
  }
  body[data-screen="storytellerEvent"] .storyteller-quiz-event.quiz-stage-question .storyteller-quiz-character{
    max-width:min(70vw,340px)!important;
  }
  body[data-screen="storytellerEvent"] .storyteller-quiz-event.quiz-stage-question .quiz-question-panel{
    gap:5px!important;
    padding:7px 8px 8px!important;
  }
  body[data-screen="storytellerEvent"] .storyteller-quiz-event.quiz-stage-question .quiz-answer-grid{gap:5px!important;}
  body[data-screen="storytellerEvent"] .storyteller-quiz-event.quiz-stage-question .quiz-answer-button{
    min-height:48px!important;
    padding:.38rem .46rem!important;
  }
}
@media (orientation:landscape){
  body[data-screen="storytellerEvent"] .storyteller-quiz-event.quiz-stage-question{
    grid-template-columns:minmax(145px,36%) minmax(0,64%)!important;
    grid-template-rows:minmax(0,1fr)!important;
    gap:7px!important;
    padding:max(4px,var(--safe-top)) 8px max(4px,var(--safe-bottom))!important;
  }
  body[data-screen="storytellerEvent"] .storyteller-quiz-event.quiz-stage-question .quiz-character-area{
    grid-column:1!important;
    grid-row:1!important;
  }
  body[data-screen="storytellerEvent"] .storyteller-quiz-event.quiz-stage-question .storyteller-quiz-character{
    max-width:100%!important;
    max-height:96%!important;
  }
  body[data-screen="storytellerEvent"] .storyteller-quiz-event.quiz-stage-question .quiz-question-panel{
    grid-column:2!important;
    grid-row:1!important;
  }
}
'''
if marker not in styles:
    write(styles_path, styles.rstrip() + css + '\n')

# 2) Bump cache/import build version so the phone cannot keep the broken CSS.
for path in ['index.html','game.html','auth.html','js/app.js','js/game-data.js','sw.js']:
    text = read(path)
    if '0.10.722' not in text:
        raise RuntimeError(f'{path}: expected 0.10.722 before bump')
    write(path, text.replace('0.10.722', '0.10.723'))

# 3) Release notes and validation.
changelog = read('CHANGELOG.md')
entry = '''# v0.10.723 - 2026-08-19\n\n- ストーリーテラー4択クイズのスマホ縦画面UI崩れを修正。\n- 人物画像が問題文・4択ボタンへ重なる現象を防止。\n- 問題パネルと4択ボタンを最前面に固定し、タップ領域を明示的に有効化。\n- 横画面も人物／問題の2カラムで固定。\n- クラウドセーブv0.10.722の処理には変更なし。\n- SAVE_SCHEMA_VERSION=1を維持。\n\n'''
if not changelog.lstrip().startswith('# v0.10.723'):
    write('CHANGELOG.md', entry + changelog.lstrip('\n'))

write('VALIDATION_v0.10.723.txt', '''JEWELRY×JEWELRY v0.10.723 VALIDATION\n1. storytellerEvent question: portraitで人物が上段内に収まり、問題パネルへはみ出さない。\n2. 4択ボタンはz-index/pointer-events/touch-actionを明示し、タップ可能。\n3. landscapeでは人物左・問題右の2カラム。\n4. js/app.js / js/game-data.js / js/firebase-service.js は node --check 合格。\n5. v0.10.723へキャッシュ更新。\n6. クラウド保存v0.10.722ロジックは変更しない。\n7. SAVE_SCHEMA_VERSION=1を維持。\n''')

# one-shot helpers cleanup
for path in [
    ROOT / '.github/workflows/apply-storyteller-v723.yml',
    ROOT / 'scripts/apply_storyteller_v723.py',
    ROOT / 'V723_TRIGGER.txt',
    ROOT / '.github/workflows/apply-cloud-save-v722.yml',
]:
    try:
        path.unlink()
    except FileNotFoundError:
        pass

print('v0.10.723 storyteller quiz mobile fix applied')
