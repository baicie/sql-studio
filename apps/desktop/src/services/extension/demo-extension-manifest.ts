import type { ExtensionManifest } from '@sqlgui/extension-schema';

export const demoExtensionManifest: ExtensionManifest = {
  name: 'sql-formatter-demo',
  displayName: 'SQL Formatter Demo',
  publisher: 'baicie',
  version: '0.1.0',
  main: 'dist/extension.js',
  activationEvents: ['onCommand:sql.format'],
  permissions: ['editor.read', 'editor.write', 'ui.notification'],
  contributes: {
    commands: [
      {
        command: 'sql.format',
        title: 'Format SQL',
        category: 'SQL',
      },
    ],
    menus: {
      'editor/context': [
        {
          command: 'sql.format',
          when: 'editorLang == sql',
        },
      ],
    },
  },
};
