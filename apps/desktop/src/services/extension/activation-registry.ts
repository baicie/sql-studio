import type { Disposable } from '@/lib/disposable';
import type { InstalledExtension } from './types';

export class ActivationRegistry {
  private _eventToExtensions = new Map<string, Set<string>>();

  register(extension: InstalledExtension): Disposable {
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
    for (const set of this._eventToExtensions.values()) {
      set.delete(extensionId);
    }
  }

  getExtensionsForEvent(event: string): string[] {
    return Array.from(this._eventToExtensions.get(event) ?? []);
  }

  hasEvent(event: string): boolean {
    return this._eventToExtensions.has(event);
  }

  clear() {
    this._eventToExtensions.clear();
  }
}

export const activationRegistry = new ActivationRegistry();
