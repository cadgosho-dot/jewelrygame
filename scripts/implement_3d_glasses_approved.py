from pathlib import Path

p = Path('js/app.js')
s = p.read_text(encoding='utf-8')
old = """function answerLooseShopOriginalQuiz(index) {
  const session = looseShopOriginalQuizSession;
  if (!session || session.stage !== 'question') return;
  const selectedIndex = Number(index);
  if (!Number.isInteger(selectedIndex) || selectedIndex < 0 || selectedIndex > 3) return;
  session.selectedIndex = selectedIndex;
  const correct = selectedIndex === session.question.answerIndex;
  session.stage = correct ? 'correct' : 'incorrect';
  persistQuizSession('looseShop', { save: true });
  render();
  playSfx(correct ? 'quiz-correct' : 'quiz-incorrect', { gain: 1 });
  vibrate(correct ? [35, 45, 80] : 110);
}"""
new = """function answerLooseShopOriginalQuiz(index) {
  const session = looseShopOriginalQuizSession;
  if (!session || session.stage !== 'question') return;
  const selectedIndex = Number(index);
  if (!Number.isInteger(selectedIndex) || selectedIndex < 0 || selectedIndex > 3) return;
  session.selectedIndex = selectedIndex;
  const correct = selectedIndex === session.question.answerIndex;
  if (correct) {
    session.stage = 'correct';
    persistQuizSession('looseShop');
    playSfx('quiz-correct', { gain: 1 });
    vibrate([35, 45, 80]);
    grantLooseShopOriginalQuizReward();
    return;
  }
  session.stage = 'incorrectAnswer';
  persistQuizSession('looseShop', { save: true });
  render();
  playSfx('quiz-incorrect', { gain: 1 });
  vibrate(110);
}"""
if old not in s:
    raise SystemExit('answerLooseShopOriginalQuiz baseline not found')
p.write_text(s.replace(old, new, 1), encoding='utf-8')

p = Path('quiz-event-v2.css')
s = p.read_text(encoding='utf-8')
marker = '/* v0.10.937 — 3Dメガネイベント実機承認レイアウト。 */'
if marker in s:
    raise SystemExit('approved production CSS already present')
s += r'''

/* v0.10.937 — 3Dメガネイベント実機承認レイアウト。 */
body[data-screen="looseShopOriginalQuizEvent"] .jxj-quiz-loose-v2.jxj-quiz-stage-dialogue-v2 .jxj-quiz-dialogue-panel-v2{
  background:transparent!important;
  box-shadow:0 6px 20px rgba(0,0,0,.22)!important;
}
body[data-screen="looseShopOriginalQuizEvent"] .jxj-quiz-loose-v2.jxj-quiz-stage-question-v2 .jxj-quiz-question-panel-v2{
  background:rgba(0,0,0,.22)!important;
  box-shadow:inset 0 0 28px rgba(0,0,0,.26)!important;
}
body[data-screen="looseShopOriginalQuizEvent"] .jxj-quiz-loose-v2.jxj-quiz-stage-question-v2 .jxj-quiz-answer-v2{
  background:rgba(18,14,11,.18)!important;
}
@media (orientation:portrait),(max-aspect-ratio:1/1){
  body[data-screen="looseShopOriginalQuizEvent"] .jxj-quiz-loose-v2.jxj-quiz-stage-question-v2 > .jxj-quiz-character-area-v2 .jxj-quiz-character-v2{
    transform:translateY(clamp(60px,7dvh,100px))!important;
    object-position:center bottom!important;
  }
}
@media (orientation:landscape) and (min-aspect-ratio:1/1){
  body[data-screen="looseShopOriginalQuizEvent"] .jxj-quiz-loose-v2.jxj-quiz-stage-dialogue-v2 .jxj-quiz-character-area-v2{
    position:absolute!important;
    left:50%!important;
    right:auto!important;
    top:max(24px,var(--safe-top))!important;
    bottom:-8px!important;
    width:min(92vw,760px)!important;
    min-height:0!important;
    transform:translateX(-50%)!important;
    display:flex!important;
    align-items:flex-start!important;
    justify-content:center!important;
    overflow:visible!important;
    padding-bottom:0!important;
    z-index:2!important;
  }
  body[data-screen="looseShopOriginalQuizEvent"] .jxj-quiz-loose-v2.jxj-quiz-stage-dialogue-v2 .jxj-quiz-character-v2{
    width:auto!important;
    max-width:70vw!important;
    max-height:88dvh!important;
    object-position:center top!important;
  }
  body[data-screen="looseShopOriginalQuizEvent"] .jxj-quiz-loose-v2.jxj-quiz-stage-dialogue-v2 .jxj-quiz-dialogue-panel-v2{
    left:7px!important;
    right:7px!important;
    bottom:max(10px,calc(var(--safe-bottom) + 6px))!important;
    width:auto!important;
    margin:0!important;
    z-index:3!important;
  }
  body[data-screen="looseShopOriginalQuizEvent"] .jxj-quiz-loose-v2.jxj-quiz-stage-question-v2 .jxj-quiz-question-panel-v2{
    justify-content:flex-start!important;
  }
  body[data-screen="looseShopOriginalQuizEvent"] .jxj-quiz-loose-v2.jxj-quiz-stage-question-v2 .jxj-quiz-answer-grid-v2{
    margin-top:10px!important;
    align-content:start!important;
  }
}
'''
p.write_text(s, encoding='utf-8')

p = Path('game.html')
s = p.read_text(encoding='utf-8')
replacements = [
    ('background: rgba(20, 15, 11, .86) !important;', 'background: transparent !important;\n    box-shadow: 0 6px 20px rgba(0,0,0,.22) !important;'),
    ('background: rgba(20, 15, 11, .88) !important;', 'background: rgba(0,0,0,.22) !important;\n    box-shadow: inset 0 0 28px rgba(0,0,0,.26) !important;'),
    ('background: rgba(26,19,13,.9) !important;', 'background: rgba(18,14,11,.18) !important;'),
]
for a,b in replacements:
    if a not in s:
        raise SystemExit('game.html layout baseline not found: ' + a)
    s = s.replace(a,b,1)
for a,b in [
    ('./quiz-event-v2.css?v=0.10.936','./quiz-event-v2.css?v=0.10.937'),
    ('./js/app.js?v=0.10.936','./js/app.js?v=0.10.937'),
]:
    if a not in s:
        raise SystemExit('game.html version baseline not found: ' + a)
    s = s.replace(a,b,1)
p.write_text(s, encoding='utf-8')

Path('VERSION').write_text('0.10.937\n', encoding='utf-8')
p = Path('js/game-data.js')
s = p.read_text(encoding='utf-8')
oldv = "export const VERSION = '0.10.936';"
if oldv not in s:
    raise SystemExit('game-data VERSION baseline not found')
p.write_text(s.replace(oldv, "export const VERSION = '0.10.937';", 1), encoding='utf-8')
