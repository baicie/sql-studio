import type { InstalledExtension } from '@/services/extension/types';
import { extensionService } from '@/services/extension/extension-service';
import { useAppTranslation } from '@/i18n';
import { ALLOWED_PERMISSIONS } from '@sqlgui/extension-schema';

interface ExtensionDetailViewProps {
  extension: InstalledExtension;
  onBack: () => void;
}

export function ExtensionDetailView({ extension, onBack }: ExtensionDetailViewProps) {
  const { t } = useAppTranslation('extension');
  const manifest = extension.manifest;
  const contributes = manifest.contributes;

  return (
    <section className="flex h-full flex-col">
      <header className="flex h-9 items-center justify-between border-b px-3">
        <button
          type="button"
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          onClick={onBack}
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          {t('back')}
        </button>

        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {t('extensionDetail')}
        </span>
      </header>

      <div className="flex-1 overflow-auto p-4">
        <div className="space-y-6">
          <div className="flex items-start gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-muted text-xl font-medium">
              {(manifest.displayName ?? manifest.name).slice(0, 1).toUpperCase()}
            </div>
            <div>
              <h2 className="text-lg font-semibold">{manifest.displayName ?? manifest.name}</h2>
              <p className="text-sm text-muted-foreground">
                {manifest.publisher}.{manifest.name}
              </p>
              <p className="text-sm text-muted-foreground">v{manifest.version}</p>
            </div>
          </div>

          {manifest.description && (
            <div>
              <h3 className="mb-2 text-sm font-medium">{t('description')}</h3>
              <p className="text-sm text-muted-foreground">{manifest.description}</p>
            </div>
          )}

          <div>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-medium">{t('status')}</h3>
              <label className="flex items-center gap-2 text-sm">
                <span className="text-xs text-muted-foreground">
                  {extension.enabled ? t('enabled') : t('disabled')}
                </span>
                <input
                  type="checkbox"
                  checked={extension.enabled}
                  onChange={(event) => {
                    extensionService.setEnabled(extension.id, event.target.checked);
                  }}
                />
              </label>
            </div>
          </div>

          {contributes?.commands && contributes.commands.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-medium">{t('commands')}</h3>
              <div className="space-y-1">
                {contributes.commands.map((command) => (
                  <div key={command.command} className="rounded border bg-muted/50 p-2">
                    <div className="font-mono text-xs text-muted-foreground">{command.command}</div>
                    <div className="text-sm">{command.title}</div>
                    {command.category && (
                      <div className="mt-1 text-xs text-muted-foreground">
                        {t('category')}: {command.category}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {contributes?.menus && Object.keys(contributes.menus).length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-medium">{t('menus')}</h3>
              <pre className="overflow-auto rounded border bg-muted p-2 text-xs">
                {JSON.stringify(contributes.menus, null, 2)}
              </pre>
            </div>
          )}

          {contributes?.keybindings && contributes.keybindings.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-medium">{t('keybindings')}</h3>
              <div className="space-y-1">
                {contributes.keybindings.map((kb, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between rounded border bg-muted/50 p-2 text-sm"
                  >
                    <span className="font-mono text-xs">{kb.command}</span>
                    <kbd className="rounded bg-muted px-2 py-0.5 text-xs font-mono">{kb.key}</kbd>
                  </div>
                ))}
              </div>
            </div>
          )}

          {manifest.permissions && manifest.permissions.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-medium">{t('permissions')}</h3>
              <div className="space-y-1">
                {manifest.permissions.map((permission) => {
                  const isAllowed = ALLOWED_PERMISSIONS.includes(permission);
                  return (
                    <div
                      key={permission}
                      className={`rounded border p-2 text-xs ${isAllowed ? 'bg-muted/50' : 'border-destructive bg-destructive/10'}`}
                    >
                      <span className="font-mono">{permission}</span>
                      {!isAllowed && (
                        <span className="ml-2 text-destructive">{t('unknownPermission')}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {manifest.activationEvents && manifest.activationEvents.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-medium">{t('activationEvents')}</h3>
              <div className="flex flex-wrap gap-1">
                {manifest.activationEvents.map((event) => (
                  <span key={event} className="rounded bg-muted px-2 py-0.5 text-xs font-mono">
                    {event}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div>
            <h3 className="mb-2 text-sm font-medium">{t('technicalInfo')}</h3>
            <dl className="space-y-1 text-xs text-muted-foreground">
              <div className="flex justify-between">
                <dt>ID:</dt>
                <dd className="font-mono">{extension.id}</dd>
              </div>
              {extension.extensionPath && (
                <div className="flex justify-between">
                  <dt>{t('path')}:</dt>
                  <dd className="truncate max-w-[200px] font-mono">{extension.extensionPath}</dd>
                </div>
              )}
              {extension.manifestPath && (
                <div className="flex justify-between">
                  <dt>{t('manifest')}:</dt>
                  <dd className="truncate max-w-[200px] font-mono">{extension.manifestPath}</dd>
                </div>
              )}
              {manifest.main && (
                <div className="flex justify-between">
                  <dt>Main:</dt>
                  <dd className="font-mono">{manifest.main}</dd>
                </div>
              )}
            </dl>
          </div>
        </div>
      </div>
    </section>
  );
}
