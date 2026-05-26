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

export const ALLOWED_PERMISSIONS: ExtensionPermission[] = [
  'editor.read',
  'editor.write',
  'storage.local',
  'ui.notification',
  'db.connection.read',
  'db.schema.read',
  'db.query.read',
  'db.query.write',
  'db.query.explain',
  'network.fetch',
  'clipboard.read',
  'clipboard.write',
];

export type MenuLocation =
  | 'commandPalette'
  | 'activity/title'
  | 'editor/title'
  | 'editor/context'
  | 'connection/context'
  | 'result/context'
  | 'statusBar/context'
  | 'welcome/actions'
  | 'connections/toolbar'
  | 'connections/item';

export const ALLOWED_MENU_LOCATIONS: MenuLocation[] = [
  'commandPalette',
  'activity/title',
  'editor/title',
  'editor/context',
  'connection/context',
  'result/context',
  'statusBar/context',
  'welcome/actions',
  'connections/toolbar',
  'connections/item',
];

export interface CommandContribution {
  command: string;
  title: string;
  category?: string;
  icon?: string;
}

export interface MenuContribution {
  command: string;
  title?: string;
  when?: string;
  group?: string;
  order?: number;
}

export interface KeybindingContribution {
  command: string;
  key: string;
  mac?: string;
  win?: string;
  linux?: string;
  when?: string;
}

export interface ExtensionContributes {
  commands?: CommandContribution[];
  menus?: Partial<Record<MenuLocation, MenuContribution[]>>;
  keybindings?: KeybindingContribution[];
  views?: ViewContributionMap;
}

export type ViewContributionLocation = 'activityBar' | 'sideBar' | 'panel';

export interface ViewContribution {
  id: string;
  name: string;
  icon?: string;
  when?: string;
}

export interface ViewContributionMap {
  activityBar?: ViewContribution[];
  sideBar?: ViewContribution[];
  panel?: ViewContribution[];
}

export interface ExtensionEngines {
  sqlgui?: string;
}

export interface ExtensionManifest {
  name: string;
  displayName?: string;
  publisher: string;
  version: string;
  description?: string;
  main?: string;
  icon?: string;
  engines?: ExtensionEngines;
  categories?: string[];
  activationEvents?: ExtensionActivationEvent[];
  permissions?: ExtensionPermission[];
  contributes?: ExtensionContributes;
}
