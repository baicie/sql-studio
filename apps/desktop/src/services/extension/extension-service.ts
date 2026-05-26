import type { ExtensionManifest } from '@sqlgui/extension-schema';
import { createSubscription } from '../common/subscription';
import { scanExtensions } from './extension-scanner';
import { validateManifest } from './manifest-validator';
import { activationRegistry } from './activation-registry';
import { contributionRegistry } from './contribution-registry';
import { notificationService } from '../notification/notification-service';
import { appStorage } from '../storage/storage-service';
import type { ExtensionHostState, ExtensionSnapshot, InstalledExtension } from './types';

const EXTENSIONS_KEY = 'extensions';
const SCANNED_EXTENSIONS_KEY = 'scanned_extensions';

function buildExtensionId(manifest: ExtensionManifest): string {
  return `${manifest.publisher}.${manifest.name}`;
}

export class ExtensionService {
  private _extensions: InstalledExtension[] = [];
  private _hostState: ExtensionHostState = 'idle';
  private _snapshot: ExtensionSnapshot = {
    extensions: this._extensions,
    hostState: this._hostState,
  };
  private _subscription = createSubscription();

  subscribe(listener: () => void) {
    return this._subscription.subscribe(listener);
  }

  getSnapshot(): ExtensionSnapshot {
    return this._snapshot;
  }

  async initialize() {
    this._hostState = 'loading';
    this._refreshSnapshot();
    this._subscription.emit();

    await this._scanAndLoadExtensions();
    this._loadStoredExtensions();
    this.activateAll();
    this._hostState = 'ready';
    this._refreshSnapshot();
    this._subscription.emit();
  }

  private async _scanAndLoadExtensions() {
    const scanResult = await scanExtensions();

    if (scanResult.errors.length > 0) {
      for (const error of scanResult.errors) {
        console.error(`[ExtensionScanner] ${error.path}: ${error.message}`);
      }
    }

    const scannedExtensions: InstalledExtension[] = [];

    for (const scanned of scanResult.extensions) {
      const validation = validateManifest(scanned.manifest);

      if (!validation.valid) {
        console.error(`[Extension] Invalid manifest at ${scanned.manifestPath}`, validation.errors);
        continue;
      }

      if (validation.warnings.length > 0) {
        for (const warning of validation.warnings) {
          console.warn(`[Extension] ${scanned.manifest.name}: ${warning}`);
        }
      }

      const extension: InstalledExtension = {
        id: buildExtensionId(scanned.manifest),
        manifest: scanned.manifest,
        enabled: true,
        extensionPath: scanned.extensionPath,
        manifestPath: scanned.manifestPath,
      };

      scannedExtensions.push(extension);
    }

    appStorage.setJSON(SCANNED_EXTENSIONS_KEY, scannedExtensions);
  }

  private _loadStoredExtensions() {
    const stored = appStorage.getJSON<InstalledExtension[]>(EXTENSIONS_KEY);
    const scanned = appStorage.getJSON<InstalledExtension[]>(SCANNED_EXTENSIONS_KEY);

    const scannedIds = new Set<string>(scanned?.map((e) => e.id) ?? []);

    if (stored && stored.length > 0) {
      this._extensions = stored.map((extension) => {
        if (scannedIds.has(extension.id)) {
          return extension;
        }
        return this._withEnabled(extension, false);
      });
    } else if (scanned && scanned.length > 0) {
      this._extensions = scanned;
    }

    this._persist();
  }

  private _withEnabled(extension: InstalledExtension, enabled: boolean): InstalledExtension {
    return {
      id: extension.id,
      manifest: extension.manifest,
      enabled,
      extensionPath: extension.extensionPath,
      manifestPath: extension.manifestPath,
    };
  }

  getExtensions() {
    return this._extensions.slice();
  }

  getHostState() {
    return this._hostState;
  }

  reload() {
    this.deactivateAll();
    activationRegistry.clear();
    this.activateAll();
    notificationService.info('Extensions reloaded.');
    this._subscription.emit();
  }

  setEnabled(id: string, enabled: boolean) {
    this._extensions = this._extensions.map((extension) => {
      if (extension.id === id) {
        return this._withEnabled(extension, enabled);
      }
      return extension;
    });

    this._persist();
    this.deactivateAll();
    this.activateAll();
    this._refreshSnapshot();
    this._subscription.emit();
  }

  uninstall(id: string) {
    this.deactivateAll();
    this._extensions = this._extensions.filter((extension) => extension.id !== id);
    this._persist();
    this.activateAll();
    this._refreshSnapshot();
    this._subscription.emit();
  }

  private activateAll() {
    for (const extension of this._extensions) {
      if (extension.enabled) {
        this._activateExtension(extension);
      }
    }
  }

  private deactivateAll() {
    for (const extension of this._extensions) {
      contributionRegistry.unregisterExtension(extension.id);
    }
    activationRegistry.clear();
  }

  private _activateExtension(extension: InstalledExtension) {
    contributionRegistry.registerExtension(extension);
    activationRegistry.register(extension);
  }

  private _persist() {
    appStorage.setJSON(EXTENSIONS_KEY, this._extensions);
  }

  private _refreshSnapshot() {
    this._snapshot = {
      extensions: this._extensions,
      hostState: this._hostState,
    };
  }
}

export const extensionService = new ExtensionService();
