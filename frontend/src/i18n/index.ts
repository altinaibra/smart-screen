import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import sq from './locales/sq.json';

export const languages = [
  { code: 'sq', label: 'Shqip' },
  { code: 'en', label: 'English' },
] as const;

export type Language = (typeof languages)[number]['code'];

const STORAGE_KEY = 'ss_lang';

function savedLanguage(): Language {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'sq' || saved === 'en') return saved;
  } catch { /* localStorage i bllokuar */ }
  return 'sq';
}

i18n.use(initReactI18next).init({
  resources: { sq: { translation: sq }, en: { translation: en } },
  lng: savedLanguage(),
  fallbackLng: 'sq',
  interpolation: { escapeValue: false }, // React e mbron vetë nga XSS
});

document.documentElement.lang = i18n.language;

/** Ndërron gjuhën e panelit dhe e mban mend për herën tjetër. */
export function changeLanguage(lang: Language) {
  try { localStorage.setItem(STORAGE_KEY, lang); } catch { /* ignore */ }
  document.documentElement.lang = lang;
  return i18n.changeLanguage(lang);
}

/** Kodi i gjuhës për datat/numrat (Intl). */
export const locale = () => (i18n.language === 'en' ? 'en-GB' : 'sq-AL');

export default i18n;
