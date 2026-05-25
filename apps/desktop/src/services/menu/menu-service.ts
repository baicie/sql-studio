import { createSubscription } from '../common/subscription';
import { evaluateWhenClause } from './evaluate-when-clause';
import type { MenuContext, MenuItem, MenuRegistration } from './types';

export class MenuService {
  private _menus = new Map<string, MenuItem[]>();
  private _subscription = createSubscription();
  private _version = 0;

  subscribe(listener: () => void) {
    return this._subscription.subscribe(listener);
  }

  getVersion() {
    return this._version;
  }

  contribute(location: string, items: MenuItem[]): MenuRegistration {
    const current = this._menus.get(location) ?? [];
    this._menus.set(location, current.concat(items));
    this._emitChange();

    return {
      dispose: () => {
        const next = (this._menus.get(location) ?? []).filter((item) => !items.includes(item));
        this._menus.set(location, next);
        this._emitChange();
      },
    };
  }

  removeByExtension(extensionId: string) {
    let changed = false;

    for (const location of this._menus.keys()) {
      const items = this._menus.get(location) ?? [];
      const next = items.filter((item) => item.extensionId !== extensionId);

      if (next.length !== items.length) {
        changed = true;
      }

      this._menus.set(location, next);
    }

    if (changed) {
      this._emitChange();
    }
  }

  getMenuItems(
    location: string,
    context: MenuContext = {},
    evaluateWhen: (expression: string, ctx: MenuContext) => boolean = evaluateWhenClause,
  ) {
    const items = this._menus.get(location) ?? [];

    return items
      .filter((item) => {
        if (!item.when) {
          return true;
        }

        return evaluateWhen(item.when, context);
      })
      .sort((left, right) => {
        return (left.order ?? 0) - (right.order ?? 0);
      });
  }

  getMenu(
    location: string,
    context: MenuContext,
    evaluateWhen: (expression: string, ctx: MenuContext) => boolean,
  ) {
    return this.getMenuItems(location, context, evaluateWhen);
  }

  getLocations() {
    return Array.from(this._menus.keys());
  }

  private _emitChange() {
    this._version += 1;
    this._subscription.emit();
  }
}

export const menuService = new MenuService();
