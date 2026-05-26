import mockExtensions from '../data/marketplace.mock.json';
import type { MarketplaceExtension, MarketplaceSearchOptions } from '../types';
import { validateMarketplaceExtensions } from './marketplaceValidator';

class MarketplaceService {
  private extensions: MarketplaceExtension[] = validateMarketplaceExtensions(
    mockExtensions as unknown[],
  );

  async search(options: MarketplaceSearchOptions = {}): Promise<MarketplaceExtension[]> {
    const query = options.query?.trim().toLowerCase();
    const category = options.category ?? 'All';

    let result = [...this.extensions];

    if (query) {
      result = result.filter((extension) => {
        const haystack = [
          extension.displayName,
          extension.name,
          extension.publisher,
          extension.description,
          ...extension.tags,
          ...extension.categories,
        ]
          .join(' ')
          .toLowerCase();

        return haystack.includes(query);
      });
    }

    if (category !== 'All') {
      result = result.filter((extension) => extension.categories.includes(category));
    }

    return sortExtensions(result, options.sortBy ?? 'relevance');
  }

  async getById(extensionId: string): Promise<MarketplaceExtension | undefined> {
    return this.extensions.find((item) => item.id === extensionId);
  }

  async getCategories() {
    const categories = new Set<string>();

    for (const extension of this.extensions) {
      for (const category of extension.categories) {
        categories.add(category);
      }
    }

    return ['All', ...Array.from(categories).sort()] as const;
  }

  async refresh() {
    return this.search();
  }

  setMockExtensions(extensions: MarketplaceExtension[]) {
    this.extensions = validateMarketplaceExtensions(extensions as unknown[]);
  }
}

function sortExtensions(
  extensions: MarketplaceExtension[],
  sortBy: MarketplaceSearchOptions['sortBy'],
) {
  if (sortBy === 'downloads') {
    return extensions.sort((a, b) => (b.stats?.downloads ?? 0) - (a.stats?.downloads ?? 0));
  }

  if (sortBy === 'updated') {
    return extensions.sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));
  }

  if (sortBy === 'name') {
    return extensions.sort((a, b) => a.displayName.localeCompare(b.displayName));
  }

  return extensions;
}

export const marketplaceService = new MarketplaceService();
