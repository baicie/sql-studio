import { MarketplaceSearch } from './MarketplaceSearch';
import { MarketplaceCategoryTabs } from './MarketplaceCategoryTabs';
import { useMarketplaceStore } from '../store/marketplaceStore';

export function MarketplaceHeader() {
  const sortBy = useMarketplaceStore((state) => state.sortBy);
  const setSortBy = useMarketplaceStore((state) => state.setSortBy);

  return (
    <div className="space-y-2 border-b p-3">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold">Extensions Marketplace</h1>
          <p className="text-xs text-muted-foreground">Discover and install SQL GUI extensions.</p>
        </div>

        <select
          className="h-8 w-36 rounded-md border bg-transparent px-2 text-xs text-foreground"
          value={sortBy}
          onChange={(event) =>
            setSortBy(event.target.value as 'relevance' | 'downloads' | 'updated' | 'name')
          }
        >
          <option value="relevance">Relevance</option>
          <option value="downloads">Downloads</option>
          <option value="updated">Updated</option>
          <option value="name">Name</option>
        </select>
      </div>

      <MarketplaceSearch />
      <MarketplaceCategoryTabs />
    </div>
  );
}
