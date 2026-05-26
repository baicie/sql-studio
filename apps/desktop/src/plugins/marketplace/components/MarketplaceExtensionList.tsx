import type { MarketplaceExtension } from '../types';
import { MarketplaceExtensionCard } from './MarketplaceExtensionCard';

interface MarketplaceExtensionListProps {
  extensions: MarketplaceExtension[];
}

export function MarketplaceExtensionList(props: MarketplaceExtensionListProps) {
  return (
    <div className="h-full overflow-auto p-2">
      {props.extensions.map((extension) => (
        <MarketplaceExtensionCard key={extension.id} extension={extension} />
      ))}
    </div>
  );
}
