import { Download, ShieldCheck } from 'lucide-react';
import type { MarketplaceExtension } from '../types';
import { useMarketplaceStore } from '../store/marketplaceStore';
import { MarketplaceInstallButton } from './MarketplaceInstallButton';
import { isMarketplaceExtensionInstalled } from '../services/marketplaceInstallStatus';

interface MarketplaceExtensionCardProps {
  extension: MarketplaceExtension;
}

export function MarketplaceExtensionCard(props: MarketplaceExtensionCardProps) {
  const { extension } = props;
  const selectedExtensionId = useMarketplaceStore((state) => state.selectedExtensionId);
  const setSelectedExtension = useMarketplaceStore((state) => state.setSelectedExtension);

  const selected = selectedExtensionId === extension.id;
  const installed = isMarketplaceExtensionInstalled(extension.id);

  return (
    <div
      className={[
        'mb-2 cursor-default rounded-md border p-3 hover:bg-accent/40',
        selected ? 'border-primary bg-accent/50' : '',
      ].join(' ')}
      onClick={() => setSelectedExtension(extension.id)}
    >
      <div className="flex gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-muted text-sm font-medium">
          {extension.displayName.slice(0, 1).toUpperCase()}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1">
            <div className="truncate text-sm font-medium">{extension.displayName}</div>

            {extension.verified ? <ShieldCheck className="h-3 w-3 shrink-0 text-blue-500" /> : null}
          </div>

          <div className="text-xs text-muted-foreground">
            {extension.publisher} · v{extension.version}
          </div>

          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{extension.description}</p>

          <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
            <span>{extension.categories.join(', ')}</span>

            {typeof extension.stats?.downloads === 'number' ? (
              <span className="flex items-center gap-1">
                <Download className="h-3 w-3" />
                {extension.stats.downloads}
              </span>
            ) : null}

            {installed ? <span className="text-green-600">Installed</span> : null}
          </div>
        </div>

        <div onClick={(event) => event.stopPropagation()}>
          <MarketplaceInstallButton extension={extension} compact />
        </div>
      </div>
    </div>
  );
}
