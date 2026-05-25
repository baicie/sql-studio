import { create } from 'zustand';

import type { NotificationItem } from './types';

interface NotificationStore {
  items: NotificationItem[];
  push: (item: NotificationItem) => void;
  remove: (id: string) => void;
  clear: () => void;
}

export const useNotificationStore = create<NotificationStore>((set) => ({
  items: [],

  push: (item) => {
    set((state) => ({
      items: state.items.concat(item),
    }));
  },

  remove: (id) => {
    set((state) => ({
      items: state.items.filter((item) => item.id !== id),
    }));
  },

  clear: () => {
    set({ items: [] });
  },
}));
