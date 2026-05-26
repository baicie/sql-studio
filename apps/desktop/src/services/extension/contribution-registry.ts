import type { Disposable } from '@/lib/disposable';
import type { InstalledExtension } from './types';
import { commandService } from '@/services/command/command-service';
import { keybindingService } from '@/services/keybinding/keybinding-service';
import { menuService } from '@/services/menu/menu-service';
import { notificationService } from '@/services/notification/notification-service';
import { registerViewContributions } from './view-contribution-registry';

export interface ContributionDisposable extends Disposable {
  extensionId: string;
}

function createContributionDisposable(
  registration: Disposable,
  extensionId: string,
): ContributionDisposable {
  return Object.assign(registration, { extensionId }) as ContributionDisposable;
}

export class ContributionRegistry {
  private _disposables = new Map<string, ContributionDisposable[]>();

  registerExtension(extension: InstalledExtension) {
    this.unregisterExtension(extension.id);

    if (!extension.enabled) {
      return;
    }

    const disposables: ContributionDisposable[] = [];

    disposables.push(...this._registerCommands(extension));
    disposables.push(...this._registerMenus(extension));
    disposables.push(...this._registerKeybindings(extension));
    disposables.push(...this._registerViews(extension));

    this._disposables.set(extension.id, disposables);
  }

  unregisterExtension(extensionId: string) {
    const disposables = this._disposables.get(extensionId);

    if (disposables) {
      for (const disposable of disposables) {
        disposable.dispose();
      }
    }

    this._disposables.delete(extensionId);
  }

  private _registerCommands(extension: InstalledExtension): ContributionDisposable[] {
    const commands = extension.manifest.contributes?.commands ?? [];

    return commands.map((command) => {
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

      return createContributionDisposable(registration, extension.id);
    });
  }

  private _registerMenus(extension: InstalledExtension): ContributionDisposable[] {
    const menus = extension.manifest.contributes?.menus ?? {};
    const disposables: ContributionDisposable[] = [];

    for (const location of Object.keys(menus)) {
      const items = menus[location as keyof typeof menus] ?? [];

      const registration = menuService.contribute(
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

      disposables.push(createContributionDisposable(registration, extension.id));
    }

    return disposables;
  }

  private _registerKeybindings(extension: InstalledExtension): ContributionDisposable[] {
    const keybindings = extension.manifest.contributes?.keybindings ?? [];

    return keybindings.map((keybinding) => {
      const registration = keybindingService.register({
        command: keybinding.command,
        key: keybinding.key,
        when: keybinding.when,
        source: 'plugin',
        extensionId: extension.id,
      });

      return createContributionDisposable(registration, extension.id);
    });
  }

  private _registerViews(extension: InstalledExtension): ContributionDisposable[] {
    const views = extension.manifest.contributes?.views;
    if (!views) return [];

    const disposables = registerViewContributions(extension);
    return disposables.map((d) => createContributionDisposable(d, extension.id));
  }
}

export const contributionRegistry = new ContributionRegistry();
