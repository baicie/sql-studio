import { callNative } from '@/services/native/invoke';
import type { ExtensionManifest } from '@sqlgui/extension-schema';

export interface ScannedExtension {
  extensionPath: string;
  manifestPath: string;
  manifest: ExtensionManifest;
}

export interface ScanError {
  path: string;
  message: string;
}

export interface ExtensionScanResult {
  extensions: ScannedExtension[];
  errors: ScanError[];
}

export async function scanExtensions(): Promise<ExtensionScanResult> {
  try {
    const result = await callNative<{
      extensions: Array<{
        extensionPath: string;
        manifestPath: string;
        manifest: ExtensionManifest;
      }>;
      errors: ScanError[];
    }>('extension_scan');

    return {
      extensions: result.extensions,
      errors: result.errors,
    };
  } catch (error) {
    console.error('[ExtensionScanner] Failed to scan extensions:', error);
    return {
      extensions: [],
      errors: [
        {
          path: '',
          message: error instanceof Error ? error.message : String(error),
        },
      ],
    };
  }
}
