import { create } from 'zustand';
import type {
  MarketplaceExtension,
  MarketplaceExtensionCategory,
  MarketplaceInstallState,
} from '../types';
import { marketplaceService } from '../services/marketplaceService';

interface MarketplaceStore {
  query: string;
  category: MarketplaceExtensionCategory | 'All';
  sortBy: 'relevance' | 'downloads' | 'updated' | 'name';

  loading: boolean;
  extensions: MarketplaceExtension[];
  selectedExtensionId?: string;

  installState: Record<string, MarketplaceInstallState>;

  setQuery: (query: string) => void;
  setCategory: (category: MarketplaceExtensionCategory | 'All') => void;
  setSortBy: (sortBy: MarketplaceStore['sortBy']) => void;
  setSelectedExtension: (extensionId?: string) => void;

  load: () => Promise<void>;

  setInstallState: (extensionId: string, patch: Partial<MarketplaceInstallState>) => void;

  getSelectedExtension: () => MarketplaceExtension | undefined;
}

export const useMarketplaceStore = create<MarketplaceStore>((set, get) => ({
  query: '',
  category: 'All',
  sortBy: 'relevance',

  loading: false,
  extensions: [],
  selectedExtensionId: undefined,

  installState: {},

  setQuery: (query) => {
    set({ query });
    void get().load();
  },

  setCategory: (category) => {
    set({ category });
    void get().load();
  },

  setSortBy: (sortBy) => {
    set({ sortBy });
    void get().load();
  },

  setSelectedExtension: (extensionId) =>
    set({
      selectedExtensionId: extensionId,
    }),

  load: async () => {
    const { query, category, sortBy } = get();

    set({ loading: true });

    try {
      const extensions = await marketplaceService.search({
        query,
        category,
        sortBy,
      });

      set({ extensions });
    } finally {
      set({ loading: false });
    }
  },

  setInstallState: (extensionId, patch) =>
    set((state) => {
      const prev = state.installState[extensionId];
      return {
        installState: Object.assign({}, state.installState, {
          [extensionId]: Object.assign(
            { extensionId, status: 'idle' } as MarketplaceInstallState,
            prev,
            patch,
          ),
        }),
      };
    }),

  getSelectedExtension: () => {
    const state = get();

    return state.extensions.find((item) => item.id === state.selectedExtensionId);
  },
}));
