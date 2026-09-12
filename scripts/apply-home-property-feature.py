#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
VERSION = (ROOT / 'VERSION').read_text(encoding='utf-8').strip()


def replace_once(path, old, new, label):
    text = path.read_text(encoding='utf-8')
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'FAIL {label}: expected 1 match, got {count}')
    path.write_text(text.replace(old, new, 1), encoding='utf-8')


app = ROOT / 'js/app.js'

store_import = f"import {{ calculateStoreMonthlyRent }} from './finance/store-rent.js?v={VERSION}';\n"
home_import = f"""import {{ calculateStoreMonthlyRent }} from './finance/store-rent.js?v={VERSION}';
import {{
  HOME_MOVE_COST,
  homePropertyUnlocked,
  normalizeHomeProperty,
  homePropertyMonthlyRent,
  homePropertyMoveTotal,
  homePropertyBackgroundAsset,
}} from './finance/home-property.js?v={VERSION}';
"""
replace_once(app, store_import, home_import, 'home property module import')

replace_once(
    app,
    "function backgroundAssetFor(target) {\n",
    "function backgroundAssetFor(target) {\n  if (backgroundFor(target) === 'sleep') return homePropertyBackgroundAsset(currentHomePropertyId(), isPortraitLayout());\n",
    'sleep background hook',
)

helpers = r'''function currentHomePropertyId() {
  return normalizeHomeProperty(state?.business?.homeProperty);
}

function currentHomeMonthlyRent() {
  return homePropertyMonthlyRent(currentHomePropertyId(), HOME_MONTHLY_RENT);
}

function renderHomeProperty() {
  const current = currentHomePropertyId();
  const selected = normalizeHomeProperty(screenData.homeProperty || current);
  screenData.homeProperty = selected;
  const rent = homePropertyMonthlyRent(selected, HOME_MONTHLY_RENT);
  const asset = homePropertyBackgroundAsset(selected, isPortraitLayout());
  const currentStyle = (id) => id === current
    ? 'box-shadow:0 0 0 2px rgba(232,196,117,.95) inset,0 0 16px rgba(232,196,117,.5);'
    : '';
  const selectedClass = (id) => id === selected ? 'primary-button' : 'secondary-button';
  return shell('自宅', `
    <section class="center-card glass-panel expansion-card" style="max-width:min(820px,94vw);margin-inline:auto;">
      <div style="display:flex;gap:10px;justify-content:center;margin-bottom:14px;">
        <button type="button" class="${selectedClass('A')}" data-action="select-home-property" data-property="A" aria-pressed="${selected === 'A'}" style="min-width:110px;${currentStyle('A')}">物件A</button>
        <button type="button" class="${selectedClass('B')}" data-action="select-home-property" data-property="B" aria-pressed="${selected === 'B'}" style="min-width:110px;${currentStyle('B')}">物件B</button>
      </div>
      <div style="display:grid;place-items:center;min-height:0;margin:0 auto 14px;">
        <img src="./assets/images/${asset}.webp?v=${VERSION}" alt="物件${selected}" draggable="false" style="display:block;max-width:100%;width:auto;max-height:52vh;object-fit:contain;border-radius:14px;">
      </div>
      <div class="phone-card" style="margin:0 auto 14px;text-align:center;max-width:520px;">
        <strong>引越し費用　${yen(HOME_MOVE_COST)}</strong>
        <span>毎月家賃　${yen(rent)}</span>
      </div>
      ${selected !== current ? '<button type="button" class="primary-button full-button" data-action="move-home-property">引越す</button>' : ''}
      <button type="button" class="secondary-button full-button" data-action="real-estate-menu" style="margin-top:10px;">戻る</button>
    </section>`, { help: '物件を選ぶと画像・引越し費用・毎月家賃を確認できます。現在住んでいる物件は枠の光で示されます。' });
}

function moveHomeProperty() {
  if (!homePropertyUnlocked(state?.game?.day)) return showToast('自宅の引越しは351日目から利用できます。', 'error');
  const current = currentHomePropertyId();
  const destination = normalizeHomeProperty(screenData.homeProperty || current);
  if (destination === current) return;
  const rent = homePropertyMonthlyRent(destination, HOME_MONTHLY_RENT);
  const total = homePropertyMoveTotal(destination, HOME_MONTHLY_RENT);
  if ((Number(state?.game?.money) || 0) < total) {
    return showToast(`引越しには合計${yen(total)}が必要です。`, 'error');
  }
  state.game.money -= total;
  state.business.homeProperty = destination;
  addFinance(`引越し費用（物件${destination}）`, 0, HOME_MOVE_COST);
  addFinance(`自宅家賃1ヶ月分（物件${destination}）`, 0, rent);
  saveGame();
  showToast(`物件${destination}へ引越しました。${yen(total)}を支払いました。`, 'success', false);
  render();
}

'''
replace_once(app, 'function renderRealEstate() {\n', helpers + 'function renderRealEstate() {\n', 'home UI helpers')

