import type { Event } from './event';

export interface I18nApi {
  readonly language: string;

  readonly onDidChangeLanguage: Event<string>;

  t(key: string, params?: Record<string, unknown>): string;
}
