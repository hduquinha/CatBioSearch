import { createContext, useContext, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

const LanguageContext = createContext();

const STORAGE_KEY = 'catbio-lang';

export const LanguageProvider = ({ children }) => {
  const { i18n } = useTranslation();
  const initialLanguage = i18n.language || 'pt';
  const [language, setLanguage] = useState(initialLanguage);

  const updateLanguage = (nextLanguage) => {
    i18n.changeLanguage(nextLanguage);
    setLanguage(nextLanguage);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, nextLanguage);
    }
  };

  const toggleLanguage = () => {
    updateLanguage(language === 'pt' ? 'en' : 'pt');
  };

  const value = useMemo(
    () => ({ language, setLanguage: updateLanguage, toggleLanguage }),
    [language]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useLanguage = () => useContext(LanguageContext);
