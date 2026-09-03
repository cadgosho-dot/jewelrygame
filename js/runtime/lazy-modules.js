// Keep large optional resources out of the startup path while preserving one
// in-flight load per resource. Rejected loads clear only the promise so the
// next user action can retry without resetting successfully loaded resources.
function createLazyResource({ initialValue, isReady, load, select = (value) => value }) {
  let value = initialValue;
  let loadPromise = null;

  function ensureLoaded() {
    if (isReady(value)) return Promise.resolve(value);
    if (!loadPromise) {
      loadPromise = load()
        .then((loaded) => {
          value = select(loaded);
          return value;
        })
        .catch((error) => {
          loadPromise = null;
          throw error;
        });
    }
    return loadPromise;
  }

  return { ensureLoaded, getValue: () => value };
}

export function createLazyModuleManager({
  loadDailyGems,
  loadLooseProfessional,
  loadKaitenzushiEmbedded,
}) {
  const dailyGems = createLazyResource({
    initialValue: null,
    isReady: Boolean,
    load: loadDailyGems,
  });
  const looseProfessional = createLazyResource({
    initialValue: null,
    isReady: Boolean,
    load: loadLooseProfessional,
  });
  const kaitenzushiEmbedded = createLazyResource({
    initialValue: '',
    isReady: Boolean,
    load: loadKaitenzushiEmbedded,
    select: (module) => String(module.KAITENZUSHI_EMBEDDED_HTML || ''),
  });

  return {
    ensureDailyGemsLoaded: dailyGems.ensureLoaded,
    ensureLooseProfessionalLoaded: looseProfessional.ensureLoaded,
    ensureKaitenzushiModuleLoaded: kaitenzushiEmbedded.ensureLoaded,
    getDailyGemsModule: dailyGems.getValue,
    getLooseProfessionalModule: looseProfessional.getValue,
    getKaitenzushiEmbeddedHtml: kaitenzushiEmbedded.getValue,
  };
}
