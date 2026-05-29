import { LocalStorageProvider } from './local-storage-provider';
import type { ScopedStorage, StorageProvider } from './types';

export class StorageService {
  constructor(private readonly _provider: StorageProvider = new LocalStorageProvider()) {}

  getItem(key: string): string | null {
    const raw = localStorage.getItem(this._namespacedKey(key));

    if (raw === null) {
      return null;
    }

    try {
      return JSON.parse(raw) as string;
    } catch {
      return raw;
    }
  }

  setItem(key: string, value: string) {
    void this._provider.set(key, value);
  }

  removeItem(key: string) {
    void this._provider.delete(key);
  }

  async get<T>(key: string, defaultValue?: T): Promise<T | undefined> {
    const value = await this._provider.get<T>(key);
    return value === undefined ? defaultValue : value;
  }

  async set<T>(key: string, value: T): Promise<void> {
    await this._provider.set(key, value);
  }

  async delete(key: string): Promise<void> {
    await this._provider.delete(key);
  }

  async keys(prefix?: string): Promise<string[]> {
    return this._provider.keys(prefix);
  }

  getJSON<T>(key: string): T | null {
    const raw = localStorage.getItem(this._namespacedKey(key));

    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  setJSON<T>(key: string, value: T) {
    void this._provider.set(key, value);
  }

  scope(namespace: string) {
    return {
      getItem: (key: string) => this.getItem(`${namespace}/${key}`),
      setItem: (key: string, value: string) => this.setItem(`${namespace}/${key}`, value),
      removeItem: (key: string) => this.removeItem(`${namespace}/${key}`),
      getJSON: <T>(key: string) => this.getJSON<T>(`${namespace}/${key}`),
      setJSON: <T>(key: string, value: T) => this.setJSON(`${namespace}/${key}`, value),
    };
  }

  scoped(namespace: string): ScopedStorage {
    return {
      get: <T>(key: string, defaultValue?: T) => this.get<T>(`${namespace}/${key}`, defaultValue),
      set: <T>(key: string, value: T) => this.set(`${namespace}/${key}`, value),
      delete: (key: string) => this.delete(`${namespace}/${key}`),
    };
  }

  private _namespacedKey(key: string) {
    const prefix = 'sqlgui';

    if (key.startsWith(`${prefix}:`)) {
      return key;
    }

    return `${prefix}:${key}`;
  }
}

export const storageService = new StorageService();

let _appStorage: ReturnType<typeof storageService.scope> | null = null;

function getAppStorage(): ReturnType<typeof storageService.scope> {
  if (!_appStorage) {
    _appStorage = storageService.scope('app');
  }
  return _appStorage;
}

export const appStorage = {
  get getItem() {
    return getAppStorage().getItem;
  },
  get setItem() {
    return getAppStorage().setItem;
  },
  get removeItem() {
    return getAppStorage().removeItem;
  },
  get getJSON() {
    return getAppStorage().getJSON;
  },
  get setJSON() {
    return getAppStorage().setJSON;
  },
};
