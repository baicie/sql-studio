import type { ComponentType } from 'react';

export type ActivityId = 'connections' | 'extensions' | 'history' | 'settings';

export type BottomPanelId = 'results' | 'problems' | 'logs';

export type ThemeMode = 'light' | 'dark' | 'system';

export interface EditorTab {
  id: string;
  title: string;
  kind: 'welcome' | 'query' | 'extension';
  dirty?: boolean;
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
