import { useState } from 'react';
import type { MarketplaceExtension } from '../types';
import { useMarketplaceStore } from '../store/marketplaceStore';
import { marketplaceInstallService } from '../services/marketplaceInstallService';
import {
  isMarketplaceExtensionEnabled,
  isMarketplaceExtensionInstalled,
} from '../services/marketplaceInstallStatus';
import { extensionService } from '@/services/extension/extension-service';
import { trustService } from '@/plugins/security/trustService';
import { UnsignedInstallWarningDialog } from '@/plugins/security/components/UnsignedInstallWarningDialog';
import { TrustPublisherDialog } from '@/plugins/security/components/TrustPublisherDialog';
import { SignatureInvalidDialog } from '@/plugins/security/components/SignatureInvalidDialog';

interface MarketplaceInstallButtonProps {
  extension: MarketplaceExtension;
  compact?: boolean;
}

type SecurityDialog = 'none' | 'unsigned' | 'untrusted' | 'invalid';

export function MarketplaceInstallButton(props: MarketplaceInstallButtonProps) {
  const { extension, compact } = props;
  const [dialog, setDialog] = useState<SecurityDialog>('none');
  const [invalidMessage, setInvalidMessage] = useState<string>();

  const installState = useMarketplaceStore((state) => state.installState[extension.id]);

  const installing = installState?.status === 'installing';
  const installed = isMarketplaceExtensionInstalled(extension.id);
  const enabled = isMarketplaceExtensionEnabled(extension.id);

  async function handleInstall() {
    const status = extension.signatureStatus;

    if (status === 'invalid') {
      setInvalidMessage('Invalid extension signature. Installation blocked.');
      setDialog('invalid');
      return;
    }

    if (status === 'unsigned') {
      setDialog('unsigned');
      return;
    }

    if (status === 'untrusted') {
      setDialog('untrusted');
      return;
    }

    await marketplaceInstallService.install(extension);
  }

  async function handleInstallUnsigned() {
    setDialog('none');
    await marketplaceInstallService.install(extension, { allowUnsigned: true });
  }

  async function handleTrustAndInstall() {
    setDialog('none');
    try {
      await trustService.trustPublisher({
        publisher: extension.publisher,
        trusted: true,
        keys: [],
        trustedAt: Date.now(),
      });
      await marketplaceInstallService.install(extension, { allowUntrusted: true });
    } catch {
      // If trust fails, fall back to trying install
      await marketplaceInstallService.install(extension, { allowUntrusted: true });
    }
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
      <>
        <button
          type="button"
          disabled
          className="rounded-md bg-muted px-3 py-1.5 text-xs text-muted-foreground"
        >
          Installing...
        </button>
        {dialog !== 'none' && renderDialog()}
      </>
    );
  }

  if (!installed) {
    return (
      <>
        <button
          type="button"
          onClick={handleInstall}
          className="rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground hover:opacity-90"
        >
          Install
        </button>
        {dialog !== 'none' && renderDialog()}
      </>
    );
  }

  return (
    <>
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
      {dialog !== 'none' && renderDialog()}
    </>
  );

  function renderDialog() {
    if (dialog === 'unsigned') {
      return (
        <UnsignedInstallWarningDialog
          open
          extensionName={extension.displayName}
          onConfirm={handleInstallUnsigned}
          onCancel={() => setDialog('none')}
        />
      );
    }

    if (dialog === 'untrusted') {
      return (
        <TrustPublisherDialog
          open
          publisher={extension.publisher}
          onTrust={handleTrustAndInstall}
          onCancel={() => setDialog('none')}
        />
      );
    }

    if (dialog === 'invalid') {
      return (
        <SignatureInvalidDialog
          open
          extensionName={extension.displayName}
          message={invalidMessage}
          onClose={() => setDialog('none')}
        />
      );
    }

    return null;
  }
}
