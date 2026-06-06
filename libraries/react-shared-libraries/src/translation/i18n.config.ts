// Default/UK-first language is English. Polish (and others) are still
// auto-detected per-user from the browser / Accept-Language and the in-app
// switcher — language is per-USER, not per-domain.
export const fallbackLng = 'en';
export const languages = [
  fallbackLng,
  'pl',
  'he',
  'ru',
  'zh',
  'fr',
  'es',
  'pt',
  'de',
  'it',
  'ja',
  'ko',
  'ar',
  'tr',
  'vi',
];

export const defaultNS = 'translation';
export const cookieName = 'i18next';
export const headerName = 'x-i18next-current-language';
