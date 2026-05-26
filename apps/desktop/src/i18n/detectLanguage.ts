import { type SupportedLanguage, supportedLanguages } from '@sqlgui/i18n';

const STORAGE_KEY = 'sqlgui.language';

export function detectInitialLanguage(): SupportedLanguage {
  const saved = localStorage.getItem(STORAGE_KEY);

  if (isSupportedLanguage(saved)) {
    return saved;
  }

  const browserLanguage = navigator.language;

  if (isSupportedLanguage(browserLanguage)) {
    return browserLanguage;
  }

  if (browserLanguage.startsWith('zh')) {
    return 'zh-CN';
  }

  return 'en-US';
}

export function isSupportedLanguage(value: unknown): value is SupportedLanguage {
  return typeof value === 'string' && supportedLanguages.includes(value as SupportedLanguage);
}

export function saveLanguage(language: SupportedLanguage) {
  localStorage.setItem(STORAGE_KEY, language);
}
