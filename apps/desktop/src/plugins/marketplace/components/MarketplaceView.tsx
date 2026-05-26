import { useEffect } from 'react';
import { useMarketplaceStore } from '../store/marketplaceStore';
import { MarketplaceHeader } from './MarketplaceHeader';
import { MarketplaceExtensionList } from './MarketplaceExtensionList';
import { MarketplaceExtensionDetail } from './MarketplaceExtensionDetail';
import { MarketplaceEmptyState } from './MarketplaceEmptyState';

export function MarketplaceView() {
  const extensions = useMarketplaceStore((state) => state.extensions);
  const loading = useMarketplaceStore((state) => state.loading);
  const selectedExtensionId = useMarketplaceStore((state) => state.selectedExtensionId);
  const load = useMarketplaceStore((state) => state.load);

  useEffect(() => {
    void load();
  }, [load]);

  const selected = extensions.find((item) => item.id === selectedExtensionId);

  return (
    <div className="flex h-full flex-col">
      <MarketplaceHeader />

      <div className="flex min-h-0 flex-1">
        <div className="w-[360px] shrink-0 border-r">
          {loading ? (
            <div className="p-3 text-sm text-muted-foreground">Loading extensions...</div>
          ) : extensions.length ? (
            <MarketplaceExtensionList extensions={extensions} />
          ) : (
            <MarketplaceEmptyState />
          )}
        </div>

        <div className="min-w-0 flex-1">
          {selected ? (
            <MarketplaceExtensionDetail extension={selected} />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Select an extension to view details.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
