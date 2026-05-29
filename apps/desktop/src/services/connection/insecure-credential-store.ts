import { appStorage } from '../storage/storage-service';
import type { CredentialStore } from './credential-types';

const CREDENTIALS_KEY = 'insecure_credentials';

interface CredentialEntry {
  connectionId: string;
  password: string;
}

interface AppStorageLike {
  getJSON<T>(key: string): T | null;
  setJSON<T>(key: string, value: T): void;
}

/**
 * MVP fallback only.
 *
 * This store persists passwords in appStorage and is NOT secure.
 * Prefer nativeCredentialStore when available.
 */
export function createInsecureCredentialStore(
  storage: AppStorageLike = appStorage,
): CredentialStore {
  function load(): CredentialEntry[] {
    return storage.getJSON<CredentialEntry[]>(CREDENTIALS_KEY) ?? [];
  }

  function saveAll(entries: CredentialEntry[]) {
    storage.setJSON(CREDENTIALS_KEY, entries);
  }

  return {
    async save(connectionId, password) {
      const entries = load();
      const existing = entries.findIndex((entry) => entry.connectionId === connectionId);

      if (existing >= 0) {
        entries[existing] = { connectionId, password };
      } else {
        entries.push({ connectionId, password });
      }

      saveAll(entries);
    },

    async get(connectionId) {
      return load().find((entry) => entry.connectionId === connectionId)?.password ?? null;
    },

    async delete(connectionId) {
      saveAll(load().filter((entry) => entry.connectionId !== connectionId));
    },

    async has(connectionId) {
      return load().some((entry) => entry.connectionId === connectionId);
    },

    async clear() {
      saveAll([]);
    },
  };
}

export const insecureCredentialStore = createInsecureCredentialStore();
