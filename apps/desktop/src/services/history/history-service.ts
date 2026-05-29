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

export interface HistoryService {
  getHistory(): HistoryEntry[];
  addEntry(entry: Omit<HistoryEntry, 'id'>): void;
  clearHistory(): void;
  deleteEntry(id: string): void;
  subscribe(listener: () => void): () => void;
}

type Listener = () => void;

function createHistoryService(): HistoryService {
  let _history: HistoryEntry[] = appStorage.getJSON<HistoryEntry[]>(HISTORY_KEY) ?? [];
  const listeners = new Set<Listener>();

  function notify() {
    listeners.forEach((l) => l());
  }

  function persist() {
    appStorage.setJSON(HISTORY_KEY, _history);
  }

  return {
    getHistory() {
      return _history.slice();
    },

    addEntry(entry: Omit<HistoryEntry, 'id'>) {
      const newEntry: HistoryEntry = extend(entry, {
        id: `hist-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      });
      _history = [newEntry, ..._history].slice(0, MAX_HISTORY);
      persist();
      notify();
    },

    clearHistory() {
      _history = [];
      persist();
      notify();
    },

    deleteEntry(id: string) {
      _history = _history.filter((e) => e.id !== id);
      persist();
      notify();
    },

    subscribe(listener: Listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

export const historyService = createHistoryService();
