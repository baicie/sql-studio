import { MarketplaceSearch } from './MarketplaceSearch';
import { MarketplaceCategoryTabs } from './MarketplaceCategoryTabs';
import { useMarketplaceStore } from '../store/marketplaceStore';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@sqlgui/ui';

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

        <Select
          value={sortBy}
          onValueChange={(value) =>
            setSortBy(value as 'relevance' | 'downloads' | 'updated' | 'name')
          }
        >
          <SelectTrigger className="h-8 w-36 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="relevance">Relevance</SelectItem>
            <SelectItem value="downloads">Downloads</SelectItem>
            <SelectItem value="updated">Updated</SelectItem>
            <SelectItem value="name">Name</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <MarketplaceSearch />
      <MarketplaceCategoryTabs />
    </div>
  );
}
