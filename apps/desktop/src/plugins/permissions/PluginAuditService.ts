import type { ExtensionPermission } from '@sqlgui/extension-schema';

export interface PluginAuditItem {
  id: string;
  extensionId: string;
  method: string;
  requiredPermissions: ExtensionPermission[];
  grantedPermissions: ExtensionPermission[];
  paramsSummary?: unknown;
  createdAt: number;
}

type Listener = () => void;

class PluginAuditService {
  private items: PluginAuditItem[] = [];
  private listeners = new Set<Listener>();
  private _cachedItems: PluginAuditItem[] = [];
  private _cachedFiltered: Map<string, PluginAuditItem[]> = new Map();

  record(item: Omit<PluginAuditItem, 'id'>) {
    this.items.push(
      Object.assign({}, item, {
        id: crypto.randomUUID(),
      }),
    );

    if (this.items.length > 2000) {
      this.items = this.items.slice(-2000);
    }

    this._cachedItems = this.items;
    this._cachedFiltered = new Map();
    this.emit();
  }

  getItems(extensionId?: string) {
    if (extensionId === undefined) {
      if (this._cachedItems.length === 0 && this.items.length > 0) {
        this._cachedItems = this.items;
      }
      return this._cachedItems;
    }

    if (!this._cachedFiltered.has(extensionId)) {
      this._cachedFiltered.set(
        extensionId,
        this.items.filter((item) => item.extensionId === extensionId),
      );
    }
    return this._cachedFiltered.get(extensionId)!;
  }

  clear(extensionId?: string) {
    if (!extensionId) {
      this.items = [];
      this._cachedItems = [];
    } else {
      this.items = this.items.filter((item) => item.extensionId !== extensionId);
      this._cachedFiltered.delete(extensionId);
    }

    this._cachedFiltered = new Map();
    this.emit();
  }

  subscribe(listener: Listener) {
    this.listeners.add(listener);

    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit() {
    for (const listener of this.listeners) {
      listener();
    }
  }
}

export const pluginAuditService = new PluginAuditService();
