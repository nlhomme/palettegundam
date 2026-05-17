const TRANSLATIONS = {
  en: {
    'app.title': 'Palette Gundam — harmony-driven character palettes',
    'app.tagline': 'harmony-driven character palettes',

    'ui.harmony': 'Harmony',
    'ui.regenerate': 'Regenerate',
    'ui.character': 'Character',
    'ui.export': 'Export',
    'ui.share': 'Share',

    'title.regenAll': 'Regenerate all (Space)',
    'title.addCharacter': 'Add character palette',
    'title.share': 'Copy short share link',
    'title.switchLanguage': 'Switch language',
    'title.regenThis': 'Regenerate this palette',
    'title.exportOne': 'Export as .swatches',
    'title.removeChar': 'Remove character',
    'title.removeBgColor': 'Remove one color',
    'title.addBgColor': 'Add one color',
    'title.lock': 'Lock',
    'title.unlock': 'Unlock',
    'title.editHex': 'Edit hex',
    'title.regenFab': 'Regenerate all',

    'harmony.auto': 'Auto',
    'harmony.monochromatic': 'Monochromatic',
    'harmony.analogous': 'Analogous',
    'harmony.complementary': 'Complementary',
    'harmony.split-complementary': 'Split-complementary',
    'harmony.triadic': 'Triadic',
    'harmony.tetradic': 'Tetradic',
    'harmony.square': 'Square',

    'export.procreateAll': 'ProCreate · all palettes (.zip)',
    'export.procreateEach': 'ProCreate · each as .swatches',
    'export.png': 'PNG preview',
    'export.css': 'CSS variables',
    'export.json': 'JSON',

    'palette.background': 'Background',
    'palette.character': 'Character {n}',

    'role.skin': 'Skin',
    'role.hair': 'Hair',
    'role.main': 'Main',
    'role.secondary': 'Secondary',
    'role.accent': 'Accent',

    'toast.copied': 'Copied {hex}',
    'toast.bgMin': 'Background must keep at least {n} color.',
    'toast.bgMax': 'Background is capped at {n} colors.',
    'toast.charMin': 'At least one character palette is required.',
    'toast.invalidHex': 'Invalid hex.',
    'toast.shareCopied': 'Short link copied!',
    'toast.shareFailed': 'Share failed.',
    'toast.exportFailed': 'Export failed.',

    'dialog.hexLabel': 'Hex color',
    'dialog.cancel': 'Cancel',
    'dialog.apply': 'Apply',

    'boot.error': 'Boot error: {msg}',
  },
  fr: {
    'app.title': 'Palette Gundam — palettes de personnages harmonisées',
    'app.tagline': 'palettes de personnages harmonisées',

    'ui.harmony': 'Harmonie',
    'ui.regenerate': 'Régénérer',
    'ui.character': 'Personnage',
    'ui.export': 'Exporter',
    'ui.share': 'Partager',

    'title.regenAll': 'Tout régénérer (Espace)',
    'title.addCharacter': 'Ajouter un personnage',
    'title.share': 'Copier le lien de partage',
    'title.switchLanguage': 'Changer de langue',
    'title.regenThis': 'Régénérer cette palette',
    'title.exportOne': 'Exporter en .swatches',
    'title.removeChar': 'Supprimer ce personnage',
    'title.removeBgColor': 'Retirer une couleur',
    'title.addBgColor': 'Ajouter une couleur',
    'title.lock': 'Verrouiller',
    'title.unlock': 'Déverrouiller',
    'title.editHex': 'Modifier le code hex',
    'title.regenFab': 'Tout régénérer',

    'harmony.auto': 'Auto',
    'harmony.monochromatic': 'Monochromatique',
    'harmony.analogous': 'Analogue',
    'harmony.complementary': 'Complémentaire',
    'harmony.split-complementary': 'Complémentaire fractionné',
    'harmony.triadic': 'Triadique',
    'harmony.tetradic': 'Tétradique',
    'harmony.square': 'Carré',

    'export.procreateAll': 'ProCreate · toutes les palettes (.zip)',
    'export.procreateEach': 'ProCreate · chaque palette en .swatches',
    'export.png': 'Aperçu PNG',
    'export.css': 'Variables CSS',
    'export.json': 'JSON',

    'palette.background': 'Arrière-plan',
    'palette.character': 'Personnage {n}',

    'role.skin': 'Peau',
    'role.hair': 'Cheveux',
    'role.main': 'Principale',
    'role.secondary': 'Secondaire',
    'role.accent': 'Accent',

    'toast.copied': '{hex} copié',
    'toast.bgMin': "L'arrière-plan doit garder au moins {n} couleur.",
    'toast.bgMax': "L'arrière-plan est limité à {n} couleurs.",
    'toast.charMin': 'Au moins une palette de personnage est requise.',
    'toast.invalidHex': 'Code hex invalide.',
    'toast.shareCopied': 'Lien court copié !',
    'toast.shareFailed': 'Échec du partage.',
    'toast.exportFailed': "Échec de l'export.",

    'dialog.hexLabel': 'Code hex',
    'dialog.cancel': 'Annuler',
    'dialog.apply': 'Appliquer',

    'boot.error': 'Erreur de démarrage : {msg}',
  },
};

const SUPPORTED = ['en', 'fr'];
const STORAGE_KEY = 'pg.lang';

let currentLang = 'en';

function safeStorageGet() {
  try { return localStorage.getItem(STORAGE_KEY); } catch { return null; }
}
function safeStorageSet(v) {
  try { localStorage.setItem(STORAGE_KEY, v); } catch {}
}

export function detectLanguage() {
  const stored = safeStorageGet();
  if (SUPPORTED.includes(stored)) return stored;
  const nav = (navigator.language || navigator.userLanguage || '').toLowerCase();
  return nav.startsWith('fr') ? 'fr' : 'en';
}

export function getLanguage() {
  return currentLang;
}

export function otherLanguage() {
  return currentLang === 'fr' ? 'en' : 'fr';
}

export function t(key, params = {}) {
  let s = TRANSLATIONS[currentLang]?.[key] ?? TRANSLATIONS.en[key] ?? key;
  for (const [k, v] of Object.entries(params)) {
    s = s.split(`{${k}}`).join(String(v));
  }
  return s;
}

export function initI18n() {
  currentLang = detectLanguage();
  document.documentElement.lang = currentLang;
  applyToDom();
}

export function setLanguage(lang) {
  if (!SUPPORTED.includes(lang) || lang === currentLang) return;
  currentLang = lang;
  safeStorageSet(lang);
  document.documentElement.lang = lang;
  applyToDom();
}

export function applyToDom() {
  document.title = t('app.title');
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    el.textContent = t(el.dataset.i18n);
  });
  document.querySelectorAll('[data-i18n-title]').forEach((el) => {
    el.title = t(el.dataset.i18nTitle);
  });
  document.querySelectorAll('[data-i18n-aria]').forEach((el) => {
    el.setAttribute('aria-label', t(el.dataset.i18nAria));
  });
}
