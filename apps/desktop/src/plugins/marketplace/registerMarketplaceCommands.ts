import { useMarketplaceStore } from './store/marketplaceStore';
import { extensionService } from '@/services/extension/extension-service';

export function registerMarketplaceCommands() {
  extensionService.subscribe(() => {
    void useMarketplaceStore.getState().load();
  });
}