old_real_estate = r'''function renderRealEstate() {
  const nextBranchNumber = nextStoreBranchNumber();
  const contractAvailable = nextBranchNumber <= MAX_STORE_BRANCHES;

  if (screenData.view !== 'contract') {
    return shell('不動産屋', `
      <section class="center-card glass-panel expansion-card">
        <button class="primary-button full-button" data-action="open-store-contract" ${contractAvailable ? '' : 'disabled'}>店舗契約</button>
      </section>`, { help: contractAvailable ? '店舗契約を押すと、次に契約できる店舗の条件を確認できます。' : '現在契約できる店舗はありません。' });
  }
'''
new_real_estate = r'''function renderRealEstate() {
  const nextBranchNumber = nextStoreBranchNumber();
  const contractAvailable = nextBranchNumber <= MAX_STORE_BRANCHES;
  const homeAvailable = homePropertyUnlocked(state?.game?.day);

  if (screenData.view === 'home') return renderHomeProperty();

  if (screenData.view !== 'contract') {
    return shell('不動産屋', `
      <section class="center-card glass-panel expansion-card">
        <button class="primary-button full-button" data-action="open-store-contract" ${contractAvailable ? '' : 'disabled'}>店舗契約</button>
        ${homeAvailable ? '<button class="primary-button full-button" data-action="open-home-property">自宅</button>' : ''}
      </section>`, { help: homeAvailable ? '店舗契約または自宅の引越しを選べます。' : (contractAvailable ? '店舗契約を押すと、次に契約できる店舗の条件を確認できます。' : '現在契約できる店舗はありません。') });
  }
'''
replace_once(app, old_real_estate, new_real_estate, 'real estate home menu')

old_rent = r'''  const result = payFixedCost(`${monthKey} 自宅家賃`, HOME_MONTHLY_RENT, (unpaid) => {
    state.business.homeRentUnpaid += unpaid;
  });
  const report = { month: monthKey, amount: HOME_MONTHLY_RENT, paid: result.paid, unpaid: result.unpaid };
  state.business.lastProcessedHomeRentMonth = monthKey;
  state.business.homeRentReports.push(report);
  state.business.homeRentReports = state.business.homeRentReports.slice(-24);

  const resultMessage = result.unpaid
    ? `自宅家賃 ${yen(HOME_MONTHLY_RENT)}のうち${yen(result.paid)}を支払い、${yen(result.unpaid)}が未払いです。生活費${yen(MIN_LIVING_CASH_RESERVE)}は残しています。`
    : `自宅家賃 ${yen(HOME_MONTHLY_RENT)}を支払いました。`;
'''
new_rent = r'''  const homeRent = currentHomeMonthlyRent();
  const result = payFixedCost(`${monthKey} 自宅家賃`, homeRent, (unpaid) => {
    state.business.homeRentUnpaid += unpaid;
  });
  const report = { month: monthKey, amount: homeRent, paid: result.paid, unpaid: result.unpaid };
  state.business.lastProcessedHomeRentMonth = monthKey;
  state.business.homeRentReports.push(report);
  state.business.homeRentReports = state.business.homeRentReports.slice(-24);

  const resultMessage = result.unpaid
    ? `自宅家賃 ${yen(homeRent)}のうち${yen(result.paid)}を支払い、${yen(result.unpaid)}が未払いです。生活費${yen(MIN_LIVING_CASH_RESERVE)}は残しています。`
    : `自宅家賃 ${yen(homeRent)}を支払いました。`;
'''
replace_once(app, old_rent, new_rent, 'monthly home rent resolver')

