import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const callLog: string[] = [];

vi.mock('@/plugins/host/PluginHostManager', () => ({
  pluginHostManager: {
    deactivateExtension: vi.fn(),
    terminateAll: vi.fn(),
  },
}));

vi.mock('@/plugins/services/extensionInstallerService', () => ({
  extensionInstallerService: {
    installFromPackage: vi.fn(),
    installFromFolder: vi.fn(),
    uninstall: vi.fn(),
  },
}));

vi.mock('../notification/notification-service', () => ({
  notificationService: {
    info: vi.fn(),
    success: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('../storage/storage-service', () => ({
  appStorage: {
    getJSON: vi.fn(() => []),
    setJSON: vi.fn(),
  },
}));

vi.mock('./extension-scanner', () => ({
  scanExtensions: vi.fn(async () => {
    callLog.push('scan:start');
    await Promise.resolve();
    callLog.push('scan:end');
    return { extensions: [], errors: [] };
  }),
}));

vi.mock('./manifest-validator', () => ({
  validateManifest: vi.fn(() => ({ valid: true, warnings: [] })),
}));

vi.mock('@/plugins/permissions/PermissionStorage', () => ({
  permissionStorage: {
    revoke: vi.fn(),
  },
}));

vi.mock('@/plugins/contribution-registry', () => ({
  contributionRegistry: {
    registerExtension: vi.fn(),
    unregisterExtension: vi.fn(),
  },
}));

vi.mock('@/plugins/activation-registry', () => ({
  activationRegistry: {
    register: vi.fn(),
    clear: vi.fn(),
  },
}));

describe('ExtensionService', () => {
  beforeEach(() => {
    callLog.length = 0;
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('awaits scan before loading and activating extensions on reload', async () => {
    const { ExtensionService } = await import('./extension-service');

    const service = new ExtensionService();

    vi.spyOn(service as any, '_loadStoredExtensions').mockImplementation(() => {
      callLog.push('load-stored');
    });

    vi.spyOn(service as any, '_activateAll').mockImplementation(() => {
      callLog.push('activate');
    });

    await service.reloadExtensions();

    expect(callLog).toEqual(['scan:start', 'scan:end', 'load-stored', 'activate']);
  });
});
