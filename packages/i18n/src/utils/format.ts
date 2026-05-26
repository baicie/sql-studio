import type { SupportedLanguage } from '../types';

export function formatDateTime(value: number | Date, language: SupportedLanguage) {
  return new Intl.DateTimeFormat(language, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(value);
}

export function formatNumber(value: number, language: SupportedLanguage) {
  return new Intl.NumberFormat(language).format(value);
}