replace_once(
    app,
    '自宅家賃 ${yen(HOME_MONTHLY_RENT)}（毎月15日・開始30日間は初回猶予）',
    '自宅家賃 ${yen(currentHomeMonthlyRent())}（毎月15日・開始30日間は初回猶予）',
    'finance current home rent display',
)

old_actions = """    case 'open-store-contract': screenData.view = 'contract'; render(); break;
    case 'real-estate-menu': screenData = {}; render(); break;
    case 'rent-next-store': rentNextStore(); break;
"""
new_actions = """    case 'open-store-contract': screenData.view = 'contract'; render(); break;
    case 'open-home-property':
      if (homePropertyUnlocked(state?.game?.day)) {
        screenData.view = 'home';
        screenData.homeProperty = currentHomePropertyId();
        render();
      }
      break;
    case 'select-home-property':
      if (screenData.view === 'home') {
        screenData.homeProperty = normalizeHomeProperty(button.dataset.property);
        render();
      }
      break;
    case 'move-home-property': moveHomeProperty(); break;
    case 'real-estate-menu': screenData = {}; render(); break;
    case 'rent-next-store': rentNextStore(); break;
"""
replace_once(app, old_actions, new_actions, 'real estate home actions')

version_sync = ROOT / 'scripts/version-sync.py'
replace_once(
    version_sync,
    "    Rule('sw.js', 'store-rent.js precache key', qparam(r'\\./js/finance/store-rent\\.js'), keep_prefix),\n",
    "    Rule('sw.js', 'store-rent.js precache key', qparam(r'\\./js/finance/store-rent\\.js'), keep_prefix),\n    Rule('sw.js', 'home-property.js precache key', qparam(r'\\./js/finance/home-property\\.js'), keep_prefix),\n",
    'version sync sw home property rule',
)
replace_once(
    version_sync,
    "    Rule('js/app.js', 'store-rent.js import key', qparam(r'\\./finance/store-rent\\.js'), keep_prefix),\n",
    "    Rule('js/app.js', 'store-rent.js import key', qparam(r'\\./finance/store-rent\\.js'), keep_prefix),\n    Rule('js/app.js', 'home-property.js import key', qparam(r'\\./finance/home-property\\.js'), keep_prefix),\n",
    'version sync app home property rule',
)

sw = ROOT / 'sw.js'
replace_once(
    sw,
    f"'./js/app.js?v={VERSION}', './js/finance/store-rent.js?v={VERSION}',",
    f"'./js/app.js?v={VERSION}', './js/finance/store-rent.js?v={VERSION}', './js/finance/home-property.js?v={VERSION}',",
    'service worker home property module',
)

changelog = ROOT / 'CHANGELOG.md'
text = changelog.read_text(encoding='utf-8')
anchor = f'## v{VERSION}\n'
if text.count(anchor) != 1:
    raise SystemExit(f'FAIL changelog anchor: {text.count(anchor)}')
entry = '''## v0.10.943
- 351日目から不動産屋に「自宅」を追加し、現在の物件Aと新しい物件Bを比較していつでも相互に引越せるようにした。引越し時は100万円と移動先1ヶ月分の家賃を支払う。
- 物件Aは既存の家賃70,000円と既存の寝る背景を維持。物件Bは月額200,000円とユーザー提供の横・縦背景を使用し、引越した当日夜から「寝る」の背景へ反映する。
- 自宅物件の料金・解放日・背景選択は `js/finance/home-property.js` に分離し、既存セーブは物件Aとして互換維持する。

'''
changelog.write_text(text.replace(anchor, entry + anchor, 1), encoding='utf-8')
print('HOME PROPERTY PATCH: PASS')
