import { Blocks, Database, History, Settings } from 'lucide-react';

import type { ActivityItem, BottomPanelItem } from './types';

export const ACTIVITY_ITEMS: ActivityItem[] = [
  {
    id: 'connections',
    title: 'Connections',
    icon: Database,
  },
  {
    id: 'extensions',
    title: 'Extensions',
    icon: Blocks,
  },
  {
    id: 'history',
    title: 'History',
    icon: History,
  },
  {
    id: 'settings',
    title: 'Settings',
    icon: Settings,
  },
];

export const BOTTOM_PANEL_ITEMS: BottomPanelItem[] = [
  {
    id: 'results',
    title: 'Results',
  },
  {
    id: 'problems',
    title: 'Problems',
  },
  {
    id: 'logs',
    title: 'Logs',
  },
];
