import type { MarketplaceExtension } from '../types';
import { useMarketplaceStore } from '../store/marketplaceStore';
import { marketplaceInstallService } from '../services/marketplaceInstallService';
import {
  isMarketplaceExtensionEnabled,
  isMarketplaceExtensionInstalled,
} from '../services/marketplaceInstallStatus';
import { extensionService } from '@/services/extension/extension-service';

interface MarketplaceInstallButtonProps {
  extension: MarketplaceExtension;
  compact?: boolean;
}

export function MarketplaceInstallButton(props: MarketplaceInstallButtonProps) {
  const { extension, compact } = props;

  const installState = useMarketplaceStore((state) => state.installState[extension.id]);

  const installing = installState?.status === 'installing';
  const installed = isMarketplaceExtensionInstalled(extension.id);
  const enabled = isMarketplaceExtensionEnabled(extension.id);

  async function handleInstall() {
    await marketplaceInstallService.install(extension);
  }

  async function handleUninstall() {
    await marketplaceInstallService.uninstall(extension.id);
  }

  async function handleEnableDisable() {
    if (enabled) {
      extensionService.setEnabled(extension.id, false);
    } else {
      extensionService.setEnabled(extension.id, true);
    }
  }

  if (installing) {
    return (
      <button
        type="button"
        disabled
        className="rounded-md bg-muted px-3 py-1.5 text-xs text-muted-foreground"
      >
        Installing...
      </button>
    );
  }

  if (!installed) {
    return (
      <button
        type="button"
        onClick={handleInstall}
        className="rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground hover:opacity-90"
      >
        Install
      </button>
    );
  }

  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={handleEnableDisable}
        className="rounded-md border px-3 py-1.5 text-xs hover:bg-accent"
      >
        {enabled ? 'Disable' : 'Enable'}
      </button>

      {!compact ? (
        <button
          type="button"
          onClick={handleUninstall}
          className="rounded-md border border-destructive bg-destructive/10 px-3 py-1.5 text-xs text-destructive hover:bg-destructive/20"
        >
          Uninstall
        </button>
      ) : null}
    </div>
  );
}
