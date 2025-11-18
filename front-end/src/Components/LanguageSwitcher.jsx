import React from 'react';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../contexts/LanguageContext';
import './LanguageSwitcher.css';

const LanguageSwitcher = () => {
  const { language, toggleLanguage } = useLanguage();
  const { t } = useTranslation();

  return (
    <button
      type="button"
      className="language-switcher"
      onClick={toggleLanguage}
      aria-label={t('language.toggle')}
    >
      <span>{language === 'pt' ? 'PT' : 'EN'}</span>
    </button>
  );
};

export default LanguageSwitcher;
