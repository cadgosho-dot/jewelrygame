#!/usr/bin/env python3
"""Validate that the aquarium uses its canonical HTML implementation without a SW hotfix."""
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sw = (ROOT / 'sw.js').read_text(encoding='utf-8')
aquarium = (ROOT / 'assets/minigames/aquarium/index.html').read_text(encoding='utf-8')
archive = ROOT / 'docs/archive/legacy-code/aquarium-observe-v734-hotfix.js'
active_hotfix = ROOT / 'js/aquarium-observe-v734-hotfix.js'
errors = []

if active_hotfix.exists():
    errors.append('旧 aquarium-observe-v734-hotfix.js が現行 js/ に残っています。')
if not archive.is_file():
    errors.append('旧水槽ホットフィックスの履歴アーカイブがありません。')
if 'aquarium-observe-v734-hotfix.js' in sw or 'aquariumDocumentNetworkFirst' in sw or 'AQUARIUM_OBSERVE_PATCH_URL' in sw:
    errors.append('Service Worker が水槽HTMLへ旧ホットフィックスを注入しています。')
if "url.pathname.endsWith('/assets/minigames/aquarium/index.html')" in sw:
    errors.append('水槽だけを特別変換するService Worker分岐が残っています。')
required = [
    "const fixedDisplayNames=new Set(['水槽','ライト','フィルター','ヒーター','床砂'])",
    "return aquariumCount('displayItems',id,'owned')>0;",
    "add.disabled=installed>=owned",
    "remove.disabled=installed<1",
    "postAquariumMessage({type:'ready'})",
    "if(data.source==='jxj-main-game'&&data.type==='aquarium-state')applyAquariumSnapshot(data.state);",
]
for token in required:
    if token not in aquarium:
        errors.append(f'水槽本体の現行同期・再設置ロジックが不足しています: {token}')

if errors:
    print('AQUARIUM RUNTIME POLICY: FAIL')
    for error in errors:
        print(f'- {error}')
    sys.exit(1)
print('AQUARIUM RUNTIME POLICY: PASS')
print('水槽表示はHTML本体を正本とし、Service Workerによる旧ホットフィックス注入に依存していません。')
