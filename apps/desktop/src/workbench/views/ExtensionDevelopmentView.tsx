import { Button } from '@sqlgui/ui';
import { useAppTranslation } from '@/i18n';
import { dialogService } from '@/services/dialogService';
import { extensionService } from '@/services/extension/extension-service';

export function ExtensionDevelopmentView() {
  const { t } = useAppTranslation('extension');

  async function installPackage() {
    const packagePath = await dialogService.pickExtensionPackage();
    if (!packagePath) return;

    await extensionService.installFromPackage(packagePath);
  }

  async function installFolderCopy() {
    const folderPath = await dialogService.pickExtensionFolder();
    if (!folderPath) return;

    await extensionService.installFromFolderCopy(folderPath);
  }

  async function installFolderLink() {
    const folderPath = await dialogService.pickExtensionFolder();
    if (!folderPath) return;

    await extensionService.installFromFolderLink(folderPath);
  }

  async function reload() {
    extensionService.reloadExtensions();
  }

  return (
    <div className="space-y-3 p-3">
      <div>
        <h2 className="text-sm font-medium">{t('development')}</h2>
        <p className="text-xs text-muted-foreground">
          Install local extension packages or load an extension folder for development.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <Button variant="outline" onClick={installPackage}>
          {t('installFromPackage')}
        </Button>

        <Button variant="outline" onClick={installFolderCopy}>
          {t('installFromFolderCopy')}
        </Button>

        <Button variant="outline" onClick={installFolderLink}>
          {t('installFromFolderLink')}
        </Button>

        <Button variant="outline" onClick={reload}>
          {t('reloadExtensions')}
        </Button>
      </div>
    </div>
  );
}
