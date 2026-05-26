export const supportedLanguages = ['zh-CN', 'en-US'] as const;

export type SupportedLanguage = (typeof supportedLanguages)[number];

export interface LanguageOption {
  value: SupportedLanguage;
  label: string;
  nativeLabel: string;
}

export const languageOptions: LanguageOption[] = [
  {
    value: 'zh-CN',
    label: 'Chinese Simplified',
    nativeLabel: '简体中文',
  },
  {
    value: 'en-US',
    label: 'English',
    nativeLabel: 'English',
  },
];
