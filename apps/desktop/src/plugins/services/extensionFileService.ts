import { callNative } from '@/services/native/invoke';

export interface ExtensionEntrySource {
  source: string;
  path: string;
}

export const extensionFileService = {
  readEntry(request: { extensionPath: string; main: string }) {
    return callNative<ExtensionEntrySource>('extension_read_entry', {
      request: {
        extensionPath: request.extensionPath || '',
        main: request.main,
      },
    });
  },
};
