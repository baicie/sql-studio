import { useTranslation } from 'react-i18next';
import type { I18nNamespace } from '@sqlgui/i18n';

export function useAppTranslation(namespace?: I18nNamespace) {
  return useTranslation(namespace);
}
