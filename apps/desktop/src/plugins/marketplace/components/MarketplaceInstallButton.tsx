import { useState } from 'react';
import { Button } from '@sqlgui/ui';
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
        <Button variant="secondary" size="sm" disabled>
          Installing...
        </Button>
        {dialog !== 'none' && renderDialog()}
      </>
    );
  }

  if (!installed) {
    return (
      <>
        <Button size="sm" onClick={handleInstall}>
          Install
        </Button>
        {dialog !== 'none' && renderDialog()}
      </>
    );
  }

  return (
    <>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={handleEnableDisable}>
          {enabled ? 'Disable' : 'Enable'}
        </Button>

        {!compact ? (
          <Button
            variant="outline"
            size="sm"
            className="border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={handleUninstall}
          >
            Uninstall
          </Button>
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
