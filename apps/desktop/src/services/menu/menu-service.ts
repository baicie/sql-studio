export interface MenuItem {
  command: string;
  title?: string;
  when?: string;
  group?: string;
  source: 'core' | 'plugin';
  extensionId?: string;
}

class MenuService {
  private _menus = new Map<string, MenuItem[]>();

  contribute(location: string, items: MenuItem[]) {
    const current = this._menus.get(location) ?? [];
    this._menus.set(location, current.concat(items));
  }

  removeByExtension(extensionId: string) {
    for (const location of this._menus.keys()) {
      const items = this._menus.get(location) ?? [];
      this._menus.set(
        location,
        items.filter((item) => item.extensionId !== extensionId),
      );
    }
  }

  getMenu(
    location: string,
    context: Record<string, unknown>,
    evaluateWhen: (expression: string, ctx: Record<string, unknown>) => boolean,
  ) {
    const items = this._menus.get(location) ?? [];

    return items.filter((item) => {
      if (!item.when) {
        return true;
      }

      return evaluateWhen(item.when, context);
    });
  }

  getLocations() {
    return Array.from(this._menus.keys());
  }
}

export const menuService = new MenuService();
