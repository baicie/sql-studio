import type { ExtensionManifest } from '@sqlgui/extension-schema';

export const demoExtensionManifest: ExtensionManifest = {
  name: 'sql-formatter-demo',
  displayName: 'SQL Formatter Demo',
  publisher: 'baicie',
  version: '0.1.0',
  description: 'A demo extension that contributes a SQL format command.',
  main: 'dist/extension.js',
  engines: { sqlgui: '^0.1.0' },
  categories: ['Formatter'],
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
          title: 'Format SQL',
          when: 'editorLang == sql',
          order: 5,
        },
      ],
    },
    keybindings: [
      {
        command: 'sql.format',
        key: 'mod+shift+f',
        when: 'activeEditorKind == query',
      },
    ],
  },
};
