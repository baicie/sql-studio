export const namespaces = [
  'common',
  'workbench',
  'connection',
  'editor',
  'result',
  'extension',
  'marketplace',
  'settings',
  'error',
] as const;

export type I18nNamespace = (typeof namespaces)[number];
