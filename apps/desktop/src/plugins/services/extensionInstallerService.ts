import { callNative } from '@/services/native/invoke';

export type ExtensionInstallType = 'package' | 'folderCopy' | 'folderLink' | 'builtin';

export interface InstalledExtensionRecord {
  id: string;
  publisher: string;
  name: string;
  displayName: string;
  version: string;
  installType: ExtensionInstallType;
  enabled: boolean;
  extensionPath: string;
  manifestPath: string;
  installedAt: number;
  updatedAt: number;
  manifestHash: string;
}

export interface ExtensionInstallResult {
  extension: InstalledExtensionRecord;
}

export const extensionInstallerService = {
  listInstalled() {
    return callNative<InstalledExtensionRecord[]>('extension_list_installed');
  },

  installFromFolder(input: { folderPath: string; mode: 'copy' | 'link'; overwrite?: boolean }) {
    return callNative<ExtensionInstallResult>('extension_install_from_folder', {
      request: {
        folderPath: input.folderPath,
        mode: input.mode,
        overwrite: input.overwrite,
      },
    });
  },

  installFromPackage(input: { packagePath: string; overwrite?: boolean }) {
    return callNative<ExtensionInstallResult>('extension_install_from_package', {
      request: {
        packagePath: input.packagePath,
        overwrite: input.overwrite,
      },
    });
  },

  uninstall(input: { extensionId: string; removeData?: boolean }) {
    return callNative<void>('extension_uninstall', {
      request: {
        extensionId: input.extensionId,
        removeData: input.removeData,
      },
    });
  },
};
