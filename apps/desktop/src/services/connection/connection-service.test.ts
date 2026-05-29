import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mutable storage that our fake localStorage will use.
// We set this up BEFORE importing ConnectionService so the module picks it up.
const fakeStorage = new Map<string, string>();
const setItemCalls: Array<[string, string]> = [];

// Create a fake localStorage that stores to our Map and records calls
const fakeLocalStorage = {
  getItem(key: string): string | null {
    return fakeStorage.get(key) ?? null;
  },
  setItem(key: string, value: string): void {
    fakeStorage.set(key, value);
    setItemCalls.push([key, value]);
  },
  removeItem(key: string): void {
    fakeStorage.delete(key);
  },
  get length(): number {
    return fakeStorage.size;
  },
  key(index: number): string | null {
    return [...fakeStorage.keys()][index] ?? null;
  },
  clear(): void {
    fakeStorage.clear();
  },
} as unknown as Storage;

vi.mock('./insecure-credential-store', () => ({
  createInsecureCredentialStore: vi.fn(() => ({
    save: vi.fn(),
    get: vi.fn(),
    delete: vi.fn(),
    has: vi.fn(),
    clear: vi.fn(),
  })),
}));

vi.mock('@/services/db/dbService', () => ({
  dbService: {
    openConnection: vi.fn(async () => ({ connectionId: 'conn-1' })),
    closeConnection: vi.fn(async () => {}),
    testConnection: vi.fn(async () => {}),
  },
}));

describe('ConnectionService security', () => {
  beforeEach(() => {
    // Replace globalThis.localStorage before importing the module.
    // We MUST do this in beforeEach (not module top-level) so that
    // each test gets a fresh storage AND the spy is set up before
    // any dynamic import resolution.
    fakeStorage.clear();
    setItemCalls.length = 0;
    Object.defineProperty(globalThis, 'localStorage', {
      value: fakeLocalStorage,
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    // Restore so other tests aren't affected
    vi.restoreAllMocks();
  });

  it('addProfile persists profile WITHOUT password field', async () => {
    const { ConnectionService } = await import('./connection-service');
    const service = new ConnectionService();
    service.initialize();

    await service.addProfile({
      id: 'conn-1',
      name: 'Test SQLite',
      kind: 'SQLite',
      filePath: '/tmp/test.db',
      username: 'user',
      password: 'super-secret',
      rememberPassword: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    const connectionsCall = setItemCalls.find(([key]) => key.endsWith('connections'));
    expect(connectionsCall).toBeDefined();

    const stored = JSON.parse(connectionsCall![1]) as Array<Record<string, unknown>>;
    expect(stored).toHaveLength(1);
    expect(stored[0]).toMatchObject({
      id: 'conn-1',
      name: 'Test SQLite',
      kind: 'SQLite',
    });
    expect(stored[0]).not.toHaveProperty('password');
  });

  it('updateConnection persists profile WITHOUT password field', async () => {
    // Seed localStorage with an existing profile so updateConnection has something to update.
    // Key format: _namespacedKey('app/connections') => 'sqlgui:app/connections'
    fakeStorage.set(
      'sqlgui:app/connections',
      JSON.stringify([
        {
          id: 'conn-1',
          name: 'Original Name',
          kind: 'SQLite',
          filePath: '/tmp/test.db',
          rememberPassword: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ]),
    );

    const { ConnectionService } = await import('./connection-service');
    const service = new ConnectionService();
    service.initialize();

    await service.updateConnection({
      id: 'conn-1',
      name: 'Updated Name',
      kind: 'SQLite',
      filePath: '/tmp/test.db',
      password: 'should-not-persist',
      rememberPassword: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    const connectionsCall = setItemCalls.find(([key]) => key.endsWith('connections'));
    expect(connectionsCall).toBeDefined();

    const stored = JSON.parse(connectionsCall![1]) as Array<Record<string, unknown>>;
    expect(stored[0]).toMatchObject({ id: 'conn-1', name: 'Updated Name' });
    expect(stored[0]).not.toHaveProperty('password');
  });

  it('deleteConnection removes profile from storage', async () => {
    const { ConnectionService } = await import('./connection-service');
    const service = new ConnectionService();
    service.initialize();

    await service.deleteConnection('conn-1');

    const connectionsCall = setItemCalls.find(([key]) => key.endsWith('connections'));
    expect(connectionsCall).toBeDefined();

    const stored = JSON.parse(connectionsCall![1]) as Array<Record<string, unknown>>;
    expect(stored).toHaveLength(0);
  });
});
