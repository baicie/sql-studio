import type { MarketplaceExtensionCategory } from '../types';
import { useMarketplaceStore } from '../store/marketplaceStore';

const categories: Array<MarketplaceExtensionCategory | 'All'> = [
  'All',
  'Formatter',
  'Database',
  'Visualization',
  'Theme',
  'Snippets',
  'Productivity',
  'Other',
];

export function MarketplaceCategoryTabs() {
  const active = useMarketplaceStore((state) => state.category);
  const setCategory = useMarketplaceStore((state) => state.setCategory);

  return (
    <div className="flex flex-wrap gap-1">
      {categories.map((category) => (
        <button
          key={category}
          type="button"
          className={[
            'rounded-md px-2 py-1 text-xs',
            active === category
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground hover:text-foreground',
          ].join(' ')}
          onClick={() => setCategory(category)}
        >
          {category}
        </button>
      ))}
    </div>
  );
}
