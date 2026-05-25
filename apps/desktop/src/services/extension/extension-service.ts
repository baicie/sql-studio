import type { CommandRegistration } from '../command/types';
import { commandService } from '../command/command-service';
import { keybindingService } from '../keybinding/keybinding-service';
import type { KeybindingRegistration } from '../keybinding/types';
import { menuService } from '../menu/menu-service';
import { notificationService } from '../notification/notification-service';
import { appStorage } from '../storage/storage-service';
import { createSubscription } from '../common/subscription';
import { demoExtensionManifest } from './demo-extension-manifest';
import type { ExtensionHostState, ExtensionSnapshot, InstalledExtension } from './types';

const EXTENSIONS_KEY = 'extensions';

function buildExtensionId(manifest: InstalledExtension['manifest']) {
  return `${manifest.publisher}.${manifest.name}`;
}

export class ExtensionService {
  private _extensions: InstalledExtension[] = [];
  private _hostState: ExtensionHostState = 'idle';
  private _commandDisposables: CommandRegistration[] = [];
  private _keybindingDisposables: KeybindingRegistration[] = [];
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

  initialize() {
    this._hostState = 'loading';
    this._refreshSnapshot();
    this._subscription.emit();

    const stored = appStorage.getJSON<InstalledExtension[]>(EXTENSIONS_KEY);

    if (stored && stored.length > 0) {
      this._extensions = stored;
    } else {
      this._extensions = [
        {
          id: buildExtensionId(demoExtensionManifest),
          manifest: demoExtensionManifest,
          enabled: true,
        },
      ];
      this._persist();
    }

    this.activateAll();
    this._hostState = 'ready';
    this._refreshSnapshot();
    this._subscription.emit();
  }

  getExtensions() {
    return this._extensions.slice();
  }

  getHostState() {
    return this._hostState;
  }

  reload() {
    this.deactivateAll();
    this.activateAll();
    notificationService.info('Extensions reloaded.');
    this._subscription.emit();
  }

  setEnabled(id: string, enabled: boolean) {
    this._extensions = this._extensions.map((extension) => {
      if (extension.id === id) {
        return Object.assign({}, extension, { enabled });
      }

      return extension;
    });

    this._persist();
    this.deactivateAll();
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
    this._commandDisposables.forEach((disposable) => {
      disposable.dispose();
    });
    this._commandDisposables = [];

    this._keybindingDisposables.forEach((disposable) => {
      disposable.dispose();
    });
    this._keybindingDisposables = [];

    for (const extension of this._extensions) {
      menuService.removeByExtension(extension.id);
    }
  }

  private _activateExtension(extension: InstalledExtension) {
    const commands = extension.manifest.contributes?.commands ?? [];

    for (const command of commands) {
      const registration = commandService.registerOrReplace({
        id: command.command,
        title: command.title,
        category: command.category,
        source: 'plugin',
        extensionId: extension.id,
        handler: async () => {
          notificationService.info(
            `${command.title} from ${extension.manifest.displayName ?? extension.manifest.name}`,
          );
        },
      });

      this._commandDisposables.push(registration);
    }

    const menus = extension.manifest.contributes?.menus ?? {};

    for (const location of Object.keys(menus)) {
      const items = menus[location] ?? [];

      menuService.contribute(
        location,
        items.map((item) => ({
          command: item.command,
          title: item.title,
          when: item.when,
          group: item.group,
          order: item.order,
          source: 'plugin' as const,
          extensionId: extension.id,
        })),
      );
    }

    const keybindings = extension.manifest.contributes?.keybindings ?? [];

    for (const keybinding of keybindings) {
      const registration = keybindingService.register({
        command: keybinding.command,
        key: keybinding.key,
        when: keybinding.when,
        source: 'plugin',
        extensionId: extension.id,
      });

      this._keybindingDisposables.push(registration);
    }
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
