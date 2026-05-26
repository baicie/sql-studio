import { Download, ShieldCheck, Star } from 'lucide-react';
import type { MarketplaceExtension } from '../types';
import { MarketplaceInstallButton } from './MarketplaceInstallButton';
import { MarketplacePermissionPreview } from './MarketplacePermissionPreview';
import { MarketplaceReadme } from './MarketplaceReadme';
import { MarketplaceInstallError } from './MarketplaceInstallError';
import {
  isMarketplaceExtensionEnabled,
  isMarketplaceExtensionInstalled,
} from '../services/marketplaceInstallStatus';

interface MarketplaceExtensionDetailProps {
  extension: MarketplaceExtension;
}

export function MarketplaceExtensionDetail(props: MarketplaceExtensionDetailProps) {
  const { extension } = props;
  const installed = isMarketplaceExtensionInstalled(extension.id);
  const enabled = isMarketplaceExtensionEnabled(extension.id);

  return (
    <div className="h-full overflow-auto">
      <div className="border-b p-5">
        <div className="flex items-start gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-muted text-2xl font-semibold">
            {extension.displayName.slice(0, 1).toUpperCase()}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold">{extension.displayName}</h2>

              {extension.verified ? (
                <ShieldCheck className="h-4 w-4 shrink-0 text-blue-500" />
              ) : null}
            </div>

            <div className="mt-1 text-sm text-muted-foreground">
              {extension.id} · v{extension.version}
            </div>

            <p className="mt-3 text-sm text-muted-foreground">{extension.description}</p>

            <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
              {typeof extension.stats?.downloads === 'number' ? (
                <span className="flex items-center gap-1">
                  <Download className="h-3 w-3" />
                  {extension.stats.downloads} downloads
                </span>
              ) : null}

              {typeof extension.stats?.rating === 'number' ? (
                <span className="flex items-center gap-1">
                  <Star className="h-3 w-3" />
                  {extension.stats.rating}
                </span>
              ) : null}

              {installed ? (
                <span className="text-green-600">
                  Installed · {enabled ? 'Enabled' : 'Disabled'}
                </span>
              ) : null}
            </div>
          </div>

          <MarketplaceInstallButton extension={extension} />
        </div>
      </div>

      <div className="p-5">
        <MarketplaceInstallError extensionId={extension.id} />
      </div>

      <div className="grid grid-cols-[1fr_280px] gap-4 p-5 pt-0">
        <div>
          <MarketplaceReadme readme={extension.readme} />
        </div>

        <aside className="space-y-4">
          <section className="rounded-md border p-3">
            <h3 className="mb-2 text-sm font-medium">Categories</h3>
            <div className="flex flex-wrap gap-1">
              {extension.categories.map((category) => (
                <span key={category} className="rounded bg-muted px-2 py-1 text-xs">
                  {category}
                </span>
              ))}
            </div>
          </section>

          {extension.tags.length > 0 ? (
            <section className="rounded-md border p-3">
              <h3 className="mb-2 text-sm font-medium">Tags</h3>
              <div className="flex flex-wrap gap-1">
                {extension.tags.map((tag) => (
                  <span key={tag} className="rounded bg-muted px-2 py-1 text-xs">
                    {tag}
                  </span>
                ))}
              </div>
            </section>
          ) : null}

          <MarketplacePermissionPreview permissions={extension.permissions} />

          <section className="rounded-md border p-3 text-xs text-muted-foreground">
            <div>Publisher: {extension.publisher}</div>
            <div>Version: {extension.version}</div>
            {extension.license ? <div>License: {extension.license}</div> : null}
          </section>
        </aside>
      </div>
    </div>
  );
}
