import { useSyncExternalStore } from 'react';

import { useAppTranslation } from '@/i18n';
import { executeCommand } from '@/services/command/execute-command';
import { extensionService } from '@/services/extension/extension-service';

export function ExtensionsView() {
  const { t } = useAppTranslation('extension');

  const snapshot = useSyncExternalStore(
    extensionService.subscribe.bind(extensionService),
    extensionService.getSnapshot.bind(extensionService),
  );

  return (
    <section className="flex h-full flex-col">
      <header className="flex h-9 items-center justify-between border-b px-3">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {t('title')}
        </span>

        <button
          type="button"
          className="rounded px-2 py-0.5 text-xs text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          onClick={() => {
            void executeCommand('extensions.reload');
          }}
        >
          {t('reloadHost')}
        </button>
      </header>

      <div className="space-y-2 p-3">
        <div className="rounded-md border p-3">
          <div className="text-sm font-medium">{t('marketplace')}</div>
          <div className="mt-1 text-xs text-muted-foreground">
            Extension marketplace will be here.
          </div>
        </div>

        <div className="rounded-md border p-3">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium">{t('installed')}</div>
            <span className="text-xs text-muted-foreground">Host: {snapshot.hostState}</span>
          </div>

          {snapshot.extensions.length === 0 ? (
            <div className="mt-2 text-xs text-muted-foreground">No extensions installed.</div>
          ) : (
            <div className="mt-2 space-y-2">
              {snapshot.extensions.map((extension) => (
                <div
                  key={extension.id}
                  className="flex items-center justify-between rounded border px-2 py-1.5 text-sm"
                >
                  <div>
                    <div className="font-medium">
                      {extension.manifest.displayName ?? extension.manifest.name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {extension.manifest.publisher} · v{extension.manifest.version}
                    </div>
                  </div>

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
          )}
        </div>
      </div>
    </section>
  );
}
