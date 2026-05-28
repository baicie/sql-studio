import { Search } from 'lucide-react';
import { Input } from '@sqlgui/ui';
import { useMarketplaceStore } from '../store/marketplaceStore';

export function MarketplaceSearch() {
  const query = useMarketplaceStore((state) => state.query);
  const setQuery = useMarketplaceStore((state) => state.setQuery);

  return (
    <div className="relative">
      <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
      <Input
        className="h-9 pl-8 pr-3"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search extensions..."
      />
    </div>
  );
}
