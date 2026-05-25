import { create } from 'zustand';

import type { LogItem } from './types';

interface LogStore {
  items: LogItem[];
  push: (item: LogItem) => void;
  clear: () => void;
}

export const useLogStore = create<LogStore>((set) => ({
  items: [],

  push: (item) => {
    set((state) => ({
      items: state.items.concat(item).slice(-1000),
    }));
  },

  clear: () => {
    set({ items: [] });
  },
}));
