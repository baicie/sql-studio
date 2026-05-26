import { Search } from 'lucide-react';
import { useMarketplaceStore } from '../store/marketplaceStore';

export function MarketplaceSearch() {
  const query = useMarketplaceStore((state) => state.query);
  const setQuery = useMarketplaceStore((state) => state.setQuery);

  return (
    <div className="relative">
      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />

      <input
        type="text"
        className="h-9 w-full rounded-md border bg-transparent pl-8 pr-3 text-sm outline-none placeholder:text-muted-foreground focus:border-primary"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search extensions..."
      />
    </div>
  );
}
