import { useSyncExternalStore } from 'react';
import { Button } from '@sqlgui/ui';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@sqlgui/ui';
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
    <Dialog
      open={open}
      onOpenChange={(isOpen) => !isOpen && permissionPromptService.resolveGrantRequest(false)}
    >
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{t('permissionGrant')}</DialogTitle>
        </DialogHeader>

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

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              permissionPromptService.resolveGrantRequest(false);
            }}
          >
            {t('deny')}
          </Button>

          <Button
            onClick={() => {
              permissionPromptService.resolveGrantRequest(true);
            }}
          >
            {t('allow')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function hasPermissionChanged(request: PermissionGrantRequest) {
  const previous = new Set(request.previousPermissions);
  return request.permissions.some((item) => !previous.has(item));
}
