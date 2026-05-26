import type { ExtensionPermission } from '@sqlgui/extension-schema';

export type MarketplaceInstallSource =
  | {
      type: 'localPackage';
      path: string;
    }
  | {
      type: 'localFolder';
      path: string;
      mode: 'copy' | 'link';
    }
  | {
      type: 'remotePackage';
      url: string;
      sha256?: string;
    };

export type MarketplaceExtensionCategory =
  | 'Formatter'
  | 'Database'
  | 'Visualization'
  | 'Theme'
  | 'Snippets'
  | 'Productivity'
  | 'Other';

export interface MarketplaceExtension {
  id: string;
  name: string;
  displayName: string;
  publisher: string;
  version: string;
  description: string;

  categories: MarketplaceExtensionCategory[];
  tags: string[];

  permissions: ExtensionPermission[];

  source: MarketplaceInstallSource;

  icon?: string;
  readme?: string;
  repository?: string;
  homepage?: string;
  license?: string;

  verified?: boolean;
  builtin?: boolean;

  stats?: {
    downloads?: number;
    rating?: number;
  };

  updatedAt?: number;
}

export interface MarketplaceSearchOptions {
  query?: string;
  category?: MarketplaceExtensionCategory | 'All';
  sortBy?: 'relevance' | 'downloads' | 'updated' | 'name';
}

export interface MarketplaceInstallState {
  extensionId: string;
  status: 'idle' | 'installing' | 'installed' | 'failed';
  error?: string;
}
