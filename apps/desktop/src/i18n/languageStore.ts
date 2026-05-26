import { create } from 'zustand';
import type { SupportedLanguage } from '@sqlgui/i18n';
import { detectInitialLanguage } from './detectLanguage';

interface LanguageStore {
  language: SupportedLanguage;
  setLanguage: (language: SupportedLanguage) => void;
}

export const useLanguageStore = create<LanguageStore>((set) => ({
  language: detectInitialLanguage(),

  setLanguage: (language) =>
    set({
      language,
    }),
}));
