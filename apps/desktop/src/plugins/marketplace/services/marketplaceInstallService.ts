import type { MarketplaceExtension } from '../types';
import { marketplaceSourceResolver } from './marketplaceSourceResolver';
import { extensionService } from '@/services/extension/extension-service';
import { useMarketplaceStore } from '../store/marketplaceStore';

export const marketplaceInstallService = {
  async install(extension: MarketplaceExtension) {
    const store = useMarketplaceStore.getState();

    store.setInstallState(extension.id, {
      status: 'installing',
      error: undefined,
    });

    try {
      if (extension.source.type === 'localPackage') {
        const packagePath = await marketplaceSourceResolver.resolvePackagePath(extension.source);

        await extensionService.installFromPackage(packagePath);
      } else if (extension.source.type === 'localFolder') {
        if (extension.source.mode === 'link') {
          await extensionService.installFromFolderLink(extension.source.path);
        } else {
          await extensionService.installFromFolderCopy(extension.source.path);
        }
      } else {
        throw new Error('Remote package install is not implemented.');
      }

      store.setInstallState(extension.id, {
        status: 'installed',
      });
    } catch (error) {
      store.setInstallState(extension.id, {
        status: 'failed',
        error: error instanceof Error ? error.message : String(error),
      });

      throw error;
    }
  },

  async uninstall(extensionId: string) {
    const store = useMarketplaceStore.getState();

    store.setInstallState(extensionId, {
      status: 'installing',
      error: undefined,
    });

    try {
      await extensionService.uninstall(extensionId);

      store.setInstallState(extensionId, {
        status: 'idle',
      });
    } catch (error) {
      store.setInstallState(extensionId, {
        status: 'failed',
        error: error instanceof Error ? error.message : String(error),
      });

      throw error;
    }
  },
};
