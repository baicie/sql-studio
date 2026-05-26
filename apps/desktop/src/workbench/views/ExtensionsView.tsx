import { useState } from 'react';
import { useSyncExternalStore } from 'react';
import { useAppTranslation } from '@/i18n';
import { extensionService } from '@/services/extension/extension-service';
import { ExtensionDetailView } from './ExtensionDetailView';
import { ExtensionDevelopmentView } from './ExtensionDevelopmentView';
import type { InstalledExtension } from '@/services/extension/types';

type Tab = 'installed' | 'marketplace' | 'development';

export function ExtensionsView() {
  const { t } = useAppTranslation('extension');
  const [selectedExtension, setSelectedExtension] = useState<InstalledExtension | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('installed');

  const snapshot = useSyncExternalStore(
    extensionService.subscribe.bind(extensionService),
    extensionService.getSnapshot.bind(extensionService),
  );

  if (selectedExtension) {
    return (
      <ExtensionDetailView
        extension={selectedExtension}
        onBack={() => setSelectedExtension(null)}
      />
    );
  }

  return (
    <section className="flex h-full flex-col">
      <header className="flex h-9 items-center justify-between border-b px-3">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {t('title')}
        </span>

        <button
          type="button"
          className="rounded px-2 py-0.5 text-xs text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          onClick={() => extensionService.reloadExtensions()}
        >
          {t('reloadHost')}
        </button>
      </header>

      <div className="flex border-b">
        {(['installed', 'marketplace', 'development'] as Tab[]).map((tab) => (
          <button
            key={tab}
            type="button"
            className={`flex-1 px-3 py-2 text-xs ${activeTab === tab ? 'border-b-2 border-primary font-medium' : 'text-muted-foreground hover:bg-accent'}`}
            onClick={() => setActiveTab(tab)}
          >
            {t(tab)}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto">
        {activeTab === 'installed' && (
          <InstalledTab
            extensions={snapshot.extensions}
            hostState={snapshot.hostState}
            onSelect={setSelectedExtension}
          />
        )}
        {activeTab === 'marketplace' && <MarketplaceTab />}
        {activeTab === 'development' && <ExtensionDevelopmentView />}
      </div>
    </section>
  );
}

function InstalledTab({
  extensions,
  hostState,
  onSelect,
}: {
  extensions: InstalledExtension[];
  hostState: string;
  onSelect: (e: InstalledExtension) => void;
}) {
  const { t } = useAppTranslation('extension');

  if (extensions.length === 0) {
    return <div className="p-4 text-center text-xs text-muted-foreground">{t('noExtensions')}</div>;
  }

  return (
    <div className="space-y-2 p-3">
      <div className="flex items-center justify-between px-1">
        <span className="text-xs text-muted-foreground">
          {extensions.length} extension{extensions.length !== 1 ? 's' : ''}
        </span>
        <span className="text-xs text-muted-foreground">
          {t('host')}: {hostState}
        </span>
      </div>

      {extensions.map((extension) => (
        <div
          key={extension.id}
          className="flex items-center justify-between rounded-md border px-3 py-2"
        >
          <button
            type="button"
            className="flex flex-1 items-center gap-2 text-left hover:opacity-80"
            onClick={() => onSelect(extension)}
          >
            <div className="flex h-8 w-8 items-center justify-center rounded bg-muted text-xs font-medium">
              {(extension.manifest.displayName ?? extension.manifest.name)
                .slice(0, 1)
                .toUpperCase()}
            </div>
            <div>
              <div className="font-medium">
                {extension.manifest.displayName ?? extension.manifest.name}
              </div>
              <div className="text-xs text-muted-foreground">
                {extension.manifest.publisher} · v{extension.manifest.version}
              </div>
            </div>
          </button>

          <label className="flex items-center gap-1 text-xs">
            <input
              type="checkbox"
              checked={extension.enabled}
              onChange={(event) => {
                extensionService.setEnabled(extension.id, event.target.checked);
              }}
            />
            {t('enable')}
          </label>
        </div>
      ))}
    </div>
  );
}

function MarketplaceTab() {
  const { t } = useAppTranslation('extension');

  return (
    <div className="flex items-center justify-center p-8">
      <div className="text-center">
        <div className="mb-2 text-sm font-medium">{t('marketplace')}</div>
        <div className="text-xs text-muted-foreground">Extension marketplace coming soon.</div>
      </div>
    </div>
  );
}
