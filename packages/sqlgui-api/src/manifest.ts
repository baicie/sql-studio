export type ExtensionActivationEvent =
  | '*'
  | 'onStartupFinished'
  | `onCommand:${string}`
  | `onView:${string}`
  | `onDbKind:${string}`
  | `onLanguage:${string}`;

export type ExtensionPermission =
  | 'editor.read'
  | 'editor.write'
  | 'storage.local'
  | 'ui.notification'
  | 'db.connection.read'
  | 'db.schema.read'
  | 'db.query.read'
  | 'db.query.write'
  | 'db.query.explain'
  | 'network.fetch'
  | 'clipboard.read'
  | 'clipboard.write';

export interface ExtensionManifest {
  name: string;
  displayName?: string;
  publisher: string;
  version: string;
  description?: string;
  main?: string;
  icon?: string;
  engines?: {
    sqlgui?: string;
  };
  categories?: string[];
  activationEvents?: ExtensionActivationEvent[];
  permissions?: ExtensionPermission[];
  contributes?: ExtensionContributions;
}

export interface ExtensionContributions {
  commands?: CommandContribution[];
  menus?: Record<string, MenuContribution[]>;
  keybindings?: KeybindingContribution[];
  views?: ViewContributionMap;
  snippets?: SnippetContribution[];
  themes?: ThemeContribution[];
  configuration?: ConfigurationContribution;
}

export interface CommandContribution {
  command: string;
  title: string;
  category?: string;
  icon?: string;
  enablement?: string;
}

export interface MenuContribution {
  command: string;
  title?: string;
  when?: string;
  group?: string;
}

export interface KeybindingContribution {
  command: string;
  key: string;
  mac?: string;
  win?: string;
  linux?: string;
  when?: string;
}

export interface ViewContributionMap {
  activityBar?: ViewContribution[];
  sideBar?: ViewContribution[];
  panel?: ViewContribution[];
}

export interface ViewContribution {
  id: string;
  name: string;
  icon?: string;
  when?: string;
}

export interface SnippetContribution {
  language: 'sql';
  path: string;
}

export interface ThemeContribution {
  id: string;
  label: string;
  path: string;
  uiTheme?: 'dark' | 'light';
}

export interface ConfigurationContribution {
  title?: string;
  properties: Record<string, ConfigurationProperty>;
}

export interface ConfigurationProperty {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  default?: unknown;
  description?: string;
  enum?: unknown[];
}
