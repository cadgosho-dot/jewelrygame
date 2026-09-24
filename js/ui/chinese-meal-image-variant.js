export function createMealImageVariantSelector() {
  let cachedKey = null;
  let cachedImage = '';

  return ({ selectionKey, images, random = Math.random } = {}) => {
    const candidates = Array.isArray(images) ? images.filter(Boolean) : [];
    if (!candidates.length) return '';

    const key = String(selectionKey ?? '');
    if (cachedKey !== key || !candidates.includes(cachedImage)) {
      const raw = Number(random());
      const normalizedRandom = Number.isFinite(raw) ? Math.max(0, Math.min(0.999999999999, raw)) : 0;
      cachedKey = key;
      cachedImage = candidates[Math.floor(normalizedRandom * candidates.length)];
    }
    return cachedImage;
  };
}

export const selectChineseMealImage = createMealImageVariantSelector();
