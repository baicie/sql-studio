import { useMarketplaceStore } from '../store/marketplaceStore';

export function MarketplaceInstallError(props: { extensionId: string }) {
  const installState = useMarketplaceStore((state) => state.installState[props.extensionId]);

  if (installState?.status !== 'failed') return null;

  return (
    <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
      {installState.error}
    </div>
  );
}
