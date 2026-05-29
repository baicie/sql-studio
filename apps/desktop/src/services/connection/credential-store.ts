import { appStorage } from '../storage/storage-service';

const CREDENTIALS_KEY = 'credentials';

interface CredentialEntry {
  connectionId: string;
  password: string;
}

interface CredentialStore {
  save(connectionId: string, password: string): void;
  get(connectionId: string): string | null;
  delete(connectionId: string): void;
  has(connectionId: string): boolean;
  getConnectionIds(): string[];
  clear(): void;
}

function createCredentialStore(): CredentialStore {
  function load(): CredentialEntry[] {
    return appStorage.getJSON<CredentialEntry[]>(CREDENTIALS_KEY) ?? [];
  }

  function saveAll(entries: CredentialEntry[]) {
    appStorage.setJSON(CREDENTIALS_KEY, entries);
  }

  return {
    save(connectionId: string, password: string) {
      const entries = load();
      const existing = entries.findIndex((e) => e.connectionId === connectionId);
      if (existing >= 0) {
        entries[existing] = { connectionId, password };
      } else {
        entries.push({ connectionId, password });
      }
      saveAll(entries);
    },

    get(connectionId: string): string | null {
      const entries = load();
      return entries.find((e) => e.connectionId === connectionId)?.password ?? null;
    },

    delete(connectionId: string) {
      const entries = load().filter((e) => e.connectionId !== connectionId);
      saveAll(entries);
    },

    has(connectionId: string): boolean {
      return load().some((e) => e.connectionId === connectionId);
    },

    getConnectionIds(): string[] {
      return load().map((e) => e.connectionId);
    },

    clear() {
      saveAll([]);
    },
  };
}

export const credentialStore = createCredentialStore();
