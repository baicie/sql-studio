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

  record(item: Omit<PluginAuditItem, 'id'>) {
    this.items.push(
      Object.assign({}, item, {
        id: crypto.randomUUID(),
      }),
    );

    if (this.items.length > 2000) {
      this.items = this.items.slice(-2000);
    }

    this.emit();
  }

  getItems(extensionId?: string) {
    if (!extensionId) return this.items;
    return this.items.filter((item) => item.extensionId === extensionId);
  }

  clear(extensionId?: string) {
    if (!extensionId) {
      this.items = [];
    } else {
      this.items = this.items.filter((item) => item.extensionId !== extensionId);
    }

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
