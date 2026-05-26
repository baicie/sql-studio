import { callNative } from '@/services/native/invoke';
import type { MarketplaceInstallSource } from '../types';

export const marketplaceSourceResolver = {
  async resolvePackagePath(source: MarketplaceInstallSource) {
    if (source.type === 'localPackage') {
      return callNative<string>('marketplace_resolve_local_package', {
        path: source.path,
      });
    }

    if (source.type === 'remotePackage') {
      throw new Error('Remote package download is not implemented in MVP.');
    }

    throw new Error(`Unsupported source type: ${source.type}`);
  },
};
