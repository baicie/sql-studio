const STORAGE_PREFIX = 'sqlgui';

class StorageService {
  getItem(key: string): string | null {
    return localStorage.getItem(this._namespacedKey(key));
  }

  setItem(key: string, value: string) {
    localStorage.setItem(this._namespacedKey(key), value);
  }

  removeItem(key: string) {
    localStorage.removeItem(this._namespacedKey(key));
  }

  getJSON<T>(key: string): T | null {
    const value = this.getItem(key);

    if (!value) {
      return null;
    }

    try {
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  }

  setJSON<T>(key: string, value: T) {
    this.setItem(key, JSON.stringify(value));
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

  private _namespacedKey(key: string) {
    if (key.startsWith(`${STORAGE_PREFIX}:`)) {
      return key;
    }

    return `${STORAGE_PREFIX}:${key}`;
  }
}

export const storageService = new StorageService();

export const appStorage = storageService.scope('app');
