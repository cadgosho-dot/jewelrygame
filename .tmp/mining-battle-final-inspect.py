from pathlib import Path

out=[]
def snippets(path, needles, before=900, after=2400):
    text=Path(path).read_text(encoding='utf-8', errors='replace')
    out.append(f'===== FILE {path} size={len(text)} =====')
    for needle in needles:
        out.append(f'\n===== {needle} =====')
        start=0; count=0
        while True:
            i=text.find(needle,start)
            if i<0: break
            count+=1
            a=max(0,i-before); b=min(len(text),i+after)
            out.append(f'--- occurrence {count} @ {i} ---\n{text[a:b]}')
            start=i+max(1,len(needle))
            if count>=8: break
        if count==0: out.append('(none)')

snippets('js/app.js',[
    "import { bindRetroBattleFrameLoader",
    'let retroBattleSession = null',
    'function maybeStartRetroBattleEvent()',
    'function finishRetroBattleEvent',
    'function failRetroBattleEventLoad',
    'function bindRetroBattleFrame()',
    'function renderRetroBattleEvent()',
    'function renderMining()',
    "setScreen('mining'",
    'maybeStartRetroBattleEvent()',
],1200,3200)

snippets('assets/minigames/retro-battle/index.html',[
    'function pickEnemy()',
    "enemyName",
    "enemyImage",
    'function playerAttack(kind)',
    'mining-pickaxe-fx',
    'window.RetroBattle =',
],1200,3600)

# Relevant asset paths only.
for base in ['assets/images','assets/audio','assets/minigames']:
    p=Path(base)
    if p.exists():
        out.append(f'\n===== PATHS {base} =====')
        for q in p.rglob('*'):
            if q.is_file() and any(k in q.name.lower() for k in ['pickaxe','mole','bat','mining','dig']):
                out.append(str(q))

Path('.tmp/mining-battle-final-inspection.txt').write_text('\n'.join(out),encoding='utf-8')
print('inspection written', len(out))
