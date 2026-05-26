import commonZh from './locales/zh-CN/common.json';
import workbenchZh from './locales/zh-CN/workbench.json';
import connectionZh from './locales/zh-CN/connection.json';
import editorZh from './locales/zh-CN/editor.json';
import resultZh from './locales/zh-CN/result.json';
import extensionZh from './locales/zh-CN/extension.json';
import marketplaceZh from './locales/zh-CN/marketplace.json';
import settingsZh from './locales/zh-CN/settings.json';
import errorZh from './locales/zh-CN/error.json';

import commonEn from './locales/en-US/common.json';
import workbenchEn from './locales/en-US/workbench.json';
import connectionEn from './locales/en-US/connection.json';
import editorEn from './locales/en-US/editor.json';
import resultEn from './locales/en-US/result.json';
import extensionEn from './locales/en-US/extension.json';
import marketplaceEn from './locales/en-US/marketplace.json';
import settingsEn from './locales/en-US/settings.json';
import errorEn from './locales/en-US/error.json';

export const resources = {
  'zh-CN': {
    common: commonZh,
    workbench: workbenchZh,
    connection: connectionZh,
    editor: editorZh,
    result: resultZh,
    extension: extensionZh,
    marketplace: marketplaceZh,
    settings: settingsZh,
    error: errorZh,
  },
  'en-US': {
    common: commonEn,
    workbench: workbenchEn,
    connection: connectionEn,
    editor: editorEn,
    result: resultEn,
    extension: extensionEn,
    marketplace: marketplaceEn,
    settings: settingsEn,
    error: errorEn,
  },
} as const;
