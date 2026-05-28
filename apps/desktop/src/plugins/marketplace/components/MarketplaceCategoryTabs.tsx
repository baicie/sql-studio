import { Button } from '@sqlgui/ui';
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
        <Button
          key={category}
          variant={active === category ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setCategory(category)}
        >
          {category}
        </Button>
      ))}
    </div>
  );
}
