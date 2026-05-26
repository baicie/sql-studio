import type { ExtensionPermission } from '@sqlgui/extension-schema';
import type { ExtensionPermissionGrant } from './types';

const STORAGE_KEY = 'sqlgui.extension.permission.grants';

type Listener = () => void;

class PermissionStorage {
  private listeners = new Set<Listener>();

  loadAll(): Record<string, ExtensionPermissionGrant> {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};

    try {
      return JSON.parse(raw);
    } catch {
      return {};
    }
  }

  getGrant(extensionId: string) {
    return this.loadAll()[extensionId];
  }

  getGrantedPermissions(extensionId: string): ExtensionPermission[] {
    return this.getGrant(extensionId)?.permissions ?? [];
  }

  saveGrant(grant: ExtensionPermissionGrant) {
    const all = this.loadAll();
    all[grant.extensionId] = grant;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    this.emit();
  }

  revoke(extensionId: string) {
    const all = this.loadAll();
    delete all[extensionId];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    this.emit();
  }

  updatePermissions(extensionId: string, permissions: ExtensionPermission[], manifestHash: string) {
    this.saveGrant({
      extensionId,
      permissions,
      manifestHash,
      grantedAt: Date.now(),
    });
  }

  hasPermission(extensionId: string, permission: ExtensionPermission) {
    return this.getGrantedPermissions(extensionId).includes(permission);
  }

  addChangeListener(listener: Listener) {
    this.listeners.add(listener);
  }

  removeChangeListener(listener: Listener) {
    this.listeners.delete(listener);
  }

  private emit() {
    for (const listener of this.listeners) {
      listener();
    }
  }
}

export const permissionStorage = new PermissionStorage();
