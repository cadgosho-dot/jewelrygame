#!/usr/bin/env python3
"""Check real quiz markup against the winning production CSS declarations.
Requires: python -m pip install tinycss2 cssselect2 lxml
This checks the CSS/DOM contract; it does not replace a browser layout test.
"""
from pathlib import Path
import sys,re,json,subprocess,importlib.util
import tinycss2,cssselect2,lxml.html
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('fixture',ROOT/'scripts/serve-3d-quiz-layout.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
def inspect(orientation,stage,attrs=True):
 w,h=(412,890) if orientation=='portrait' else (974,414)
 page=m.case_page({'stage':[stage]})
 script=re.search(r'<script>([\s\S]*?)</script>',page).group(1)
 harness="const vm=require('node:vm');const root={}; const context={innerWidth:"+str(w)+",innerHeight:"+str(h)+",document:{documentElement:{dataset:{},style:{setProperty(){}}},getElementById(){return root}},addEventListener(){}};vm.runInNewContext("+json.dumps(script)+",context);process.stdout.write(root.innerHTML)"
 markup=subprocess.check_output(['node','-e',harness],text=True)
 doc=lxml.html.document_fromstring('<html data-device-class="phone" data-orientation="'+orientation+'"'+(' data-loose-quiz-orientation="'+orientation+'"' if attrs else '')+'><body data-screen="looseShopOriginalQuizEvent"><div id="root">'+markup+'</div></body></html>')
 matcher=cssselect2.Matcher();skipped=[]
 def active(media):
  def item(s):
   if 'print' in s:return False
   if 'orientation:portrait' in s.replace(' ','') and orientation!='portrait':return False
   if 'orientation:landscape' in s.replace(' ','') and orientation!='landscape':return False
   for bound,dimension,number in re.findall(r'(min|max)-(width|height)\s*:\s*([\d.]+)px',s):
    value=w if dimension=='width' else h
    if bound=='min' and value<float(number) or bound=='max' and value>float(number):return False
   for bound,a,b in re.findall(r'(min|max)-aspect-ratio\s*:\s*([\d.]+)/([\d.]+)',s):
    if bound=='min' and w/h<float(a)/float(b) or bound=='max' and w/h>float(a)/float(b):return False
   return True
  return any(item(s) for s in media.split(','))
 def parse(css,label):
  for rule in tinycss2.parse_stylesheet(css,skip_comments=True,skip_whitespace=True):
   if rule.type=='at-rule':
    if rule.lower_at_keyword=='import':
     path=re.search(r"['\"](.+?)['\"]",tinycss2.serialize(rule.prelude)).group(1).split('?')[0]
     parse((ROOT/path).read_text(),path)
    elif rule.content is not None and rule.lower_at_keyword in ('media','supports','layer'):
     if rule.lower_at_keyword!='media' or active(tinycss2.serialize(rule.prelude)):parse(tinycss2.serialize(rule.content),label)
   elif rule.type=='qualified-rule':
    selector=tinycss2.serialize(rule.prelude).strip()
    declarations=[]
    for d in tinycss2.parse_declaration_list(rule.content,skip_comments=True,skip_whitespace=True):
     if d.type=='declaration':
      value=tinycss2.serialize(d.value).strip(); declarations.append((d.lower_name,value,d.important))
      if d.lower_name in ('inset','padding','margin'):
       vs=[tinycss2.serialize([t]) for t in d.value if t.type!='whitespace']; vs=(vs*4 if len(vs)==1 else [vs[0],vs[1],vs[0],vs[1]] if len(vs)==2 else [vs[0],vs[1],vs[2],vs[1]] if len(vs)==3 else vs)
       for side,v in zip(['top','right','bottom','left'],vs):declarations.append((side if d.lower_name=='inset' else d.lower_name+'-'+side,v,d.important))
    try:
     for sel in cssselect2.compile_selector_list(selector):matcher.add_selector(sel,(declarations,label,selector))
    except cssselect2.SelectorError:skipped.append(selector)
 for tag in re.findall(r'<link[^>]+rel="stylesheet"[^>]*>|<style\b[^>]*>[\s\S]*?</style>',page):
  if tag.startswith('<link'):path=re.search(r'href="([^"]+)',tag).group(1).split('?')[0];parse((ROOT/path).read_text(),path)
  else:parse(re.sub(r'^<style[^>]*>|</style>$','',tag),'inline')
 for name in ['hosting-origin-guard.js','memories-event-image-overrides-v751.js']:
  for css in re.findall(r'style.textContent = `([\s\S]*?)`;', (ROOT/name).read_text()):parse(css,name)
 result={}
 for e in cssselect2.ElementWrapper.from_html_root(doc).iter_subtree():
  props={}
  for specificity,order,pseudo,(decls,label,sel) in matcher.match(e):
   if pseudo:continue
   for name,value,important in decls:
    rank=(important,specificity,order)
    if name not in props or rank>=props[name][0]:props[name]=(rank,value,label,sel)
  result[e.etree_element] = props
 return doc,result,skipped
if __name__=='__main__':
 failures=[]
 for orientation in ['portrait','landscape']:
  for stage in ['intro1','intro2','question']:
   doc,r,skipped=inspect(orientation,stage)
   def styles(selector):
    wrapper=cssselect2.ElementWrapper.from_html_root(doc)
    node=wrapper.query(selector).etree_element
    return {k:v[1] for k,v in r[node].items()}
   content=styles('.screen-content')
   event=styles('.jxj-quiz-event-v2')
   # A centred auto grid track collapses when its only child's contents are
   # absolutely positioned. The event must fill a definite-height container.
   if orientation=='portrait' and content.get('display')=='grid' and content.get('align-content')=='center' and event.get('position')!='absolute':
    failures.append(f'{orientation}/{stage}: event remains in a collapsing centred auto grid track')
   if orientation=='landscape' and stage.startswith('intro'):
    image=styles('.jxj-quiz-character-v2')
    area=styles('.jxj-quiz-character-area-v2')
    # The approved preview uses 88dvh and starts at the top. Parent-relative
    # size plus a reserved dialogue strip shrinks and vertically centres it.
    if image.get('max-height')=='100%' or area.get('bottom')!='-8px':
     failures.append(f'{orientation}/{stage}: character still constrained by the dialogue strip')
   if stage=='question' and orientation=='landscape':
    question=styles('h2')
    if question.get('grid-column')!='1/-1' or question.get('grid-row')!='2':
     failures.append(f'{orientation}/{stage}: the real question heading does not span the question row')
   if any('jxj-quiz' in selector for selector in skipped):
    failures.append('A quiz selector could not be evaluated')
 if failures:
  print('FAIL: 3D quiz CSS/DOM integration (no browser rendering)')
  print('\n'.join(failures));sys.exit(1)
 print('PASS: 6 portrait/landscape CSS/DOM integration cases (no browser rendering)')
