import { useSyncExternalStore } from 'react';
import { Button } from '@sqlgui/ui';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@sqlgui/ui';
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
    <Dialog
      open={open}
      onOpenChange={(isOpen) =>
        !isOpen && permissionPromptService.resolveDangerousSqlRequest(false)
      }
    >
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-destructive">{t('dangerousSqlConfirm')}</DialogTitle>
        </DialogHeader>

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

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              permissionPromptService.resolveDangerousSqlRequest(false);
            }}
          >
            {t('deny')}
          </Button>

          <Button
            variant="destructive"
            onClick={() => {
              permissionPromptService.resolveDangerousSqlRequest(true);
            }}
          >
            {t('allowOnce')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
