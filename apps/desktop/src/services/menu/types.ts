import type { Disposable } from '@/lib/disposable';

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

export interface MenuContext {
  [key: string]: unknown;
}

export interface MenuItem {
  command: string;
  title?: string;
  titleKey?: string;
  when?: string;
  group?: string;
  order?: number;
  source: 'core' | 'plugin';
  extensionId?: string;
}

export interface MenuRegistration extends Disposable {}
