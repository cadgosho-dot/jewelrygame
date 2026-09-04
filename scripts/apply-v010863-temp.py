#!/usr/bin/env python3
from pathlib import Path

OLD_VERSION = '0.10.862'


def one_hit(lines, needle, label):
    hits = [i for i, line in enumerate(lines) if needle in line]
    if len(hits) != 1:
        raise SystemExit(f'{label} hits={len(hits)}')
    return hits[0]


app_path = Path('js/app.js')
app = app_path.read_text(encoding='utf-8')
app_lines = app.splitlines()
idx = one_hit(app_lines, f"from './ui/craft-surface.js?v={OLD_VERSION}';", 'craft-surface import')
app_lines.insert(idx + 1, f"import {{ renderToolBriefMarkup }} from './ui/tool-brief.js?v={OLD_VERSION}';")
app = '\n'.join(app_lines) + ('\n' if app.endswith('\n') else '')

old_func = """function renderToolBrief(tool, guideAction = 'glab-tool-guide') {
  const description = String(tool?.description || '').trim();
  const detail = String(tool?.detail || '').trim();
  return `<section class="tool-brief-card">
    ${description ? `<p>${esc(description)}</p>` : ''}
    ${detail && detail !== description ? `<p class="tool-brief-sub">${esc(detail)}</p>` : ''}
    <div class="tool-brief-actions">
      <button class="secondary-button tool-inline-guide-button" data-action="${esc(guideAction)}" data-id="${esc(tool.id)}">詳しい説明を見る</button>
    </div>
  </section>`;
}"""
new_func = """function renderToolBrief(tool, guideAction = 'glab-tool-guide') {
  return renderToolBriefMarkup(tool, guideAction, esc);
}"""
if app.count(old_func) != 1:
    raise SystemExit(f'legacy renderToolBrief hits={app.count(old_func)}')
app = app.replace(old_func, new_func, 1)
app_path.write_text(app, encoding='utf-8')

sw_path = Path('sw.js')
sw_lines = sw_path.read_text(encoding='utf-8').splitlines()
idx = one_hit(sw_lines, f'./js/ui/craft-surface.js?v={OLD_VERSION}', 'craft-surface SW')
line = sw_lines[idx]
indent = line[:len(line) - len(line.lstrip())]
quote = "'" if "'" in line else '"'
sw_lines.insert(idx + 1, f"{indent}{quote}./js/ui/tool-brief.js?v={OLD_VERSION}{quote},")
sw_path.write_text('\n'.join(sw_lines) + '\n', encoding='utf-8')

vs_path = Path('scripts/version-sync.py')
vs_lines = vs_path.read_text(encoding='utf-8').splitlines()
idx = one_hit(vs_lines, 'craft-surface.js precache key', 'craft-surface precache rule')
vs_lines.insert(idx + 1, "    Rule('sw.js', 'tool-brief.js precache key', qparam(r'\\./js/ui/tool-brief\\.js'), keep_prefix),")
idx = one_hit(vs_lines, 'craft-surface.js import key', 'craft-surface import rule')
vs_lines.insert(idx + 1, "    Rule('js/app.js', 'tool-brief.js import key', qparam(r'\\./ui/tool-brief\\.js'), keep_prefix),")
vs_path.write_text('\n'.join(vs_lines) + '\n', encoding='utf-8')

current_path = Path('scripts/check-current.py')
current_lines = current_path.read_text(encoding='utf-8').splitlines()
idx = one_hit(current_lines, 'check-craft-surface.py', 'check-craft-surface registration')
current_lines.insert(idx + 1, "    ('工具説明UI', [sys.executable, str(ROOT / 'scripts/check-tool-brief.py')]),")
current_path.write_text('\n'.join(current_lines) + '\n', encoding='utf-8')

changelog_path = Path('CHANGELOG.md')
changelog = changelog_path.read_text(encoding='utf-8')
marker = '\n## v0.10.862\n'
if changelog.count(marker) != 1:
    raise SystemExit(f'changelog marker hits={changelog.count(marker)}')
entry = """
## v0.10.863
- 工房・g-Lab.の工具詳細画面で共通利用している工具説明カードのHTML生成だけを `js/ui/tool-brief.js` へ分離。
- 説明文のtrim、補足文の重複抑止、詳しい説明ボタン、`data-action`・工具IDのHTMLエスケープを従来どおり維持。
- 既存 `renderToolBrief()` は薄いラッパーとして残し、従来の `esc` をcallback注入することで既存2画面の呼び出し位置と表示内容を変更しない構造にした。
- 購入・修理・所持状態・価格・時間判定・画面遷移・工具画像・セーブ・認証・在庫・水槽・イベント処理には変更なし。
- 新UI helperをService Workerと `version-sync.py` へ正式登録し、専用単体/統合検査を総合監査へ追加。

"""
changelog = changelog.replace(marker, '\n' + entry + '## v0.10.862\n', 1)
changelog_path.write_text(changelog, encoding='utf-8')

print('v0.10.863 source changes applied')
