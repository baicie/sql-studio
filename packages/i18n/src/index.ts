import enUS from './locales/en-US/common.json';
import zhCN from './locales/zh-CN/common.json';

export const resources = {
  'en-US': { common: enUS },
  'zh-CN': { common: zhCN },
} as const;

export type Locale = keyof typeof resources;
