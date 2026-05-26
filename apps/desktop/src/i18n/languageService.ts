import type { SupportedLanguage } from '@sqlgui/i18n';
import { changeLanguage } from './initI18n';
import { saveLanguage } from './detectLanguage';
import { useLanguageStore } from './languageStore';

export const languageService = {
  getCurrentLanguage() {
    return useLanguageStore.getState().language;
  },

  async setLanguage(language: SupportedLanguage) {
    await changeLanguage(language);
    saveLanguage(language);
    useLanguageStore.getState().setLanguage(language);
  },
};
