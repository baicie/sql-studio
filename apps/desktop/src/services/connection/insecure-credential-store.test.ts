import { describe, expect, it } from 'vitest';
import { createInsecureCredentialStore } from './insecure-credential-store';

interface MemoryStorage {
  getJSON<T>(key: string): T | null;
  setJSON<T>(key: string, value: T): void;
}

function createMemoryStorage(): MemoryStorage {
  const data = new Map<string, unknown>();

  return {
    getJSON<T>(key: string): T | null {
      return (data.get(key) as T | undefined) ?? null;
    },
    setJSON<T>(key: string, value: T): void {
      data.set(key, value);
    },
  };
}

describe('insecureCredentialStore', () => {
  it('saves and retrieves credential by connection id', async () => {
    const store = createInsecureCredentialStore(createMemoryStorage());

    await store.save('conn-1', 'secret');
    expect(await store.get('conn-1')).toBe('secret');
    expect(await store.has('conn-1')).toBe(true);
  });

  it('updates existing credential', async () => {
    const store = createInsecureCredentialStore(createMemoryStorage());

    await store.save('conn-1', 'secret1');
    await store.save('conn-1', 'secret2');

    expect(await store.get('conn-1')).toBe('secret2');
    expect(await store.has('conn-1')).toBe(true);
  });

  it('deletes credential by connection id', async () => {
    const store = createInsecureCredentialStore(createMemoryStorage());

    await store.save('conn-1', 'secret');
    expect(await store.get('conn-1')).toBe('secret');

    await store.delete('conn-1');
    expect(await store.get('conn-1')).toBeNull();
    expect(await store.has('conn-1')).toBe(false);
  });

  it('returns null for non-existent credential', async () => {
    const store = createInsecureCredentialStore(createMemoryStorage());

    expect(await store.get('non-existent')).toBeNull();
    expect(await store.has('non-existent')).toBe(false);
  });

  it('clears all credentials', async () => {
    const store = createInsecureCredentialStore(createMemoryStorage());

    await store.save('conn-1', 'secret1');
    await store.save('conn-2', 'secret2');
    await store.clear();

    expect(await store.get('conn-1')).toBeNull();
    expect(await store.get('conn-2')).toBeNull();
    expect(await store.has('conn-1')).toBe(false);
    expect(await store.has('conn-2')).toBe(false);
  });

  it('does not persist password in profile storage key', async () => {
    const storage = createMemoryStorage();
    const store = createInsecureCredentialStore(storage);

    await store.save('conn-1', 'secret');

    // Credential is stored under 'insecure_credentials', not 'credentials'
    expect(storage.getJSON('insecure_credentials')).not.toBeNull();
    expect(storage.getJSON('credentials')).toBeNull();
  });
});
