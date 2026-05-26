import { useSyncExternalStore } from 'react';
import { permissionPromptService } from '../PermissionPromptService';
import type { PermissionGrantRequest } from '../PermissionPromptService';
import { PermissionList } from './PermissionList';
import { useAppTranslation } from '@/i18n';

export function PermissionGrantDialog() {
  const { t } = useAppTranslation('extension');
  const request = useSyncExternalStore(
    (callback) => permissionPromptService.subscribe(callback),
    () => permissionPromptService.getGrantRequest(),
  );

  const open = Boolean(request);

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-background/50 p-4 backdrop-blur-sm transition-opacity ${
        open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
      }`}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          permissionPromptService.resolveGrantRequest(false);
        }
      }}
    >
      <div className="w-full max-w-xl rounded-lg border bg-popover p-4 shadow-xl">
        <div className="mb-4">
          <h2 className="text-lg font-semibold">{t('permissionGrant')}</h2>
        </div>

        {request ? (
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Extension{' '}
              <b>{request.extension.manifest.displayName ?? request.extension.manifest.name}</b>{' '}
              {t('permissionRequest')}:
            </div>

            <PermissionList permissions={request.permissions} />

            {hasPermissionChanged(request) ? (
              <div className="rounded-md border border-yellow-500/30 bg-yellow-500/10 p-2 text-sm">
                {t('permissionChanged')}
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            className="rounded-md border px-3 py-1.5 text-sm hover:bg-accent"
            onClick={() => {
              permissionPromptService.resolveGrantRequest(false);
            }}
          >
            {t('deny')}
          </button>

          <button
            type="button"
            className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground hover:opacity-90"
            onClick={() => {
              permissionPromptService.resolveGrantRequest(true);
            }}
          >
            {t('allow')}
          </button>
        </div>
      </div>
    </div>
  );
}

function hasPermissionChanged(request: PermissionGrantRequest) {
  const previous = new Set(request.previousPermissions);
  return request.permissions.some((item) => !previous.has(item));
}
