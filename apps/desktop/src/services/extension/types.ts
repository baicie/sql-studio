import type { ExtensionManifest } from '@sqlgui/extension-schema';

export interface InstalledExtension {
  id: string;
  manifest: ExtensionManifest;
  enabled: boolean;
}

export type ExtensionHostState = 'idle' | 'loading' | 'ready' | 'error';

export interface ExtensionSnapshot {
  extensions: InstalledExtension[];
  hostState: ExtensionHostState;
}
