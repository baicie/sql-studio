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
        <button
          type="button"
          onClick={installPackage}
          className="w-full rounded-md border px-3 py-1.5 text-sm hover:bg-accent"
        >
          {t('installFromPackage')}
        </button>

        <button
          type="button"
          onClick={installFolderCopy}
          className="w-full rounded-md border px-3 py-1.5 text-sm hover:bg-accent"
        >
          {t('installFromFolderCopy')}
        </button>

        <button
          type="button"
          onClick={installFolderLink}
          className="w-full rounded-md border px-3 py-1.5 text-sm hover:bg-accent"
        >
          {t('installFromFolderLink')}
        </button>

        <button
          type="button"
          onClick={reload}
          className="w-full rounded-md border px-3 py-1.5 text-sm hover:bg-accent"
        >
          {t('reloadExtensions')}
        </button>
      </div>
    </div>
  );
}
