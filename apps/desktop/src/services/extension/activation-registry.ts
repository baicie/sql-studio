import type { Disposable } from '@/lib/disposable';
import type { InstalledExtension } from './types';

class ExtensionStore {
  private extensions = new Map<string, InstalledExtension>();

  set(extension: InstalledExtension) {
    this.extensions.set(extension.id, extension);
  }

  get(id: string): InstalledExtension | undefined {
    return this.extensions.get(id);
  }

  delete(id: string) {
    this.extensions.delete(id);
  }

  clear() {
    this.extensions.clear();
  }

  values(): InstalledExtension[] {
    return Array.from(this.extensions.values());
  }
}

export const extensionStore = new ExtensionStore();

export class ActivationRegistry {
  private _eventToExtensions = new Map<string, Set<string>>();

  register(extension: InstalledExtension): Disposable {
    extensionStore.set(extension);

    const events = extension.manifest.activationEvents ?? [];

    for (const event of events) {
      const set = this._eventToExtensions.get(event) ?? new Set<string>();
      set.add(extension.id);
      this._eventToExtensions.set(event, set);
    }

    return {
      dispose: () => {
        this.unregister(extension.id);
      },
    };
  }

  unregister(extensionId: string) {
    extensionStore.delete(extensionId);
    for (const set of this._eventToExtensions.values()) {
      set.delete(extensionId);
    }
  }

  getExtensionById(extensionId: string): InstalledExtension | undefined {
    return extensionStore.get(extensionId);
  }

  getExtensionsForEvent(event: string): string[] {
    return Array.from(this._eventToExtensions.get(event) ?? []);
  }

  hasEvent(event: string): boolean {
    return this._eventToExtensions.has(event);
  }

  clear() {
    extensionStore.clear();
    this._eventToExtensions.clear();
  }
}

export const activationRegistry = new ActivationRegistry();
