#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected 1 match, got {count}')
    return text.replace(old, new, 1)


def replace_function(text: str, signature: str, replacement: str) -> str:
    start = text.find(signature)
    if start < 0:
        raise SystemExit(f'{signature} not found')
    brace = text.find('{', start)
    depth = 0
    quote = None
    escape = False
    line_comment = False
    block_comment = False
    i = brace
    while i < len(text):
        c = text[i]
        n = text[i + 1] if i + 1 < len(text) else ''
        if line_comment:
            if c == '\n':
                line_comment = False
            i += 1
            continue
        if block_comment:
            if c == '*' and n == '/':
                block_comment = False
                i += 2
                continue
            i += 1
            continue
        if quote:
            if escape:
                escape = False
            elif c == '\\':
                escape = True
            elif c == quote:
                quote = None
            i += 1
            continue
        if c == '/' and n == '/':
            line_comment = True
            i += 2
            continue
        if c == '/' and n == '*':
            block_comment = True
            i += 2
            continue
        if c in "'\"`":
            quote = c
            i += 1
            continue
        if c == '{':
            depth += 1
        elif c == '}':
            depth -= 1
            if depth == 0:
                return text[:start] + replacement + text[i + 1:]
        i += 1
    raise SystemExit(f'{signature} end not found')


app_path = ROOT / 'js/app.js'
app = app_path.read_text(encoding='utf-8')
app = replace_once(
    app,
    "import { calculateStoreMonthlyRent } from './finance/store-rent.js?v=0.10.944';\n",
    "import { calculateStoreMonthlyRent } from './finance/store-rent.js?v=0.10.944';\nimport { createHomePropertyController } from './finance/home-property-controller.js?v=0.10.944';\n",
    'controller import',
)
app = replace_once(
    app,
    'let screenData = {};\n',
    """let screenData = {};
const homePropertyController = createHomePropertyController({
  getState: () => state,
  getScreenData: () => screenData,
  shell,
  yen,
  version: VERSION,
  isPortraitLayout,
  showToast,
  addFinance,
  saveGame,
  gameDate,
  rerender: render,
  payFixedCost,
  addNotification,
  propertyARent: HOME_MONTHLY_RENT,
  getMinLivingCashReserve: () => MIN_LIVING_CASH_RESERVE,
});
""",
    'controller init',
)
alien = "  if (isAlienAbducted() && target !== 'alienReturnEvent') return isPortraitLayout() ? 'space-portrait' : 'space';\n"
app = replace_once(
    app,
    alien,
    alien + "  if (backgroundFor(target) === 'sleep') return homePropertyController.backgroundAsset();\n",
    'sleep background resolver',
)
app = replace_once(
    app,
    "  document.documentElement.style.setProperty('--screen-bg', `url('./assets/images/${asset}.webp?v=${VERSION}')`);",
    "  const extension = backgroundFor(screen) === 'sleep' && homePropertyController.currentProperty() === 'B' ? 'png' : 'webp';\n  document.documentElement.style.setProperty('--screen-bg', `url('./assets/images/${asset}.${extension}?v=${VERSION}')`);",
    'sleep image extension',
)
app = replace_once(
    app,
    '自宅家賃 ${yen(HOME_MONTHLY_RENT)}（毎月15日・開始30日間は初回猶予）',
    '自宅家賃 ${yen(homePropertyController.currentRent())}（毎月15日・開始30日間は初回猶予）',
    'finance rent display',
)
old_menu = """function renderRealEstate() {
  const nextBranchNumber = nextStoreBranchNumber();
  const contractAvailable = nextBranchNumber <= MAX_STORE_BRANCHES;

  if (screenData.view !== 'contract') {
    return shell('不動産屋', `
      <section class=\"center-card glass-panel expansion-card\">
        <button class=\"primary-button full-button\" data-action=\"open-store-contract\" ${contractAvailable ? '' : 'disabled'}>店舗契約</button>
      </section>`, { help: contractAvailable ? '店舗契約を押すと、次に契約できる店舗の条件を確認できます。' : '現在契約できる店舗はありません。' });
  }
"""
new_menu = """function renderRealEstate() {
  const nextBranchNumber = nextStoreBranchNumber();
  const contractAvailable = nextBranchNumber <= MAX_STORE_BRANCHES;
  const homeAvailable = homePropertyController.isUnlocked();

  if (screenData.view === 'home') return homePropertyController.renderView();

  if (screenData.view !== 'contract') {
    return shell('不動産屋', `
      <section class=\"center-card glass-panel expansion-card\">
        <button class=\"primary-button full-button\" data-action=\"open-store-contract\" ${contractAvailable ? '' : 'disabled'}>店舗契約</button>
        ${homeAvailable ? '<button class=\"primary-button full-button\" data-action=\"open-home-property\">自宅</button>' : ''}
      </section>`, { help: homeAvailable ? '店舗契約または自宅の引越しを選べます。' : (contractAvailable ? '店舗契約を押すと、次に契約できる店舗の条件を確認できます。' : '現在契約できる店舗はありません。') });
  }
"""
app = replace_once(app, old_menu, new_menu, 'real estate menu')
app = replace_once(
    app,
    "    case 'open-store-contract': screenData.view = 'contract'; render(); break;\n    case 'real-estate-menu': screenData = {}; render(); break;",
    "    case 'open-store-contract': screenData.view = 'contract'; render(); break;\n    case 'open-home-property': homePropertyController.open(); break;\n    case 'select-home-property': homePropertyController.select(button.dataset.property); break;\n    case 'move-home-property': homePropertyController.move(); break;\n    case 'real-estate-menu': screenData = {}; render(); break;",
    'home property actions',
)
app = replace_function(
    app,
    'function processHomeRent() {',
    "function processHomeRent() {\n  return homePropertyController.processRent();\n}",
)
for marker in [
    'createHomePropertyController',
    "case 'open-home-property'",
    "case 'select-home-property'",
    "case 'move-home-property'",
    'homePropertyController.currentRent()',
    'homePropertyController.backgroundAsset()',
    'homePropertyController.processRent()',
]:
    if marker not in app:
        raise SystemExit(f'missing app marker: {marker}')
