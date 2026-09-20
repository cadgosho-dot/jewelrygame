#!/usr/bin/env python3
"""Browser regression fixture using the real game shell, renderers and CSS.

Run: python scripts/serve-3d-quiz-layout.py
Open http://localhost:8765/tools/3d-quiz-layout-test
Checks visible portrait content, approved landscape character scale and quiz
text containment. No game save, authentication or production state is loaded.
"""
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse, parse_qs
import json
import re

ROOT = Path(__file__).resolve().parents[1]


def function(source, name):
    start = source.index('function ' + name + '(')
    end = source.index('\nfunction ', start + 1)
    return source[start:end]


def case_page(query):
    app = (ROOT / 'js/app.js').read_text()
    game = (ROOT / 'game.html').read_text()
    head = '\n'.join(re.findall(r'<link[^>]+rel="stylesheet"[^>]*>|<style\b[^>]*>[\s\S]*?</style>', game))
    funcs = '\n'.join(function(app, name) for name in [
        'shell', 'renderQuizLayoutV2Question', 'renderQuizLayoutV2Dialogue',
        'renderQuizLayoutV2Reward', 'renderLooseShopOriginalQuizEvent',
    ])
    data = json.loads((ROOT / 'data/jewelry_quiz_50_verified_2026-08-10.json').read_text())
    questions = data['questions']
    question = next(q for q in questions if '遊色' in q['question'])
    stage = query.get('stage', ['intro1'])[0]
    if stage not in ['intro1', 'intro2', 'intro4', 'question', 'incorrectAnswer']:
        stage = 'intro1'
    bootstrap = '''
const state = {playerName:'カワハラ'};
const LOOSE_SHOP_ORIGINAL_QUIZ_NAME = '3Dメガネ';
const esc = value => String(value).replace(/[&<>\"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const looseShopOriginalQuizCharacterImage = () => './assets/images/events/loose-shop-original-quiz-v751.png';
const looseShopOriginalQuizSession = SESSION;
function resizeFixture() {
  const orientation = innerWidth > innerHeight ? 'landscape' : 'portrait';
  document.documentElement.dataset.deviceClass = 'phone';
  document.documentElement.dataset.orientation = orientation;
  document.documentElement.style.setProperty('--jwj-layout-height', innerHeight+'px');
  document.documentElement.style.setProperty('--jwj-layout-width', innerWidth+'px');
}
resizeFixture();
addEventListener('resize', resizeFixture);
'''.replace('SESSION', json.dumps({'stage': stage, 'question': question}, ensure_ascii=False))
    return f'''<!doctype html><html lang="ja"><head><meta charset="utf-8"><base href="/">
<meta name="viewport" content="width=device-width,initial-scale=1">{head}</head>
<body data-screen="looseShopOriginalQuizEvent"><div id="background-layer"></div><div id="background-shade"></div><div id="root"></div>
<script>{bootstrap}\n{funcs}\ndocument.getElementById('root').innerHTML=renderLooseShopOriginalQuizEvent();</script>
<script src="/hosting-origin-guard.js"></script></body></html>'''


REPORT_SCRIPT = r'''
const results = document.getElementById('results');
function measure(frame) {
 const doc=frame.contentDocument, win=frame.contentWindow;
 const event=doc.querySelector('.jxj-quiz-event-v2');
 if(!event || !doc.documentElement.dataset.looseQuizOrientation) return null;
 const rect=el=>el.getBoundingClientRect();
 const panel=doc.querySelector('.jxj-quiz-dialogue-panel-v2,.jxj-quiz-question-panel-v2');
 const img=doc.querySelector('.jxj-quiz-character-v2');
 if (!img.complete || !img.naturalWidth) return null;
 const failures=[];
 const within=(r,b)=>r.width>0 && r.height>0 && r.left>=b.left-1 && r.right<=b.right+1 && r.top>=b.top-1 && r.bottom<=b.bottom+1;
 const viewport={left:0,top:0,right:win.innerWidth,bottom:win.innerHeight};
 if (!within(rect(panel),viewport)) failures.push('panel outside viewport');
 let visible=rect(img).toJSON();
 for(let p=img.parentElement;p;p=p.parentElement){
  const c=win.getComputedStyle(p),r=rect(p);
  if(/hidden|clip|auto|scroll/.test(c.overflow)) {
   visible.top=Math.max(visible.top,r.top); visible.bottom=Math.min(visible.bottom,r.bottom);
   visible.left=Math.max(visible.left,r.left); visible.right=Math.min(visible.right,r.right);
  }
 }
 const visibleHeight=Math.max(0,Math.min(visible.bottom,win.innerHeight)-Math.max(visible.top,0));
 if(visibleHeight<win.innerHeight*.30) failures.push('character clipped or too small: '+Math.round(visibleHeight));
 if(win.innerWidth>win.innerHeight && event.classList.contains('jxj-quiz-stage-dialogue-v2') && rect(img).height<win.innerHeight*.70) failures.push('landscape character below approved scale');
 const question=panel.querySelector('h2');
 if(question){
  if(rect(question).width<rect(panel).width*.75) failures.push('question squeezed into a narrow column');
  for(const button of panel.querySelectorAll('.jxj-quiz-answer-v2')){
   if(!within(rect(button),rect(panel))) failures.push('answer outside panel');
   const text=button.querySelector('strong');
   if(!within(rect(text),rect(button))) failures.push('answer text outside button');
  }
 }
 return {case:frame.title,failures,rects:{event:rect(event).toJSON(),panel:rect(panel).toJSON(),image:rect(img).toJSON()},orientation:doc.documentElement.dataset.looseQuizOrientation};
}
function check(){
 const reports=[...document.querySelectorAll('iframe')].map(measure);
 if(reports.some(r=>!r)){results.textContent='Loading';return;}
 const failures=reports.flatMap(r=>r.failures.map(f=>r.case+': '+f));
 results.textContent=(failures.length?'FAIL':'PASS')+'\n'+(failures.join('\n')||reports.length+' layout cases passed')+'\n'+JSON.stringify(reports,null,2);
}
setInterval(check,800);
'''


def test_page():
    frames = []
    for label, w, h in [('portrait', 412, 890), ('landscape', 974, 414)]:
        for stage in ['intro1', 'intro2', 'question']:
            frames.append(f'<h2>{label} {stage}</h2><iframe title="{label} {stage}" width="{w}" height="{h}" src="/tools/3d-quiz-layout-case?stage={stage}"></iframe>')
    return '<!doctype html><meta charset="utf-8"><title>3D quiz layout regression</title><style>body{background:#ddd;font:14px sans-serif}iframe{border:0;display:block}pre{white-space:pre-wrap}</style><pre id="results">Loading</pre>' + ''.join(frames) + '<script>' + REPORT_SCRIPT + '</script>'


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def do_GET(self):
        request = urlparse(self.path)
        if request.path in ['/tools/3d-quiz-layout-case', '/tools/3d-quiz-layout-test']:
            html = case_page(parse_qs(request.query)) if request.path.endswith('-case') else test_page()
            data = html.encode()
            self.send_response(200)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.send_header('Content-Length', str(len(data)))
            self.end_headers()
            self.wfile.write(data)
        else:
            super().do_GET()

    def log_message(self, *args):
        pass


if __name__ == '__main__':
    print('3D quiz fixture: http://localhost:8765/tools/3d-quiz-layout-test', flush=True)
    ThreadingHTTPServer(('0.0.0.0', 8765), Handler).serve_forever()
