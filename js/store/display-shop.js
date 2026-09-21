export const PRODUCT_ORDER = Object.freeze(['case', 'showcase', 'displaySupplies']);

const quantity = (value) => Math.max(0, Math.floor(Number(value) || 0));

const installedShowcases = (branch) => Array.isArray(branch?.showcases) ? branch.showcases.length : 0;

const maximumShowcases = (branch, expanded) => {
  if (Number(branch?.number) >= 2) return 3;
  return expanded ? 3 : 1;
};

export function displaySuppliesInstalled(store, branch) {
  const value = branch && Number.isFinite(Number(branch.displaySuppliesInstalled))
    ? branch.displaySuppliesInstalled
    : store?.displaySuppliesInstalled;
  return quantity(value);
}

const caseRemaining = (store, branch) => {
  const value = branch && Number.isFinite(Number(branch.casesInstalled))
    ? branch.casesInstalled
    : store?.casesInstalled;
  return Math.min(50, quantity(value));
};

export function purchaseMaximum(productId, store, branches = []) {
  const owned = quantity(store?.displayInventory?.[productId]);
  const stores = Array.isArray(branches) ? branches : [];

  if (productId === 'showcase') {
    const maximum = stores.reduce((sum, branch) => sum + maximumShowcases(branch, store?.expanded), 0);
    const installed = stores.reduce((sum, branch) => sum + installedShowcases(branch), 0);
    return Math.max(0, maximum - installed - owned);
  }

  if (productId === 'displaySupplies') {
    const maximum = stores.reduce((sum, branch) => sum + installedShowcases(branch), 0);
    const installed = stores.reduce((sum, branch) => sum + displaySuppliesInstalled(store, branch), 0);
    return Math.max(0, maximum - installed - owned);
  }

  return Number.POSITIVE_INFINITY;
}

export function casePurchaseMaximum(product, store, branch, money) {
  if (!product) return 0;
  const owned = quantity(store?.displayInventory?.case);
  const installed = caseRemaining(store, branch);
  const limitRemaining = Math.max(0, quantity(product.purchaseLimit) - owned - installed);
  const affordable = Math.max(0, Math.floor(Number(money || 0) / Math.max(1, Number(product.price) || 1)));
  return Math.max(0, Math.min(limitRemaining, affordable));
}

export function caseInstallMaximum(store, branch) {
  const owned = quantity(store?.displayInventory?.case);
  return Math.max(0, Math.min(owned, 50 - caseRemaining(store, branch)));
}
