import type { Disposable } from '@/lib/disposable';
import type { InstalledExtension } from './types';
import type { ViewContributionMap } from '@sqlgui/extension-schema';

export interface RegisteredViewContribution {
  extensionId: string;
  location: 'activityBar' | 'sideBar' | 'panel';
  id: string;
  name: string;
  icon?: string;
  when?: string;
}

class ViewContributionRegistry {
  private _views: RegisteredViewContribution[] = [];

  register(contribution: RegisteredViewContribution): Disposable {
    this._views.push(contribution);

    return {
      dispose: () => {
        this._views = this._views.filter((v) => v !== contribution);
      },
    };
  }

  getViews(location?: RegisteredViewContribution['location']) {
    if (!location) return this._views.slice();
    return this._views.filter((v) => v.location === location);
  }

  hasView(id: string): boolean {
    return this._views.some((v) => v.id === id);
  }

  clear() {
    this._views = [];
  }
}

export const viewContributionRegistry = new ViewContributionRegistry();

export function registerViewContributions(extension: InstalledExtension): Disposable[] {
  const views = extension.manifest.contributes?.views as ViewContributionMap | undefined;
  if (!views) return [];

  const disposables: Disposable[] = [];

  for (const location of ['activityBar', 'sideBar', 'panel'] as const) {
    for (const view of views[location] ?? []) {
      disposables.push(
        viewContributionRegistry.register({
          extensionId: extension.id,
          location,
          id: view.id,
          name: view.name,
          icon: view.icon,
          when: view.when,
        }),
      );
    }
  }

  return disposables;
}
