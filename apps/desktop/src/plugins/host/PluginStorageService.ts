const STORAGE_PREFIX = 'sqlgui.plugin.storage';

class PluginStorageService {
  private createKey(extensionId: string, scope: 'global' | 'workspace', key: string) {
    return `${STORAGE_PREFIX}.${extensionId}.${scope}.${key}`;
  }

  get<T>(
    extensionId: string,
    scope: 'global' | 'workspace',
    key: string,
    defaultValue?: T,
  ): T | undefined {
    const raw = localStorage.getItem(this.createKey(extensionId, scope, key));

    if (raw === null) return defaultValue;

    try {
      return JSON.parse(raw) as T;
    } catch {
      return defaultValue;
    }
  }

  set<T>(extensionId: string, scope: 'global' | 'workspace', key: string, value: T) {
    localStorage.setItem(this.createKey(extensionId, scope, key), JSON.stringify(value));
  }

  delete(extensionId: string, scope: 'global' | 'workspace', key: string) {
    localStorage.removeItem(this.createKey(extensionId, scope, key));
  }

  keys(extensionId: string, scope: 'global' | 'workspace') {
    const prefix = `${STORAGE_PREFIX}.${extensionId}.${scope}.`;

    return Object.keys(localStorage)
      .filter((key) => key.startsWith(prefix))
      .map((key) => key.slice(prefix.length));
  }

  clear(extensionId: string, scope: 'global' | 'workspace') {
    const prefix = `${STORAGE_PREFIX}.${extensionId}.${scope}.`;

    for (const key of Object.keys(localStorage)) {
      if (key.startsWith(prefix)) {
        localStorage.removeItem(key);
      }
    }
  }
}

export const pluginStorageService = new PluginStorageService();
