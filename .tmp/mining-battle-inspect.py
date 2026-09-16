from pathlib import Path

p=Path('js/app.js')
s=p.read_text(encoding='utf-8')
needles=[
    'finishMiningRock',
    "setScreen('mining",
    'miningLocations',
    'renderMining',
    'screen === \'mining\'',
    'case \'mining\'',
    'miningLocation',
    'retroBattleFrame',
    'showRetroBattle',
]
out=[]
for needle in needles:
    out.append(f'===== {needle} =====')
    start=0; n=0
    while True:
        i=s.find(needle,start)
        if i<0: break
        n+=1
        a=max(0,i-1200); b=min(len(s),i+2600)
        out.append(f'--- occurrence {n} @ {i} ---\n{s[a:b]}')
        start=i+len(needle)
        if n>=12: break
    if n==0: out.append('(none)')
Path('.tmp/mining-battle-inspection.txt').write_text('\n\n'.join(out),encoding='utf-8')
print('wrote inspection',len(out))
