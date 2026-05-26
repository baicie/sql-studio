import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { type SupportedLanguage, namespaces, resources } from '@sqlgui/i18n';
import { detectInitialLanguage } from './detectLanguage';

export async function initI18n() {
  const lng = detectInitialLanguage();

  await i18n.use(initReactI18next).init({
    resources,
    lng,
    fallbackLng: 'en-US',
    supportedLngs: ['zh-CN', 'en-US'],
    ns: [...namespaces],
    defaultNS: 'common',

    interpolation: {
      escapeValue: false,
    },

    returnNull: false,
    returnEmptyString: false,

    react: {
      useSuspense: false,
    },
  });

  return i18n;
}

export async function changeLanguage(language: SupportedLanguage) {
  await i18n.changeLanguage(language);
}
