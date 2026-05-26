import type { MarketplaceExtension } from '../types';

export const marketplaceDownloadService = {
  async downloadPackage(extension: MarketplaceExtension): Promise<string> {
    if (extension.source.type !== 'remotePackage') {
      throw new Error('Extension source is not remote.');
    }

    throw new Error('Remote download is not implemented.');
  },
};
