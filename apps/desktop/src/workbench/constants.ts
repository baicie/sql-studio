import { Blocks, Database, History, Settings } from 'lucide-react';

import type { ActivityItem, BottomPanelItem } from './types';

export const ACTIVITY_ITEMS: ActivityItem[] = [
  {
    id: 'connections',
    titleKey: 'activityBar.connections',
    icon: Database,
  },
  {
    id: 'extensions',
    titleKey: 'activityBar.extensions',
    icon: Blocks,
  },
  {
    id: 'history',
    titleKey: 'activityBar.history',
    icon: History,
  },
  {
    id: 'settings',
    titleKey: 'activityBar.settings',
    icon: Settings,
  },
];

export const BOTTOM_PANEL_ITEMS: BottomPanelItem[] = [
  {
    id: 'results',
    titleKey: 'panel.results',
  },
  {
    id: 'problems',
    titleKey: 'panel.problems',
  },
  {
    id: 'terminal',
    titleKey: 'panel.terminal',
  },
];
