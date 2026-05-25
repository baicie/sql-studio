import type { StorageProvider } from './types';

const STORAGE_PREFIX = 'sqlgui';

export class LocalStorageProvider implements StorageProvider {
  async get<T>(key: string): Promise<T | undefined> {
    const raw = localStorage.getItem(this._namespacedKey(key));

    if (raw === null) {
      return undefined;
    }

    return JSON.parse(raw) as T;
  }

  async set<T>(key: string, value: T): Promise<void> {
    localStorage.setItem(this._namespacedKey(key), JSON.stringify(value));
  }

  async delete(key: string): Promise<void> {
    localStorage.removeItem(this._namespacedKey(key));
  }

  async keys(prefix?: string): Promise<string[]> {
    const keys: string[] = [];
    const normalizedPrefix = prefix ? this._namespacedKey(prefix) : `${STORAGE_PREFIX}:`;

    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);

      if (key && key.startsWith(normalizedPrefix)) {
        keys.push(key.slice(`${STORAGE_PREFIX}:`.length));
      }
    }

    return keys;
  }

  private _namespacedKey(key: string) {
    if (key.startsWith(`${STORAGE_PREFIX}:`)) {
      return key;
    }

    return `${STORAGE_PREFIX}:${key}`;
  }
}
