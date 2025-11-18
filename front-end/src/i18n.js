import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import pt from './locales/pt.json';
import en from './locales/en.json';

const resources = {
  pt: {
    translation: pt,
  },
  en: {
    translation: en,
  },
};

const getInitialLanguage = () => {
  if (typeof window === 'undefined') {
    return 'pt';
  }
  return localStorage.getItem('catbio-lang') || 'pt';
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: getInitialLanguage(),
    fallbackLng: 'pt',
    interpolation: {
      escapeValue: false,
    },
    returnObjects: true,
  });

export default i18n;
