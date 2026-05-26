export interface PluginSecurityAuditItem {
  id: string;
  type:
    | 'install.verified'
    | 'install.unsigned'
    | 'install.untrusted'
    | 'install.invalid'
    | 'publisher.trusted'
    | 'publisher.revoked';
  extensionId?: string;
  publisher?: string;
  message?: string;
  createdAt: number;
}

class PluginSecurityAuditService {
  private items: PluginSecurityAuditItem[] = [];

  record(item: Omit<PluginSecurityAuditItem, 'id' | 'createdAt'>) {
    const id = crypto.randomUUID();
    this.items.push(Object.assign({ id, createdAt: Date.now() }, item));

    if (this.items.length > 1000) {
      this.items = this.items.slice(-1000);
    }
  }

  getItems() {
    return this.items.slice();
  }

  clear() {
    this.items = [];
  }
}

export const pluginSecurityAuditService = new PluginSecurityAuditService();
