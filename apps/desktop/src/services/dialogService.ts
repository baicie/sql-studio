import { open } from '@tauri-apps/plugin-dialog';

export const dialogService = {
  async pickExtensionFolder() {
    const result = await open({
      directory: true,
      multiple: false,
      title: 'Select Extension Folder',
    });

    return typeof result === 'string' ? result : undefined;
  },

  async pickExtensionPackage() {
    const result = await open({
      directory: false,
      multiple: false,
      title: 'Select Extension Package',
      filters: [
        {
          name: 'SQL GUI Extension',
          extensions: ['sgx', 'zip'],
        },
      ],
    });

    return typeof result === 'string' ? result : undefined;
  },
};
