import { useSyncExternalStore } from 'react';
import { permissionPromptService } from '../PermissionPromptService';
import { useAppTranslation } from '@/i18n';

export function DangerousSqlConfirmDialog() {
  const { t } = useAppTranslation('extension');
  const request = useSyncExternalStore(
    (callback) => permissionPromptService.subscribe(callback),
    () => permissionPromptService.getDangerousSqlRequest(),
  );

  const open = Boolean(request);

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-background/50 p-4 backdrop-blur-sm transition-opacity ${
        open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
      }`}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          permissionPromptService.resolveDangerousSqlRequest(false);
        }
      }}
    >
      <div className="w-full max-w-2xl rounded-lg border bg-popover p-4 shadow-xl">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-destructive">{t('dangerousSqlConfirm')}</h2>
        </div>

        {request ? (
          <div className="space-y-3">
            <div className="rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm">
              {t('dangerousSqlMessage', {
                extensionName: request.extensionName,
              })}
            </div>

            <div className="text-sm text-muted-foreground">
              {t('reason')}: {request.reason}
            </div>

            <pre className="max-h-72 overflow-auto rounded-md border bg-muted p-3 text-xs">
              {request.sql}
            </pre>
          </div>
        ) : null}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            className="rounded-md border px-3 py-1.5 text-sm hover:bg-accent"
            onClick={() => {
              permissionPromptService.resolveDangerousSqlRequest(false);
            }}
          >
            {t('deny')}
          </button>

          <button
            type="button"
            className="rounded-md bg-destructive px-3 py-1.5 text-sm text-destructive-foreground hover:opacity-90"
            onClick={() => {
              permissionPromptService.resolveDangerousSqlRequest(true);
            }}
          >
            {t('allowOnce')}
          </button>
        </div>
      </div>
    </div>
  );
}
