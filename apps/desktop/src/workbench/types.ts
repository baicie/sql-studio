import type { ComponentType } from 'react';

export type ActivityId = 'connections' | 'extensions' | 'history' | 'settings';

export type BottomPanelId = 'results' | 'problems' | 'logs';

export type ThemeMode = 'light' | 'dark' | 'system';

export type SqlEditorKind2 = 'welcome' | 'query' | 'readonly';

export interface EditorTab {
  id: string;
  title: string;
  kind: SqlEditorKind2;

  connectionId?: string;
  database?: string;
  schema?: string;

  content?: string;
  language?: string;

  dirty?: boolean;
  readonly?: boolean;

  createdAt?: number;
  updatedAt?: number;

  source?: {
    type: 'connection-tree' | 'history' | 'manual' | 'plugin';
    nodeId?: string;
  };
}

export interface SqlEditorTab extends EditorTab {
  kind: 'query' | 'readonly';
  content: string;
  language: 'sql';
  dirty: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface ActivityItem {
  id: ActivityId;
  title?: string;
  titleKey?: string;
  icon: ComponentType<{
    className?: string;
  }>;
}

export interface BottomPanelItem {
  id: BottomPanelId;
  title?: string;
  titleKey?: string;
}
