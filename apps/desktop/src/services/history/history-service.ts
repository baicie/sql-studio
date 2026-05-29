import { appStorage } from '../storage/storage-service';
import { extend } from '@sqlgui/utils';

const HISTORY_KEY = 'query_history';
const MAX_HISTORY = 100;

export interface HistoryEntry {
  id: string;
  connectionId: string;
  connectionName: string;
  sql: string;
  status: 'success' | 'error';
  elapsedMs: number;
  startedAt: number;
  finishedAt: number;
  errorMessage?: string;
}

export interface HistoryStorage {
  getJSON<T>(key: string): T | null;
  setJSON<T>(key: string, value: T): void;
}

export interface HistoryService {
  getHistory(): HistoryEntry[];
  addEntry(entry: Omit<HistoryEntry, 'id'>): void;
  clearHistory(): void;
  deleteEntry(id: string): void;
  subscribe(listener: () => void): () => void;
}

type Listener = () => void;

export function createHistoryService(storage: HistoryStorage = appStorage): HistoryService {
  let _history: HistoryEntry[] = storage.getJSON<HistoryEntry[]>(HISTORY_KEY) ?? [];
  const listeners = new Set<Listener>();
  let _cachedSnapshot: HistoryEntry[] = _history.slice();

  function notify() {
    listeners.forEach((l) => l());
  }

  function persist() {
    storage.setJSON(HISTORY_KEY, _history);
  }

  return {
    getHistory() {
      return _cachedSnapshot;
    },

    addEntry(entry: Omit<HistoryEntry, 'id'>) {
      const newEntry: HistoryEntry = extend(entry, {
        id: `hist-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      });
      _history = [newEntry, ..._history].slice(0, MAX_HISTORY);
      _cachedSnapshot = _history.slice();
      persist();
      notify();
    },

    clearHistory() {
      _history = [];
      _cachedSnapshot = [];
      persist();
      notify();
    },

    deleteEntry(id: string) {
      _history = _history.filter((e) => e.id !== id);
      _cachedSnapshot = _history.slice();
      persist();
      notify();
    },

    subscribe(listener: Listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

let _singleton: HistoryService | null = null;

function getSingleton(): HistoryService {
  if (!_singleton) {
    _singleton = createHistoryService();
  }
  return _singleton;
}

export const historyService: HistoryService = {
  get getHistory() {
    return getSingleton().getHistory;
  },
  get addEntry() {
    return getSingleton().addEntry;
  },
  get clearHistory() {
    return getSingleton().clearHistory;
  },
  get deleteEntry() {
    return getSingleton().deleteEntry;
  },
  get subscribe() {
    return getSingleton().subscribe;
  },
};