app_path.write_text(app, encoding='utf-8')

# Rebind copied feature files to the new patch version before global version sync.
for rel in [
    'js/finance/home-property.js',
    'js/finance/home-property-controller.js',
    'scripts/check-home-property.py',
    'scripts/check-home-rent-regression.py',
    'tools/test-home-rent-regression.mjs',
]:
    path = ROOT / rel
    value = path.read_text(encoding='utf-8').replace('0.10.944', '0.10.945')
    path.write_text(value, encoding='utf-8')

vs_path = ROOT / 'scripts/version-sync.py'
vs = vs_path.read_text(encoding='utf-8')
sw_rule = "    Rule('sw.js', 'store-rent.js precache key', qparam(r'\\./js/finance/store-rent\\.js'), keep_prefix),\n"
vs = replace_once(
    vs,
    sw_rule,
    sw_rule + "    Rule('sw.js', 'home-property.js precache key', qparam(r'\\./js/finance/home-property\\.js'), keep_prefix),\n    Rule('sw.js', 'home-property-controller.js precache key', qparam(r'\\./js/finance/home-property-controller\\.js'), keep_prefix),\n",
    'version-sync sw rules',
)
app_rule = "    Rule('js/app.js', 'store-rent.js import key', qparam(r'\\./finance/store-rent\\.js'), keep_prefix),\n"
vs = replace_once(
    vs,
    app_rule,
    app_rule + "    Rule('js/app.js', 'home-property-controller.js import key', qparam(r'\\./finance/home-property-controller\\.js'), keep_prefix),\n    Rule('js/finance/home-property-controller.js', 'home-property.js import key', qparam(r'\\./home-property\\.js'), keep_prefix),\n",
    'version-sync app rules',
)
vs_path.write_text(vs, encoding='utf-8')

sw_path = ROOT / 'sw.js'
sw = sw_path.read_text(encoding='utf-8')
sw = replace_once(
    sw,
    "'./js/app.js?v=0.10.944', './js/finance/store-rent.js?v=0.10.944',",
    "'./js/app.js?v=0.10.944', './js/finance/store-rent.js?v=0.10.944', './js/finance/home-property.js?v=0.10.944', './js/finance/home-property-controller.js?v=0.10.944',",
    'service worker home modules',
)
sw_path.write_text(sw, encoding='utf-8')

current_path = ROOT / 'scripts/check-current.py'
current = current_path.read_text(encoding='utf-8')
check_anchor = "    ('固定費自動支払い・自宅家賃処理保護', [sys.executable, str(ROOT / 'scripts/check-home-rent-regression.py')]),\n"
current = replace_once(
    current,
    check_anchor,
    check_anchor + "    ('自宅物件・引越し処理保護', [sys.executable, str(ROOT / 'scripts/check-home-property.py')]),\n",
    'check-current home-property entry',
)
current_path.write_text(current, encoding='utf-8')

changelog_path = ROOT / 'CHANGELOG.md'
changelog = changelog_path.read_text(encoding='utf-8')
entry = """## v0.10.945 - 2026-09-13

- 351日目以降、不動産屋に「自宅」を追加し、物件A／物件Ｂの選択・引越し機能を追加。
- 物件Ｂの月額家賃を200,000円、引越し費用を1,000,000円とし、移動先1か月分家賃を引越し時に支払う仕様を追加。
- 選択中の自宅を「寝る」背景へ即時反映し、旧セーブは物件Aとして扱う。引越し月の家賃二重請求を防止。
- 自宅物件ロジックは `js/finance/home-property.js` と `js/finance/home-property-controller.js` に分離し、既存UI・イベント・セーブ形式・Firebase関連は変更しない。

"""
if '## v0.10.945 - 2026-09-13' not in changelog:
    pos = changelog.find('## ')
    if pos < 0:
        raise SystemExit('CHANGELOG heading not found')
    changelog_path.write_text(changelog[:pos] + entry + changelog[pos:], encoding='utf-8')

print('TEMP HOME PROPERTY APPLY: PASS')
