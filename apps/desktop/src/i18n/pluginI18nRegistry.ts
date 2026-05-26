import i18n from 'i18next';
import type { SupportedLanguage } from '@sqlgui/i18n';

export const pluginI18nRegistry = {
  registerPluginResources(
    extensionId: string,
    language: SupportedLanguage,
    resources: Record<string, string>,
  ) {
    const namespace = createPluginNamespace(extensionId);

    i18n.addResourceBundle(language, namespace, resources, true, true);
  },

  translatePluginText(extensionId: string, text: string) {
    if (!isI18nPlaceholder(text)) {
      return text;
    }

    const key = text.slice(1, -1);
    const namespace = createPluginNamespace(extensionId);

    return i18n.t(`${namespace}:${key}`, {
      defaultValue: key,
    });
  },
};

function createPluginNamespace(extensionId: string) {
  return `plugin.${extensionId}`;
}

function isI18nPlaceholder(value: string) {
  return value.startsWith('%') && value.endsWith('%');
}
